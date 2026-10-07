import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/types';
import { graphCapabilities, type GraphCapabilities } from '@/lib/workflows/graph/permissions';
import { semanticGraph, parseWorkflowGraph, type WorkflowGraph } from '@/lib/workflows/graph';

/**
 * Reads for the visual workflow builder. Everything goes through the signed-in user's
 * Supabase client, so row level security (not just these queries) keeps one company's
 * workflows, runs and tasks away from another's.
 */

export async function loadCapabilities(profile: Profile): Promise<GraphCapabilities> {
  let enabled = false;
  if (profile.role === 'contractor' && profile.contractor_id) {
    const db = await createClient();
    const { data } = await db.from('workflow_builder_access').select('enabled').eq('contractor_id', profile.contractor_id).maybeSingle();
    enabled = (data as { enabled?: boolean } | null)?.enabled === true;
  }
  return graphCapabilities(profile, enabled);
}

export type GraphStatus = 'draft' | 'published' | 'paused';
export interface GraphWorkflowListItem {
  id: string;
  name: string;
  description: string | null;
  contractorId: string | null;
  contractorName: string | null;
  status: GraphStatus;
  publishedVersion: number | null;
  hasUnpublishedChanges: boolean;
  triggerType: string;
  updatedAt: string;
  runCounts: { active: number; completed: number; failed: number };
  /** Only while paused: when it was paused, how many runs are held, how many events were ignored since. */
  paused: null | { since: string | null; heldRuns: number; skippedEvents: number };
}

export async function listGraphWorkflows(): Promise<GraphWorkflowListItem[]> {
  const db = await createClient();
  const { data: rows, error } = await db
    .from('workflows')
    .select('id,name,description,contractor_id,graph_status,published_version,trigger_type,updated_at,paused_at,contractor:contractors(name)')
    .eq('engine', 'graph').eq('is_template', false).is('archived_at', null).order('updated_at', { ascending: false });
  if (error) {
    // Migration 0041 not applied yet: there are simply no visual workflows.
    if (/engine|column|graph_status/i.test(error.message)) return [];
    throw new Error('Workflows are unavailable');
  }
  const ids = (rows ?? []).map((r) => r.id as string);
  if (!ids.length) return [];
  const [{ data: runs }, { data: drafts }, { data: versions }] = await Promise.all([
    db.from('workflow_runs').select('workflow_id,status').in('workflow_id', ids),
    db.from('workflow_graph_drafts').select('workflow_id,graph').in('workflow_id', ids),
    db.from('workflow_versions').select('workflow_id,version,graph').in('workflow_id', ids),
  ]);
  const pausedRows = (rows ?? []).filter((r) => r.graph_status === 'paused');
  const skipped = new Map<string, number>();
  await Promise.all(pausedRows.map(async (r) => {
    skipped.set(r.id as string, await countSkippedWhilePaused(db, r.id as string, (r.paused_at as string | null) ?? null));
  }));
  return (rows ?? []).map((r) => {
    const own = (runs ?? []).filter((x) => x.workflow_id === r.id);
    const contractor = Array.isArray(r.contractor) ? r.contractor[0] : r.contractor;
    const draft = (drafts ?? []).find((d) => d.workflow_id === r.id);
    const published = (versions ?? []).find((v) => v.workflow_id === r.id && v.version === r.published_version);
    let dirty = false;
    try { dirty = !!draft && !!published ? semanticGraph(parseWorkflowGraph(draft.graph)) !== semanticGraph(parseWorkflowGraph(published.graph)) : false; } catch { dirty = true; }
    return {
      id: r.id, name: r.name, description: r.description, contractorId: r.contractor_id, contractorName: contractor?.name ?? null,
      status: r.graph_status as GraphStatus, publishedVersion: r.published_version, hasUnpublishedChanges: dirty, triggerType: r.trigger_type, updatedAt: r.updated_at,
      runCounts: {
        active: own.filter((x) => ['pending', 'running', 'waiting'].includes(x.status)).length,
        completed: own.filter((x) => x.status === 'completed').length,
        failed: own.filter((x) => x.status === 'failed').length,
      },
      paused: r.graph_status === 'paused'
        ? { since: (r.paused_at as string | null) ?? null, heldRuns: own.filter((x) => ['pending', 'running', 'waiting'].includes(x.status)).length, skippedEvents: skipped.get(r.id as string) ?? 0 }
        : null,
    };
  });
}

/** Distinct events a paused workflow ignored since it was paused (from the 'run.skipped_paused' log). */
export async function countSkippedWhilePaused(db: Awaited<ReturnType<typeof createClient>>, workflowId: string, since: string | null): Promise<number> {
  let query = db.from('workflow_logs').select('event_id').eq('workflow_id', workflowId).eq('code', 'run.skipped_paused').not('event_id', 'is', null).limit(5000);
  if (since) query = query.gte('created_at', since);
  const { data } = await query;
  return new Set((data ?? []).map((x) => x.event_id as string)).size;
}

export interface GraphWorkflowDetail {
  id: string;
  name: string;
  description: string | null;
  contractorId: string | null;
  contractorName: string | null;
  status: GraphStatus;
  publishedVersion: number | null;
  publishedAt: string | null;
  archivedAt: string | null;
  draft: { graph: WorkflowGraph; revision: number; updatedAt: string };
  published: { graph: WorkflowGraph; version: number } | null;
  hasUnpublishedChanges: boolean;
  versions: { version: number; publishedAt: string; note: string | null }[];
  paused: null | { since: string | null; skippedEvents: number };
}

export async function getGraphWorkflow(id: string): Promise<GraphWorkflowDetail | null> {
  const db = await createClient();
  const { data: w } = await db
    .from('workflows')
    .select('id,name,description,contractor_id,graph_status,published_version,published_at,archived_at,paused_at,contractor:contractors(name)')
    .eq('id', id).eq('engine', 'graph').maybeSingle();
  if (!w) return null;
  const [{ data: draft }, { data: versions }] = await Promise.all([
    db.from('workflow_graph_drafts').select('graph,revision,updated_at').eq('workflow_id', id).maybeSingle(),
    db.from('workflow_versions').select('version,graph,note,published_at').eq('workflow_id', id).order('version', { ascending: false }),
  ]);
  if (!draft) return null;
  const draftGraph = parseWorkflowGraph(draft.graph);
  const live = (versions ?? []).find((v) => v.version === w.published_version);
  const publishedGraph = live ? parseWorkflowGraph(live.graph) : null;
  const contractor = Array.isArray(w.contractor) ? w.contractor[0] : w.contractor;
  return {
    id: w.id, name: w.name, description: w.description, contractorId: w.contractor_id, contractorName: contractor?.name ?? null,
    status: w.graph_status as GraphStatus, publishedVersion: w.published_version, publishedAt: w.published_at, archivedAt: w.archived_at,
    draft: { graph: draftGraph, revision: draft.revision, updatedAt: draft.updated_at },
    published: live && publishedGraph ? { graph: publishedGraph, version: live.version } : null,
    hasUnpublishedChanges: publishedGraph ? semanticGraph(publishedGraph) !== semanticGraph(draftGraph) : false,
    versions: (versions ?? []).map((v) => ({ version: v.version, publishedAt: v.published_at, note: v.note })),
    paused: w.graph_status === 'paused' ? { since: (w.paused_at as string | null) ?? null, skippedEvents: await countSkippedWhilePaused(db, id, (w.paused_at as string | null) ?? null) } : null,
  };
}

/** What the side panels offer to pick from. Reads only what the signed-in user may see. */
export interface BuilderLookups {
  emailTemplates: { id: string; name: string; subject: string }[];
  teamMembers: { id: string; name: string; role: string }[];
  recipients: { id: string; name: string; email: string }[];
  calling: null | { mode: string | null; agentConfigured: boolean; phoneConfigured: boolean; globalEnabled: boolean; adminEnabled: boolean };
  smsConnected: boolean;
}

export async function loadBuilderLookups(contractorId: string | null, isAdmin: boolean): Promise<BuilderLookups> {
  const db = await createClient();
  const admin = createAdminClient();
  let templates = db.from('email_templates').select('id,name,subject').eq('is_active', true).order('name');
  if (contractorId) templates = templates.eq('contractor_visible', true);
  const [{ data: t }, { data: people }, { data: rec }, readiness] = await Promise.all([
    templates,
    contractorId
      ? db.from('profiles').select('id,full_name,email,contractor_role').eq('contractor_id', contractorId).eq('role', 'contractor').eq('is_active', true).order('full_name')
      : isAdmin ? db.from('profiles').select('id,full_name,email,role').in('role', ['admin', 'setter', 'caller']).eq('is_active', true).order('full_name') : Promise.resolve({ data: [] }),
    isAdmin && !contractorId ? db.from('lead_recipients').select('id,name,email').eq('is_active', true).order('name') : Promise.resolve({ data: [] }),
    import('./workflow-graph-readiness').then((m) => m.readiness(admin, contractorId)),
  ]);
  return {
    emailTemplates: ((t ?? []) as { id: string; name: string; subject: string }[]),
    teamMembers: ((people ?? []) as { id: string; full_name: string | null; email: string | null; role?: string; contractor_role?: string }[]).map((p) => ({ id: p.id, name: p.full_name || p.email || 'Team member', role: p.contractor_role ?? p.role ?? '' })),
    recipients: ((rec ?? []) as { id: string; name: string; email: string }[]),
    calling: readiness.calling,
    smsConnected: false,
  };
}

// ---------------------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------------------
export interface RunListItem {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowVersion: number;
  contractorName: string | null;
  leadId: string | null;
  leadName: string | null;
  trigger: string;
  source: string;
  mode: 'live' | 'test';
  status: string;
  currentStepKey: string | null;
  enrolledAt: string;
  resumeAt: string | null;
}

export async function listGraphRuns(opts: { workflowId?: string; status?: string; limit?: number } = {}): Promise<RunListItem[]> {
  const db = await createClient();
  let q = db
    .from('workflow_runs')
    .select('id,workflow_id,workflow_version,status,current_step_key,created_at,resume_at,lead_id,mode,enrollment_source,definition_snapshot,workflow:workflows(name,engine,trigger_type),contractor:contractors(name),lead:leads(first_name,last_name),event:workflow_events!workflow_runs_trigger_event_id_fkey(type)')
    .eq('workflow.engine', 'graph')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.workflowId) q = q.eq('workflow_id', opts.workflowId);
  if (opts.status) q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) {
    if (/engine|column|mode/i.test(error.message)) return [];
    throw new Error('Runs are unavailable');
  }
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  return (data ?? [])
    .filter((r) => one<{ engine?: string }>(r.workflow)?.engine === 'graph')
    .map((r) => {
      const lead = one<{ first_name?: string | null; last_name?: string | null }>(r.lead);
      return {
        id: r.id, workflowId: r.workflow_id, workflowName: one<{ name: string }>(r.workflow)?.name ?? 'Workflow', workflowVersion: r.workflow_version,
        contractorName: one<{ name: string }>(r.contractor)?.name ?? null, leadId: r.lead_id,
        leadName: [lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || null,
        trigger: one<{ trigger_type: string }>(r.workflow)?.trigger_type ?? '', source: r.enrollment_source, mode: r.mode,
        status: r.status, currentStepKey: r.current_step_key, enrolledAt: r.created_at, resumeAt: r.resume_at && !r.resume_at.startsWith('infinity') ? r.resume_at : null,
      };
    });
}

export interface RunDetail {
  run: {
    id: string; workflowId: string; workflowName: string; workflowVersion: number; status: string; mode: 'live' | 'test'; source: string;
    contractorId: string | null; contractorName: string | null; leadId: string | null; leadName: string | null; triggerEvent: string; enrolledAt: string; startedAt: string | null;
    completedAt: string | null; currentStepKey: string | null; resumeAt: string | null; paused: boolean; cancelReason: string | null;
    lastError: { code: string; message: string } | null; contactSuppressed: boolean; endReason: string | null;
  };
  graph: WorkflowGraph;
  steps: {
    id: string; nodeId: string; status: string; attemptCount: number; maxAttempts: number; startedAt: string | null; completedAt: string | null;
    resumeAt: string | null; nextRetryAt: string | null; skipReason: string | null; handle: string | null;
    outcome: string | null; executionStatus: string | null; reason: string | null; callJobId: string | null; adopted: boolean;
    error: { code: string; message: string } | null;
  }[];
  waits: { stepKey: string; kind: string; status: string; timeoutAt: string }[];
  calls: { id: string; status: string; attempts: number; maxAttempts: number; createdAt: string; source: string }[];
  appointments: { id: string; scheduledAt: string | null; status: string }[];
  logs: { id: string; at: string; level: string; code: string; message: string }[];
}

export async function getGraphRun(runId: string, includeLogs: boolean): Promise<RunDetail | null> {
  const db = await createClient();
  const { data: r } = await db
    .from('workflow_runs')
    .select('*,workflow:workflows(name,engine),contractor:contractors(name),lead:leads(first_name,last_name),event:workflow_events!workflow_runs_trigger_event_id_fkey(type)')
    .eq('id', runId).maybeSingle();
  if (!r) return null;
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  if (one<{ engine?: string }>(r.workflow)?.engine !== 'graph') return null;
  const snapshot = r.definition_snapshot as { graph?: unknown };
  const [{ data: steps }, { data: waits }, { data: logs }, { data: appts }] = await Promise.all([
    db.from('workflow_step_runs').select('id,step_key,status,attempt_count,max_attempts,started_at,completed_at,resume_at,next_retry_at,skip_reason,output,last_error,created_at').eq('run_id', runId).order('created_at'),
    db.from('workflow_waits').select('step_key,kind,status,timeout_at').eq('run_id', runId),
    includeLogs ? db.from('workflow_logs').select('id,created_at,level,code,message').eq('run_id', runId).order('created_at').limit(300) : Promise.resolve({ data: [] }),
    r.lead_id ? db.from('appointments').select('id,scheduled_at,status,assignment:lead_assignments!inner(lead_id,contractor_id)').eq('assignment.lead_id', r.lead_id) : Promise.resolve({ data: [] }),
  ]);
  const jobIds = (steps ?? []).map((s) => (s.output as Record<string, unknown> | null)?.jobId).filter((x): x is string => typeof x === 'string');
  const calls = jobIds.length
    ? (await db.from('ai_call_jobs').select('id,status,attempts,max_attempts,created_at,trigger_source').in('id', jobIds)).data ?? []
    : [];
  const lead = one<{ first_name?: string | null; last_name?: string | null }>(r.lead);
  const meta = (r.metadata ?? {}) as Record<string, unknown>;
  const err = r.last_error as { code?: string; message?: string } | null;
  return {
    run: {
      id: r.id, workflowId: r.workflow_id, workflowName: one<{ name: string }>(r.workflow)?.name ?? 'Workflow', workflowVersion: r.workflow_version,
      status: r.status, mode: r.mode, source: r.enrollment_source, contractorId: (r.contractor_id as string | null) ?? null, contractorName: one<{ name: string }>(r.contractor)?.name ?? null,
      leadId: r.lead_id, leadName: [lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || null,
      triggerEvent: one<{ type: string }>(r.event)?.type ?? '', enrolledAt: r.created_at, startedAt: r.started_at, completedAt: r.completed_at,
      currentStepKey: r.current_step_key, resumeAt: r.resume_at && !String(r.resume_at).startsWith('infinity') ? r.resume_at : null,
      paused: String(r.resume_at ?? '').startsWith('infinity'), cancelReason: r.cancel_reason,
      lastError: err?.code ? { code: err.code, message: String(err.message ?? '').slice(0, 300) } : null,
      contactSuppressed: meta.contact_suppressed === true, endReason: typeof meta.end_reason === 'string' ? meta.end_reason : null,
    },
    graph: parseWorkflowGraph(snapshot.graph),
    steps: (steps ?? []).map((s) => {
      // Only ids and codes are shown from stored output: it never holds message bodies or contact details.
      const out = (s.output ?? {}) as Record<string, unknown>;
      const e = s.last_error as { code?: string; message?: string } | null;
      return {
        id: s.id, nodeId: s.step_key, status: s.status, attemptCount: s.attempt_count, maxAttempts: s.max_attempts, startedAt: s.started_at, completedAt: s.completed_at,
        resumeAt: s.resume_at, nextRetryAt: s.next_retry_at, skipReason: s.skip_reason,
        handle: typeof out.handle === 'string' ? out.handle : null, outcome: typeof out.outcome === 'string' ? out.outcome : null,
        executionStatus: typeof out.executionStatus === 'string' ? out.executionStatus : null, reason: typeof out.reason === 'string' ? out.reason : null,
        callJobId: typeof out.jobId === 'string' ? out.jobId : null, adopted: out.adopted === true,
        error: e?.code ? { code: e.code, message: String(e.message ?? '').slice(0, 300) } : null,
      };
    }),
    waits: (waits ?? []).map((w) => ({ stepKey: w.step_key, kind: w.kind, status: w.status, timeoutAt: w.timeout_at })),
    calls: (calls as { id: string; status: string; attempts: number; max_attempts: number; created_at: string; trigger_source: string }[]).map((c) => ({ id: c.id, status: c.status, attempts: c.attempts, maxAttempts: c.max_attempts, createdAt: c.created_at, source: c.trigger_source })),
    appointments: ((appts ?? []) as { id: string; scheduled_at: string | null; status: string }[]).map((a) => ({ id: a.id, scheduledAt: a.scheduled_at, status: a.status })),
    logs: ((logs ?? []) as { id: string; created_at: string; level: string; code: string; message: string }[]).map((l) => ({ id: l.id, at: l.created_at, level: l.level, code: l.code, message: l.message })),
  };
}

// ---------------------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------------------
export interface TaskItem { id: string; title: string; description: string | null; dueAt: string | null; status: string; leadId: string | null; leadName: string | null; contractorName: string | null; createdAt: string }
export async function listWorkflowTasks(status: 'open' | 'done' = 'open'): Promise<TaskItem[]> {
  const db = await createClient();
  const { data, error } = await db
    .from('workflow_tasks')
    .select('id,title,description,due_at,status,lead_id,created_at,lead:leads(first_name,last_name),contractor:contractors(name)')
    .eq('status', status).order('due_at', { ascending: true, nullsFirst: false }).limit(200);
  if (error) { if (/workflow_tasks/i.test(error.message)) return []; throw new Error('Tasks are unavailable'); }
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  return (data ?? []).map((t) => {
    const lead = one<{ first_name?: string | null; last_name?: string | null }>(t.lead);
    return { id: t.id, title: t.title, description: t.description, dueAt: t.due_at, status: t.status, leadId: t.lead_id, leadName: [lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || null, contractorName: one<{ name: string }>(t.contractor)?.name ?? null, createdAt: t.created_at };
  });
}
