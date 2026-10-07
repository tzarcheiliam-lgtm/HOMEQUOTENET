'use server';

import { createHash, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadCapabilities } from '@/lib/data/workflow-graph';
import { WORKFLOW_EVENT_TYPES } from '@/lib/workflows';
import { claimAndExecuteWorkflowRuns, processWorkflowEvent } from '@/lib/workflows/runtime.server';
import { loadLeadPreviewContext } from '@/lib/workflows/graph/context.server';
import { resolveTemplateEmail } from '@/lib/workflows/actions.server';
import { loadIntegrationReadiness } from '@/lib/workflows/graph/readiness.server';
import {
  CALL_OUTCOMES,
  dryRunGraph,
  emptyGraph,
  getGraphTemplate,
  hasBlockingIssues,
  parseWorkflowGraph,
  sampleContext,
  semanticGraph,
  triggerOf,
  validateGraph,
  type DryRunResult,
  type GraphIssue,
  type GraphEvaluationContext,
  type WorkflowGraph,
} from '@/lib/workflows/graph';

/**
 * Server actions for the visual builder. Authorization is decided on the server for
 * every call (the UI hiding a button is never the control) AND again by the database
 * (workflow_can_manage() inside each wfg_* function + row level security).
 */
export interface GraphActionResult<T = unknown> {
  ok: boolean;
  message?: string;
  issues?: GraphIssue[];
  data?: T;
  /** The draft changed elsewhere; the client must reload. */
  conflict?: boolean;
}

const fail = <T = unknown>(message: string, extra: Partial<GraphActionResult<T>> = {}): GraphActionResult<T> => ({ ok: false, message, ...extra });
const uuid = z.string().uuid();

const hashGraph = (g: WorkflowGraph) => createHash('sha256').update(semanticGraph(g)).digest('hex');

async function audit(actor: string, action: string, metadata: Record<string, unknown>) {
  await createAdminClient().from('audit_logs').insert({ actor_id: actor, action, metadata });
}

interface WorkflowRow { id: string; name: string; contractor_id: string | null; engine: string; graph_status: string | null; published_version: number | null; archived_at: string | null }
async function loadWorkflowForEdit(workflowId: string) {
  const profile = await requireProfile();
  const caps = await loadCapabilities(profile);
  const db = await createClient();
  const { data } = await db.from('workflows').select('id,name,contractor_id,engine,graph_status,published_version,archived_at').eq('id', workflowId).eq('engine', 'graph').maybeSingle();
  const wf = data as WorkflowRow | null;
  // Not found and "not yours" look identical on purpose.
  if (!wf || wf.archived_at) return { profile, caps, db, wf: null as WorkflowRow | null };
  return { profile, caps, db, wf: caps.edit(wf.contractor_id) ? wf : null };
}

// ---------------------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------------------
const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  contractorId: uuid.nullable(),
  templateKey: z.string().max(64).nullable(),
  triggerEvent: z.enum(WORKFLOW_EVENT_TYPES).optional(),
});

/** Creates an UNPUBLISHED draft (from scratch or from a starter template). Nothing runs, nothing is contacted. */
export async function createGraphWorkflowAction(input: z.input<typeof createSchema>): Promise<GraphActionResult<{ id: string }>> {
  const profile = await requireProfile();
  const caps = await loadCapabilities(profile);
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail('Check the name and scope.');
  const d = parsed.data;
  const contractorId = caps.scopeContractorId ?? d.contractorId; // contractor users are always scoped to their own company
  if (!caps.edit(contractorId)) return fail('You do not have permission to create workflows here.');
  const template = d.templateKey ? getGraphTemplate(d.templateKey) : null;
  if (d.templateKey && !template) return fail('That template is no longer available.');
  const graph: WorkflowGraph = template ? structuredClone(template.graph) : emptyGraph(d.triggerEvent ?? 'lead.assigned');
  const trig = triggerOf(graph);
  const db = await createClient();
  const { data, error } = await db.rpc('wfg_create', {
    p_name: d.name, p_description: d.description ?? template?.summary ?? null, p_contractor: contractorId, p_graph: graph,
    p_trigger_type: trig?.config.event ?? 'lead.assigned', p_trigger_config: trig?.config.filters ?? {}, p_template_key: template?.key ?? null,
  });
  if (error || !data) return fail(error?.message.includes('function') ? 'Apply migration 0041 before creating workflows.' : 'Could not create the workflow.');
  await audit(profile.id, 'workflow.graph.create', { workflow_id: data, template: template?.key ?? null, contractor_id: contractorId });
  revalidatePath('/app/workflows');
  return { ok: true, data: { id: data as string } };
}

// ---------------------------------------------------------------------------------------
// Draft autosave
// ---------------------------------------------------------------------------------------
const saveSchema = z.object({ workflowId: uuid, expectedRevision: z.number().int().min(1), graph: z.unknown(), name: z.string().trim().min(1).max(120), description: z.string().max(2000).nullable() });

export async function saveGraphDraftAction(input: z.input<typeof saveSchema>): Promise<GraphActionResult<{ revision: number }>> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return fail('Check the workflow name.');
  const d = parsed.data;
  const { wf, db } = await loadWorkflowForEdit(d.workflowId);
  if (!wf) return fail('You do not have permission to edit this workflow.');
  let graph: WorkflowGraph;
  try { graph = parseWorkflowGraph(d.graph); } catch { return fail('The workflow is malformed and was not saved.'); }
  const { data, error } = await db.rpc('wfg_save_draft', {
    p_workflow: d.workflowId, p_expected_revision: d.expectedRevision, p_graph: graph, p_name: d.name, p_description: d.description, p_hash: hashGraph(graph),
  });
  if (error) {
    if (error.code === '40001' || /draft changed/i.test(error.message)) return fail('This workflow was changed in another window. Reload to continue.', { conflict: true });
    return fail('Could not save your changes.');
  }
  return { ok: true, data: { revision: data as number } };
}

// ---------------------------------------------------------------------------------------
// Validate / publish / lifecycle
// ---------------------------------------------------------------------------------------
export async function validateGraphForPublishAction(workflowId: string): Promise<GraphActionResult<{ errors: number; warnings: number }>> {
  const { wf, db } = await loadWorkflowForEdit(workflowId);
  if (!wf) return fail('Not found.');
  const { data: draft } = await db.from('workflow_graph_drafts').select('graph').eq('workflow_id', workflowId).maybeSingle();
  if (!draft) return fail('Not found.');
  const result = validateGraph(draft.graph, { contractorId: wf.contractor_id, mode: 'publish', integrations: await loadIntegrationReadiness(wf.contractor_id) });
  return { ok: !hasBlockingIssues(result.issues), issues: result.issues, data: { errors: result.errors, warnings: result.warnings } };
}

const publishSchema = z.object({ workflowId: uuid, expectedRevision: z.number().int().min(1), note: z.string().trim().max(500).optional() });

/** Validates (permissions, settings, branches, integration readiness) then creates a NEW immutable version. */
export async function publishGraphAction(input: z.input<typeof publishSchema>): Promise<GraphActionResult<{ version: number }>> {
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  const d = parsed.data;
  const { profile, wf, db } = await loadWorkflowForEdit(d.workflowId);
  if (!wf) return fail('You do not have permission to publish this workflow.');
  const { data: draft } = await db.from('workflow_graph_drafts').select('graph,revision').eq('workflow_id', d.workflowId).maybeSingle();
  if (!draft) return fail('Not found.');
  if (draft.revision !== d.expectedRevision) return fail('The workflow changed in another window. Reload before publishing.', { conflict: true });
  const result = validateGraph(draft.graph, { contractorId: wf.contractor_id, mode: 'publish', integrations: await loadIntegrationReadiness(wf.contractor_id) });
  if (!result.graph || hasBlockingIssues(result.issues)) return fail('Fix the problems below before publishing.', { issues: result.issues });
  const trig = triggerOf(result.graph)!;
  if (result.graph.settings.exitEvents.includes(trig.config.event)) {
    return fail('A workflow cannot stop on its own trigger event.', { issues: [{ severity: 'error', code: 'exit_on_trigger', message: 'Remove the trigger event from "stop when these happen".' }] });
  }
  const { data, error } = await createAdminClient().rpc('wfg_publish_internal', {
    p_workflow: d.workflowId, p_expected_revision: d.expectedRevision, p_actor: profile.id, p_note: d.note ?? null,
    p_trigger_type: trig.config.event, p_trigger_config: trig.config.filters, p_exit_events: result.graph.settings.exitEvents, p_reentry: result.graph.settings.reentry,
  });
  if (error) return error.code === '40001' ? fail('The workflow changed in another window. Reload before publishing.', { conflict: true }) : fail('Could not publish the workflow.');
  await audit(profile.id, 'workflow.graph.publish', { workflow_id: d.workflowId, version: (data as { version: number }).version });
  revalidatePath('/app/workflows'); revalidatePath(`/app/workflows/${d.workflowId}`);
  return { ok: true, issues: result.issues.filter((i) => i.severity === 'warning'), data: { version: (data as { version: number }).version }, message: 'Published. Only events from now on will enroll leads; existing leads are not touched.' };
}

async function lifecycle(workflowId: string, fn: 'wfg_set_paused' | 'wfg_archive', args: Record<string, unknown>, action: string, message: string): Promise<GraphActionResult> {
  const { profile, wf, db } = await loadWorkflowForEdit(workflowId);
  if (!wf) return fail('You do not have permission to change this workflow.');
  const { error } = await db.rpc(fn, { p_workflow: workflowId, ...args });
  if (error) return fail(/publish the workflow/.test(error.message) ? 'Publish the workflow before pausing it.' : 'Could not update the workflow.');
  await audit(profile.id, action, { workflow_id: workflowId });
  revalidatePath('/app/workflows'); revalidatePath(`/app/workflows/${workflowId}`);
  return { ok: true, message };
}
export async function pauseGraphAction(workflowId: string): Promise<GraphActionResult> {
  return lifecycle(workflowId, 'wfg_set_paused', { p_paused: true }, 'workflow.graph.pause', 'Paused. New leads are not enrolled and waiting runs are held until you resume.');
}
export async function resumeGraphAction(workflowId: string): Promise<GraphActionResult> {
  return lifecycle(workflowId, 'wfg_set_paused', { p_paused: false }, 'workflow.graph.resume', 'Resumed. Held runs continue; only events from now on enroll new leads.');
}
export async function archiveGraphAction(workflowId: string): Promise<GraphActionResult> {
  return lifecycle(workflowId, 'wfg_archive', {}, 'workflow.graph.archive', 'Archived.');
}

// ---------------------------------------------------------------------------------------
// Dry run and live test
// ---------------------------------------------------------------------------------------
const dryRunSchema = z.object({
  workflowId: uuid,
  graph: z.unknown().optional(),
  leadId: uuid.nullable(),
  callOutcome: z.enum(CALL_OUTCOMES).optional(),
  callOutcomes: z.record(z.enum(CALL_OUTCOMES)).optional(),
  eventWaits: z.record(z.enum(['received', 'timeout'])).optional(),
  optedOut: z.boolean().optional(),
});

/** Shows the decisions and rendered content a run WOULD produce. Sends nothing, calls no one, changes no record. */
export async function dryRunGraphAction(input: z.input<typeof dryRunSchema>): Promise<GraphActionResult<DryRunResult & { usedSample: boolean }>> {
  const parsed = dryRunSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  const d = parsed.data;
  const { wf, db } = await loadWorkflowForEdit(d.workflowId);
  if (!wf) return fail('Not found.');
  let graph: WorkflowGraph;
  try {
    if (d.graph) graph = parseWorkflowGraph(d.graph);
    else {
      const { data: draft } = await db.from('workflow_graph_drafts').select('graph').eq('workflow_id', d.workflowId).single();
      graph = parseWorkflowGraph(draft!.graph);
    }
  } catch { return fail('The workflow is malformed.'); }
  const check = validateGraph(graph, { contractorId: wf.contractor_id, mode: 'edit' });
  if (hasBlockingIssues(check.issues.filter((i) => i.code !== 'setup_required'))) return fail('Fix the problems in the workflow first.', { issues: check.issues });

  let ctx: GraphEvaluationContext = sampleContext();
  let usedSample = true;
  if (d.leadId) {
    // The lead must be visible to the signed-in user (row level security) before its facts are read.
    const { data: visible } = await db.from('leads').select('id').eq('id', d.leadId).maybeSingle();
    if (!visible) return fail('That lead is not available to you.');
    if (wf.contractor_id) {
      const { data: assigned } = await db.from('lead_assignments').select('id').eq('lead_id', d.leadId).eq('contractor_id', wf.contractor_id).maybeSingle();
      if (!assigned) return fail('That lead is not assigned to this contractor.');
    }
    const real = await loadLeadPreviewContext(createAdminClient(), d.leadId, wf.contractor_id);
    if (real) { ctx = real; usedSample = false; }
  }
  // Saved email templates, rendered with the same renderer the real send uses.
  const emailTemplates: Record<string, { subject: string; body: string; name?: string }> = {};
  for (const n of graph.nodes) {
    const tid = n.type === 'send_email' ? (n.config as { templateId?: string }).templateId : undefined;
    if (tid && !emailTemplates[tid]) {
      const rendered = await resolveTemplateEmail(createAdminClient(), tid, ctx);
      if (rendered) emailTemplates[tid] = { subject: rendered.subject, body: rendered.text, name: 'Saved template' };
    }
  }
  const result = await dryRunGraph(graph, ctx, {
    defaultCallOutcome: d.callOutcome, callOutcomes: d.callOutcomes, eventWaits: d.eventWaits, optedOut: d.optedOut, emailTemplates,
  }, { phone: process.env.HOMEQUOTE_PHONE, siteUrl: process.env.NEXT_PUBLIC_SITE_URL });
  return { ok: true, data: { ...result, usedSample } };
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const testSchema = z.object({
  workflowId: uuid,
  leadId: uuid,
  /** Explicit test recipients: the signed-in user's own email and/or (admins) saved HomeQuote recipients. */
  includeMyEmail: z.boolean(),
  recipientIds: z.array(uuid).max(10).default([]),
  callOutcome: z.enum(CALL_OUTCOMES).default('booked'),
});

/**
 * Live test: runs the DRAFT through the real engine against a chosen lead. Email goes ONLY to the
 * explicitly selected test recipients; AI calls are never placed (the tester picks the result);
 * status changes, assignments and team notifications are skipped; tasks/notes are labelled "[Test]".
 */
export async function startLiveTestAction(input: z.input<typeof testSchema>): Promise<GraphActionResult<{ runId: string | null }>> {
  const parsed = testSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  const d = parsed.data;
  const { profile, caps, wf, db } = await loadWorkflowForEdit(d.workflowId);
  if (!wf) return fail('You do not have permission to test this workflow.');
  const recipients: string[] = [];
  if (d.includeMyEmail && profile.email && EMAIL.test(profile.email)) recipients.push(profile.email.toLowerCase());
  if (d.recipientIds.length) {
    if (!caps.manageAccess) return fail('Only HomeQuote admins can choose saved recipients.');
    const { data } = await db.from('lead_recipients').select('email').in('id', d.recipientIds).eq('is_active', true);
    recipients.push(...((data ?? []) as { email: string }[]).map((r) => r.email.toLowerCase()));
  }
  const { data: draft } = await db.from('workflow_graph_drafts').select('graph').eq('workflow_id', d.workflowId).maybeSingle();
  if (!draft) return fail('Not found.');
  const graph = parseWorkflowGraph(draft.graph);
  const check = validateGraph(graph, { contractorId: wf.contractor_id, mode: 'edit' });
  if (hasBlockingIssues(check.issues)) return fail('Fix the problems in the workflow before testing it.', { issues: check.issues });
  if (graph.nodes.some((n) => n.type === 'send_email') && !recipients.length) return fail('Choose at least one test recipient. Test runs never email the real homeowner.');
  const { data: visible } = await db.from('leads').select('id').eq('id', d.leadId).maybeSingle();
  if (!visible) return fail('That lead is not available to you.');

  const admin = createAdminClient();
  const requestId = randomUUID();
  const { data: eventId, error } = await admin.rpc('emit_workflow_event', {
    p_type: 'workflow.manual_enrollment', p_idempotency_key: `workflow.manual_enrollment|manual:${d.workflowId}:${d.leadId}:${requestId}`,
    p_entity_type: 'lead', p_entity_id: d.leadId, p_source: 'app:workflow_test', p_occurred_at: new Date().toISOString(),
    p_contractor_id: wf.contractor_id, p_lead_id: d.leadId, p_actor_type: 'user', p_actor_id: profile.id,
    p_payload: { leadId: d.leadId, workflowId: d.workflowId, requestId, enrolledBy: profile.id, testRun: true },
    p_metadata: { test: { recipients, simulatedCallOutcome: d.callOutcome } },
  });
  if (error || !eventId) return fail('Could not start the test.');
  const result = await processWorkflowEvent(eventId as string, { db: admin });
  const runId = result.createdRunIds[0] ?? null;
  if (!runId) return fail('The test could not start (' + (result.skippedWorkflows[0]?.reason ?? 'not eligible') + ').');
  await audit(profile.id, 'workflow.graph.live_test', { workflow_id: d.workflowId, lead_id: d.leadId, recipients: recipients.length });
  return { ok: true, data: { runId }, message: 'Test started. Recipients you selected will receive any emails; no real calls are placed.' };
}

// ---------------------------------------------------------------------------------------
// Manual enrollment
// ---------------------------------------------------------------------------------------
export async function enrollLeadAction(input: { workflowId: string; leadId: string }): Promise<GraphActionResult<{ runId: string | null }>> {
  const parsed = z.object({ workflowId: uuid, leadId: uuid }).safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  const d = parsed.data;
  const { profile, wf, db } = await loadWorkflowForEdit(d.workflowId);
  if (!wf) return fail('You do not have permission to enroll leads in this workflow.');
  if (wf.graph_status !== 'published') return fail(wf.graph_status === 'paused' ? 'This workflow is paused.' : 'Publish the workflow before enrolling leads.');
  const { data: visible } = await db.from('leads').select('id,archived_at').eq('id', d.leadId).maybeSingle();
  if (!visible || (visible as { archived_at: string | null }).archived_at) return fail('That lead is not available.');
  if (wf.contractor_id) {
    const { data: assigned } = await db.from('lead_assignments').select('id').eq('lead_id', d.leadId).eq('contractor_id', wf.contractor_id).maybeSingle();
    if (!assigned) return fail('That lead is not assigned to this contractor.');
  }
  // Explain re-entry rules instead of silently doing nothing.
  const { data: ver } = await db.from('workflow_versions').select('graph').eq('workflow_id', d.workflowId).eq('version', wf.published_version!).maybeSingle();
  const graph = ver ? parseWorkflowGraph(ver.graph) : null;
  if (graph && !graph.settings.allowManualEnrollment && triggerOf(graph)?.config.event !== 'workflow.manual_enrollment') {
    return fail('Manual enrollment is turned off for this workflow (see Enrollment settings).');
  }
  const { data: runs } = await db.from('workflow_runs').select('id,status').eq('workflow_id', d.workflowId).eq('lead_id', d.leadId).neq('mode', 'test');
  const existing = (runs ?? []) as { id: string; status: string }[];
  if (graph?.settings.reentry === 'once_per_entity' && existing.length) return fail('This lead has already been through this workflow (set to once per lead).');
  if (graph?.settings.reentry === 'one_active_per_entity' && existing.some((r) => ['pending', 'running', 'waiting'].includes(r.status))) return fail('This lead already has an active run.');

  const admin = createAdminClient();
  const requestId = randomUUID();
  const { data: eventId, error } = await admin.rpc('emit_workflow_event', {
    p_type: 'workflow.manual_enrollment', p_idempotency_key: `workflow.manual_enrollment|manual:${d.workflowId}:${d.leadId}:${requestId}`,
    p_entity_type: 'lead', p_entity_id: d.leadId, p_source: 'app:workflow_enroll', p_occurred_at: new Date().toISOString(),
    p_contractor_id: wf.contractor_id, p_lead_id: d.leadId, p_actor_type: 'user', p_actor_id: profile.id,
    p_payload: { leadId: d.leadId, workflowId: d.workflowId, requestId, enrolledBy: profile.id },
  });
  if (error || !eventId) return fail('Could not enroll the lead.');
  const result = await processWorkflowEvent(eventId as string, { db: admin });
  const runId = result.createdRunIds[0] ?? null;
  if (!runId) {
    const reason = result.skippedWorkflows[0]?.reason ?? (result.duplicateWorkflows.length ? 'already enrolled' : 'not eligible');
    return fail(`The lead was not enrolled (${reason.replaceAll('_', ' ')}).`);
  }
  await audit(profile.id, 'workflow.graph.enroll', { workflow_id: d.workflowId, lead_id: d.leadId, run_id: runId });
  revalidatePath(`/app/workflows/${d.workflowId}`);
  return { ok: true, data: { runId }, message: 'Lead enrolled.' };
}

// ---------------------------------------------------------------------------------------
// Runs and tasks
// ---------------------------------------------------------------------------------------
export async function cancelGraphRunAction(runId: string): Promise<GraphActionResult<{ callInProgress: boolean }>> {
  if (!uuid.safeParse(runId).success) return fail('Invalid request.');
  const profile = await requireProfile();
  const db = await createClient();
  const { data, error } = await db.rpc('wfg_cancel_run', { p_run: runId, p_reason: 'cancelled_by_user' });
  if (error) return fail(/not allowed/i.test(error.message) ? 'You do not have permission to cancel this run.' : 'Could not cancel the run.');
  const r = data as { cancelled: boolean; callInProgress?: boolean; queuedCallsCancelled?: number };
  if (!r.cancelled) return fail('This run has already finished.');
  await audit(profile.id, 'workflow.graph.cancel_run', { run_id: runId });
  revalidatePath('/app/workflows');
  return { ok: true, data: { callInProgress: !!r.callInProgress }, message: r.callInProgress ? 'Run cancelled. A call already in progress cannot be hung up from here; its result will be recorded but the run will not continue.' : 'Run cancelled.' };
}

export async function retryGraphRunAction(runId: string): Promise<GraphActionResult> {
  if (!uuid.safeParse(runId).success) return fail('Invalid request.');
  const profile = await requireProfile();
  const db = await createClient();
  const { data, error } = await db.rpc('wfg_retry_run', { p_run: runId });
  if (error) return fail(/not allowed/i.test(error.message) ? 'You do not have permission to retry this run.' : 'Could not retry the run.');
  if (!(data as { retried: boolean }).retried) return fail('Only a failed run can be retried.');
  await audit(profile.id, 'workflow.graph.retry_run', { run_id: runId });
  // Run it now; it only re-attempts the step that failed (finished steps and sent emails/calls are never repeated).
  try { await claimAndExecuteWorkflowRuns({ db: createAdminClient(), ids: [runId], limit: 1 }); } catch { /* the scheduler will pick it up */ }
  revalidatePath('/app/workflows');
  return { ok: true, message: 'Retrying the failed step. Steps that already succeeded are not repeated.' };
}

export async function completeWorkflowTaskAction(taskId: string): Promise<GraphActionResult> {
  if (!uuid.safeParse(taskId).success) return fail('Invalid request.');
  await requireProfile();
  const db = await createClient();
  const { error } = await db.rpc('wfg_complete_task', { p_task: taskId });
  if (error) return fail('Could not update the task.');
  revalidatePath('/app/workflows/tasks');
  return { ok: true };
}

export async function setBuilderAccessAction(contractorId: string, enabled: boolean): Promise<GraphActionResult> {
  const profile = await requireProfile();
  const caps = await loadCapabilities(profile);
  if (!caps.manageAccess || !uuid.safeParse(contractorId).success) return fail('Only HomeQuote admins can change this.');
  const db = await createClient();
  const { error } = await db.from('workflow_builder_access').upsert({ contractor_id: contractorId, enabled, updated_by: profile.id, updated_at: new Date().toISOString() }, { onConflict: 'contractor_id' });
  if (error) return fail('Could not save.');
  await audit(profile.id, 'workflow.graph.builder_access', { contractor_id: contractorId, enabled });
  revalidatePath('/app/workflows');
  return { ok: true, message: enabled ? 'This contractor can now build automations for their own company.' : 'Builder access turned off. Their published workflows keep running.' };
}

/** Lead picker for dry runs, tests and manual enrollment. Returns only leads the signed-in user can see (and, for contractor workflows, that are assigned to that company). */
export async function searchLeadsForWorkflowAction(workflowId: string, query: string): Promise<GraphActionResult<{ id: string; name: string; city: string | null }[]>> {
  if (!uuid.safeParse(workflowId).success) return fail('Invalid request.');
  const { wf, db } = await loadWorkflowForEdit(workflowId);
  if (!wf) return fail('Not found.');
  const term = query.replace(/[%,()]/g, ' ').trim().slice(0, 60);
  let q = db.from('leads').select('id,first_name,last_name,city,lead_assignments!inner(contractor_id)').is('archived_at', null).order('created_at', { ascending: false }).limit(15);
  if (wf.contractor_id) q = q.eq('lead_assignments.contractor_id', wf.contractor_id);
  if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) {
    // The network (no contractor) case has no inner join to constrain; retry without it.
    const { data: plain } = await db.from('leads').select('id,first_name,last_name,city').is('archived_at', null).order('created_at', { ascending: false }).limit(15);
    return { ok: true, data: ((plain ?? []) as { id: string; first_name: string | null; last_name: string | null; city: string | null }[]).map((l) => ({ id: l.id, name: [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Lead', city: l.city })) };
  }
  return { ok: true, data: ((data ?? []) as { id: string; first_name: string | null; last_name: string | null; city: string | null }[]).map((l) => ({ id: l.id, name: [l.first_name, l.last_name].filter(Boolean).join(' ') || 'Lead', city: l.city })) };
}

