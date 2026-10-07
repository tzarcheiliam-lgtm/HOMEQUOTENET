import { describe, expect, it } from 'vitest';
import {
  GRAPH_TEMPLATES, MemoryPorts, addNodeAfter, advanceRun, dryRunGraph, emptyGraph, sampleContext, updateNode, connect,
  type WorkflowGraph, type GraphEvaluationContext,
} from '@/lib/workflows/graph';

const T0 = new Date('2026-10-07T17:00:00Z'); // Wed 10:00 PT
const deadline = (days = 30) => new Date(T0.getTime() + days * 86_400_000);
const ctx = (over: Partial<GraphEvaluationContext> = {}): GraphEvaluationContext => ({ ...sampleContext(), ...over });

/** Builds trigger -> n1 -> n2 ... from [type, config] pairs, each wired to the previous `next` handle. */
function chain(steps: [Parameters<typeof addNodeAfter>[3], Record<string, unknown>?][]): WorkflowGraph {
  let g = emptyGraph('lead.assigned');
  let prev = 'trigger';
  for (const [type, config] of steps) {
    const r = addNodeAfter(g, prev, 'next', type);
    const merged = { ...r.graph.nodes.find((n) => n.id === r.nodeId)!.config, ...config };
    // A config for a wait that switches mode replaces the defaults entirely.
    const final = type === 'wait_duration' && config?.mode ? { ...config } : merged;
    g = config ? updateNode(r.graph, r.nodeId, { config: final }) : r.graph;
    prev = r.nodeId;
  }
  return g;
}

describe('engine: sequencing, replay and idempotency', () => {
  it('runs steps in order and completes', async () => {
    const g = chain([['add_note'], ['create_task'], ['end']]);
    const ports = new MemoryPorts(ctx(), T0);
    const done: string[] = [];
    ports.actionHandler = (node) => { done.push(node.id); return { outcome: 'success' }; };
    const d = await advanceRun(g, ports, { deadline: deadline() });
    expect(d.kind).toBe('completed');
    expect(done).toEqual(['add_note_1', 'create_task_1']);
  });

  it('never executes a finished step twice when the run is replayed (restart / duplicate wake-up)', async () => {
    const g = chain([['send_email'], ['wait_duration', { mode: 'duration', amount: 1, unit: 'days' }], ['add_note']]);
    const ports = new MemoryPorts(ctx(), T0);
    let emails = 0;
    ports.actionHandler = (node) => { if (node.type === 'send_email') emails += 1; return { outcome: 'success' }; };
    const first = await advanceRun(g, ports, { deadline: deadline() });
    expect(first).toMatchObject({ kind: 'waiting', why: 'wait' });
    // A second worker picks the run up early and again after the wait: the email is not resent.
    expect((await advanceRun(g, ports, { deadline: deadline() })).kind).toBe('waiting');
    ports.clock = new Date(T0.getTime() + 25 * 3_600_000);
    expect((await advanceRun(g, ports, { deadline: deadline() })).kind).toBe('completed');
    expect((await advanceRun(g, ports, { deadline: deadline() })).kind).toBe('completed');
    expect(emails).toBe(1);
  });

  it('waits are persisted as absolute instants, so a fresh worker resumes from stored state alone', async () => {
    const g = chain([['wait_duration', { mode: 'duration', amount: 2, unit: 'hours' }], ['add_note']]);
    const ports = new MemoryPorts(ctx(), T0);
    const d = await advanceRun(g, ports, { deadline: deadline() });
    expect(d).toMatchObject({ kind: 'waiting' });
    expect((d as { resumeAt: Date }).resumeAt.toISOString()).toBe('2026-10-07T19:00:00.000Z');
    expect(ports.steps.get('wait_duration_1')).toMatchObject({ status: 'waiting' });
  });

  it('a wait before the appointment skips or ends when the moment has passed', async () => {
    const soon = ctx({ appointment: { scheduled_at: new Date(T0.getTime() + 3_600_000).toISOString(), status: 'scheduled' } });
    const ends = chain([['wait_duration', { mode: 'before_appointment', hoursBefore: 24, ifPast: 'end' }], ['add_note']]);
    const p1 = new MemoryPorts(soon, T0);
    expect(await advanceRun(ends, p1, { deadline: deadline() })).toMatchObject({ kind: 'completed' });
    expect(p1.steps.has('add_note_1')).toBe(false);
    const goes = chain([['wait_duration', { mode: 'before_appointment', hoursBefore: 24, ifPast: 'continue' }], ['add_note']]);
    const p2 = new MemoryPorts(soon, T0);
    expect((await advanceRun(goes, p2, { deadline: deadline() })).kind).toBe('completed');
    expect(p2.steps.get('add_note_1')?.status).toBe('succeeded');
  });
});

describe('engine: conditions', () => {
  function branching(): WorkflowGraph {
    let g = chain([['condition']]);
    g = updateNode(g, 'condition_1', { config: { branches: [
      { id: 'in_austin', label: 'Austin', conditions: { match: 'all', conditions: [{ field: 'lead.city', operator: 'equals', value: 'Austin' }] } },
      { id: 'has_zip', label: 'Has ZIP', conditions: { match: 'all', conditions: [{ field: 'lead.zip', operator: 'exists' }] } }] } });
    g = addNodeAfter(g, 'condition_1', 'in_austin', 'add_note').graph;
    g = addNodeAfter(g, 'condition_1', 'has_zip', 'create_task').graph;
    g = addNodeAfter(g, 'condition_1', 'else', 'send_notification').graph;
    return g;
  }
  const run = async (lead: Record<string, unknown>) => {
    const ports = new MemoryPorts(ctx({ lead }), T0);
    await advanceRun(branching(), ports, { deadline: deadline() });
    return { taken: ports.steps.get('condition_1')!.output!.handle, ran: [...ports.steps.keys()].filter((k) => k !== 'condition_1') };
  };
  it('takes the first matching branch, then the next, then else', async () => {
    expect(await run({ city: 'Austin', zip: '78701' })).toEqual({ taken: 'in_austin', ran: ['add_note_1'] });
    expect(await run({ city: 'Dallas', zip: '75001' })).toEqual({ taken: 'has_zip', ran: ['create_task_1'] });
    expect(await run({ city: 'Dallas' })).toEqual({ taken: 'else', ran: ['send_notification_1'] });
  });
  it('re-reads fresh facts each time it is evaluated (estimate accepted while waiting)', async () => {
    const t = GRAPH_TEMPLATES.find((x) => x.key === 'estimate_follow_up')!.graph;
    let status = 'sent';
    const ports = new MemoryPorts(() => ctx({ estimate: { status, amount: 42000 } }), T0);
    const sent: string[] = [];
    ports.actionHandler = (node) => { sent.push(node.id); return { outcome: 'success' }; };
    expect((await advanceRun(t, ports, { deadline: deadline() })).kind).toBe('waiting'); // 3-day wait
    status = 'accepted';
    ports.clock = new Date(T0.getTime() + 4 * 86_400_000);
    expect((await advanceRun(t, ports, { deadline: deadline() })).kind).toBe('completed');
    expect(sent).toEqual([]); // accepted: no follow-up email
  });
});

describe('engine: retries and failures', () => {
  it('retries a temporary failure with backoff, then succeeds without repeating earlier steps', async () => {
    const g = chain([['add_note'], ['send_email']]);
    const ports = new MemoryPorts(ctx(), T0);
    let attempts = 0;
    const calls: string[] = [];
    ports.actionHandler = (node) => {
      calls.push(node.id);
      if (node.type !== 'send_email') return { outcome: 'success' };
      attempts += 1;
      return attempts < 3 ? { outcome: 'temporary_failure', error: { code: 'gmail_down', message: 'x', kind: 'temporary', retryable: true } } : { outcome: 'success' };
    };
    let d = await advanceRun(g, ports, { deadline: deadline() });
    expect(d).toMatchObject({ kind: 'waiting', why: 'retry' });
    expect(ports.steps.get('send_email_1')).toMatchObject({ status: 'retry_scheduled', attemptCount: 1 });
    // Too early: still waiting, action not invoked again.
    d = await advanceRun(g, ports, { deadline: deadline() });
    expect(d.kind).toBe('waiting');
    expect(attempts).toBe(1);
    ports.clock = new Date((d as { resumeAt: Date }).resumeAt.getTime() + 1000);
    d = await advanceRun(g, ports, { deadline: deadline() });
    expect(d).toMatchObject({ kind: 'waiting', why: 'retry' });
    ports.clock = new Date((d as { resumeAt: Date }).resumeAt.getTime() + 1000);
    d = await advanceRun(g, ports, { deadline: deadline() });
    expect(d.kind).toBe('completed');
    expect(calls.filter((c) => c === 'add_note_1')).toHaveLength(1);
    expect(attempts).toBe(3);
  });

  it('turns an exhausted retry budget into a permanent failure that fails the run', async () => {
    const g = chain([['send_email']]);
    const ports = new MemoryPorts(ctx(), T0);
    ports.actionHandler = () => ({ outcome: 'temporary_failure', error: { code: 'gmail_down', message: 'down', kind: 'temporary', retryable: true } });
    let d: Awaited<ReturnType<typeof advanceRun>> = { kind: 'completed' };
    for (let i = 0; i < 8; i += 1) {
      d = await advanceRun(g, ports, { deadline: deadline() });
      if (d.kind !== 'waiting') break;
      ports.clock = new Date(d.resumeAt.getTime() + 1000);
    }
    expect(d).toMatchObject({ kind: 'failed', nodeId: 'send_email_1', error: { code: 'gmail_down', kind: 'permanent' } });
    expect(ports.steps.get('send_email_1')!.attemptCount).toBe(5);
  });

  it('fails the run on a permanent error, unless the step is set to continue', async () => {
    const bad = (): { outcome: 'permanent_failure'; error: import('@/lib/workflows').WorkflowError } => ({ outcome: 'permanent_failure', error: { code: 'bad', message: 'bad', kind: 'permanent', retryable: false } });
    const g1 = chain([['add_note'], ['end']]);
    const p1 = new MemoryPorts(ctx(), T0); p1.actionHandler = bad;
    expect(await advanceRun(g1, p1, { deadline: deadline() })).toMatchObject({ kind: 'failed' });
    const g2 = chain([['add_note', { onError: 'continue' }], ['end']]);
    const p2 = new MemoryPorts(ctx(), T0); p2.actionHandler = bad;
    expect((await advanceRun(g2, p2, { deadline: deadline() })).kind).toBe('completed');
    expect(p2.steps.get('add_note_1')).toMatchObject({ status: 'skipped', skipReason: 'error_continued:bad' });
  });

  it('skips a step the handler declines (no consent / no contact) and carries on', async () => {
    const g = chain([['send_email'], ['add_note']]);
    const ports = new MemoryPorts(ctx(), T0);
    ports.actionHandler = (node) => (node.type === 'send_email' ? { outcome: 'skipped', reason: 'no_consent' } : { outcome: 'success' });
    expect((await advanceRun(g, ports, { deadline: deadline() })).kind).toBe('completed');
    expect(ports.steps.get('send_email_1')).toMatchObject({ status: 'skipped', skipReason: 'no_consent' });
  });
});

describe('engine: limits, cancellation and pause', () => {
  it('stops a run that outlives its lifetime', async () => {
    const g = chain([['wait_duration', { mode: 'duration', amount: 40, unit: 'days' }], ['add_note']]);
    const ports = new MemoryPorts(ctx(), T0);
    const d1 = await advanceRun(g, ports, { deadline: deadline(30) });
    expect(d1.kind).toBe('waiting');
    ports.clock = new Date(T0.getTime() + 41 * 86_400_000);
    expect(await advanceRun(g, ports, { deadline: deadline(30) })).toMatchObject({ kind: 'failed', error: { code: 'run_expired' } });
  });
  it('honours cancellation and pause at the next step boundary', async () => {
    const g = chain([['add_note'], ['create_task']]);
    const ports = new MemoryPorts(ctx(), T0);
    ports.state = 'cancelled';
    expect((await advanceRun(g, ports, { deadline: deadline() })).kind).toBe('cancelled');
    expect(ports.steps.size).toBe(0);
    ports.state = 'paused';
    expect((await advanceRun(g, ports, { deadline: deadline() })).kind).toBe('parked');
    ports.state = 'active';
    expect((await advanceRun(g, ports, { deadline: deadline() })).kind).toBe('completed');
  });
  it('caps the number of steps a single run can visit', async () => {
    const g = chain(Array.from({ length: 6 }, () => ['add_note'] as [string]) as never);
    const ports = new MemoryPorts(ctx(), T0);
    expect(await advanceRun(g, ports, { deadline: deadline(), maxVisits: 3 })).toMatchObject({ kind: 'failed', error: { code: 'step_limit' } });
  });
});

describe('engine: waiting for an event', () => {
  function g() {
    let graph = chain([['wait_event', { event: 'appointment.booked', timeoutMinutes: 60 }]]);
    graph = addNodeAfter(graph, 'wait_event_1', 'received', 'add_note').graph;
    graph = addNodeAfter(graph, 'wait_event_1', 'timed_out', 'create_task').graph;
    return graph;
  }
  it('continues on "received" when the event satisfies the wait', async () => {
    const ports = new MemoryPorts(ctx(), T0);
    const d = await advanceRun(g(), ports, { deadline: deadline() });
    expect(d).toMatchObject({ kind: 'waiting', why: 'event' });
    expect((d as { resumeAt: Date }).resumeAt.toISOString()).toBe('2026-10-07T18:00:00.000Z'); // the timeout is the wake time
    await ports.resolveEventWait('wait_event_1', 'satisfied');
    expect((await advanceRun(g(), ports, { deadline: deadline() })).kind).toBe('completed');
    expect([...ports.steps.keys()]).toEqual(['wait_event_1', 'add_note_1']);
  });
  it('takes "timed out" when nothing happens, so the run can never wait forever', async () => {
    const ports = new MemoryPorts(ctx(), T0);
    await advanceRun(g(), ports, { deadline: deadline() });
    ports.clock = new Date(T0.getTime() + 61 * 60_000);
    await advanceRun(g(), ports, { deadline: deadline() });
    expect([...ports.steps.keys()]).toEqual(['wait_event_1', 'create_task_1']);
    expect(ports.waits.get('wait_event_1')!.status).toBe('timed_out');
  });
});

describe('engine: AI call node', () => {
  function callGraph() {
    let graph = chain([['ai_call', { resultTimeoutMinutes: 120, analysisGraceMinutes: 30 }]]);
    for (const h of ['booked', 'qualified_awaiting_scheduling', 'callback_requested', 'needs_human_review', 'no_answer', 'wrong_number', 'opted_out', 'failed', 'timed_out']) {
      graph = addNodeAfter(graph, 'ai_call_1', h, 'add_note').graph;
    }
    graph = addNodeAfter(graph, 'add_note_7', 'next', 'send_email').graph; // opted_out -> email (must be suppressed)
    return graph;
  }
  const requestPending = (ports: MemoryPorts) => {
    ports.callHandler = () => ({ ok: true, jobId: 'job-1', adopted: false });
    ports.callStatuses['job-1'] = { status: 'accepted' };
  };
  const taken = (ports: MemoryPorts) => ports.steps.get('ai_call_1')!.output!.handle;

  it('creates a pending call, waits for the webhook, then branches on the verified result', async () => {
    const ports = new MemoryPorts(ctx(), T0);
    requestPending(ports);
    let d = await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(d).toMatchObject({ kind: 'waiting', why: 'call' });
    expect(ports.steps.get('ai_call_1')).toMatchObject({ status: 'waiting', output: { jobId: 'job-1' } });
    // Early wake-up while the call is still in flight: keeps waiting, still one job.
    d = await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(d.kind).toBe('waiting');
    ports.callStatuses['job-1'] = { status: 'completed', conversation_ended_at: T0.toISOString(), analysis: { status: 'completed', data: [{ name: 'appointment_booked', value: true }] } };
    ports.clock = new Date(T0.getTime() + 60_000);
    await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(taken(ports)).toBe('booked');
    expect(ports.steps.get('ai_call_1')!.output).toMatchObject({ outcome: 'booked', executionStatus: 'completed' });
  });

  it('a completed call without a qualification signal goes to human review, never "qualified"', async () => {
    const ports = new MemoryPorts(ctx(), T0);
    requestPending(ports);
    await advanceRun(callGraph(), ports, { deadline: deadline() });
    ports.callStatuses['job-1'] = { status: 'completed', conversation_ended_at: T0.toISOString(), analysis: { status: 'completed', summary: 'ok', data: [] } };
    await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(taken(ports)).toBe('needs_human_review');
  });

  it('waits for the analysis, but only for the grace period', async () => {
    const ports = new MemoryPorts(ctx(), T0);
    requestPending(ports);
    await advanceRun(callGraph(), ports, { deadline: deadline() });
    ports.callStatuses['job-1'] = { status: 'completed', conversation_ended_at: T0.toISOString(), analysis: null };
    const d = await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(d).toMatchObject({ kind: 'waiting', why: 'call' });
    expect((d as { resumeAt: Date }).resumeAt.toISOString()).toBe('2026-10-07T17:30:00.000Z');
    ports.clock = new Date(T0.getTime() + 31 * 60_000);
    await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(taken(ports)).toBe('needs_human_review');
    expect(ports.steps.get('ai_call_1')!.output).toMatchObject({ reason: 'analysis_unavailable' });
  });

  it('a missing webhook cannot strand the run: the timeout path is taken', async () => {
    const ports = new MemoryPorts(ctx(), T0);
    requestPending(ports);
    const d = await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect((d as { resumeAt: Date }).resumeAt.toISOString()).toBe('2026-10-07T19:00:00.000Z');
    ports.clock = new Date(T0.getTime() + 121 * 60_000);
    await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(taken(ports)).toBe('timed_out');
  });

  it.each([
    [{ status: 'no_answer' }, 'no_answer'],
    [{ status: 'busy' }, 'no_answer'],
    [{ status: 'failed', last_error: 'fish_http_500' }, 'failed'],
    [{ status: 'expired' }, 'failed'],
    [{ status: 'blocked', block_reason: 'no_consent' }, 'failed'],
    [{ status: 'completed', analysis: { status: 'completed', data: [{ name: 'wrong_number', value: true }] } }, 'wrong_number'],
    [{ status: 'completed', analysis: { status: 'completed', data: [{ name: 'callback_requested', value: true }] } }, 'callback_requested'],
    [{ status: 'completed', analysis: { status: 'completed', data: [{ name: 'qualified', value: true }] } }, 'qualified_awaiting_scheduling'],
  ])('maps %j to the %s path', async (facts, handle) => {
    const ports = new MemoryPorts(ctx(), T0);
    ports.callHandler = () => ({ ok: true, jobId: 'job-1', adopted: false });
    ports.callStatuses['job-1'] = facts as never;
    await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(taken(ports)).toBe(handle);
  });

  it('an opt-out stops all later contact in the run, even though the graph wires an email after it', async () => {
    const ports = new MemoryPorts(ctx(), T0);
    ports.callHandler = () => ({ ok: true, jobId: 'job-1', adopted: false });
    ports.callStatuses['job-1'] = { status: 'completed', analysis: { status: 'completed', data: [{ name: 'do_not_call', value: true }] } } as never;
    let emails = 0;
    ports.actionHandler = (node) => { if (node.type === 'send_email') emails += 1; return { outcome: 'success' }; };
    const d = await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(taken(ports)).toBe('opted_out');
    expect(d.kind).toBe('completed');
    expect(emails).toBe(0);
    expect(ports.steps.get('send_email_1')).toMatchObject({ status: 'skipped', skipReason: 'contact_suppressed' });
    expect(ports.suppressed).toBe(true);
  });

  it('a second call step in a suppressed run is not placed', async () => {
    let g = chain([['ai_call'], ['ai_call']]);
    g = connect(g, { source: 'ai_call_1', sourceHandle: 'no_answer', target: 'ai_call_2' }).graph;
    const ports = new MemoryPorts(ctx(), T0);
    ports.suppressed = true;
    let requests = 0;
    ports.callHandler = () => { requests += 1; return { ok: true, jobId: 'x', adopted: false }; };
    await advanceRun(g, ports, { deadline: deadline() });
    expect(requests).toBe(0);
    expect(ports.steps.get('ai_call_1')!.output).toMatchObject({ handle: 'opted_out', reason: 'contact_suppressed' });
  });

  it('a request failure takes the "Call failed" path (and retries a temporary one first)', async () => {
    const ports = new MemoryPorts(ctx(), T0);
    let n = 0;
    ports.callHandler = () => (++n === 1
      ? { ok: false, error: { code: 'fish_unreachable', message: 'x', kind: 'temporary', retryable: true } }
      : { ok: false, error: { code: 'fish_http_402', message: 'x', kind: 'permanent', retryable: false } });
    let d = await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(d).toMatchObject({ kind: 'waiting', why: 'retry' });
    ports.clock = new Date((d as { resumeAt: Date }).resumeAt.getTime() + 1000);
    d = await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(taken(ports)).toBe('failed');
    expect(n).toBe(2);
  });

  it('adopting an existing call (form-to-call) waits on that job instead of placing another', async () => {
    const ports = new MemoryPorts(ctx(), T0);
    ports.callHandler = () => ({ ok: true, jobId: 'auto-job', adopted: true });
    ports.callStatuses['auto-job'] = { status: 'answered' };
    await advanceRun(callGraph(), ports, { deadline: deadline() });
    expect(ports.steps.get('ai_call_1')!.output).toMatchObject({ jobId: 'auto-job', adopted: true });
    expect(ports.logs.map((l) => l.code)).toContain('call.adopted');
  });
});

describe('dry run', () => {
  it('walks the AI qualification template without sending or calling anything and explains each decision', async () => {
    const t = GRAPH_TEMPLATES[0].graph;
    const c = ctx();
    c.lead = { ...c.lead!, phone_e164: '+15125550100', consent_granted: true, consent_disclosure: 'You may call or text me' };
    const r = await dryRunGraph(t, c, { defaultCallOutcome: 'qualified_awaiting_scheduling' });
    expect(r.dryRun).toBe(true);
    expect(r.disposition).toBe('completed');
    expect(r.path).toEqual(['call_homeowner', 'task_schedule', 'end_qualified']);
    const call = r.steps[0];
    expect(call.preview).toMatchObject({ purpose: expect.stringContaining('Qualify'), simulatedResult: 'qualified_awaiting_scheduling' });
    expect(call.warnings).toEqual([]);
    expect(r.steps[1].preview).toMatchObject({ title: expect.stringContaining('Sarah') });
  });
  it('reports blockers a real run would hit (no consent, no time zone, missing values)', async () => {
    const t = GRAPH_TEMPLATES[0].graph;
    const c = ctx();
    c.lead = { first_name: 'Pat', consent_granted: false };
    const r = await dryRunGraph(t, c);
    const w = r.steps[0].warnings.join(' | ');
    expect(w).toMatch(/phone number/);
    expect(w).toMatch(/consent/);
    expect(w).toMatch(/time zone/);
  });
  it('follows the opted-out path and skips later contact; rendered email shows resolved text', async () => {
    const t = GRAPH_TEMPLATES[2].graph; // no-answer retry
    const r = await dryRunGraph(t, ctx(), { defaultCallOutcome: 'opted_out' });
    expect(r.path).toContain('note_opt_out');
    const reminder = await dryRunGraph(GRAPH_TEMPLATES[1].graph, ctx(), {});
    const email = reminder.steps.find((s) => s.nodeId === 'confirm_email')!;
    expect(email.preview).toMatchObject({ subject: 'Your appointment with Blue Wave Pools is confirmed' });
    expect(String(email.preview!.body)).toContain('Hi Sarah');
  });
  it('simulates waits on a virtual clock and the event-wait timeout path', async () => {
    const t = GRAPH_TEMPLATES[3].graph;
    const timeout = await dryRunGraph(t, ctx(), { eventWaits: { wait_answer: 'timeout' } });
    expect(timeout.path).toEqual(['wait_3_days', 'accepted_yet', 'follow_up_email', 'wait_answer', 'task_call', 'end_task']);
    expect(new Date(timeout.endedAt).getTime() - Date.now()).toBeGreaterThan(7 * 86_400_000 - 60_000);
    const received = await dryRunGraph(t, ctx(), { eventWaits: { wait_answer: 'received' } });
    expect(received.path).toEqual(['wait_3_days', 'accepted_yet', 'follow_up_email', 'wait_answer', 'end_after_accept']);
  });
});
