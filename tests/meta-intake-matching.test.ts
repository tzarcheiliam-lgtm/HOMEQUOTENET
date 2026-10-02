import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/leads/notify', () => ({ sendLeadEmailsSoon: vi.fn() }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: vi.fn() }));

type Call = { table: string; op: string; filters: unknown[][]; payload?: Record<string, unknown> };
type Result = { data: unknown; error: { code?: string; message: string } | null };
const state = vi.hoisted(() => ({ calls: [] as Call[], resolve: (() => ({ data: [], error: null })) as (q: Call) => Result }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from(table: string) {
      const q: Call = { table, op: 'select', filters: [] };
      const chain: Record<string, unknown> = {
        select: () => chain,
        insert: (p: Record<string, unknown>) => { q.op = 'insert'; q.payload = p; return chain; },
        update: (p: Record<string, unknown>) => { q.op = 'update'; q.payload = p; return chain; },
        eq: (c: string, v: unknown) => { q.filters.push(['eq', c, v]); return chain; },
        is: (c: string, v: unknown) => { q.filters.push(['is', c, v]); return chain; },
        in: (c: string, v: unknown) => { q.filters.push(['in', c, v]); return chain; },
        or: (v: string) => { q.filters.push(['or', v]); return chain; },
        limit: () => chain,
        single: async () => { state.calls.push(q); return state.resolve(q); },
        then: (ok: (v: Result) => unknown, bad: (e: unknown) => unknown) => { state.calls.push(q); return Promise.resolve(state.resolve(q)).then(ok, bad); },
      };
      return chain;
    },
  }),
}));

import { ingestLead } from '@/lib/integrations/intake';

const ctx = { integrationId: 'int-1', provider: 'meta', rawPayload: {} };
const lead = (over: Record<string, unknown> = {}) => ({
  full_name: 'Jordan Rivera', email: 'jordan@example.com', phone: '(818) 555-0142', source: 'meta',
  external_lead_id: 'L1', timeline: 'Within 3 months', answers: { q: 'a' }, ...over,
});
const existing = (over: Record<string, unknown> = {}) => ({
  id: 'old-1', first_name: 'Jordan', last_name: 'Rivera', email_normalized: 'jordan@example.com', phone_e164: '+18185550142', ...over,
});
const inserted = (table: string): Call[] => state.calls.filter((c: Call) => c.table === table && c.op === 'insert');
const filtersOn = (q: Call, ...cols: string[]) => q.filters.some((f) => cols.includes(String(f[1])));

beforeEach(() => {
  state.calls = [];
  state.resolve = (q: Call) => {
    if (q.table === 'leads' && q.op === 'insert') return { data: { id: 'new-1' }, error: null };
    if (q.table === 'lead_intake_events' && q.op === 'insert') return { data: { id: 'ev-1' }, error: null };
    return { data: [], error: null };
  };
});

describe('ingestLead idempotency', () => {
  it('does nothing for a lead id that was already imported', async () => {
    state.resolve = (q: Call) =>
      q.table === 'leads' && q.op === 'select' && filtersOn(q, 'external_lead_id')
        ? { data: [{ id: 'old-1' }], error: null }
        : { data: [], error: null };
    expect(await ingestLead(lead(), ctx)).toEqual({ status: 'duplicate', duplicateOf: 'old-1', redelivery: true });
    expect(inserted('leads')).toHaveLength(0);
    expect(inserted('lead_activities')).toHaveLength(0);
    expect(inserted('lead_intake_events')).toHaveLength(0);
  });

  it('recognises a redelivery whose first delivery matched an existing lead', async () => {
    state.resolve = (q: Call) =>
      q.table === 'lead_intake_events' && q.op === 'select'
        ? { data: [{ lead_id: null, duplicate_of: 'old-1' }], error: null }
        : { data: [], error: null };
    expect(await ingestLead(lead(), ctx)).toMatchObject({ status: 'duplicate', duplicateOf: 'old-1', redelivery: true });
    expect(inserted('lead_activities')).toHaveLength(0);
  });

  it('resolves a concurrent-delivery unique violation to the winning lead', async () => {
    let lookups = 0;
    state.resolve = (q: Call) => {
      if (q.table === 'leads' && q.op === 'insert') return { data: null, error: { code: '23505', message: 'duplicate key' } };
      if (q.table === 'leads' && filtersOn(q, 'external_lead_id')) return { data: ++lookups > 1 ? [{ id: 'winner' }] : [], error: null };
      return { data: [], error: null };
    };
    expect(await ingestLead(lead(), ctx)).toMatchObject({ status: 'duplicate', duplicateOf: 'winner', redelivery: true });
  });
});

describe('ingestLead conservative contact matching', () => {
  it('stores project details, page id and every answer on a new lead', async () => {
    await ingestLead(lead({ page_id: 'page-1', project_description: 'New pool' }), ctx);
    expect(inserted('leads')[0].payload).toMatchObject({
      timeline: 'Within 3 months', page_id: 'page-1', project_description: 'New pool',
      answers: { q: 'a' }, external_lead_id: 'L1', source: 'meta',
    });
  });

  it('treats the same email AND phone as the same person and keeps the new inquiry in the activity', async () => {
    state.resolve = (q: Call) =>
      q.table === 'leads' && q.op === 'select' && filtersOn(q, 'email_normalized', 'phone_e164')
        ? { data: [existing()], error: null }
        : { data: [], error: null };
    expect(await ingestLead(lead(), ctx)).toMatchObject({ status: 'duplicate', duplicateOf: 'old-1' });
    expect(inserted('leads')).toHaveLength(0);
    expect((inserted('lead_activities')[0].payload as { metadata: unknown }).metadata).toMatchObject({ timeline: 'Within 3 months', answers: { q: 'a' } });
  });

  it('does NOT merge a different person who shares only a phone number', async () => {
    state.resolve = (q: Call) =>
      q.table === 'leads' && q.op === 'select' && filtersOn(q, 'phone_e164')
        ? { data: [existing({ first_name: 'Sam', email_normalized: 'sam@example.com' })], error: null }
        : q.table === 'leads' && q.op === 'insert' ? { data: { id: 'new-1' }, error: null }
        : q.table === 'lead_intake_events' && q.op === 'insert' ? { data: { id: 'ev-1' }, error: null }
        : { data: [], error: null };
    expect(await ingestLead(lead(), ctx)).toMatchObject({ status: 'created', leadId: 'new-1', possibleDuplicateOf: 'old-1' });
    expect(inserted('leads')).toHaveLength(1);
    expect((inserted('lead_activities')[0].payload as { body: string }).body).toMatch(/possible duplicate/i);
  });

  it('merges on a single shared field only when the names are compatible', async () => {
    state.resolve = (q: Call) =>
      q.table === 'leads' && q.op === 'select' && filtersOn(q, 'email_normalized')
        ? { data: [existing({ phone_e164: '+18185550999' })], error: null }
        : { data: [], error: null };
    expect(await ingestLead(lead(), ctx)).toMatchObject({ status: 'duplicate', duplicateOf: 'old-1' });
  });

  it('never puts contact values in a PostgREST filter string', async () => {
    await ingestLead(lead({ email: 'a,phone_e164.neq.x)@example.com' }), ctx);
    const ors = state.calls.flatMap((c) => c.filters).filter((f) => f[0] === 'or');
    expect(ors).toEqual([]);
  });
});
