import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { MAX_RUN_RUNTIME_ERRORS, claimAndExecuteWorkflowRuns, processWorkflowEvent } from '@/lib/workflows/runtime.server';

/**
 * Phase 5 hardening regressions for the workflow runtime, against a
 * recording fake of the Supabase query builder (no network, no DB):
 *  H2  an unreadable event is marked failed with backoff, never left 'dispatching'
 *  H2b one broken run neither aborts the batch nor loops forever
 */

interface Call { table: string; op: 'select' | 'update' | 'insert'; columns: string | null; values: Record<string, unknown> | null; filters: [string, unknown][] }
type Handler = (call: Call) => { data: unknown; error: unknown };

function fakeDb(handler: Handler, rpc: (name: string, args: Record<string, unknown>) => { data: unknown; error: unknown } = () => ({ data: [], error: null })) {
  const calls: Call[] = [];
  const from = (table: string) => {
    const call: Call = { table, op: 'select', columns: null, values: null, filters: [] };
    const settle = () => { calls.push(call); return Promise.resolve(handler(call)); };
    const b: Record<string, unknown> = {
      select(columns?: string) { if (call.op === 'select') call.columns = columns ?? '*'; return b; },
      update(values: Record<string, unknown>) { call.op = 'update'; call.values = values; return b; },
      insert(values: Record<string, unknown>) { call.op = 'insert'; call.values = values; return b; },
      eq(k: string, v: unknown) { call.filters.push([k, v]); return b; },
      is(k: string, v: unknown) { call.filters.push([k, v]); return b; },
      in() { return b; }, order() { return b; }, limit() { return b; },
      single: settle, maybeSingle: settle,
      then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) { return settle().then(resolve, reject); },
    };
    return b;
  };
  return { db: { from, rpc: async (name: string, args: Record<string, unknown>) => rpc(name, args) } as never, calls };
}

const ok = { data: null, error: null };

describe('H2: unreadable events are failed with backoff', () => {
  it('marks the event failed (not left dispatching) and backs off by attempt', async () => {
    const eventId = randomUUID();
    const { db, calls } = fakeDb((c) => {
      if (c.table === 'workflow_events' && c.op === 'select' && c.columns === '*') {
        // A lead.created row whose payload lacks required nullable keys (the H1 shape).
        return { data: { id: eventId, type: 'lead.created', schema_version: 1, idempotency_key: `lead.created|lead:${eventId}`, occurred_at: '2026-09-25T10:00:00Z', recorded_at: '2026-09-25T10:00:00Z', contractor_id: null, actor_type: 'system', actor_id: null, entity_type: 'lead', entity_id: eventId, lead_id: eventId, source: 'db:leads', correlation_id: null, causation_id: null, payload: { leadId: eventId, status: 'new', qualificationStatus: 'needs_qualification', zip: '91436' }, metadata: {}, dispatch_status: 'dispatching', dispatch_attempts: 3, available_at: '2026-09-25T10:00:00Z', dispatched_at: null, last_error: null }, error: null };
      }
      if (c.table === 'workflow_events' && c.op === 'select') return { data: { dispatch_attempts: 3 }, error: null };
      return ok;
    });
    const before = Date.now();
    await expect(processWorkflowEvent(eventId, { db, workerId: 'tick:test', execute: false })).rejects.toThrow();
    const failed = calls.find((c) => c.table === 'workflow_events' && c.op === 'update');
    expect(failed?.values).toMatchObject({ dispatch_status: 'failed', locked_by: null, locked_until: null });
    expect(failed?.filters).toEqual(expect.arrayContaining([['id', eventId], ['locked_by', 'tick:test']]));
    const delay = new Date(String(failed?.values?.available_at)).getTime() - before;
    expect(delay).toBeGreaterThanOrEqual(239_000); // attempt 3 -> 4 minutes
    expect(delay).toBeLessThan(250_000);
    expect(calls.some((c) => c.table === 'workflow_logs' && c.values?.code === 'event.dispatch_failed')).toBe(true);
  });

  it('still records the failure when processed outside a claim (no worker id)', async () => {
    const { db, calls } = fakeDb((c) => (c.table === 'workflow_events' && c.op === 'select' && c.columns === '*' ? { data: null, error: { message: 'gone' } } : ok));
    await expect(processWorkflowEvent(randomUUID(), { db, execute: false })).rejects.toThrow();
    const failed = calls.find((c) => c.table === 'workflow_events' && c.op === 'update');
    expect(failed?.values?.dispatch_status).toBe('failed');
    expect(failed?.filters.some(([k]) => k === 'locked_by')).toBe(false);
  });
});

describe('H2b: a broken run is isolated and bounded', () => {
  const brokenRun = (errors: number) => ({
    id: randomUUID(), workflow_id: randomUUID(), workflow_version: 1, definition_snapshot: { not: 'a definition' },
    contractor_id: null, trigger_event_id: randomUUID(), lead_id: null, entity_type: 'lead', entity_id: randomUUID(),
    status: 'running', current_step_key: null, dedupe_key: null, concurrency_key: null, resume_at: null,
    locked_by: 'tick:test', locked_until: new Date(Date.now() + 60_000).toISOString(), context: {},
    metadata: { _claimed_from: 'pending', ...(errors ? { _runtime_errors: errors } : {}) },
    last_error: null, cancel_reason: null, started_at: null, completed_at: null, failed_at: null, cancelled_at: null,
    created_at: '', updated_at: '',
  });

  it('keeps going after a failing run and schedules a backoff retry', async () => {
    const a = brokenRun(0), b = brokenRun(0);
    const { db, calls } = fakeDb(() => ({ data: { id: 'x' }, error: null }), () => ({ data: [a, b], error: null }));
    const result = await claimAndExecuteWorkflowRuns({ db, workerId: 'tick:test' });
    expect(result).toEqual({ claimed: 2, failed: 2 });
    const updates = calls.filter((c) => c.table === 'workflow_runs' && c.op === 'update');
    expect(updates).toHaveLength(2);
    for (const u of updates) {
      expect(u.values).toMatchObject({ status: 'waiting', locked_by: null, metadata: { _runtime_errors: 1 }, last_error: { code: 'runtime_error', kind: 'temporary' } });
      expect(u.filters).toEqual(expect.arrayContaining([['locked_by', 'tick:test']]));
    }
  });

  it(`fails the run permanently after ${MAX_RUN_RUNTIME_ERRORS} runtime errors`, async () => {
    const run = brokenRun(MAX_RUN_RUNTIME_ERRORS - 1);
    const { db, calls } = fakeDb(() => ({ data: { id: 'x' }, error: null }), () => ({ data: [run], error: null }));
    expect(await claimAndExecuteWorkflowRuns({ db, workerId: 'tick:test' })).toEqual({ claimed: 1, failed: 1 });
    const update = calls.find((c) => c.table === 'workflow_runs' && c.op === 'update');
    expect(update?.values).toMatchObject({ status: 'failed', last_error: { code: 'runtime_error', kind: 'permanent' } });
  });
});
