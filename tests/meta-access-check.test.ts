import { describe, expect, it } from 'vitest';
import { runAccessCheck, whereDoesAccessLive, type Check, type GraphGet, type GraphGetAll } from '@/lib/meta/access-check';
import { GraphError, graphGet, graphGetAll, classifyGraphError } from '@/lib/meta/marketing-api';

/** A scripted Graph: answers each path from a table; anything unknown throws a Graph-shaped error. NEVER the real network. */
function fakeGraph(table: Record<string, unknown>, failures: Record<string, { kind: string; code: number; message: string }> = {}) {
  const calls: string[] = [];
  const find = (path: string) => { calls.push(path); const f = failures[path]; if (f) throw new GraphError({ ...f, retryable: false, httpStatus: 400, subcode: null, fbtraceId: null } as never); if (!(path in table)) throw new GraphError({ kind: 'invalid', code: 100, message: `unexpected ${path}`, retryable: false, httpStatus: 400, subcode: null, fbtraceId: null }); return table[path]; };
  const get: GraphGet = async (path) => find(path) as never;
  const getAll: GraphGetAll = async (path) => find(path) as never;
  return { get, getAll, calls };
}
const ACCT = 'act_111';
const base = {
  me: { id: '900', name: 'HQN System User' },
  debug_token: { data: { is_valid: true, type: 'USER', app_id: 'APP1', application: 'HQN', scopes: ['ads_read'], expires_at: 0 } },
  'me/adaccounts': [{ id: ACCT, name: 'Pool Masters LA', account_status: 1, business: { id: 'ETHAN_BIZ' }, is_personal: 0 }],
  [`${ACCT}/insights`]: [{ spend: '12.5', impressions: '900' }],
  [`${ACCT}/adsets`]: [{ id: 's1', name: 'Set', effective_status: 'ACTIVE', promoted_object: { pixel_id: '2057270381542607' } }],
  [`${ACCT}/ads`]: [{ id: 'a1', effective_status: 'ACTIVE', tracking_specs: [{ fb_pixel: ['2057270381542607'] }] }],
  '933962709362966': { id: '933962709362966', name: 'PM funnel pixel', owner_business: { id: 'ETHAN_BIZ' }, last_fired_time: new Date(Date.now() - 3600_000).toISOString() },
  '2057270381542607': { id: '2057270381542607', name: 'Old pixel', owner_business: { id: 'ETHAN_BIZ' }, last_fired_time: new Date(Date.now() - 40 * 86400_000).toISOString() },
};
const input = { appId: 'APP1', appSecret: 's', targetAccountId: '111', hqnBusinessId: 'HQN_BIZ', datasets: [{ id: '933962709362966', role: 'funnel Pixel' }] };
const byId = (r: { checks: Check[] }, id: string) => r.checks.find((c) => c.id === id)!;

describe('access diagnostic', () => {
  it('passes end to end when the token holds the account and datasets, and explains ownership', async () => {
    const g = fakeGraph(base);
    const r = await runAccessCheck(g.get, g.getAll, input);
    expect(r.targetVisible).toBe(true);
    for (const id of ['token', 'token_details', 'accounts', 'target', 'insights', 'adconfig']) expect(byId(r, id).status, id).toBe('pass');
    expect(byId(r, 'target').detail).toMatch(/another Business.*Advanced access/);
    expect(byId(r, 'dataset:933962709362966').status).toBe('pass');
  });
  it('finds the dataset the ads actually use and flags a dead one (the "Pixel is not active" symptom) without changing anything', async () => {
    const g = fakeGraph(base);
    const r = await runAccessCheck(g.get, g.getAll, input);
    const dead = byId(r, 'dataset:2057270381542607');
    expect(dead.status).toBe('warn'); expect(dead.detail).toMatch(/40 day/);
    expect((r.checks.find((c) => c.id === 'dataset:2057270381542607') as { action?: { what: string } }).action?.what).toMatch(/ONE side only/);
  });
  it('an unassigned ad account is an ASSET-ASSIGNMENT gap with the exact next step, not an app problem', async () => {
    const g = fakeGraph({ ...base, 'me/adaccounts': [] });
    const r = await runAccessCheck(g.get, g.getAll, input);
    expect(r.targetVisible).toBe(false);
    expect(byId(r, 'target').status).toBe('fail');
    expect((r.checks.find((c) => c.id === 'target') as { action?: { what: string } }).action?.what).toMatch(/Accounts -> Ad accounts.*personal profile only.*partner/s);
    expect(g.calls).not.toContain(`${ACCT}/insights`); // nothing else is attempted on an account the token cannot see
  });
  it('the app being refused (permission) is reported as an App Review matter, separate from asset assignment', async () => {
    const g = fakeGraph(base, { [`${ACCT}/insights`]: { kind: 'permission', code: 200, message: 'requires ads_read' } });
    const r = await runAccessCheck(g.get, g.getAll, input);
    expect(byId(r, 'target').status).toBe('pass');          // the identity holds the account...
    expect(byId(r, 'insights').status).toBe('fail');        // ...but the app is refused
    expect((r.checks.find((c) => c.id === 'insights') as { action?: { who: string; what: string } }).action).toMatchObject({ who: 'Meta (App Review)' });
  });
  it('a missing permission, wrong app, near expiry and excess scopes are called out', async () => {
    const mk = (d: object) => fakeGraph({ ...base, debug_token: { data: { is_valid: true, type: 'USER', app_id: 'APP1', scopes: ['ads_read'], ...d } } });
    let g = mk({ scopes: ['public_profile'] }); expect(byId(await runAccessCheck(g.get, g.getAll, input), 'token_details').status).toBe('fail');
    g = mk({ app_id: 'OTHER' }); expect(byId(await runAccessCheck(g.get, g.getAll, input), 'token_details').detail).toMatch(/DIFFERENT app/);
    g = mk({ scopes: ['ads_read', 'ads_management'] }); expect(byId(await runAccessCheck(g.get, g.getAll, input), 'token_details').status).toBe('warn');
    g = mk({ expires_at: Math.floor(Date.now() / 1000) + 5 * 86400 }); expect(byId(await runAccessCheck(g.get, g.getAll, input), 'token_details').status).toBe('warn');
  });
  it('an expired token stops early with a regenerate instruction', async () => {
    const g = fakeGraph({}, { me: { kind: 'auth', code: 190, message: 'expired' } });
    const r = await runAccessCheck(g.get, g.getAll, input);
    expect(r.checks).toHaveLength(1); expect(r.checks[0]).toMatchObject({ status: 'fail', action: { who: 'you' } });
  });
  it('without app id/secret it says what it cannot know instead of guessing', async () => {
    const g = fakeGraph(base);
    expect(byId(await runAccessCheck(g.get, g.getAll, { ...input, appId: null, appSecret: null }), 'token_details').status).toBe('skip');
  });
  it('Conversions API token: reads the dataset only (never sends) and reports a token that cannot see it', async () => {
    const g = fakeGraph(base);
    const get: GraphGet = async (path, params, override) => { if (override === 'CAPI' && path === '933962709362966') throw new GraphError({ kind: 'permission', code: 200, message: 'no access', retryable: false, httpStatus: 403, subcode: null, fbtraceId: null }); return g.get(path, params, override); };
    const r = await runAccessCheck(get, g.getAll, { ...input, readDatasetWithToken: 'CAPI' });
    expect(byId(r, 'capi:933962709362966').status).toBe('fail');
    expect(g.calls.every((c) => !/\/events$/.test(c))).toBe(true); // no write endpoint is ever touched
  });
  it('tells personal-profile access from HQN-portfolio access by comparing two tokens', async () => {
    const seeing = fakeGraph(base), blind = fakeGraph({ ...base, 'me/adaccounts': [] });
    const personal = await runAccessCheck(seeing.get, seeing.getAll, input), system = await runAccessCheck(blind.get, blind.getAll, input);
    expect(whereDoesAccessLive(personal, system).verdict).toBe('personal_only');
    expect(whereDoesAccessLive(system, personal).verdict).toBe('system_user_only');
    expect(whereDoesAccessLive(personal, personal).verdict).toBe('both');
    expect(whereDoesAccessLive(system, system).verdict).toBe('neither');
    expect(whereDoesAccessLive(null, system).verdict).toBe('unknown');
  });
});

describe('the real Graph client used by the CLI', () => {
  it('only ever issues GET requests, with the token in the Authorization header and never in the URL', async () => {
    const seen: { url: string; method?: string; auth?: string }[] = [];
    const f = (async (url: string, init?: RequestInit) => { seen.push({ url, method: init?.method, auth: (init?.headers as Record<string, string>)?.Authorization }); return new Response(JSON.stringify({ data: [{ id: 1 }] }), { status: 200 }); }) as unknown as typeof fetch;
    await graphGet('me/adaccounts', { fields: 'id' }, { token: 'SECRET123', fetchImpl: f });
    await graphGetAll('act_1/insights', {}, { token: 'SECRET123', fetchImpl: f });
    for (const s of seen) { expect(s.method ?? 'GET').toBe('GET'); expect(s.auth).toBe('Bearer SECRET123'); expect(s.url).not.toContain('SECRET123'); }
    expect(classifyGraphError(403, { error: { code: 200, message: 'x' } }).kind).toBe('permission');
  });
});
