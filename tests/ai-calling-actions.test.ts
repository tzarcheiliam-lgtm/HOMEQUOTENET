import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeFakeStore } from './helpers/fake-ai-store';

const UUID_C = '5f0c1c1a-0000-4000-8000-000000000001';
const UUID_L = '5f0c1c1a-0000-4000-8000-000000000002';
const ADMIN = { id: 'admin-1', role: 'admin' };

const m = vi.hoisted(() => ({
  requireRole: vi.fn(), adminCalls: [] as { table: string; calls: [string, unknown[]][] }[],
  resolve: (() => ({ data: null, error: null })) as (t: string, c: [string, unknown[]][]) => { data: unknown; error: unknown },
  dispatchJobNow: vi.fn(), store: null as unknown,
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireRole: m.requireRole }));
vi.mock('@/lib/ai-calling/run.server', () => ({ dispatchJobNow: m.dispatchJobNow, runAiCallQueue: vi.fn() }));
vi.mock('@/lib/ai-calling/store.server', () => ({ createSupabaseJobStore: () => m.store }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const rec = { table, calls: [] as [string, unknown[]][] };
      m.adminCalls.push(rec);
      const p: unknown = new Proxy(function () {}, {
        get(_t, prop) {
          if (prop === 'then') return (res: (v: unknown) => unknown) => res(m.resolve(table, rec.calls));
          return (...args: unknown[]) => { rec.calls.push([String(prop), args]); return p; };
        },
      });
      return p;
    },
  }),
}));

import * as actions from '@/lib/actions/ai-calling';

const clock = { now: new Date('2026-10-06T20:00:00Z') };
let t: ReturnType<typeof makeFakeStore>;
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const inserts = (table: string) => m.adminCalls.filter((c) => c.table === table && c.calls.some(([n]) => n === 'insert'));
const insertedRow = (table: string) => inserts(table)[0]?.calls.find(([n]) => n === 'insert')?.[1][0] as Record<string, unknown> | undefined;

beforeEach(() => {
  m.adminCalls.length = 0;
  m.requireRole.mockReset().mockResolvedValue(ADMIN);
  m.dispatchJobNow.mockReset();
  t = makeFakeStore(clock);
  t.seedPoolMasters();
  t.state.contractors.get('c1')!.contractor_id = UUID_C;
  t.state.contractors.set(UUID_C, { ...t.state.contractors.get('c1')!, mode: 'manual_only' });
  t.state.leads.set(UUID_L, { ...t.state.leads.get('l1')!, id: UUID_L });
  m.store = t.store;
  m.resolve = (table, calls) => {
    const ins = calls.find(([n]) => n === 'insert');
    if (table === 'ai_call_jobs' && ins) {
      const row = ins[1][0] as Record<string, unknown>;
      const job = t.addJob({ lead_id: null, prospect_id: null, ...row, id: '7d6f6d6d-0000-4000-8000-0000000000aa', created_at: clock.now.toISOString() } as never);
      return { data: job, error: null };
    }
    if (table === 'lead_assignments') return { data: { id: 'asg' }, error: null };
    if (table === 'leads') return { data: { first_name: 'Ada', last_name: 'Lovelace' }, error: null };
    return { data: null, error: null };
  };
});

const manual = (o: Record<string, string> = {}) => fd({ token: '9a9a9a9a-0000-4000-8000-000000000001', contractor_id: UUID_C, contact_mode: 'new', timing: 'now',
  contact_name: 'Grace Hopper', phone: '(310) 555-0199', state: 'CA', zip: '90210', consent_basis: 'verbal', consent_reference: 'Intake call 10/6', consent_date: '2026-10-05',
  purpose: 'Follow up on quote request', context: 'Asked about a spa', ...o });

describe('admin-only enforcement (server side)', () => {
  const calls: [string, () => Promise<unknown>][] = [
    ['setCallingEnabled', () => actions.setCallingEnabled(fd({ enabled: 'true' }))],
    ['saveCallingSettings', () => actions.saveCallingSettings(undefined, fd({ window_start_hour: '8', window_end_hour: '21', max_attempts: '3', retry_delay_minutes: '60', max_job_age_hours: '48' }))],
    ['saveContractorCalling', () => actions.saveContractorCalling(undefined, fd({ contractor_id: UUID_C, mode: 'automatic', agent_id: 'agent_123', phone_number_id: 'pn_12345' }))],
    ['cancelJob', () => actions.cancelJob(fd({ id: UUID_C }))],
    ['retryJob', () => actions.retryJob(fd({ id: UUID_C }))],
    ['addOptOut', () => actions.addOptOut(undefined, fd({ phone: '3105550123' }))],
    ['createManualCall', () => actions.createManualCall(undefined, manual())],
  ];
  it.each(calls)('%s rejects a non-admin before touching any data', async (_n, run) => {
    m.requireRole.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(run()).rejects.toThrow('NEXT_REDIRECT');
    expect(m.adminCalls).toHaveLength(0);
    expect(m.dispatchJobNow).not.toHaveBeenCalled();
    expect(m.requireRole).toHaveBeenCalledWith(['admin']);
  });
});

describe('contractor and global configuration', () => {
  it('refuses to turn calling on for a contractor without both Fish ids', async () => {
    const r = await actions.saveContractorCalling(undefined, fd({ contractor_id: UUID_C, mode: 'automatic', agent_id: 'agent_123', phone_number_id: '' }));
    expect(r).toMatchObject({ ok: false });
    expect(m.adminCalls.filter((c) => c.table === 'ai_calling_contractor_settings')).toHaveLength(0);
  });
  it('saves a complete configuration and audits it', async () => {
    const r = await actions.saveContractorCalling(undefined, fd({ contractor_id: UUID_C, mode: 'automatic', agent_id: 'agent_123', phone_number_id: 'pn_12345' }));
    expect(r).toMatchObject({ ok: true });
    expect(insertedRow('audit_logs')).toMatchObject({ actor_id: 'admin-1', action: 'ai_calling.contractor' });
  });
  it('the emergency stop writes enabled=false with who and when, and is audited', async () => {
    await actions.setCallingEnabled(fd({ enabled: 'false' }));
    const upd = m.adminCalls.find((c) => c.table === 'ai_calling_settings')!.calls.find(([n]) => n === 'update')![1][0] as Record<string, unknown>;
    expect(upd).toMatchObject({ enabled: false, stopped_by: 'admin-1' });
    expect(upd.stopped_at).toBeTruthy();
    expect(insertedRow('audit_logs')).toMatchObject({ action: 'ai_calling.emergency_stop' });
  });
  it('rejects an invalid calling window', async () => {
    expect(await actions.saveCallingSettings(undefined, fd({ window_start_hour: '21', window_end_hour: '8', max_attempts: '3', retry_delay_minutes: '60', max_job_age_hours: '48' }))).toMatchObject({ ok: false });
  });
});

describe('manual calls', () => {
  it('records the initiator, recipient, contractor, purpose and consent reference, then asks the provider', async () => {
    m.dispatchJobNow.mockImplementation(async (id: string) => { t.state.jobs.get(id)!.status = 'accepted'; t.state.jobs.get(id)!.provider_session_id = 'sess-9'; return { claimed: 1, outcomes: [] }; });
    const r = await actions.createManualCall(undefined, manual());
    expect(insertedRow('ai_call_jobs')).toMatchObject({ trigger_source: 'manual', initiated_by: 'admin-1', contractor_id: UUID_C, contact_phone: '+13105550199', contact_name: 'Grace Hopper',
      purpose: 'Follow up on quote request', consent_basis: 'verbal', consent_reference: 'Intake call 10/6', dedupe_key: 'manual:9a9a9a9a-0000-4000-8000-000000000001' });
    expect(insertedRow('audit_logs')).toMatchObject({ actor_id: 'admin-1', action: 'ai_call.manual' });
    expect(m.dispatchJobNow).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ ok: true, placed: true, status: 'accepted', sessionId: 'sess-9' });
  });
  it('never reports a call as placed when the provider did not accept it', async () => {
    m.dispatchJobNow.mockImplementation(async (id: string) => { Object.assign(t.state.jobs.get(id)!, { status: 'failed', last_error: 'fish_http_402' }); return { claimed: 1, outcomes: [] }; });
    const r = await actions.createManualCall(undefined, manual());
    expect(r).toMatchObject({ ok: false, placed: false, status: 'failed' });
    expect(r!.error).toMatch(/Not dialed/);
  });
  it('a row is saved but nothing is dialed when calling is switched off (and it says so)', async () => {
    m.dispatchJobNow.mockResolvedValue({ skipped: 'env_disabled', claimed: 0, outcomes: [] });
    const r = await actions.createManualCall(undefined, manual());
    expect(r).toMatchObject({ ok: false, status: 'queued' });
    expect(r!.error).toMatch(/Not dialed: AI calling is switched off/);
    expect(r!.placed).toBeFalsy();
  });
  it('reports a block reason (e.g. opt-out) from the same rules the worker uses', async () => {
    m.dispatchJobNow.mockImplementation(async (id: string) => { Object.assign(t.state.jobs.get(id)!, { status: 'blocked', block_reason: 'opted_out' }); return { claimed: 1, outcomes: [] }; });
    expect((await actions.createManualCall(undefined, manual()))!.error).toMatch(/Opted out/);
  });
  it.each([
    ['contractor off', () => { t.state.contractors.get(UUID_C)!.mode = 'off'; }, manual(), /off for this contractor/],
    ['contractor not configured', () => { t.state.contractors.get(UUID_C)!.agent_id = null; }, manual(), /no Fish agent/],
    ['new contact without consent details', () => {}, manual({ consent_reference: '', consent_date: '' }), /how and when/],
    ['invalid phone', () => {}, manual({ phone: '12345' }), /valid US/],
    ['unknown state (calling hours need it)', () => {}, manual({ state: 'ZZ' }), /2-letter state/],
    ['missing purpose', () => {}, manual({ purpose: '' }), /purpose/i],
    ['schedule in the past', () => {}, manual({ timing: 'scheduled', scheduled_at: '2020-01-01T00:00:00Z' }), /Schedule a time/],
  ])('rejects without creating a call: %s', async (_n, setup, form, msg) => {
    setup();
    const r = await actions.createManualCall(undefined, form);
    expect(r).toMatchObject({ ok: false });
    expect(r!.error).toMatch(msg);
    expect(inserts('ai_call_jobs')).toHaveLength(0);
    expect(m.dispatchJobNow).not.toHaveBeenCalled();
  });
  it('enforces contractor isolation: a lead not assigned to the contractor cannot be called', async () => {
    m.resolve = (table) => ({ data: table === 'lead_assignments' ? null : null, error: null });
    const r = await actions.createManualCall(undefined, manual({ contact_mode: 'lead', lead_id: UUID_L }));
    expect(r).toMatchObject({ ok: false });
    expect(r!.error).toMatch(/not assigned to this contractor/);
    expect(inserts('ai_call_jobs')).toHaveLength(0);
  });
  it('a double submit with the same token returns the existing call and does not dial twice', async () => {
    const existing = t.addJob({ trigger_source: 'manual', dedupe_key: 'manual:9a9a9a9a-0000-4000-8000-000000000001', status: 'accepted', provider_session_id: 'sess-1' });
    m.resolve = (table, calls) => {
      if (table === 'ai_call_jobs' && calls.some(([n]) => n === 'insert')) return { data: null, error: { code: '23505' } };
      if (table === 'ai_call_jobs') return { data: existing, error: null };
      return { data: null, error: null };
    };
    const r = await actions.createManualCall(undefined, manual());
    expect(r).toMatchObject({ ok: true, jobId: existing.id, placed: true });
    expect(m.dispatchJobNow).not.toHaveBeenCalled();
  });
  it('scheduled calls are preflighted: a hard blocker is reported now instead of silently queued', async () => {
    t.state.optOuts.add('+13105550199');
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const r = await actions.createManualCall(undefined, manual({ timing: 'scheduled', scheduled_at: future }));
    expect(r).toMatchObject({ ok: false, status: 'blocked' });
    expect(r!.error).toMatch(/Opted out/);
    expect(m.dispatchJobNow).not.toHaveBeenCalled();
  });
  it('a valid scheduled call is queued for its time and not dialed now', async () => {
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const r = await actions.createManualCall(undefined, manual({ timing: 'scheduled', scheduled_at: future }));
    expect(r).toMatchObject({ ok: true, status: 'queued', placed: false });
    expect(insertedRow('ai_call_jobs')).toMatchObject({ run_at: future, scheduled_for: future });
    expect(m.dispatchJobNow).not.toHaveBeenCalled();
  });
});
