import type { WorkflowActionResult } from '../actions';
import { validPhone } from '@/lib/ai-calling/eligibility';
import { resolveZones } from '@/lib/ai-calling/timezone';
import { advanceRun, type CallRequestResult, type Disposition, type EnginePorts, type EventWaitState, type StepPatch, type StepRecord } from './engine';
import type { CallOutcome } from './call-outcomes';
import { nodeDisplayName, type GraphNode, type WorkflowGraph } from './model';
import { buildCallBrief, previewTemplate, type GraphEvaluationContext } from './render';

/**
 * In-memory EnginePorts. Used for dry runs (the "Test" panel) and for the engine's
 * unit tests. Nothing is sent, called or written: actions return a rendered
 * preview, the clock is virtual, and real customer records are only ever READ.
 */

export interface DryRunScenario {
  /** What each call step "returns". Default: `defaultCallOutcome`. */
  callOutcomes?: Record<string, CallOutcome>;
  defaultCallOutcome?: CallOutcome;
  /** For "wait for something to happen" steps: it happens (default) or the wait times out. */
  eventWaits?: Record<string, 'received' | 'timeout'>;
  /** Saved email templates (id -> text) so previews show real wording. */
  emailTemplates?: Record<string, { subject: string; body: string; name?: string }>;
  /** Pretend the homeowner has already opted out. */
  optedOut?: boolean;
  startAt?: Date;
}

export interface DryRunStep {
  nodeId: string;
  name: string;
  type: GraphNode['type'];
  status: StepRecord['status'];
  /** Output taken (branch / outcome), or null. */
  handle: string | null;
  /** Virtual time the step started. */
  at: string;
  waitUntil?: string;
  skipReason?: string;
  /** What would be sent / written. Never persisted. */
  preview?: Record<string, unknown>;
  /** Things that would block or degrade the real run (missing consent, unknown time zone...). */
  warnings: string[];
}

export interface DryRunResult {
  steps: DryRunStep[];
  path: string[];
  disposition: Disposition['kind'];
  failure?: string;
  endedAt: string;
  /** Always true: nothing was sent or changed. */
  dryRun: true;
}

export class MemoryPorts implements EnginePorts {
  steps = new Map<string, StepRecord>();
  waits = new Map<string, EventWaitState>();
  suppressed = false;
  state: 'active' | 'cancelled' | 'paused' = 'active';
  clock: Date;
  trace: DryRunStep[] = [];
  logs: { code: string; data?: Record<string, unknown> }[] = [];
  currentNode: string | null = null;
  private seq = 0;
  /** Hooks for tests / dry runs. */
  actionHandler: (node: GraphNode, config: Record<string, unknown>, ctx: GraphEvaluationContext, step: StepRecord) => Promise<WorkflowActionResult> | WorkflowActionResult = () => ({ outcome: 'success' });
  callHandler: (node: GraphNode, config: Record<string, unknown>, ctx: GraphEvaluationContext, step: StepRecord) => Promise<CallRequestResult> | CallRequestResult = () => ({ ok: true, jobId: 'job-1', adopted: false, simulated: 'booked' });
  callStatuses: Record<string, import('./call-outcomes').CallJobFacts | null> = {};
  contextFactory: () => GraphEvaluationContext;
  nodes = new Map<string, GraphNode>();

  constructor(context: GraphEvaluationContext | (() => GraphEvaluationContext), start = new Date()) {
    this.contextFactory = typeof context === 'function' ? context : () => context;
    this.clock = start;
  }
  now() { return this.clock; }
  async runState() { return this.state; }
  async loadContext() {
    const ctx = this.contextFactory();
    // The most recent finished call step feeds `call.*` conditions.
    const last = [...this.steps.values()].filter((s) => s.output && 'outcome' in s.output && s.status === 'succeeded').pop();
    return last ? { ...ctx, call: { outcome: last.output!.outcome, execution_status: last.output!.executionStatus, attempts: last.output!.attempts ?? 0 } } : ctx;
  }
  async isContactSuppressed() { return this.suppressed ? { suppressed: true, reason: 'opted_out' } : { suppressed: false }; }
  async markContactSuppressed() { this.suppressed = true; }
  async getStep(nodeId: string) { return this.steps.get(nodeId) ?? null; }
  async beginStep(node: GraphNode, maxAttempts: number) {
    this.nodes.set(node.id, node);
    const existing = this.steps.get(node.id);
    if (existing) {
      if (existing.status === 'retry_scheduled') {
        const next = { ...existing, status: 'running' as const, attemptCount: existing.attemptCount + 1, nextRetryAt: null };
        this.steps.set(node.id, next);
        return next;
      }
      return existing;
    }
    this.seq += 1;
    const created: StepRecord = {
      id: `step-${this.seq}`, nodeId: node.id, status: 'running', attemptCount: 1, maxAttempts, output: null, resumeAt: null,
      nextRetryAt: null, lastError: null, skipReason: null, idempotencyKey: `memory:${node.id}:0`,
    };
    this.steps.set(node.id, created);
    return created;
  }
  async updateStep(step: StepRecord, patch: StepPatch) {
    const next: StepRecord = {
      ...step,
      status: patch.status,
      output: patch.output !== undefined ? patch.output : step.output,
      resumeAt: patch.resumeAt !== undefined ? patch.resumeAt : step.resumeAt,
      nextRetryAt: patch.nextRetryAt !== undefined ? patch.nextRetryAt : step.nextRetryAt,
      lastError: patch.lastError !== undefined ? patch.lastError : step.lastError,
      skipReason: patch.skipReason !== undefined ? patch.skipReason : step.skipReason,
    };
    this.steps.set(step.nodeId, next);
    return next;
  }
  async runAction(node: GraphNode, config: Record<string, unknown>, ctx: GraphEvaluationContext, step: StepRecord) {
    return this.actionHandler(node, config, ctx, step);
  }
  call = {
    request: async (node: GraphNode, config: Record<string, unknown>, ctx: GraphEvaluationContext, step: StepRecord) => this.callHandler(node, config, ctx, step),
    status: async (jobId: string) => this.callStatuses[jobId] ?? null,
  };
  async openEventWait(node: GraphNode, config: Record<string, unknown>, _ctx: GraphEvaluationContext, timeoutAt: Date) {
    this.waits.set(node.id, { status: 'open', timeoutAt });
  }
  async getEventWait(nodeId: string) { return this.waits.get(nodeId) ?? null; }
  async resolveEventWait(nodeId: string, status: 'satisfied' | 'timed_out') {
    const w = this.waits.get(nodeId);
    if (w) this.waits.set(nodeId, { ...w, status });
  }
  async setCurrent(nodeId: string) { this.currentNode = nodeId; }
  async log(_level: 'info' | 'warn' | 'error', code: string, _message: string, data?: Record<string, unknown>) { this.logs.push({ code, data }); }
}

const asString = (v: unknown) => (typeof v === 'string' ? v : null);

/** Runs the real engine against in-memory ports with a virtual clock. */
export async function dryRunGraph(
  graph: WorkflowGraph,
  baseContext: GraphEvaluationContext,
  scenario: DryRunScenario = {},
  system: { phone?: string; siteUrl?: string } = {}
): Promise<DryRunResult> {
  const start = scenario.startAt ?? new Date();
  const ports = new MemoryPorts(baseContext, start);
  ports.suppressed = !!scenario.optedOut;
  const recorded = new Map<string, DryRunStep>();
  const order: DryRunStep[] = [];
  const note = (node: GraphNode, preview: Record<string, unknown> | undefined, warnings: string[]) => {
    const row: DryRunStep = { nodeId: node.id, name: nodeDisplayName(node), type: node.type, status: 'running', handle: null, at: ports.clock.toISOString(), preview, warnings };
    recorded.set(node.id, row);
    order.push(row);
  };

  ports.actionHandler = (node, config, ctx) => {
    const warnings: string[] = [];
    let preview: Record<string, unknown> = {};
    switch (node.type) {
      case 'send_email': {
        const tpl = typeof config.templateId === 'string' ? scenario.emailTemplates?.[config.templateId] : undefined;
        const subject = previewTemplate(tpl?.subject ?? String(config.subject ?? ''), ctx, system);
        const body = previewTemplate(tpl?.body ?? String(config.body ?? ''), ctx, system);
        const to = (config.to as { kind: string }).kind === 'lead' ? asString(ctx.lead?.email) ? 'the homeowner' : null : 'saved recipients';
        if (!to) warnings.push('The lead has no email address, so this step would be skipped.');
        if ((config.to as { kind: string }).kind === 'lead' && ctx.lead?.consent_granted !== true) warnings.push('No recorded consent: this email would be skipped.');
        if (config.templateId && !tpl) warnings.push('Template text is not available in this preview; showing nothing for it.');
        warnings.push(...[...new Set([...subject.missing, ...body.missing])].map((m) => `{{${m}}} has no value for this lead.`));
        preview = { to: to ?? 'nobody (no email on file)', subject: subject.text, body: body.text, template: tpl?.name ?? null };
        break;
      }
      case 'create_task': {
        const title = previewTemplate(String(config.title), ctx, system);
        const desc = config.description ? previewTemplate(String(config.description), ctx, system) : null;
        warnings.push(...title.missing.map((m) => `{{${m}}} has no value for this lead.`));
        preview = { title: title.text, description: desc?.text ?? null, dueAt: config.dueInMinutes !== undefined ? new Date(ports.clock.getTime() + Number(config.dueInMinutes) * 60_000).toISOString() : null, assignee: (config.assignee as { kind: string } | undefined)?.kind ?? 'unassigned' };
        break;
      }
      case 'add_note': {
        const body = previewTemplate(String(config.body), ctx, system);
        warnings.push(...body.missing.map((m) => `{{${m}}} has no value for this lead.`));
        preview = { note: body.text };
        break;
      }
      case 'update_lead_status':
        preview = { pipeline: config.pipeline, from: asString((config.pipeline === 'lead' ? ctx.lead : ctx.assignment)?.status), to: config.status };
        break;
      case 'assign_lead':
        preview = { strategy: config.strategy, candidates: (config.userIds as string[]).length };
        break;
      case 'send_notification':
        preview = { audience: config.audience, title: config.title, body: config.body };
        break;
      default:
        preview = {};
    }
    note(node, preview, warnings);
    return { outcome: 'success' as const, output: { dryRun: true } };
  };

  ports.callHandler = (node, config, ctx) => {
    const warnings: string[] = [];
    const brief = buildCallBrief(config as never, ctx, system);
    if (!validPhone(asString(ctx.lead?.phone_e164))) warnings.push('The lead has no valid North-American phone number: the call would be blocked.');
    if (ctx.lead?.consent_granted !== true) warnings.push('No recorded consent: the call would be blocked.');
    else if (!/\bcall/i.test(asString(ctx.lead?.consent_disclosure) ?? '')) warnings.push('The lead\'s consent wording does not mention calls: the call would be blocked.');
    if (!resolveZones({ state: asString(ctx.lead?.state), zip: asString(ctx.lead?.zip) })) warnings.push('The lead\'s time zone is unknown (no state / supported ZIP): the call would be held for review.');
    warnings.push(...brief.missing.map((m) => `${m} is missing, so it is left out of the call brief.`));
    const outcome = scenario.callOutcomes?.[node.id] ?? scenario.defaultCallOutcome ?? 'booked';
    note(node, { purpose: brief.purpose, context: brief.context, maxAttempts: config.maxAttempts, simulatedResult: outcome }, warnings);
    return { ok: true, jobId: null, adopted: false, simulated: outcome };
  };

  const deadline = new Date(start.getTime() + (graph.settings.runLifetimeDays + 1) * 86_400_000);
  const original = ports.updateStep.bind(ports);
  ports.updateStep = async (step, patch) => {
    const next = await original(step, patch);
    const node = ports.nodes.get(step.nodeId);
    let row = recorded.get(step.nodeId);
    if (!row && node) {
      note(node, undefined, []);
      row = recorded.get(step.nodeId);
    }
    if (row) {
      row.status = patch.status;
      row.handle = typeof next.output?.handle === 'string' ? next.output.handle : null;
      if (patch.resumeAt) row.waitUntil = patch.resumeAt.toISOString();
      if (patch.skipReason) row.skipReason = patch.skipReason;
      if (patch.status === 'skipped' && patch.skipReason === 'contact_suppressed') row.warnings.push('The homeowner opted out, so contact steps are skipped.');
    }
    return next;
  };

  let disposition: Disposition = { kind: 'completed' };
  for (let i = 0; i < 200; i += 1) {
    disposition = await advanceRun(graph, ports, { deadline });
    if (disposition.kind !== 'waiting') break;
    const waitNode = ports.nodes.get(disposition.nodeId);
    if (waitNode?.type === 'wait_event' && (scenario.eventWaits?.[waitNode.id] ?? 'received') === 'received') {
      await ports.resolveEventWait(waitNode.id, 'satisfied');
    } else if (disposition.resumeAt.getTime() > ports.clock.getTime()) {
      ports.clock = disposition.resumeAt;
    }
    // A step that is retried leaves its row in 'retry_scheduled'; the next pass re-runs it.
    if (disposition.why === 'retry') ports.clock = new Date(Math.max(ports.clock.getTime(), disposition.resumeAt.getTime()));
  }

  return {
    steps: order,
    path: order.map((r) => r.nodeId),
    disposition: disposition.kind,
    ...(disposition.kind === 'failed' ? { failure: disposition.error.message } : {}),
    endedAt: ports.clock.toISOString(),
    dryRun: true,
  };
}
