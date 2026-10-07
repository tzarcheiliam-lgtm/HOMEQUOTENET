import 'server-only';

import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  eventFromRow,
  evaluateWorkflowConditions,
  runKeys,
  stepRunIdempotencyKey,
  toWorkflowLogRow,
  triggerConfigMatches,
  workflowCanSeeEvent,
  workflowResolver,
  type WorkflowError,
  type WorkflowEvent,
  type WorkflowEventRow,
  type WorkflowLogEntry,
  type WorkflowRunRow,
} from '@/lib/workflows';
import type { WorkflowLogCode } from '../logging';
import { callBookingEvidence, callJobFacts, requestWorkflowCall } from './calls.server';
import { executeGraphAction } from './actions.server';
import { loadGraphContext } from './context.server';
import {
  advanceRun,
  type CallRequestResult,
  type Disposition,
  type EnginePorts,
  type EventWaitState,
  type StepPatch,
  type StepRecord,
} from './engine';
import { parseWorkflowGraph, triggerOf, type GraphNode, type WorkflowGraph } from './model';
import { validateGraph } from './validate';

type Db = ReturnType<typeof createAdminClient>;

export class LeaseLostError extends Error {
  constructor() { super('workflow run lease lost'); }
}

const wfError = (code: string, message: string, kind: 'temporary' | 'permanent' = 'permanent'): WorkflowError => ({ code, message: message.slice(0, 500), kind, retryable: kind === 'temporary' });

async function writeLog(db: Db, entry: WorkflowLogEntry): Promise<void> {
  const { error } = await db.from('workflow_logs').insert(toWorkflowLogRow(entry));
  if (error) console.error(`[workflow-log] ${entry.code}: ${error.message}`);
}

export interface GraphSnapshot {
  kind: 'graph';
  version: number | null;
  versionId: string | null;
  graph: WorkflowGraph;
}
export const isGraphSnapshot = (value: unknown): value is GraphSnapshot =>
  !!value && typeof value === 'object' && (value as { kind?: unknown }).kind === 'graph';

type StepRow = {
  id: string; step_key: string; status: StepRecord['status']; attempt_count: number; max_attempts: number;
  output: Record<string, unknown> | null; resume_at: string | null; next_retry_at: string | null;
  last_error: WorkflowError | null; skip_reason: string | null; idempotency_key: string;
};
const asStep = (r: StepRow): StepRecord => ({
  id: r.id, nodeId: r.step_key, status: r.status, attemptCount: r.attempt_count, maxAttempts: r.max_attempts, output: r.output,
  resumeAt: r.resume_at ? new Date(r.resume_at) : null, nextRetryAt: r.next_retry_at ? new Date(r.next_retry_at) : null,
  lastError: r.last_error, skipReason: r.skip_reason, idempotencyKey: r.idempotency_key,
});
const TERMINAL = new Set(['succeeded', 'failed', 'skipped', 'cancelled']);

/** EnginePorts backed by Postgres for one claimed run. */
export class DbPorts implements EnginePorts {
  private mode: 'live' | 'test';
  private testRecipients: string[];
  private simulatedCall: string;

  constructor(private db: Db, private run: WorkflowRunRow & { mode?: 'live' | 'test' }, private workerId: string, private event: WorkflowEvent) {
    this.mode = run.mode === 'test' ? 'test' : 'live';
    const test = (run.context?.test ?? {}) as { recipients?: string[]; simulatedCallOutcome?: string };
    this.testRecipients = Array.isArray(test.recipients) ? test.recipients : [];
    this.simulatedCall = typeof test.simulatedCallOutcome === 'string' ? test.simulatedCallOutcome : 'booked';
  }

  now() { return new Date(); }

  async runState() {
    const { data: r } = await this.db.from('workflow_runs').select('status,locked_by,workflow_id').eq('id', this.run.id).single();
    if (!r) return 'cancelled' as const;
    if (r.status === 'cancelled') return 'cancelled' as const;
    if (r.locked_by !== this.workerId) throw new LeaseLostError();
    if (this.mode === 'live') {
      const { data: w } = await this.db.from('workflows').select('graph_status').eq('id', r.workflow_id).single();
      if (w?.graph_status === 'paused') return 'paused' as const;
    }
    return 'active' as const;
  }

  loadContext() { return loadGraphContext(this.db, this.run, this.event); }

  async isContactSuppressed(ctx: Awaited<ReturnType<EnginePorts['loadContext']>>) {
    if (this.run.metadata?.contact_suppressed === true) return { suppressed: true, reason: String(this.run.metadata.suppress_reason ?? 'opted_out') };
    const { data: fresh } = await this.db.from('workflow_runs').select('metadata').eq('id', this.run.id).single();
    if ((fresh?.metadata as Record<string, unknown> | undefined)?.contact_suppressed === true) return { suppressed: true, reason: 'opted_out' };
    const phone = typeof ctx.lead?.phone_e164 === 'string' ? ctx.lead.phone_e164 : null;
    if (phone) {
      // A recorded opt-out for this number applies to EVERY run, not just the one that heard it.
      const { data } = await this.db.from('ai_call_opt_outs').select('phone_e164').eq('phone_e164', phone).maybeSingle();
      if (data) return { suppressed: true, reason: 'number_opted_out' };
    }
    return { suppressed: false };
  }

  async markContactSuppressed(reason: string) {
    const { data } = await this.db.from('workflow_runs').select('metadata').eq('id', this.run.id).single();
    await this.db.from('workflow_runs').update({ metadata: { ...((data?.metadata as object) ?? {}), contact_suppressed: true, suppress_reason: reason } }).eq('id', this.run.id);
    this.run.metadata = { ...this.run.metadata, contact_suppressed: true, suppress_reason: reason };
  }

  private async fetch(nodeId: string): Promise<StepRow | null> {
    const { data } = await this.db.from('workflow_step_runs').select('*').eq('run_id', this.run.id).eq('step_key', nodeId).eq('iteration', 0).maybeSingle();
    return (data as StepRow | null) ?? null;
  }
  async getStep(nodeId: string) { const r = await this.fetch(nodeId); return r ? asStep(r) : null; }

  async beginStep(node: GraphNode, maxAttempts: number) {
    const existing = await this.fetch(node.id);
    if (existing) {
      if (existing.status === 'retry_scheduled') {
        const { data, error } = await this.db.from('workflow_step_runs')
          .update({ status: 'running', attempt_count: existing.attempt_count + 1, next_retry_at: null, locked_by: this.workerId })
          .eq('id', existing.id).eq('status', 'retry_scheduled').select('*').single();
        if (error || !data) throw new Error('Could not start the next attempt');
        return asStep(data as StepRow);
      }
      return asStep(existing);
    }
    const { data, error } = await this.db.from('workflow_step_runs').insert({
      run_id: this.run.id,
      step_key: node.id,
      step_type: node.type === 'condition' ? 'branch' : 'action',
      action_type: node.type === 'condition' ? null : node.type,
      status: 'running',
      idempotency_key: stepRunIdempotencyKey(this.run.id, node.id),
      attempt_count: 1,
      max_attempts: Math.max(1, Math.min(maxAttempts, 20)),
      input: {},
      locked_by: this.workerId,
      started_at: new Date().toISOString(),
    }).select('*').single();
    if (error?.code === '23505') {
      const again = await this.fetch(node.id);
      if (again) return asStep(again);
    }
    if (error || !data) throw new Error('Could not create the workflow step run');
    return asStep(data as StepRow);
  }

  async updateStep(step: StepRecord, patch: StepPatch) {
    const row: Record<string, unknown> = { status: patch.status, locked_by: null, locked_until: null };
    if (patch.output !== undefined) row.output = patch.output;
    if (patch.resumeAt !== undefined) row.resume_at = patch.resumeAt ? patch.resumeAt.toISOString() : null;
    if (patch.nextRetryAt !== undefined) row.next_retry_at = patch.nextRetryAt ? patch.nextRetryAt.toISOString() : null;
    if (patch.lastError !== undefined) row.last_error = patch.lastError;
    if (patch.skipReason !== undefined) row.skip_reason = patch.skipReason;
    if (patch.failureKind !== undefined) row.failure_kind = patch.failureKind;
    if (TERMINAL.has(patch.status)) row.completed_at = new Date().toISOString();
    const { data, error } = await this.db.from('workflow_step_runs').update(row).eq('id', step.id).select('*').single();
    if (error || !data) throw new Error(`Could not update workflow step: ${error?.message ?? 'no row'}`);
    return asStep(data as StepRow);
  }

  async runAction(node: GraphNode, config: Record<string, unknown>, ctx: Awaited<ReturnType<EnginePorts['loadContext']>>, step: StepRecord) {
    return executeGraphAction({
      db: this.db, node, config, ctx, event: this.event, now: new Date(),
      run: { id: this.run.id, workflowId: this.run.workflow_id, contractorId: this.run.contractor_id, leadId: this.run.lead_id, mode: this.mode, testRecipients: this.testRecipients },
      stepRun: { id: step.id, stepKey: node.id, attempt: step.attemptCount, idempotencyKey: step.idempotencyKey },
    });
  }

  call = {
    request: async (node: GraphNode, config: Record<string, unknown>, ctx: Awaited<ReturnType<EnginePorts['loadContext']>>, step: StepRecord): Promise<CallRequestResult> => {
      // A live test never dials: the tester picks the result so every branch can be exercised safely.
      if (this.mode === 'test') return { ok: true, jobId: null, adopted: false, simulated: this.simulatedCall as never };
      const result = await requestWorkflowCall({
        db: this.db, run: { id: this.run.id, contractorId: this.run.contractor_id }, stepRun: { id: step.id }, nodeId: node.id,
        config, ctx, eventType: this.event.type, eventOccurredAt: this.event.occurredAt, now: new Date(), contractorIdFromEvent: this.event.contractorId,
      });
      if (result.ok && result.jobId) {
        // The durable wait: its timeout is the run's wake time, and the call-status trigger / sweeper
        // use this row to wake exactly this run when the call reaches a final state.
        const timeoutAt = new Date(Date.now() + Number(config.resultTimeoutMinutes ?? 360) * 60_000);
        const { error } = await this.db.from('workflow_waits').upsert({
          run_id: this.run.id, step_key: node.id, kind: 'call', status: 'open', contractor_id: this.run.contractor_id,
          lead_id: typeof ctx.lead?.id === 'string' ? ctx.lead.id : this.run.lead_id, call_job_id: result.jobId,
          since: new Date().toISOString(), timeout_at: timeoutAt.toISOString(),
        }, { onConflict: 'run_id,step_key', ignoreDuplicates: true });
        if (error) return { ok: false, error: wfError('wait_create_failed', 'Could not record the wait for the call result', 'temporary') };
      }
      return result;
    },
    status: (jobId: string) => callJobFacts(this.db, jobId, { leadId: this.run.lead_id, contractorId: this.run.contractor_id }),
    bookingEvidence: (jobId: string) => callBookingEvidence(this.db, jobId),
  };

  async openEventWait(node: GraphNode, config: Record<string, unknown>, ctx: Awaited<ReturnType<EnginePorts['loadContext']>>, timeoutAt: Date) {
    const { error } = await this.db.from('workflow_waits').upsert({
      run_id: this.run.id, step_key: node.id, kind: 'event', status: 'open',
      contractor_id: this.run.contractor_id,
      lead_id: typeof ctx.lead?.id === 'string' ? ctx.lead.id : this.run.lead_id,
      event_types: [String(config.event)],
      match: Array.isArray(config.toStatuses) ? { toStatuses: config.toStatuses } : {},
      since: new Date().toISOString(),
      timeout_at: timeoutAt.toISOString(),
    }, { onConflict: 'run_id,step_key', ignoreDuplicates: true });
    if (error) throw new Error('Could not open the wait');
  }
  async getEventWait(nodeId: string): Promise<EventWaitState | null> {
    const { data } = await this.db.from('workflow_waits').select('status,timeout_at').eq('run_id', this.run.id).eq('step_key', nodeId).maybeSingle();
    return data ? { status: data.status, timeoutAt: new Date(data.timeout_at) } : null;
  }
  async resolveEventWait(nodeId: string, status: 'satisfied' | 'timed_out') {
    await this.db.from('workflow_waits').update({ status, resolved_at: new Date().toISOString() }).eq('run_id', this.run.id).eq('step_key', nodeId).eq('status', 'open');
  }
  async setCurrent(nodeId: string) {
    await this.db.from('workflow_runs').update({ current_step_key: nodeId }).eq('id', this.run.id).eq('locked_by', this.workerId);
  }
  async log(level: 'info' | 'warn' | 'error', code: WorkflowLogCode, message: string, data: Record<string, unknown> = {}) {
    await writeLog(this.db, { level, code, message, runId: this.run.id, data });
  }
}

// ----------------------------------------------------------------------------------------
// Running a claimed graph run
// ----------------------------------------------------------------------------------------
async function updateClaimed(db: Db, runId: string, workerId: string, values: Record<string, unknown>): Promise<boolean> {
  const { data } = await db.from('workflow_runs').update(values).eq('id', runId).eq('locked_by', workerId).select('id').maybeSingle();
  return !!data;
}

async function failGraphRun(db: Db, run: WorkflowRunRow, workerId: string, error: WorkflowError, nodeId?: string) {
  await updateClaimed(db, run.id, workerId, {
    status: 'failed', failed_at: new Date().toISOString(), last_error: { ...error, details: { ...error.details, ...(nodeId ? { node_id: nodeId } : {}) } },
    resume_at: null, locked_by: null, locked_until: null,
  });
  await writeLog(db, { level: 'error', code: 'run.failed', message: error.message, runId: run.id, data: { error_code: error.code, ...(nodeId ? { node_id: nodeId } : {}) } });
}

async function loadRunEvent(db: Db, eventId: string): Promise<WorkflowEvent> {
  const { data, error } = await db.from('workflow_events').select('*').eq('id', eventId).single();
  if (error || !data) throw new Error('Workflow event not found');
  return eventFromRow(data as WorkflowEventRow);
}

export async function executeGraphRun(run: WorkflowRunRow, workerId: string, db: Db = createAdminClient()): Promise<void> {
  const snapshot = run.definition_snapshot;
  if (!isGraphSnapshot(snapshot)) throw new Error('Not a graph run');
  const claimedFrom = typeof run.metadata?._claimed_from === 'string' ? run.metadata._claimed_from : 'pending';
  await writeLog(db, { level: 'info', code: claimedFrom === 'pending' ? 'run.started' : 'run.resumed', message: claimedFrom === 'pending' ? 'Workflow run started' : 'Workflow run resumed', runId: run.id, data: {} });

  // Fail closed: the snapshot is re-validated by the same rules that gated publishing.
  const check = validateGraph(snapshot.graph, { contractorId: run.contractor_id, mode: 'edit' });
  const blocking = check.issues.filter((i) => i.severity === 'error');
  if (!check.graph || blocking.length) {
    await failGraphRun(db, run, workerId, wfError('invalid_definition', blocking[0]?.message ?? 'The workflow definition is invalid'));
    return;
  }
  const graph = parseWorkflowGraph(check.graph);
  const event = await loadRunEvent(db, run.trigger_event_id);
  const ports = new DbPorts(db, run, workerId, event);
  const deadline = new Date(new Date(run.created_at).getTime() + graph.settings.runLifetimeDays * 86_400_000);

  let disposition: Disposition;
  try {
    disposition = await advanceRun(graph, ports, { deadline });
  } catch (cause) {
    if (cause instanceof LeaseLostError) return; // another worker owns the run now; touch nothing
    throw cause;
  }

  switch (disposition.kind) {
    case 'completed':
      await updateClaimed(db, run.id, workerId, {
        status: 'completed', completed_at: new Date().toISOString(), resume_at: null, locked_by: null, locked_until: null,
        metadata: { ...run.metadata, ...(disposition.reason ? { end_reason: disposition.reason } : {}) },
      });
      await writeLog(db, { level: 'info', code: 'run.completed', message: 'Workflow run completed', runId: run.id, data: {} });
      return;
    case 'waiting':
      await updateClaimed(db, run.id, workerId, { status: 'waiting', resume_at: disposition.resumeAt.toISOString(), locked_by: null, locked_until: null, last_error: null });
      await writeLog(db, { level: 'info', code: 'run.waiting', message: 'Workflow run is waiting', runId: run.id, data: { node_id: disposition.nodeId, why: disposition.why } });
      // A result that landed while this run was still 'running' could not wake it: re-check now.
      await db.rpc('workflow_sweep_waits');
      return;
    case 'parked':
      await updateClaimed(db, run.id, workerId, {
        status: 'waiting', resume_at: 'infinity', locked_by: null, locked_until: null,
        metadata: { ...run.metadata, _parked_resume_at: new Date().toISOString() },
      });
      await writeLog(db, { level: 'info', code: 'run.held_paused', message: 'Run held because the workflow is paused', runId: run.id, data: {} });
      return;
    case 'cancelled':
      return;
    case 'failed':
      await failGraphRun(db, run, workerId, disposition.error, disposition.nodeId);
      return;
  }
}

// ----------------------------------------------------------------------------------------
// Enrollment: event -> graph runs
// ----------------------------------------------------------------------------------------
export interface GraphDispatchResult {
  createdRunIds: string[];
  duplicateWorkflows: string[];
  skipped: { workflowId: string; reason: string }[];
}

interface WorkflowGraphRow {
  id: string; contractor_id: string | null; trigger_type: string; published_version: number | null; published_at: string | null;
  enroll_from: string | null; enabled: boolean; archived_at: string | null; graph_status: string | null;
}

async function loadVersion(db: Db, workflowId: string, version: number) {
  const { data } = await db.from('workflow_versions').select('id,version,graph').eq('workflow_id', workflowId).eq('version', version).maybeSingle();
  return (data as { id: string; version: number; graph: unknown } | null) ?? null;
}

async function causedByWorkflow(db: Db, event: WorkflowEvent, workflowId: string): Promise<boolean> {
  // A call the workflow itself placed must never re-trigger that same workflow.
  const runId = (event.payload as Record<string, unknown>).workflowRunId;
  if (typeof runId === 'string') {
    const { data } = await db.from('workflow_runs').select('workflow_id').eq('id', runId).maybeSingle();
    if (data?.workflow_id === workflowId) return true;
  }
  let eventId = event.causationId;
  for (let depth = 0; eventId && depth < 50; depth += 1) {
    const { count } = await db.from('workflow_runs').select('id', { head: true, count: 'exact' }).eq('workflow_id', workflowId).eq('trigger_event_id', eventId);
    if ((count ?? 0) > 0) return true;
    const { data } = await db.from('workflow_events').select('causation_id').eq('id', eventId).maybeSingle();
    eventId = data?.causation_id ?? null;
  }
  return false;
}

/**
 * Creates runs for every published graph workflow this event enrolls. Publishing
 * never back-fills: only events RECORDED after the workflow's `enroll_from`
 * (publish / resume time) can enroll, so no historical or paused-period lead is touched.
 */
export async function dispatchGraphEvent(db: Db, event: WorkflowEvent, recordedAt: string | undefined): Promise<GraphDispatchResult> {
  const result: GraphDispatchResult = { createdRunIds: [], duplicateWorkflows: [], skipped: [] };
  const manual = event.type === 'workflow.manual_enrollment';
  const payload = event.payload as Record<string, unknown>;

  let rows: WorkflowGraphRow[] = [];
  if (manual) {
    const { data } = await db.from('workflows').select('id,contractor_id,trigger_type,published_version,published_at,enroll_from,enabled,archived_at,graph_status').eq('id', String(payload.workflowId)).eq('engine', 'graph').is('archived_at', null);
    rows = (data ?? []) as WorkflowGraphRow[];
  } else {
    const { data, error } = await db.from('workflows').select('id,contractor_id,trigger_type,published_version,published_at,enroll_from,enabled,archived_at,graph_status')
      .eq('engine', 'graph').eq('trigger_type', event.type).eq('enabled', true).is('archived_at', null);
    // Before migration 0041 the engine column does not exist: there are no graph workflows to enroll.
    if (error && /engine|column/i.test(error.message)) return result;
    if (error) throw new Error('Could not load graph workflows');
    rows = (data ?? []) as WorkflowGraphRow[];
  }

  for (const wf of rows) {
    const skip = async (reason: string, code?: WorkflowLogCode) => {
      result.skipped.push({ workflowId: wf.id, reason });
      if (code) await writeLog(db, { level: 'info', code, message: `Event not enrolled: ${reason}`, workflowId: wf.id, eventId: event.id, data: { reason } });
    };
    const isTest = manual && payload.testRun === true;
    if (!workflowCanSeeEvent(wf.contractor_id, event.contractorId)) { await skip('tenant'); continue; }

    // Pick the definition: a live run pins the latest PUBLISHED version; a live test runs the current draft.
    let graph: WorkflowGraph;
    let versionRow: { id: string; version: number } | null = null;
    if (isTest) {
      const { data: draft } = await db.from('workflow_graph_drafts').select('graph').eq('workflow_id', wf.id).maybeSingle();
      if (!draft) { await skip('no_draft'); continue; }
      graph = parseWorkflowGraph(draft.graph);
    } else {
      if (!wf.published_version || (!wf.enabled && !manual)) { await skip('not_published'); continue; }
      if (manual && wf.graph_status === 'paused') { await skip('paused'); continue; }
      const v = await loadVersion(db, wf.id, wf.published_version);
      if (!v) { await skip('version_missing'); continue; }
      graph = parseWorkflowGraph(v.graph);
      versionRow = { id: v.id, version: v.version };
      if (manual && !graph.settings.allowManualEnrollment && triggerOf(graph)?.config.event !== 'workflow.manual_enrollment') { await skip('manual_not_allowed'); continue; }
      // No back-fill: the fact must have been recorded after publishing (or resuming).
      const cutoff = wf.enroll_from ?? wf.published_at;
      if (cutoff && recordedAt && Date.parse(recordedAt) < Date.parse(cutoff)) { await skip('before_publish', 'run.skipped_pre_publish'); continue; }
    }

    const trigger = triggerOf(graph);
    if (!trigger) { await skip('no_trigger'); continue; }
    const ctx = await loadGraphContext(db, { id: randomUUID(), contractor_id: wf.contractor_id }, event);

    if (!manual) {
      if (trigger.config.event !== event.type) { await skip('trigger'); continue; }
      // Trigger filters (from/to statuses, result filters) reuse the engine's own matcher.
      const fakeWorkflow = { trigger: { type: event.type, config: trigger.config.filters } } as never;
      if (!triggerConfigMatches(fakeWorkflow, event)) { await skip('trigger_config'); continue; }
      if (trigger.config.entry && !evaluateWorkflowConditions(trigger.config.entry, workflowResolver(ctx)).matched) {
        await skip('conditions', 'run.conditions_not_met'); continue;
      }
      if (await causedByWorkflow(db, event, wf.id)) { await skip('causation_loop'); continue; }
    } else if (trigger.config.entry && !isTest && !evaluateWorkflowConditions(trigger.config.entry, workflowResolver(ctx)).matched) {
      // A person enrolled the lead on purpose: entry conditions are still enforced so enrollment rules stay explicit.
      await skip('conditions', 'run.conditions_not_met'); continue;
    }
    if (ctx.lead && ctx.lead.archived_at) { await skip('lead_archived'); continue; }

    const policyEntity = event.leadId ? { type: 'lead' as const, id: event.leadId } : { type: event.entityType, id: event.entityId };
    const keys = isTest ? { dedupeKey: null, concurrencyKey: null } : runKeys(graph.settings.reentry, policyEntity.type, policyEntity.id);
    const snapshot: GraphSnapshot = { kind: 'graph', version: versionRow?.version ?? null, versionId: versionRow?.id ?? null, graph };
    const testConfig = (event.metadata?.test ?? {}) as Record<string, unknown>;
    const { data: run, error } = await db.from('workflow_runs').insert({
      workflow_id: wf.id,
      workflow_version: versionRow?.version ?? 1,
      workflow_version_id: versionRow?.id ?? null,
      definition_snapshot: snapshot,
      trigger_event_id: event.id,
      lead_id: event.leadId,
      entity_type: event.entityType,
      entity_id: event.entityId,
      status: 'pending',
      resume_at: new Date().toISOString(),
      dedupe_key: keys.dedupeKey,
      concurrency_key: keys.concurrencyKey,
      mode: isTest ? 'test' : 'live',
      enrollment_source: isTest ? 'test' : manual ? 'manual' : 'event',
      context: isTest ? { test: testConfig } : {},
      metadata: {},
    }).select('id').maybeSingle();
    if (error?.code === '23505') {
      result.duplicateWorkflows.push(wf.id);
      await writeLog(db, { level: 'info', code: 'run.duplicate', message: 'Duplicate workflow run suppressed', workflowId: wf.id, eventId: event.id, data: {} });
      continue;
    }
    if (error || !run) throw new Error(`Could not create workflow run: ${error?.message ?? 'no row'}`);
    result.createdRunIds.push(run.id);
    await writeLog(db, { level: 'info', code: 'run.created', message: 'Workflow run created', runId: run.id, eventId: event.id, data: { workflow_version: versionRow?.version ?? null, mode: isTest ? 'test' : 'live' } });
  }
  return result;
}

/** Cleans up what a cancelled run leaves open: its waits and any call that has not been dialed yet. */
export async function cleanupCancelledRuns(db: Db, runIds: string[]): Promise<void> {
  if (!runIds.length) return;
  await db.from('workflow_waits').update({ status: 'cancelled', resolved_at: new Date().toISOString() }).in('run_id', runIds).eq('status', 'open');
  await db.from('workflow_step_runs').update({ status: 'cancelled', completed_at: new Date().toISOString(), locked_by: null, locked_until: null }).in('run_id', runIds).in('status', ['waiting', 'retry_scheduled', 'running']);
  await db.from('ai_call_jobs').update({ status: 'cancelled', block_reason: 'workflow_run_cancelled', locked_by: null, locked_until: null }).in('workflow_run_id', runIds).eq('status', 'queued');
}

