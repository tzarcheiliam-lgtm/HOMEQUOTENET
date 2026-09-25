import 'server-only';

import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_RETRY_POLICY,
  WORKFLOW_ACTIONS,
  computeWaitUntil,
  conditionsMatch,
  eventFromRow,
  parseWorkflowDefinition,
  parseWorkflowEvent,
  planWorkflow,
  runKeys,
  stepRunIdempotencyKey,
  stepRunUpdateForResult,
  toWorkflowLogRow,
  workflowFromRows,
  workflowResolver,
  type Workflow,
  type WorkflowActionStep,
  type WorkflowDefinition,
  type WorkflowError,
  type WorkflowEvaluationContext,
  type WorkflowEvent,
  type WorkflowEventRow,
  type WorkflowLogEntry,
  type WorkflowPlan,
  type WorkflowRunRow,
  type WorkflowStepRunRow,
} from '@/lib/workflows';
import { executeWorkflowAction } from './actions.server';

type WorkflowDb = ReturnType<typeof createAdminClient>;

export interface WorkflowProcessResult {
  eventId: string;
  createdRunIds: string[];
  duplicateWorkflows: string[];
  skippedWorkflows: { workflowId: string; reason: string }[];
}

export interface WorkflowTickResult {
  events: number;
  runs: number;
  failures: number;
}

function runtimeError(code: string, message: string, kind: 'temporary' | 'permanent' = 'permanent'): WorkflowError {
  return { code, message, kind, retryable: kind === 'temporary' };
}

function definitionOf(workflow: Workflow): WorkflowDefinition {
  return {
    name: workflow.name,
    description: workflow.description ?? null,
    trigger: workflow.trigger,
    conditions: workflow.conditions,
    exitEvents: workflow.exitEvents,
    reentryPolicy: workflow.reentryPolicy,
    steps: workflow.steps,
  };
}

async function writeLog(db: WorkflowDb, entry: WorkflowLogEntry): Promise<void> {
  const { error } = await db.from('workflow_logs').insert(toWorkflowLogRow(entry));
  if (error) console.error(`[workflow-log] ${entry.code}: ${error.message}`);
}

async function loadEvent(db: WorkflowDb, eventId: string): Promise<WorkflowEvent> {
  const { data, error } = await db.from('workflow_events').select('*').eq('id', eventId).single();
  if (error || !data) throw new Error('Workflow event not found');
  return eventFromRow(data as WorkflowEventRow);
}

async function loadStoredWorkflow(db: WorkflowDb, row: Record<string, unknown>): Promise<Workflow> {
  const { data: steps, error } = await db
    .from('workflow_steps')
    .select('*')
    .eq('workflow_id', String(row.id))
    .order('position');
  if (error) throw new Error('Could not load workflow steps');
  return workflowFromRows(row as never, (steps ?? []) as never);
}

function payloadId(event: WorkflowEvent, key: string): string | null {
  const value = (event.payload as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

export async function loadWorkflowEvaluationContext(
  db: WorkflowDb,
  event: WorkflowEvent,
  workflowContractorId: string | null
): Promise<WorkflowEvaluationContext> {
  let lead: Record<string, unknown> | null = null;
  let assignment: Record<string, unknown> | null = null;
  let appointment: Record<string, unknown> | null = null;
  let estimate: Record<string, unknown> | null = null;
  let contractor: Record<string, unknown> | null = null;

  if (event.leadId) {
    const result = await db.from('leads').select('*').eq('id', event.leadId).maybeSingle();
    lead = (result.data as Record<string, unknown> | null) ?? null;
  }
  const assignmentId = payloadId(event, 'assignmentId') ?? (event.entityType === 'lead_assignment' ? event.entityId : null);
  if (assignmentId) {
    const result = await db.from('lead_assignments').select('*').eq('id', assignmentId).maybeSingle();
    assignment = (result.data as Record<string, unknown> | null) ?? null;
  } else if (workflowContractorId && event.leadId) {
    const result = await db
      .from('lead_assignments')
      .select('*')
      .eq('lead_id', event.leadId)
      .eq('contractor_id', workflowContractorId)
      .maybeSingle();
    assignment = (result.data as Record<string, unknown> | null) ?? null;
  }
  const appointmentId = payloadId(event, 'appointmentId') ?? (event.entityType === 'appointment' ? event.entityId : null);
  if (appointmentId) {
    const result = await db.from('appointments').select('*').eq('id', appointmentId).maybeSingle();
    appointment = (result.data as Record<string, unknown> | null) ?? null;
  }
  const estimateId = payloadId(event, 'estimateId') ?? (event.entityType === 'estimate' ? event.entityId : null);
  if (estimateId) {
    const result = await db.from('estimates').select('*').eq('id', estimateId).maybeSingle();
    estimate = (result.data as Record<string, unknown> | null) ?? null;
  }
  const contractorId = workflowContractorId ?? event.contractorId;
  if (contractorId) {
    const result = await db.from('contractors').select('id,name').eq('id', contractorId).maybeSingle();
    contractor = (result.data as Record<string, unknown> | null) ?? null;
  }
  return { contractor, lead, assignment, appointment, estimate, event: { payload: event.payload as Record<string, unknown> } };
}

async function causationContainsWorkflow(db: WorkflowDb, event: WorkflowEvent, workflowId: string): Promise<boolean> {
  let eventId = event.causationId;
  for (let depth = 0; eventId && depth < 50; depth += 1) {
    const { count } = await db
      .from('workflow_runs')
      .select('id', { head: true, count: 'exact' })
      .eq('workflow_id', workflowId)
      .eq('trigger_event_id', eventId);
    if ((count ?? 0) > 0) return true;
    const { data } = await db.from('workflow_events').select('causation_id').eq('id', eventId).maybeSingle();
    eventId = data?.causation_id ?? null;
  }
  return false;
}

async function cancelExitRuns(db: WorkflowDb, event: WorkflowEvent): Promise<void> {
  if (!event.leadId) return;
  const { data: workflows } = await db
    .from('workflows')
    .select('id,contractor_id')
    .contains('exit_events', [event.type]);
  for (const workflow of workflows ?? []) {
    if (workflow.contractor_id !== null && workflow.contractor_id !== event.contractorId) continue;
    const { data: cancelled } = await db
      .from('workflow_runs')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: `exit_event:${event.type}`, locked_by: null, locked_until: null })
      .eq('workflow_id', workflow.id)
      .eq('lead_id', event.leadId)
      .in('status', ['pending', 'running', 'waiting'])
      .select('id');
    for (const run of cancelled ?? []) {
      await writeLog(db, { level: 'info', code: 'run.exit_event', message: 'Run cancelled by exit event', runId: run.id, eventId: event.id, data: { event_type: event.type } });
    }
  }
}

export async function processWorkflowEvent(
  eventId: string,
  options: { db?: WorkflowDb; workerId?: string; execute?: boolean } = {}
): Promise<WorkflowProcessResult> {
  const db = options.db ?? createAdminClient();
  const workerId = options.workerId ?? `event:${randomUUID()}`;
  const result: WorkflowProcessResult = { eventId, createdRunIds: [], duplicateWorkflows: [], skippedWorkflows: [] };
  try {
    // Loaded inside the try: an unreadable event must be marked failed (and
    // eventually dead-lettered by the claim's attempt cap), never left
    // 'dispatching' to be reclaimed forever.
    const event = await loadEvent(db, eventId);
    await writeLog(db, { level: 'info', code: 'event.recorded', message: 'Workflow event received', eventId, data: { event_type: event.type } });
    await cancelExitRuns(db, event);
    const { data: rows, error } = await db
      .from('workflows')
      .select('*')
      .eq('trigger_type', event.type)
      .eq('enabled', true)
      .eq('is_template', false)
      .is('archived_at', null);
    if (error) throw new Error('Could not load matching workflows');
    for (const row of rows ?? []) {
      const workflow = await loadStoredWorkflow(db, row as Record<string, unknown>);
      const values = await loadWorkflowEvaluationContext(db, event, workflow.contractorId);
      const plan = planWorkflow(workflow, event, values);
      if (!plan.matched) {
        result.skippedWorkflows.push({ workflowId: workflow.id, reason: plan.reason });
        if (plan.reason === 'conditions') {
          await writeLog(db, { level: 'info', code: 'run.conditions_not_met', message: 'Workflow entry conditions did not match', workflowId: workflow.id, eventId, data: {} });
        }
        continue;
      }
      if (await causationContainsWorkflow(db, event, workflow.id)) {
        result.skippedWorkflows.push({ workflowId: workflow.id, reason: 'causation_loop' });
        continue;
      }
      const policyEntity = event.leadId ? { type: 'lead' as const, id: event.leadId } : { type: event.entityType, id: event.entityId };
      const keys = runKeys(workflow.reentryPolicy, policyEntity.type, policyEntity.id);
      const { data: run, error: insertError } = await db
        .from('workflow_runs')
        .insert({
          workflow_id: workflow.id,
          workflow_version: workflow.version,
          definition_snapshot: definitionOf(workflow),
          trigger_event_id: event.id,
          lead_id: event.leadId,
          entity_type: event.entityType,
          entity_id: event.entityId,
          status: 'pending',
          resume_at: new Date().toISOString(),
          dedupe_key: keys.dedupeKey,
          concurrency_key: keys.concurrencyKey,
          context: {},
          metadata: {},
        })
        .select('*')
        .maybeSingle();
      if (insertError?.code === '23505') {
        result.duplicateWorkflows.push(workflow.id);
        await writeLog(db, { level: 'info', code: 'run.duplicate', message: 'Duplicate workflow run suppressed', workflowId: workflow.id, eventId, data: {} });
        continue;
      }
      if (insertError || !run) throw new Error('Could not create workflow run');
      result.createdRunIds.push(run.id);
      await writeLog(db, { level: 'info', code: 'run.created', message: 'Workflow run created', runId: run.id, eventId, data: { workflow_version: workflow.version } });
    }
    const status = result.createdRunIds.length || result.duplicateWorkflows.length ? 'dispatched' : 'ignored';
    let finish = db.from('workflow_events').update({
      dispatch_status: status,
      dispatched_at: new Date().toISOString(),
      last_error: null,
      locked_by: null,
      locked_until: null,
    }).eq('id', eventId);
    if (options.workerId) finish = finish.eq('locked_by', workerId);
    await finish;
    if (!result.createdRunIds.length) {
      await writeLog(db, { level: 'info', code: 'event.no_match', message: 'No new workflow run matched the event', eventId, data: {} });
    }
    if (options.execute !== false && result.createdRunIds.length) {
      await claimAndExecuteWorkflowRuns({ db, workerId, ids: result.createdRunIds });
    }
    return result;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Workflow event dispatch failed';
    // Exponential backoff by attempt (1m, 2m, 4m ... capped at 1h); the claim
    // stops after 10 attempts.
    const { data: current } = await db.from('workflow_events').select('dispatch_attempts').eq('id', eventId).maybeSingle();
    const attempts = Math.max(1, Number(current?.dispatch_attempts ?? 1));
    const delaySeconds = Math.min(60 * 2 ** (attempts - 1), 3600);
    let failure = db.from('workflow_events').update({
      dispatch_status: 'failed',
      available_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
      last_error: message.slice(0, 500),
      locked_by: null,
      locked_until: null,
    }).eq('id', eventId);
    if (options.workerId) failure = failure.eq('locked_by', workerId);
    await failure;
    await writeLog(db, { level: 'error', code: 'event.dispatch_failed', message: 'Workflow event dispatch failed', eventId, data: { attempts } });
    throw cause;
  }
}

async function updateClaimedRun(
  db: WorkflowDb,
  runId: string,
  workerId: string,
  values: Record<string, unknown>
): Promise<boolean> {
  const { data } = await db.from('workflow_runs').update(values).eq('id', runId).eq('locked_by', workerId).select('id').maybeSingle();
  return !!data;
}

async function failRun(db: WorkflowDb, run: WorkflowRunRow, workerId: string, lastError: WorkflowError): Promise<void> {
  await updateClaimedRun(db, run.id, workerId, {
    status: 'failed', failed_at: new Date().toISOString(), last_error: lastError,
    resume_at: null, locked_by: null, locked_until: null,
  });
  await writeLog(db, { level: 'error', code: 'run.failed', message: lastError.message, runId: run.id, data: { error_code: lastError.code } });
}

async function findStepRun(db: WorkflowDb, runId: string, stepKey: string): Promise<WorkflowStepRunRow | null> {
  const { data } = await db
    .from('workflow_step_runs')
    .select('*')
    .eq('run_id', runId)
    .eq('step_key', stepKey)
    .eq('iteration', 0)
    .maybeSingle();
  return (data as WorkflowStepRunRow | null) ?? null;
}

async function startStep(
  db: WorkflowDb,
  run: WorkflowRunRow,
  step: WorkflowActionStep,
  workerId: string
): Promise<WorkflowStepRunRow> {
  const existing = await findStepRun(db, run.id, step.key);
  if (existing) {
    if (existing.status === 'retry_scheduled') {
      const { data } = await db.from('workflow_step_runs').update({
        status: 'running', attempt_count: existing.attempt_count + 1, next_retry_at: null,
        locked_by: workerId, locked_until: run.locked_until,
      }).eq('id', existing.id).eq('status', 'retry_scheduled').select('*').single();
      return data as WorkflowStepRunRow;
    }
    return existing;
  }
  const maxAttempts = WORKFLOW_ACTIONS[step.action.type].defaultMaxAttempts;
  const { data, error } = await db.from('workflow_step_runs').insert({
    run_id: run.id,
    step_key: step.key,
    step_type: 'action',
    action_type: step.action.type,
    status: 'running',
    idempotency_key: stepRunIdempotencyKey(run.id, step.key),
    attempt_count: 1,
    max_attempts: maxAttempts,
    input: step.action.config,
    locked_by: workerId,
    locked_until: run.locked_until,
    started_at: new Date().toISOString(),
  }).select('*').single();
  if (error || !data) throw new Error('Could not create workflow step run');
  return data as WorkflowStepRunRow;
}

export async function executeClaimedWorkflowRun(
  run: WorkflowRunRow,
  workerId: string,
  db: WorkflowDb = createAdminClient()
): Promise<void> {
  const definition = parseWorkflowDefinition(run.definition_snapshot);
  const event = await loadEvent(db, run.trigger_event_id);
  const claimedFrom = typeof run.metadata?._claimed_from === 'string' ? run.metadata._claimed_from : 'pending';
  await writeLog(db, {
    level: 'info', code: claimedFrom === 'pending' ? 'run.started' : 'run.resumed',
    message: claimedFrom === 'pending' ? 'Workflow run started' : 'Workflow run resumed', runId: run.id, data: {},
  });
  const steps = definition.steps
    .filter((step): step is WorkflowActionStep => step.stepType === 'action' && step.parentKey === null)
    .sort((a, b) => a.position - b.position);
  if (steps.length !== definition.steps.length) {
    await failRun(db, run, workerId, runtimeError('unsupported_branch', 'Branch workflow execution is not available'));
    return;
  }

  for (const step of steps) {
    const current = await findStepRun(db, run.id, step.key);
    if (current?.status === 'succeeded' || current?.status === 'skipped') continue;
    if (current?.status === 'failed' || current?.status === 'cancelled') {
      await failRun(db, run, workerId, current.last_error ?? runtimeError('step_failed', 'A workflow step failed'));
      return;
    }
    if (current?.status === 'waiting') {
      await db.from('workflow_step_runs').update({ status: 'succeeded', completed_at: new Date().toISOString(), locked_by: null, locked_until: null }).eq('id', current.id).eq('status', 'waiting');
      await writeLog(db, { level: 'info', code: 'step.succeeded', message: 'Wait completed', stepRunId: current.id, data: { step_key: step.key } });
      continue;
    }
    if (current?.status === 'retry_scheduled' && current.next_retry_at && new Date(current.next_retry_at).getTime() > Date.now()) {
      await updateClaimedRun(db, run.id, workerId, { status: 'waiting', resume_at: current.next_retry_at, locked_by: null, locked_until: null });
      return;
    }

    await updateClaimedRun(db, run.id, workerId, { current_step_key: step.key });
    const stepRun = await startStep(db, run, step, workerId);
    await writeLog(db, { level: 'info', code: 'step.started', message: 'Workflow step started', stepRunId: stepRun.id, data: { step_key: step.key, action_type: step.action.type } });
    const values = await loadWorkflowEvaluationContext(db, event, run.contractor_id);
    if (!conditionsMatch(step.conditions, workflowResolver(values))) {
      await db.from('workflow_step_runs').update({ status: 'skipped', skip_reason: 'condition_not_met', completed_at: new Date().toISOString(), locked_by: null, locked_until: null }).eq('id', stepRun.id);
      await writeLog(db, { level: 'info', code: 'step.skipped', message: 'Workflow step condition did not match', stepRunId: stepRun.id, data: { step_key: step.key, reason: 'condition_not_met' } });
      continue;
    }

    if (step.action.type === 'wait') {
      const resolution = computeWaitUntil(step.action.config, new Date(), {
        'appointment.scheduled_at': typeof values.appointment?.scheduled_at === 'string' ? values.appointment.scheduled_at : null,
        'lead.created_at': typeof values.lead?.created_at === 'string' ? values.lead.created_at : null,
        'event.occurred_at': event.occurredAt,
      });
      if (resolution.kind === 'resume_at') {
        const resumeAt = resolution.resumeAt.toISOString();
        await db.from('workflow_step_runs').update({ status: 'waiting', resume_at: resumeAt, locked_by: null, locked_until: null }).eq('id', stepRun.id);
        await updateClaimedRun(db, run.id, workerId, { status: 'waiting', resume_at: resumeAt, locked_by: null, locked_until: null });
        await writeLog(db, { level: 'info', code: 'step.waiting', message: 'Workflow step is waiting', stepRunId: stepRun.id, data: { step_key: step.key } });
        await writeLog(db, { level: 'info', code: 'run.waiting', message: 'Workflow run is waiting', runId: run.id, data: { step_key: step.key } });
        return;
      }
      if (resolution.kind === 'skip') {
        await db.from('workflow_step_runs').update({ status: 'skipped', skip_reason: resolution.reason, completed_at: new Date().toISOString(), locked_by: null, locked_until: null }).eq('id', stepRun.id);
        continue;
      }
      await db.from('workflow_step_runs').update({ status: 'succeeded', completed_at: new Date().toISOString(), locked_by: null, locked_until: null }).eq('id', stepRun.id);
      continue;
    }
    if (step.action.type === 'stop_workflow') {
      await db.from('workflow_step_runs').update({ status: 'succeeded', output: { stopped: true }, completed_at: new Date().toISOString(), locked_by: null, locked_until: null }).eq('id', stepRun.id);
      await updateClaimedRun(db, run.id, workerId, { status: 'completed', completed_at: new Date().toISOString(), resume_at: null, locked_by: null, locked_until: null, metadata: { ...run.metadata, stopped: true, stop_reason: step.action.config.reason ?? null } });
      await writeLog(db, { level: 'info', code: 'run.completed', message: 'Workflow stopped cleanly', runId: run.id, data: { step_key: step.key } });
      return;
    }

    const actionContext = {
      action: step.action,
      run: { id: run.id, workflowId: run.workflow_id, contractorId: run.contractor_id, leadId: run.lead_id },
      stepRun: { id: stepRun.id, stepKey: step.key, attempt: stepRun.attempt_count, idempotencyKey: stepRun.idempotency_key },
      event,
      now: new Date(),
    };
    const actionResult = await executeWorkflowAction({ db, context: actionContext, values });
    const update = stepRunUpdateForResult(actionResult, stepRun.attempt_count, new Date(), { ...DEFAULT_RETRY_POLICY, maxAttempts: stepRun.max_attempts });
    if (update.status === 'succeeded') {
      await db.from('workflow_step_runs').update({ status: 'succeeded', output: update.output, provider: update.provider, completed_at: new Date().toISOString(), locked_by: null, locked_until: null }).eq('id', stepRun.id);
      await writeLog(db, { level: 'info', code: 'step.succeeded', message: 'Workflow step succeeded', stepRunId: stepRun.id, data: { step_key: step.key } });
      continue;
    }
    if (update.status === 'skipped') {
      await db.from('workflow_step_runs').update({ status: 'skipped', skip_reason: update.skipReason, provider: update.provider, completed_at: new Date().toISOString(), locked_by: null, locked_until: null }).eq('id', stepRun.id);
      await writeLog(db, { level: 'info', code: 'step.skipped', message: 'Workflow step skipped', stepRunId: stepRun.id, data: { step_key: step.key, reason: update.skipReason } });
      continue;
    }
    if (update.status === 'retry_scheduled') {
      const retryAt = update.nextRetryAt.toISOString();
      await db.from('workflow_step_runs').update({ status: 'retry_scheduled', failure_kind: update.failureKind, last_error: update.lastError, next_retry_at: retryAt, provider: update.provider, locked_by: null, locked_until: null }).eq('id', stepRun.id);
      await updateClaimedRun(db, run.id, workerId, { status: 'waiting', resume_at: retryAt, last_error: update.lastError, locked_by: null, locked_until: null });
      await writeLog(db, { level: 'warn', code: 'step.retry_scheduled', message: 'Workflow step scheduled for retry', stepRunId: stepRun.id, data: { step_key: step.key, error_code: update.lastError.code } });
      return;
    }
    await db.from('workflow_step_runs').update({ status: 'failed', failure_kind: update.failureKind, last_error: update.lastError, provider: update.provider, completed_at: new Date().toISOString(), locked_by: null, locked_until: null }).eq('id', stepRun.id);
    await writeLog(db, { level: 'error', code: 'step.failed', message: update.lastError.message, stepRunId: stepRun.id, data: { step_key: step.key, error_code: update.lastError.code } });
    await failRun(db, run, workerId, update.lastError);
    return;
  }

  await updateClaimedRun(db, run.id, workerId, { status: 'completed', completed_at: new Date().toISOString(), resume_at: null, locked_by: null, locked_until: null });
  await writeLog(db, { level: 'info', code: 'run.completed', message: 'Workflow run completed', runId: run.id, data: {} });
}

export async function claimAndExecuteWorkflowRuns(options: {
  db?: WorkflowDb;
  workerId?: string;
  ids?: string[];
  limit?: number;
} = {}): Promise<{ claimed: number; failed: number }> {
  const db = options.db ?? createAdminClient();
  const workerId = options.workerId ?? `run:${randomUUID()}`;
  const { data, error } = await db.rpc('claim_workflow_runs', {
    p_worker: workerId,
    p_ids: options.ids?.length ? options.ids : null,
    p_limit: options.limit ?? 20,
    p_lease_seconds: 120,
  });
  if (error) throw new Error('Could not claim workflow runs');
  let failed = 0;
  // Each run is isolated: one unexpected error must neither abort the rest of
  // the batch nor leave the run 'running' to be reclaimed forever.
  for (const row of data ?? []) {
    const run = row as WorkflowRunRow;
    try {
      await executeClaimedWorkflowRun(run, workerId, db);
    } catch (cause) {
      failed += 1;
      await recoverRunError(db, run, workerId, cause);
    }
  }
  return { claimed: data?.length ?? 0, failed };
}

/** Unexpected runtime errors (DB timeouts, bugs) back off; after MAX they fail the run. */
export const MAX_RUN_RUNTIME_ERRORS = 5;

async function recoverRunError(db: WorkflowDb, run: WorkflowRunRow, workerId: string, cause: unknown): Promise<void> {
  const errors = Number(run.metadata?._runtime_errors ?? 0) + 1;
  const detail = cause instanceof Error ? cause.message.slice(0, 200) : 'Unexpected workflow runtime error';
  if (errors >= MAX_RUN_RUNTIME_ERRORS) {
    await failRun(db, run, workerId, runtimeError('runtime_error', detail));
    return;
  }
  const resumeAt = new Date(Date.now() + Math.min(60 * 2 ** (errors - 1), 3600) * 1000).toISOString();
  await updateClaimedRun(db, run.id, workerId, {
    status: 'waiting', resume_at: resumeAt, locked_by: null, locked_until: null,
    last_error: runtimeError('runtime_error', detail, 'temporary'),
    metadata: { ...run.metadata, _runtime_errors: errors },
  });
  await writeLog(db, { level: 'warn', code: 'run.waiting', message: 'Workflow run hit a runtime error and will retry', runId: run.id, data: { reason: 'runtime_error', attempts: errors } });
}

export async function processWorkflowTick(options: { db?: WorkflowDb; workerId?: string; limit?: number } = {}): Promise<WorkflowTickResult> {
  const db = options.db ?? createAdminClient();
  const workerId = options.workerId ?? `tick:${randomUUID()}`;
  const limit = options.limit ?? 20;
  const { data: events, error } = await db.rpc('claim_workflow_events', { p_worker: workerId, p_limit: limit, p_lease_seconds: 120 });
  if (error) throw new Error('Could not claim workflow events');
  let failures = 0;
  for (const event of events ?? []) {
    try {
      await processWorkflowEvent(event.id, { db, workerId, execute: true });
    } catch {
      failures += 1;
    }
  }
  let runs = 0;
  try {
    const executed = await claimAndExecuteWorkflowRuns({ db, workerId, limit });
    runs = executed.claimed;
    failures += executed.failed;
  } catch {
    failures += 1;
  }
  return { events: events?.length ?? 0, runs, failures };
}

export async function dryRunWorkflowEvent(
  input: unknown,
  options: { db?: WorkflowDb; workflowId?: string } = {}
): Promise<{ event: WorkflowEvent; workflows: WorkflowPlan[] }> {
  const db = options.db ?? createAdminClient();
  const event = parseWorkflowEvent(input);
  let query = db.from('workflows').select('*').eq('trigger_type', event.type).eq('is_template', false);
  if (options.workflowId) query = query.eq('id', options.workflowId);
  const { data: rows, error } = await query;
  if (error) throw new Error('Could not load workflows for dry run');
  const plans: WorkflowPlan[] = [];
  for (const row of rows ?? []) {
    const workflow = await loadStoredWorkflow(db, row as Record<string, unknown>);
    const values = await loadWorkflowEvaluationContext(db, event, workflow.contractorId);
    plans.push(planWorkflow(workflow, event, values));
  }
  return { event, workflows: plans };
}
