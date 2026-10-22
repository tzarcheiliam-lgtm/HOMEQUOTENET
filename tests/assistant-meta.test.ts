/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomBytes, randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

const h = vi.hoisted(() => ({ client: null as any }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.client }));
vi.mock('@/lib/emails/gmail', () => ({ sendGmailMessage: async () => ({ id: 'm', fromEmail: 'hq@test' }) }));
vi.mock('@/lib/actions/leads', () => ({ changeLeadStatus: vi.fn(), updateAssignmentStatus: vi.fn() }));

process.env.META_APP_ID = '1234567890'; process.env.META_APP_SECRET = 'app-secret-value'; process.env.META_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
delete process.env.META_CONVERSIONS_API_TOKEN;

import { blankFunnelConfig } from '@/lib/funnels/builder';
import { decideAction } from '@/lib/assistant/execute';
import { runTool, toolsFor } from '@/lib/assistant/registry';
import type { ToolContext, UiBlock } from '@/lib/assistant/tools';
import { metaAppConfig, openToken, sealToken, SCOPES_READ } from '@/lib/meta/setup/config';
import { canSetUpMeta, getConnection, saveConnection } from '@/lib/meta/setup/connections';
import { accountsFor, configureFunnelTracking, createDataset, datasetsFor, trackingStatus, verifyFunnelTracking, loadFunnelForActor } from '@/lib/meta/setup/funnel';
import { parseEventCounts } from '@/lib/meta/setup/graph';
import { adSetGuidance } from '@/lib/meta/setup/guidance';
import { authorizeUrl, exchangeCode, inspectToken, safeReturnPath, signState, verifyState } from '@/lib/meta/setup/oauth';
import { evaluate, type Observed } from '@/lib/meta/setup/verify';
import type { Profile } from '@/lib/types';

let pg: PGlite;
const id = Object.fromEntries(['admin', 'ownerA', 'staffA', 'ownerB', 'setter', 'companyA', 'companyB', 'funnelA', 'funnelB', 'funnelHouse'].map((k) => [k, randomUUID()])) as Record<string, string>;
const q = async (sql: string, p?: unknown[]) => (await pg.query<any>(sql, p)).rows;
const profile = (o: Partial<Profile>): Profile => ({
  id: id.ownerA, role: 'contractor', contractor_id: id.companyA, contractor_role: 'owner', can_export_company_data: false, full_name: 'Owner A', email: 'a@a.test', phone: null,
  is_active: true, account_status: 'active', last_login_at: null, deleted_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', ...o,
});
const ownerA = () => profile({}); const ownerB = () => profile({ id: id.ownerB, contractor_id: id.companyB });
const staffA = () => profile({ id: id.staffA, contractor_role: 'staff' });
const admin = () => profile({ id: id.admin, role: 'admin', contractor_id: null, contractor_role: null });
const setter = () => profile({ id: id.setter, role: 'setter', contractor_id: null, contractor_role: null });

/** A fake Graph API. `state` can be changed per test. */
const graph = { accounts: [{ id: 'act_1111111', name: 'Acme Ads', account_status: 1, currency: 'USD', business: { id: 'b1', name: 'Acme Business' } }],
  pixels: { act_1111111: [{ id: '123456789012345', name: 'Acme Pixel', last_fired_time: '2026-10-01T00:00:00+0000', creation_time: '2026-01-01T00:00:00+0000' }] } as Record<string, any[]>,
  stats: { WEB_ONLY: [{ data: [{ value: 'PageView', count: 10 }] }] as any, SERVER_ONLY: [{ data: [] }] as any }, posts: [] as string[], failWith: null as null | { status: number; body: any } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const fetchImpl = async (url: string | URL, init?: RequestInit) => {
  const u = new URL(String(url)); const path = u.pathname.replace(/^\/v[\d.]+\//, '');
  if (graph.failWith) return json(graph.failWith.body, graph.failWith.status);
  if (init?.method === 'POST' && path.endsWith('/adspixels')) { graph.posts.push(path); return json({ id: '999999999999999' }); }
  if (path === 'me/adaccounts') return json({ data: graph.accounts });
  const px = /^(act_\d+)\/adspixels$/.exec(path); if (px) return json({ data: graph.pixels[px[1]] ?? [] });
  const stats = /^(\d+)\/stats$/.exec(path); if (stats) return json({ data: graph.stats[(u.searchParams.get('event_source') ?? 'WEB_ONLY') as 'WEB_ONLY'] });
  const one = /^(\d+)$/.exec(path); if (one) return json(Object.values(graph.pixels).flat().find((p: any) => p.id === one[1]) ?? { error: { code: 100, message: 'x' } }, 200);
  return json({ error: { code: 100, message: 'unknown' } }, 400);
};
const deps = (p: Profile) => ({ admin: h.client, profile: p, fetchImpl: fetchImpl as any });

beforeAll(async () => {
  pg = await fullSchema({ supabaseGrants: true }); h.client = fakeSupabase(pg);
  await q(`insert into public.contractors(id,name) values ($1,'Acme'),($2,'Other')`, [id.companyA, id.companyB]);
  for (const [uid, role, company, crole] of [[id.admin, 'admin', null, null], [id.setter, 'setter', null, null], [id.ownerA, 'contractor', id.companyA, 'owner'], [id.staffA, 'contractor', id.companyA, 'staff'], [id.ownerB, 'contractor', id.companyB, 'owner']] as const) {
    await q(`insert into auth.users(id,email) values ($1,$2)`, [uid, `${uid}@t.test`]);
    await q(`update public.profiles set role=$2, contractor_id=$3, contractor_role=$4, is_active=true, account_status='active' where id=$1`, [uid, role, company, crole]);
  }
  const cfg = (name: string) => JSON.stringify(blankFunnelConfig(name, 'Pools'));
  await q(`insert into public.funnels(id,slug,contractor_id,status,config) values ($1,'acme','${id.companyA}','published',$2),($3,'other','${id.companyB}','published',$4),($5,'house',null,'published',$6)`, [id.funnelA, cfg('Acme'), id.funnelB, cfg('Other'), id.funnelHouse, cfg('House')]);
}, 240_000);
afterAll(async () => { await pg?.close(); });
beforeEach(() => { graph.failWith = null; graph.posts.length = 0; });

describe('Meta authorization (OAuth)', () => {
  const cfg = metaAppConfig()!;
  it('sends the user to Facebook with only the permission it needs and never the app secret', () => {
    const url = authorizeUrl(cfg, 'STATE', SCOPES_READ);
    expect(url.startsWith('https://www.facebook.com/')).toBe(true);
    expect(new URL(url).searchParams.get('scope')).toBe('ads_read'); expect(url).not.toContain(cfg.appSecret);
    expect(new URL(url).searchParams.get('client_id')).toBe(cfg.appId);
  });
  it('binds the state to the signed-in user, a cookie nonce and an expiry (CSRF protection)', () => {
    const { state, nonce } = signState(cfg.appSecret, { u: 'user-1', c: 'co-1', lvl: 'read', r: '/app' }, 1_000);
    expect(verifyState(cfg.appSecret, state, nonce, 'user-1', 2_000)).toMatchObject({ u: 'user-1', c: 'co-1' });
    expect(verifyState(cfg.appSecret, state, nonce, 'someone-else', 2_000)).toBeNull(); // a link started by another user
    expect(verifyState(cfg.appSecret, state, 'wrong-nonce', 'user-1', 2_000)).toBeNull(); // no matching cookie
    expect(verifyState(cfg.appSecret, state, null, 'user-1', 2_000)).toBeNull();
    expect(verifyState(cfg.appSecret, state, nonce, 'user-1', 1_000 + 11 * 60_000)).toBeNull(); // expired
    expect(verifyState('other-secret', state, nonce, 'user-1', 2_000)).toBeNull();
    const [payload, mac] = state.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), c: 'victim-company' })).toString('base64url');
    expect(verifyState(cfg.appSecret, `${forged}.${mac}`, nonce, 'user-1', 2_000)).toBeNull(); // cannot retarget another company
  });
  it('only returns to pages inside the app', () => {
    expect(safeReturnPath('/app/funnels')).toBe('/app/funnels'); expect(safeReturnPath('https://evil.test')).toBe('/app'); expect(safeReturnPath('//evil.test')).toBe('/app'); expect(safeReturnPath('/app//x')).toBe('/app'); expect(safeReturnPath(null)).toBe('/app');
  });
  it('exchanges the code for a long-lived token on the server and checks it belongs to our app and the user', async () => {
    const calls: string[] = [];
    const f = (async (url: string) => { calls.push(url); const u = new URL(url);
      if (u.pathname.endsWith('/oauth/access_token')) return json(u.searchParams.get('grant_type') === 'fb_exchange_token' ? { access_token: 'LONG', expires_in: 5_183_944 } : { access_token: 'SHORT' });
      if (u.pathname.endsWith('/debug_token')) return json({ data: { is_valid: true, app_id: cfg.appId, user_id: 'meta-u1', scopes: ['ads_read'], expires_at: 1_900_000_000 } });
      return json({}, 404); }) as any;
    expect((await exchangeCode(cfg, 'CODE', f)).token).toBe('LONG');
    expect(calls[0]).toContain('client_secret=' + cfg.appSecret); expect(calls[1]).toContain('fb_exchange_token=SHORT'); // secret only ever goes server-to-Meta
    expect(await inspectToken(cfg, 'LONG', f)).toMatchObject({ isValid: true, appId: cfg.appId, userId: 'meta-u1', scopes: ['ads_read'] });
  });
  it('encrypts stored tokens', () => {
    const sealed = sealToken('EAAB-secret-token');
    expect(sealed).not.toContain('EAAB'); expect(openToken(sealed)).toBe('EAAB-secret-token');
  });
});

describe('who may connect Meta and set up tracking', () => {
  it('allows admins and company owners only', () => {
    expect(canSetUpMeta(admin())).toBe(true); expect(canSetUpMeta(ownerA())).toBe(true);
    expect(canSetUpMeta(staffA())).toBe(false); expect(canSetUpMeta(setter())).toBe(false);
    expect(canSetUpMeta(profile({ contractor_id: null }))).toBe(false); expect(canSetUpMeta(profile({ is_active: false }))).toBe(false);
    expect(toolsFor(staffA()).map((t) => t.name)).not.toContain('meta_list_assets');
  });
  it('keeps one company’s connection invisible to another', async () => {
    await saveConnection(h.client, { contractorId: id.companyA, connectedBy: id.ownerA, metaUserId: 'mu-a', metaUserName: 'Alice A', scopes: ['ads_read'], expiresAt: new Date(Date.now() + 86_400_000 * 30), token: 'TOKEN-A' });
    await saveConnection(h.client, { contractorId: id.companyB, connectedBy: id.ownerB, metaUserId: 'mu-b', metaUserName: 'Bob B', scopes: ['ads_read', 'ads_management'], expiresAt: new Date(Date.now() + 86_400_000 * 30), token: 'TOKEN-B' });
    expect((await getConnection(h.client, ownerA()))?.metaUserName).toBe('Alice A');
    expect((await getConnection(h.client, ownerB()))?.canCreateDataset).toBe(true);
    expect(await getConnection(h.client, admin())).toBeNull(); // HomeQuote's own connection is separate (none yet)
    expect(await getConnection(h.client, staffA())).toBeNull();
    const secrets = await q(`select token_enc from public.meta_connection_secrets`);
    expect(secrets).toHaveLength(2);
    expect(secrets.every((s) => !/TOKEN-/.test(s.token_enc))).toBe(true);
  });
  it('treats an expired authorization as needing a reconnect', async () => {
    await saveConnection(h.client, { contractorId: id.companyB, connectedBy: id.ownerB, metaUserId: 'mu-b', metaUserName: 'Bob B', scopes: ['ads_read', 'ads_management'], expiresAt: new Date(Date.now() - 1000), token: 'TOKEN-B' });
    expect((await getConnection(h.client, ownerB()))?.status).toBe('needs_reconnect');
    expect(await accountsFor(deps(ownerB()))).toMatchObject({ ok: false, error: 'needs_reconnect' });
    await saveConnection(h.client, { contractorId: id.companyB, connectedBy: id.ownerB, metaUserId: 'mu-b', metaUserName: 'Bob B', scopes: ['ads_read', 'ads_management'], expiresAt: new Date(Date.now() + 86_400_000), token: 'TOKEN-B' });
  });
});

describe('only assets the connected user is authorized for', () => {
  it('lists the user’s own ad accounts and datasets', async () => {
    const a = await accountsFor(deps(ownerA()));
    expect(a.ok && a.items.map((x) => x.id)).toEqual(['act_1111111']);
    const d = await datasetsFor(deps(ownerA()), 'act_1111111');
    expect(d.ok && d.items.map((x) => x.id)).toEqual(['123456789012345']);
  });
  it('refuses an ad account that is not in the user’s own list', async () => {
    expect(await datasetsFor(deps(ownerA()), 'act_9999999')).toMatchObject({ ok: false, error: 'permission' });
  });
  it('reports a Meta permission / app-review block honestly and does not pretend', async () => {
    graph.failWith = { status: 403, body: { error: { code: 200, message: 'Requires ads_read permission (app in development mode)' } } };
    const r = await accountsFor(deps(ownerA()));
    expect(r).toMatchObject({ ok: false, error: 'permission' }); expect((r as any).message).toMatch(/access level|App Review|does not have access/i);
  });
  it('flags an expired token as needing reconnect and stores that', async () => {
    graph.failWith = { status: 401, body: { error: { code: 190, message: 'Invalid OAuth 2.0 access token' } } };
    expect(await accountsFor(deps(ownerA()))).toMatchObject({ ok: false, error: 'needs_reconnect' });
    expect((await q(`select status from public.meta_connections where contractor_id=$1`, [id.companyA]))[0].status).toBe('needs_reconnect');
    await saveConnection(h.client, { contractorId: id.companyA, connectedBy: id.ownerA, metaUserId: 'mu-a', metaUserName: 'Alice A', scopes: ['ads_read'], expiresAt: new Date(Date.now() + 86_400_000 * 30), token: 'TOKEN-A' });
  });
});

describe('attaching a dataset to a funnel', () => {
  const input = { funnelId: '', adAccountId: 'act_1111111', datasetId: '123456789012345' };
  it('only lets an owner configure their own company’s funnel, and never staff or another company', async () => {
    expect(await configureFunnelTracking(deps(ownerB()), { ...input, funnelId: id.funnelA }, 'a1')).toMatchObject({ ok: false, error: expect.stringMatching(/not found or access denied/i) });
    expect(await configureFunnelTracking(deps(staffA()), { ...input, funnelId: id.funnelA }, 'a1')).toMatchObject({ ok: false, error: expect.stringMatching(/not found or access denied/i) });
    expect(await configureFunnelTracking(deps(ownerA()), { ...input, funnelId: id.funnelHouse }, 'a1')).toMatchObject({ ok: false }); // a HomeQuote house funnel is not theirs
    expect(await loadFunnelForActor(h.client, ownerA(), id.funnelB)).toBeNull();
    expect((await loadFunnelForActor(h.client, admin(), id.funnelB))?.slug).toBe('other');
  });
  it('refuses a dataset or account the connected login cannot see', async () => {
    expect(await configureFunnelTracking(deps(ownerA()), { ...input, funnelId: id.funnelA, datasetId: '555555555555555' }, 'a1')).toMatchObject({ ok: false, error: expect.stringMatching(/not available/i) });
    expect(await configureFunnelTracking(deps(ownerA()), { ...input, funnelId: id.funnelA, adAccountId: 'act_2222222' }, 'a1')).toMatchObject({ ok: false });
    expect((await q(`select config from public.funnels where id=$1`, [id.funnelA]))[0].config.trackingPixels?.metaPixelId).toBeUndefined();
  });
  it('connects an existing dataset: updates only the pixel id, keeps consent, records who approved', async () => {
    const before = (await q(`select config from public.funnels where id=$1`, [id.funnelA]))[0].config;
    const r = await configureFunnelTracking(deps(ownerA()), { ...input, funnelId: id.funnelA }, 'action-77');
    expect(r).toMatchObject({ ok: true, previousDatasetId: null, unchanged: false });
    const after = (await q(`select config from public.funnels where id=$1`, [id.funnelA]))[0].config;
    expect(after.trackingPixels.metaPixelId).toBe('123456789012345');
    expect(after.trackingPixels.consentMode).toBe(before.trackingPixels.consentMode); // consent behaviour is never changed
    expect({ ...after, trackingPixels: undefined }).toEqual({ ...before, trackingPixels: undefined });
    expect((await q(`select dataset_id, ad_account_id, configured_by from public.meta_funnel_tracking where funnel_id=$1`, [id.funnelA]))[0]).toEqual({ dataset_id: '123456789012345', ad_account_id: 'act_1111111', configured_by: id.ownerA });
    expect((await q(`select action, metadata from public.meta_setup_log where funnel_id=$1`, [id.funnelA]))[0]).toMatchObject({ action: 'funnel_tracking_configured', metadata: { assistant_action_id: 'action-77', approved_by: id.ownerA, dataset_id: '123456789012345' } });
  });
  it('is idempotent: connecting the same dataset again changes nothing', async () => {
    const again = await configureFunnelTracking(deps(ownerA()), { ...input, funnelId: id.funnelA }, 'action-78');
    expect(again).toMatchObject({ ok: true, unchanged: true });
  });
});

describe('creating a dataset: reuse first, only with permission', () => {
  it('reuses an existing dataset instead of creating a duplicate', async () => {
    const r = await createDataset(deps(ownerB()), { adAccountId: 'act_1111111', name: 'New' }, 'c1'); // owner B has ads_management in this test world
    expect(r).toMatchObject({ ok: true, created: false, datasetId: '123456789012345' }); expect(graph.posts).toHaveLength(0);
  });
  it('refuses without the ads_management permission', async () => {
    expect(await createDataset(deps(ownerA()), { adAccountId: 'act_1111111', name: 'New' }, 'c2')).toMatchObject({ ok: false, error: expect.stringMatching(/permission/i) });
    expect(graph.posts).toHaveLength(0);
  });
  it('creates one only when the account has none', async () => {
    graph.pixels.act_1111111 = [];
    const r = await createDataset(deps(ownerB()), { adAccountId: 'act_1111111', name: 'Fresh' }, 'c3');
    expect(r).toMatchObject({ ok: true, created: true, datasetId: '999999999999999' }); expect(graph.posts).toHaveLength(1);
    graph.pixels.act_1111111 = [{ id: '123456789012345', name: 'Acme Pixel', last_fired_time: '2026-10-01T00:00:00+0000' }];
  });
});

describe('verification never overstates', () => {
  const base: Observed = { configuredAt: '2026-10-10T00:00:00Z', funnelPublished: true, isDemo: false, consentMode: 'opt_in', serverTokenPresent: false, pixelUnavailable: false,
    pixelLastFiredAt: null, browserCounts: null, serverCounts: null, ledgerAcceptedLeads: 0, checkedAt: '2026-10-18T00:00:00Z' };
  it('is only "installed" until Meta reports activity after setup', () => {
    expect(evaluate(base).level).toBe('installed');
    expect(evaluate({ ...base, ledgerAcceptedLeads: 5 }).level).toBe('installed'); // an accepted API request is not verification
    expect(evaluate({ ...base, pixelLastFiredAt: '2026-10-01T00:00:00Z' }).level).toBe('installed'); // fired, but before this funnel was connected
  });
  it('is "receiving" when the pixel fired after setup but no Lead was seen', () => {
    expect(evaluate({ ...base, pixelLastFiredAt: '2026-10-17T00:00:00Z', browserCounts: { PageView: 4 } }).level).toBe('receiving');
  });
  it('is only "verified" when Meta itself reports Lead events after setup (and server events when server tracking is on)', () => {
    const seen = { ...base, pixelLastFiredAt: '2026-10-17T00:00:00Z', browserCounts: { PageView: 4, Lead: 2 } };
    expect(evaluate(seen).level).toBe('verified');
    expect(evaluate({ ...seen, serverTokenPresent: true }).level).toBe('receiving'); // server tracking is on but nothing seen yet
    expect(evaluate({ ...seen, serverTokenPresent: true, serverCounts: { Lead: 1 } }).level).toBe('verified');
    expect(evaluate({ ...seen, funnelPublished: false }).level).toBe('receiving');
    expect(evaluate({ ...seen, pixelUnavailable: true }).level).toBe('receiving');
  });
  it('treats unreadable stats as unknown, not as zero or success', () => {
    const r = evaluate({ ...base, pixelLastFiredAt: '2026-10-17T00:00:00Z', browserCounts: null });
    expect(r.level).toBe('receiving'); expect(r.checks.find((c) => c.id === 'browser_lead')?.state).toBe('unknown');
  });
  it('never claims de-duplication was confirmed, and explains opt-in consent honestly', () => {
    const r = evaluate(base);
    expect(r.checks.find((c) => c.id === 'dedup')?.state).toBe('unknown');
    expect(r.checks.find((c) => c.id === 'consent')?.detail).toMatch(/intentional/);
    expect(r.checks.find((c) => c.id === 'published')?.state).toBe('ok');
    expect(evaluate({ ...base, funnelPublished: false }).checks.find((c) => c.id === 'published')?.state).toBe('bad');
  });
  it('parses only the event-count shape it recognises', () => {
    expect(parseEventCounts([{ data: [{ value: 'Lead', count: 3 }, { value: 'Lead', count: 2 }] }])).toEqual({ Lead: 5 });
    expect(parseEventCounts([])).toEqual({}); expect(parseEventCounts([{ weird: true }])).toBeNull(); expect(parseEventCounts('nope')).toBeNull();
  });

  it('reads Meta’s own data end to end and reports what it found', async () => {
    graph.pixels.act_1111111 = [{ id: '123456789012345', name: 'Acme Pixel', last_fired_time: '2026-12-31T00:00:00+0000' }];
    graph.stats.WEB_ONLY = [{ data: [{ value: 'PageView', count: 9 }] }];
    const noLead = await verifyFunnelTracking(deps(ownerA()), id.funnelA);
    expect(noLead && noLead.level).toBe('receiving');
    expect((await q(`select verified_at from public.meta_funnel_tracking where funnel_id=$1`, [id.funnelA]))[0].verified_at).toBeNull();
    graph.stats.WEB_ONLY = [{ data: [{ value: 'PageView', count: 9 }, { value: 'Lead', count: 2 }] }];
    const withLead = await verifyFunnelTracking(deps(ownerA()), id.funnelA);
    expect(withLead && withLead.level).toBe('verified');
    const row = (await q(`select verified_at, verification from public.meta_funnel_tracking where funnel_id=$1`, [id.funnelA]))[0];
    expect(row.verified_at).toBeTruthy(); expect(row.verification.checkedAt).toBeTruthy();
    const status = await trackingStatus(deps(ownerA()), id.funnelA);
    expect(status).toMatchObject({ level: 'verified', browser: 'on', server: 'off_no_token', tracking: { datasetId: '123456789012345' } });
    expect(await trackingStatus(deps(ownerB()), id.funnelA)).toBeNull(); // another company cannot read this status
  });
  it('says so when Meta cannot be read at all, rather than guessing', async () => {
    graph.failWith = { status: 403, body: { error: { code: 200, message: 'permissions' } } };
    const r = await verifyFunnelTracking(deps(ownerA()), id.funnelA);
    expect(r && 'metaReadError' in r && r.metaReadError).toMatch(/Meta did not allow/);
    expect(r && r.level).not.toBe('verified');
  });
});

describe('ad set guidance only advises', () => {
  it('explains the relationships and the exact settings, and says nothing was applied', () => {
    const g = adSetGuidance({ pixelId: '123456789012345', funnelUrl: 'https://homequotenet.com/estimate/acme' });
    expect(g.applied).toBe(false);
    expect(g.apiView.promoted_object).toEqual({ pixel_id: '123456789012345', custom_event_type: 'LEAD' });
    expect(g.urlParameters).toMatch(/utm_source=facebook/); expect(g.urlParameters).toMatch(/ad_id=\{\{ad\.id\}\}/);
    expect(g.deliveryImplications.join(' ')).toMatch(/learning phase/); expect(g.deliveryImplications.join(' ')).toMatch(/does not edit active campaigns/);
    expect(g.relationships.join(' ')).toMatch(/ad does not need the pixel ID/);
  });
});

describe('through the assistant', () => {
  const ctx = (p: Profile, blocks: UiBlock[] = []): ToolContext => ({ db: h.client, admin: h.client, profile: p, tz: 'America/Los_Angeles', conversationId: '', now: new Date(), onBlock: (b) => blocks.push(b), fetchImpl: fetchImpl as any });
  it('shows selection cards from the user’s own authorized assets, never raw ids to paste', async () => {
    const blocks: UiBlock[] = [];
    const r = await runTool(ctx(ownerA(), blocks), 'meta_list_assets', {});
    expect(blocks[0]).toMatchObject({ type: 'cards', kind: 'ad_account' }); expect((blocks[0] as any).items.map((i: any) => i.id)).toEqual(['act_1111111']);
    expect(JSON.stringify(r.result)).not.toMatch(/TOKEN-A|access_token/);
  });
  it('rejects a dataset id the model made up, before any proposal exists', async () => {
    const conv = randomUUID(); await q(`insert into public.assistant_conversations(id,user_id,title) values ($1,$2,'t')`, [conv, id.ownerA]);
    const c = { ...ctx(ownerA()), conversationId: conv };
    expect((await runTool(c, 'propose_meta_funnel_tracking', { funnel_id: id.funnelA, ad_account_id: 'act_1111111', dataset_id: '777777777777777' })).result).toEqual({ error: 'dataset_not_available_to_you' });
    expect((await runTool(c, 'propose_meta_funnel_tracking', { funnel_id: id.funnelB, ad_account_id: 'act_1111111', dataset_id: '123456789012345' })).result).toEqual({ error: 'not_found' }); // another company’s funnel
    expect(await q(`select 1 from public.assistant_actions where conversation_id=$1`, [conv])).toHaveLength(0);
  });
  it('proposes the change with the exact before/after, applies nothing until confirmed, then confirms with the backend result', async () => {
    await q(`update public.funnels set config = jsonb_set(config, '{trackingPixels,metaPixelId}', 'null'::jsonb) - 'x' where id=$1`, [id.funnelA]).catch(() => undefined);
    await q(`delete from public.meta_funnel_tracking where funnel_id=$1`, [id.funnelA]);
    await q(`update public.funnels set config = config #- '{trackingPixels,metaPixelId}' where id=$1`, [id.funnelA]);
    const conv = randomUUID(); await q(`insert into public.assistant_conversations(id,user_id,title) values ($1,$2,'t')`, [conv, id.ownerA]);
    const c = { ...ctx(ownerA()), conversationId: conv };
    const prop = await runTool(c, 'propose_meta_funnel_tracking', { funnel_id: id.funnelA, ad_account_id: 'act_1111111', dataset_id: '123456789012345' });
    expect(prop.isError).toBe(false);
    const action = (await q(`select id, kind, status, preview from public.assistant_actions where conversation_id=$1`, [conv]))[0];
    expect(action).toMatchObject({ kind: 'configure_meta_tracking', status: 'proposed' });
    expect(action.preview.lines.join('\n')).toMatch(/\(none\) → 123456789012345/); expect(action.preview.lines.join('\n')).toMatch(/No ads, campaigns or budgets are touched/);
    expect((await q(`select config from public.funnels where id=$1`, [id.funnelA]))[0].config.trackingPixels.metaPixelId).toBeUndefined(); // proposing changed nothing
    const done = await decideAction({ db: h.client, admin: h.client, profile: ownerA(), tz: 'x', fetchImpl: fetchImpl as any }, action.id, 'confirm');
    expect(done).toMatchObject({ ok: true, action: { status: 'executed', result: { message: expect.stringMatching(/not verified yet/i) } } });
    expect((await q(`select config from public.funnels where id=$1`, [id.funnelA]))[0].config.trackingPixels.metaPixelId).toBe('123456789012345');
    expect((await q(`select metadata->>'approved_by' as who from public.meta_setup_log where action='funnel_tracking_configured' order by id desc limit 1`))[0].who).toBe(id.ownerA);
    // and it fails closed when Meta no longer lists the dataset at confirmation time
    const c2 = randomUUID(); await q(`insert into public.assistant_conversations(id,user_id,title) values ($1,$2,'t')`, [c2, id.ownerA]);
    await runTool({ ...ctx(ownerA()), conversationId: c2 }, 'propose_meta_funnel_tracking', { funnel_id: id.funnelA, ad_account_id: 'act_1111111', dataset_id: '123456789012345' });
    const second = (await q(`select id from public.assistant_actions where conversation_id=$1`, [c2]))[0];
    graph.pixels.act_1111111 = [];
    expect(await decideAction({ db: h.client, admin: h.client, profile: ownerA(), tz: 'x', fetchImpl: fetchImpl as any }, second.id, 'confirm')).toMatchObject({ ok: true, action: { status: 'failed' } });
    graph.pixels.act_1111111 = [{ id: '123456789012345', name: 'Acme Pixel', last_fired_time: '2026-10-01T00:00:00+0000' }];
  });
  it('lets only admins and owners see Meta tools, and says what it cannot do', () => {
    const names = (p: Profile) => toolsFor(p).map((t) => t.name);
    expect(names(ownerA())).toContain('meta_guided_test'); expect(names(staffA())).not.toContain('meta_guided_test'); expect(names(setter())).not.toContain('meta_check_tracking');
    expect(names(admin())).not.toContain('publish_ad'); // there is no tool that publishes ads, changes budgets or edits campaigns
    expect(names(admin()).filter((n) => /publish|budget|campaign|spend/i.test(n))).toEqual([]);
  });
  it('gives the honest guided-test caveats', async () => {
    const r = await runTool(ctx(ownerA()), 'meta_guided_test', {});
    expect(JSON.stringify(r.result)).toMatch(/NOT sandboxed/); expect(JSON.stringify(r.result)).toMatch(/never submits forms/);
  });
});
