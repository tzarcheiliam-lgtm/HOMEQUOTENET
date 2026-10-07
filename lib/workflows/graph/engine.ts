import { nextRetryAt, type RetryPolicy, type WorkflowActionResult, type WorkflowError } from '../actions';
import { evaluateWorkflowConditions } from '../evaluator';
import { workflowResolver } from '../planner';
import type { WorkflowLogCode } from '../logging';
import { resolveZones } from '@/lib/ai-calling/timezone';
import { nextBusinessWindow } from './business-hours';
import { confirmBooking, resolveCallOutcome, timedOutCallResult, type BookingEvidence, type CallJobFacts, type CallOutcome, type CallResult } from './call-outcomes';
import {
  MAX_NODE_VISITS,
  NODE_CONFIG_SCHEMAS,
  NODE_TYPES,
  nodeDisplayName,
  targetOf,
  triggerOf,
  type GraphNode,
  type WorkflowGraph,
} from './model';
import type { GraphEvaluationContext } from './render';

/**
 * The graph interpreter. PURE: every side effect (database, email, calls, clock)
 * goes through EnginePorts. The same function drives
 *   - real runs      (ports backed by Postgres, executor.server.ts),
 *   - live tests     (same ports; recipients restricted, calls simulated), and
 *   - dry runs       (in-memory ports; nothing is sent or changed),
 * so what a dry run shows is what the engine would actually decide.
 *
 * advanceRun() walks from the trigger following the output handle each finished
 * node recorded, so it is RESTART-SAFE and idempotent: calling it again after a crash,
 * a wake-up or a retry replays finished nodes from their stored results and only
 * executes the node that was in flight. It never sleeps: a wait returns
 * { kind: 'waiting', resumeAt } and the caller persists that instant.
 */

export type StepStatus = 'running' | 'waiting' | 'retry_scheduled' | 'succeeded' | 'failed' | 'skipped' | 'cancelled';

export interface StepRecord {
  id: string;
  nodeId: string;
  status: StepStatus;
  attemptCount: number;
  maxAttempts: number;
  /** Always contains `handle` once the node finished. Ids/codes only — never message bodies or contact details. */
  output: Record<string, unknown> | null;
  resumeAt: Date | null;
  nextRetryAt: Date | null;
  lastError: WorkflowError | null;
  skipReason: string | null;
  idempotencyKey: string;
}

export interface StepPatch {
  status: StepStatus;
  output?: Record<string, unknown> | null;
  resumeAt?: Date | null;
  nextRetryAt?: Date | null;
  lastError?: WorkflowError | null;
  skipReason?: string | null;
  failureKind?: 'temporary' | 'permanent' | null;
}

export type CallRequestResult =
  | { ok: true; jobId: string | null; adopted: boolean; /** live test: the tester-chosen result, no call is placed */ simulated?: CallOutcome; facts?: CallJobFacts }
  | { ok: false; error: WorkflowError };

export interface EventWaitState {
  status: 'open' | 'satisfied' | 'timed_out' | 'cancelled';
  timeoutAt: Date;
}

export interface EnginePorts {
  now(): Date;
  runState(): Promise<'active' | 'cancelled' | 'paused'>;
  /** Fresh facts every time (an estimate may have been accepted while the run waited). */
  loadContext(): Promise<GraphEvaluationContext>;
  /** True once the homeowner opted out (this run, or a recorded opt-out for their number). */
  isContactSuppressed(ctx: GraphEvaluationContext): Promise<{ suppressed: boolean; reason?: string }>;
  markContactSuppressed(reason: string): Promise<void>;
  getStep(nodeId: string): Promise<StepRecord | null>;
  /** Creates the step record, or starts the next attempt of a step that is scheduled for retry. */
  beginStep(node: GraphNode, maxAttempts: number): Promise<StepRecord>;
  updateStep(step: StepRecord, patch: StepPatch): Promise<StepRecord>;
  runAction(node: GraphNode, config: Record<string, unknown>, ctx: GraphEvaluationContext, step: StepRecord): Promise<WorkflowActionResult>;
  call: {
    request(node: GraphNode, config: Record<string, unknown>, ctx: GraphEvaluationContext, step: StepRecord): Promise<CallRequestResult>;
    status(jobId: string): Promise<CallJobFacts | null>;
    /** Is there a real appointment for this call's lead + contractor? (A "booked" claim needs it.) */
    bookingEvidence(jobId: string): Promise<BookingEvidence | null>;
  };
  openEventWait(node: GraphNode, config: Record<string, unknown>, ctx: GraphEvaluationContext, timeoutAt: Date): Promise<void>;
  getEventWait(nodeId: string): Promise<EventWaitState | null>;
  resolveEventWait(nodeId: string, status: 'satisfied' | 'timed_out'): Promise<void>;
  setCurrent(nodeId: string): Promise<void>;
  log(level: 'info' | 'warn' | 'error', code: WorkflowLogCode, message: string, data?: Record<string, unknown>): Promise<void>;
}

export type Disposition =
  | { kind: 'completed'; reason?: string }
  | { kind: 'waiting'; resumeAt: Date; why: 'wait' | 'retry' | 'call' | 'event'; nodeId: string }
  | { kind: 'failed'; error: WorkflowError; nodeId?: string }
  | { kind: 'cancelled' }
  | { kind: 'parked' };

export interface AdvanceOptions {
  /** Absolute end of the run's lifetime. */
  deadline: Date;
  maxVisits?: number;
  retry?: Partial<RetryPolicy>;
}

const wfError = (code: string, message: string, kind: 'temporary' | 'permanent' = 'permanent', details?: WorkflowError['details']): WorkflowError => ({
  code, message, kind, retryable: kind === 'temporary', ...(details ? { details } : {}),
});

const RETRY: RetryPolicy = { maxAttempts: 5, baseDelaySeconds: 60, maxDelaySeconds: 3600 };

export async function advanceRun(graph: WorkflowGraph, ports: EnginePorts, opts: AdvanceOptions): Promise<Disposition> {
  const trigger = triggerOf(graph);
  if (!trigger) return { kind: 'failed', error: wfError('invalid_definition', 'The workflow has no trigger') };
  let current: GraphNode | null = targetOf(graph, trigger.node.id, 'next');
  let visits = 0;
  const maxVisits = opts.maxVisits ?? MAX_NODE_VISITS;

  while (current) {
    visits += 1;
    if (visits > maxVisits) return { kind: 'failed', error: wfError('step_limit', `The run visited more than ${maxVisits} steps`), nodeId: current.id };
    const state = await ports.runState();
    if (state === 'cancelled') return { kind: 'cancelled' };
    if (state === 'paused') return { kind: 'parked' };
    if (ports.now().getTime() > opts.deadline.getTime()) {
      return { kind: 'failed', error: wfError('run_expired', 'The run reached its maximum lifetime'), nodeId: current.id };
    }

    const node: GraphNode = current;
    const existing = await ports.getStep(node.id);

    // Replay: a finished node is never executed twice; its recorded handle decides the path.
    if (existing && (existing.status === 'succeeded' || existing.status === 'skipped')) {
      if (node.type === 'end') return { kind: 'completed', reason: typeof existing.output?.reason === 'string' ? existing.output.reason : undefined };
      // `handle: null` means "the run ended here" (a step that finished the workflow).
      const handle = existing.output && 'handle' in existing.output ? existing.output.handle : 'next';
      if (handle === null) return { kind: 'completed', reason: typeof existing.output?.reason === 'string' ? existing.output.reason : undefined };
      current = targetOf(graph, node.id, String(handle));
      continue;
    }
    if (existing && (existing.status === 'failed' || existing.status === 'cancelled')) {
      return { kind: 'failed', error: existing.lastError ?? wfError('step_failed', `${nodeDisplayName(node)} failed`), nodeId: node.id };
    }

    await ports.setCurrent(node.id);
    const outcome = await runNode(graph, node, existing, ports, opts);
    if (outcome.kind === 'next') {
      if (node.type === 'end') return { kind: 'completed', reason: outcome.reason };
      current = targetOf(graph, node.id, outcome.handle);
      continue;
    }
    return outcome.disposition;
  }
  return { kind: 'completed' };
}

type NodeOutcome = { kind: 'next'; handle: string; reason?: string } | { kind: 'stop'; disposition: Disposition };
const next = (handle = 'next', reason?: string): NodeOutcome => ({ kind: 'next', handle, reason });
const stop = (disposition: Disposition): NodeOutcome => ({ kind: 'stop', disposition });

async function runNode(graph: WorkflowGraph, node: GraphNode, existing: StepRecord | null, ports: EnginePorts, opts: AdvanceOptions): Promise<NodeOutcome> {
  const parsed = NODE_CONFIG_SCHEMAS[node.type].safeParse(node.config);
  if (!parsed.success) {
    return stop({ kind: 'failed', nodeId: node.id, error: wfError('invalid_config', `${nodeDisplayName(node)} has invalid settings`) });
  }
  const config = parsed.data as Record<string, unknown>;
  const def = NODE_TYPES[node.type];
  if (def.availability !== 'ready') {
    return stop({ kind: 'failed', nodeId: node.id, error: wfError('step_unavailable', `${def.label} is not available`) });
  }

  switch (node.type) {
    case 'end': {
      const step = existing ?? (await ports.beginStep(node, 1));
      const reason = typeof config.reason === 'string' ? config.reason : undefined;
      await ports.updateStep(step, { status: 'succeeded', output: { handle: null, ...(reason ? { reason } : {}) } });
      return next('next', reason);
    }
    case 'condition':
      return runCondition(node, config, existing, ports);
    case 'wait_duration':
    case 'wait_business_hours':
      return runTimedWait(node, config, existing, ports);
    case 'wait_event':
      return runEventWait(node, config, existing, ports);
    case 'ai_call':
      return runCall(node, config, existing, ports, opts);
    default:
      return runAction(node, config, existing, ports, opts);
  }
}

// --------------------------------------------------------------------------------------
async function runCondition(node: GraphNode, config: Record<string, unknown>, existing: StepRecord | null, ports: EnginePorts): Promise<NodeOutcome> {
  const step = existing ?? (await ports.beginStep(node, 1));
  const ctx = await ports.loadContext();
  const resolve = workflowResolver(ctx);
  const branches = config.branches as { id: string; label: string; conditions: Parameters<typeof evaluateWorkflowConditions>[0] }[];
  const results: Record<string, boolean> = {};
  let taken = 'else';
  for (const b of branches) {
    const matched = evaluateWorkflowConditions(b.conditions, resolve).matched;
    results[b.id] = matched;
    if (matched && taken === 'else') taken = b.id;
  }
  await ports.updateStep(step, { status: 'succeeded', output: { handle: taken, branches: results } });
  await ports.log('info', 'node.branch_taken', 'Condition branch taken', { node_id: node.id, branch: taken });
  return next(taken);
}

// --------------------------------------------------------------------------------------
async function runTimedWait(node: GraphNode, config: Record<string, unknown>, existing: StepRecord | null, ports: EnginePorts): Promise<NodeOutcome> {
  const now = ports.now();
  if (existing?.status === 'waiting' && existing.resumeAt) {
    if (existing.resumeAt.getTime() > now.getTime()) {
      return stop({ kind: 'waiting', resumeAt: existing.resumeAt, why: 'wait', nodeId: node.id });
    }
    await ports.updateStep(existing, { status: 'succeeded', output: { handle: 'next', resumedAt: now.toISOString() } });
    return next();
  }
  const step = existing ?? (await ports.beginStep(node, 1));
  const ctx = await ports.loadContext();
  let resumeAt: Date | null = null;
  let detail: Record<string, unknown> = {};

  if (node.type === 'wait_duration') {
    if (config.mode === 'before_appointment') {
      const at = typeof ctx.appointment?.scheduled_at === 'string' ? Date.parse(ctx.appointment.scheduled_at) : NaN;
      if (Number.isNaN(at)) {
        await ports.updateStep(step, { status: 'skipped', skipReason: 'anchor_missing', output: { handle: 'next' } });
        return next();
      }
      resumeAt = new Date(at - Number(config.hoursBefore) * 3_600_000);
      if (resumeAt.getTime() <= now.getTime()) {
        if (config.ifPast === 'end') {
          await ports.updateStep(step, { status: 'skipped', skipReason: 'anchor_past', output: { handle: 'next', reason: 'appointment_too_soon' } });
          return stop({ kind: 'completed', reason: 'The appointment is too close for this step' });
        }
        resumeAt = null;
      }
    } else {
      const unit = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 }[config.unit as 'minutes' | 'hours' | 'days'];
      resumeAt = new Date(now.getTime() + Number(config.amount) * unit);
    }
  } else {
    const zones = resolveZones({ state: asString(ctx.lead?.state), zip: asString(ctx.lead?.zip) });
    const window = nextBusinessWindow(now, config as never, zones);
    if (!window) {
      await ports.updateStep(step, { status: 'failed', lastError: wfError('no_business_window', 'No business-hours window within 15 days'), failureKind: 'permanent' });
      return stop({ kind: 'failed', nodeId: node.id, error: wfError('no_business_window', 'No business-hours window within 15 days') });
    }
    resumeAt = window.resumeAt;
    detail = { zones: window.zones, usedFallbackZone: window.usedFallbackZone };
  }

  if (!resumeAt || resumeAt.getTime() <= now.getTime()) {
    await ports.updateStep(step, { status: 'succeeded', output: { handle: 'next', ...detail } });
    return next();
  }
  await ports.updateStep(step, { status: 'waiting', resumeAt, output: { handle: 'next', ...detail } });
  await ports.log('info', 'step.waiting', 'Workflow step is waiting', { node_id: node.id });
  return stop({ kind: 'waiting', resumeAt, why: 'wait', nodeId: node.id });
}

// --------------------------------------------------------------------------------------
async function runEventWait(node: GraphNode, config: Record<string, unknown>, existing: StepRecord | null, ports: EnginePorts): Promise<NodeOutcome> {
  const now = ports.now();
  if (existing?.status === 'waiting') {
    const wait = await ports.getEventWait(node.id);
    if (wait?.status === 'satisfied') {
      await ports.updateStep(existing, { status: 'succeeded', output: { handle: 'received' } });
      await ports.log('info', 'wait.satisfied', 'Waited-for event happened', { node_id: node.id });
      return next('received');
    }
    const timeoutAt = wait?.timeoutAt ?? existing.resumeAt ?? now;
    if (wait?.status === 'timed_out' || timeoutAt.getTime() <= now.getTime()) {
      await ports.resolveEventWait(node.id, 'timed_out');
      await ports.updateStep(existing, { status: 'succeeded', output: { handle: 'timed_out' } });
      await ports.log('info', 'wait.timed_out', 'Wait timed out', { node_id: node.id });
      return next('timed_out');
    }
    return stop({ kind: 'waiting', resumeAt: timeoutAt, why: 'event', nodeId: node.id });
  }
  const step = existing ?? (await ports.beginStep(node, 1));
  const ctx = await ports.loadContext();
  const timeoutAt = new Date(now.getTime() + Number(config.timeoutMinutes) * 60_000);
  await ports.openEventWait(node, config, ctx, timeoutAt);
  await ports.updateStep(step, { status: 'waiting', resumeAt: timeoutAt, output: { handle: null, event: config.event } });
  await ports.log('info', 'step.waiting', 'Workflow step is waiting for an event', { node_id: node.id, event: String(config.event) });
  return stop({ kind: 'waiting', resumeAt: timeoutAt, why: 'event', nodeId: node.id });
}

// --------------------------------------------------------------------------------------
async function runCall(node: GraphNode, config: Record<string, unknown>, existing: StepRecord | null, ports: EnginePorts, opts: AdvanceOptions): Promise<NodeOutcome> {
  const now = ports.now();
  let step = existing;
  const timeoutMs = Number(config.resultTimeoutMinutes) * 60_000;

  if (!step || step.status === 'retry_scheduled' || step.status === 'running') {
    if (step?.status === 'retry_scheduled' && step.nextRetryAt && step.nextRetryAt.getTime() > now.getTime()) {
      return stop({ kind: 'waiting', resumeAt: step.nextRetryAt, why: 'retry', nodeId: node.id });
    }
    step = await ports.beginStep(node, NODE_TYPES.ai_call.maxAttempts);
    const ctx = await ports.loadContext();
    const suppression = await ports.isContactSuppressed(ctx);
    if (suppression.suppressed) {
      await ports.updateStep(step, { status: 'succeeded', skipReason: 'contact_suppressed', output: { handle: 'opted_out', outcome: 'opted_out', reason: 'contact_suppressed', executionStatus: 'not_placed' } });
      await ports.log('info', 'run.suppressed', 'Call skipped because the homeowner opted out', { node_id: node.id });
      return next('opted_out');
    }
    const request = await ports.call.request(node, config, ctx, step);
    if (!request.ok) {
      const e = request.error;
      if (e.kind === 'temporary') {
        const retryAt = nextRetryAt(step.attemptCount, now, { ...RETRY, ...opts.retry, maxAttempts: step.maxAttempts });
        if (retryAt) {
          await ports.updateStep(step, { status: 'retry_scheduled', lastError: e, nextRetryAt: retryAt, failureKind: 'temporary' });
          await ports.log('warn', 'step.retry_scheduled', 'Call request scheduled for retry', { node_id: node.id, error_code: e.code });
          return stop({ kind: 'waiting', resumeAt: retryAt, why: 'retry', nodeId: node.id });
        }
      }
      // The call could not even be requested: that is the "Call failed" path, not a crashed workflow.
      await ports.updateStep(step, { status: 'succeeded', lastError: e, output: { handle: 'failed', outcome: 'failed', reason: e.code, executionStatus: 'not_placed' } });
      await ports.log('warn', 'call.outcome', 'Call could not be requested', { node_id: node.id, error_code: e.code });
      return next('failed');
    }
    if (request.simulated) {
      await ports.updateStep(step, { status: 'succeeded', output: { handle: request.simulated, outcome: request.simulated, executionStatus: 'simulated', reason: 'simulated', simulated: true } });
      return next(request.simulated);
    }
    await ports.log('info', request.adopted ? 'call.adopted' : 'call.requested', request.adopted ? 'Reusing an existing AI call for this lead' : 'AI call requested', { node_id: node.id, call_job_id: request.jobId });
    const timeoutAt = new Date(now.getTime() + timeoutMs);
    step = await ports.updateStep(step, { status: 'waiting', resumeAt: timeoutAt, output: { handle: null, jobId: request.jobId, adopted: request.adopted } });
  }

  if (step.status !== 'waiting') return stop({ kind: 'failed', nodeId: node.id, error: wfError('unexpected_state', 'The call step is in an unexpected state') });
  const jobId = typeof step.output?.jobId === 'string' ? step.output.jobId : null;
  const timeoutAt = step.resumeAt ?? new Date(now.getTime() + timeoutMs);
  const facts = jobId ? await ports.call.status(jobId) : null;
  let resolution = facts ? resolveCallOutcome(facts, { now, analysisGraceMinutes: Number(config.analysisGraceMinutes) }) : null;
  if (facts && jobId && resolution?.state === 'final' && resolution.result.outcome === 'booked') {
    // The agent's claim is not a booking: require a matching appointment record (or wait for it, then human review).
    const evidence = await ports.call.bookingEvidence(jobId);
    resolution = confirmBooking(resolution.result, evidence, { now, graceMinutes: Number(config.analysisGraceMinutes), endedAt: facts.conversation_ended_at ?? facts.updated_at ?? null });
  }

  const finish = async (result: CallResult): Promise<NodeOutcome> => {
    await ports.updateStep(step!, {
      status: 'succeeded',
      output: {
        handle: result.outcome, outcome: result.outcome, executionStatus: result.executionStatus, reason: result.reason,
        attempts: result.attempts, jobId, adopted: step!.output?.adopted ?? false, callbackAt: result.callbackAt,
        ...(result.appointmentId ? { appointmentId: result.appointmentId } : {}),
      },
    });
    await ports.log('info', 'call.outcome', 'AI call result recorded', { node_id: node.id, outcome: result.outcome, execution_status: result.executionStatus });
    // Close the durable wait record (result arrived, or we gave up waiting).
    await ports.resolveEventWait(node.id, result.outcome === 'timed_out' ? 'timed_out' : 'satisfied');
    if (result.outcome === 'opted_out') await ports.markContactSuppressed('call_outcome_opted_out');
    return next(result.outcome);
  };

  if (resolution?.state === 'final') return finish(resolution.result);
  if (now.getTime() >= timeoutAt.getTime()) {
    // No webhook arrived in time: never wait forever.
    await ports.log('warn', 'wait.timed_out', 'Call result timed out', { node_id: node.id });
    return finish(timedOutCallResult(facts, 'result_timeout'));
  }
  if (!facts && jobId) {
    return finish({ ...timedOutCallResult(null, 'call_record_missing'), outcome: 'failed', executionStatus: 'unknown' });
  }
  const wakeAt = resolution?.state === 'pending' && resolution.recheckAt && resolution.recheckAt < timeoutAt ? resolution.recheckAt : timeoutAt;
  return stop({ kind: 'waiting', resumeAt: wakeAt, why: 'call', nodeId: node.id });
}

// --------------------------------------------------------------------------------------
async function runAction(node: GraphNode, config: Record<string, unknown>, existing: StepRecord | null, ports: EnginePorts, opts: AdvanceOptions): Promise<NodeOutcome> {
  const now = ports.now();
  const def = NODE_TYPES[node.type];
  if (existing?.status === 'retry_scheduled' && existing.nextRetryAt && existing.nextRetryAt.getTime() > now.getTime()) {
    return stop({ kind: 'waiting', resumeAt: existing.nextRetryAt, why: 'retry', nodeId: node.id });
  }
  const step = await ports.beginStep(node, def.maxAttempts);
  const ctx = await ports.loadContext();

  if (def.contactsHomeowner) {
    const suppression = await ports.isContactSuppressed(ctx);
    if (suppression.suppressed) {
      await ports.updateStep(step, { status: 'skipped', skipReason: 'contact_suppressed', output: { handle: 'next' } });
      await ports.log('info', 'run.suppressed', 'Step skipped because the homeowner opted out', { node_id: node.id });
      return next();
    }
  }

  await ports.log('info', 'step.started', 'Workflow step started', { node_id: node.id, node_type: node.type });
  const result = await ports.runAction(node, config, ctx, step);
  switch (result.outcome) {
    case 'success':
      await ports.updateStep(step, { status: 'succeeded', output: { handle: 'next', ...(result.output ?? {}) } });
      await ports.log('info', 'step.succeeded', 'Workflow step succeeded', { node_id: node.id });
      return next();
    case 'skipped':
      await ports.updateStep(step, { status: 'skipped', skipReason: result.reason, output: { handle: 'next' } });
      await ports.log('info', 'step.skipped', 'Workflow step skipped', { node_id: node.id, reason: result.reason });
      return next();
    case 'temporary_failure': {
      const retryAt = nextRetryAt(step.attemptCount, now, { ...RETRY, ...opts.retry, maxAttempts: step.maxAttempts }, result.retryAfterSeconds);
      if (retryAt) {
        await ports.updateStep(step, { status: 'retry_scheduled', lastError: result.error, nextRetryAt: retryAt, failureKind: 'temporary' });
        await ports.log('warn', 'step.retry_scheduled', 'Workflow step scheduled for retry', { node_id: node.id, error_code: result.error.code });
        return stop({ kind: 'waiting', resumeAt: retryAt, why: 'retry', nodeId: node.id });
      }
      return failStep(node, step, config, wfError(result.error.code, result.error.message, 'permanent'), ports);
    }
    case 'permanent_failure':
      return failStep(node, step, config, result.error, ports);
  }
}

async function failStep(node: GraphNode, step: StepRecord, config: Record<string, unknown>, error: WorkflowError, ports: EnginePorts): Promise<NodeOutcome> {
  if (config.onError === 'continue') {
    // The builder chose to keep going: record the error on a skipped step and follow the normal output.
    await ports.updateStep(step, { status: 'skipped', skipReason: `error_continued:${error.code}`, lastError: error, output: { handle: 'next' } });
    await ports.log('warn', 'step.skipped', 'Workflow step failed; continuing as configured', { node_id: node.id, error_code: error.code });
    return next();
  }
  await ports.updateStep(step, { status: 'failed', lastError: error, failureKind: 'permanent' });
  await ports.log('error', 'step.failed', error.message, { node_id: node.id, error_code: error.code });
  return stop({ kind: 'failed', error, nodeId: node.id });
}

const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null);
