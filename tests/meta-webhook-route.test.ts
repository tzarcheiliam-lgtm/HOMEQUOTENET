import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type TestIntegration = { id: string; secret: string; is_enabled: boolean; config: Record<string, unknown> };
const mocks = vi.hoisted(() => ({ integration: null as unknown as TestIntegration, ingest: vi.fn(), touch: vi.fn(), inserts: [] as Record<string, unknown>[] }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => ({ insert: async (row: Record<string, unknown>) => { mocks.inserts.push(row); return {}; }, select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: mocks.integration }) }) }) }) }) }) }),
}));
vi.mock('@/lib/integrations/intake', () => ({ ingestLead: mocks.ingest, touchIntegration: mocks.touch }));

import { GET, POST } from '@/app/api/integrations/meta/webhook/route';

const APP_SECRET = 'test_app_secret';
const envelope = (leadgenId = '444444444444444', pageId = 'page-1') => JSON.stringify({
  object: 'page', entry: [{ id: pageId, changes: [{ field: 'leadgen', value: { leadgen_id: leadgenId, form_id: 'form-9', ad_id: 'a1' } }] }],
});
const sign = (body: string, secret = APP_SECRET) => 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');
const post = (body: string, signature: string | null) => POST(new NextRequest('https://crm.test/api/integrations/meta/webhook', {
  method: 'POST', body, headers: signature ? { 'x-hub-signature-256': signature } : {},
}));
const graphLead = { id: '444444444444444', created_time: '2026-10-01T10:00:00+0000', platform: 'fb', field_data: [{ name: 'email', values: ['jordan@example.com'] }] };

beforeEach(() => {
  mocks.integration = { id: 'int-1', secret: 'verify-me', is_enabled: true, config: { app_secret: APP_SECRET, page_access_token: 'tok', page_id: 'page-1' } };
  mocks.ingest.mockReset().mockResolvedValue({ status: 'created', leadId: 'lead-1' });
  mocks.touch.mockReset();
  mocks.inserts.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('Meta webhook security', () => {
  it('echoes the challenge only for the right verify token', async () => {
    const url = (t: string) => new NextRequest(`https://crm.test/api/integrations/meta/webhook?hub.mode=subscribe&hub.verify_token=${t}&hub.challenge=987`);
    expect(await (await GET(url('verify-me'))).text()).toBe('987');
    expect((await GET(url('wrong'))).status).toBe(403);
  });
  it('rejects missing, forged and tampered signatures before touching Graph or the database', async () => {
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy);
    const body = envelope();
    expect((await post(body, null)).status).toBe(401);
    expect((await post(body, sign(body, 'attacker'))).status).toBe(401);
    expect((await post(body + ' ', sign(body))).status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled(); expect(mocks.ingest).not.toHaveBeenCalled();
  });
  it('fails closed when no app secret is configured', async () => {
    mocks.integration.config.app_secret = null;
    const body = envelope();
    expect((await post(body, sign(body))).status).toBe(401);
  });
  it('answers 503 (so Meta retries) without importing when the integration is disabled', async () => {
    mocks.integration.is_enabled = false;
    const body = envelope();
    expect((await post(body, sign(body))).status).toBe(503); expect(mocks.ingest).not.toHaveBeenCalled();
  });
  it('ignores leads from a Page other than the configured one', async () => {
    const send = vi.fn(); vi.stubGlobal('fetch', send);
    const body = envelope('L9', 'someone-elses-page');
    const res = await post(body, sign(body));
    expect(res.status).toBe(200); expect(await res.json()).toMatchObject({ skipped: 1, created: 0 });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('Meta webhook import', () => {
  it('fetches the lead from Graph and imports the merged answers and identifiers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(graphLead), { status: 200 })));
    const body = envelope();
    const res = await post(body, sign(body));
    expect(await res.json()).toMatchObject({ received: 1, created: 1, fetchFailures: 0 });
    expect(mocks.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jordan@example.com', external_lead_id: '444444444444444', form_id: 'form-9', page_id: 'page-1', platform: 'facebook' }),
      expect.objectContaining({ integrationId: 'int-1', provider: 'meta' }),
    );
  });
  it('returns 500 so Meta redelivers, and imports nothing, when the lead cannot be retrieved', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
    const body = envelope();
    const res = await post(body, sign(body));
    expect(res.status).toBe(500); expect(await res.json()).toMatchObject({ fetchFailures: 1, created: 0 });
    expect(mocks.ingest).not.toHaveBeenCalled();
    expect(mocks.touch).toHaveBeenCalledWith('int-1', expect.objectContaining({ error: expect.any(String) }));
  });
  it('flags an expired token on the integration and never logs the token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":{"code":190}}', { status: 400 })));
    const body = envelope();
    expect((await post(body, sign(body))).status).toBe(500);
    expect(mocks.touch.mock.calls[0][1].error).toMatch(/reconnect/i);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('tok');
  });
  it('treats a re-delivered lead as a harmless duplicate (200, nothing new created)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(graphLead), { status: 200 })));
    mocks.ingest.mockResolvedValueOnce({ status: 'created', leadId: 'lead-1' }).mockResolvedValueOnce({ status: 'duplicate', duplicateOf: 'lead-1', redelivery: true });
    const body = envelope(); const signature = sign(body);
    expect(await (await post(body, signature)).json()).toMatchObject({ created: 1, duplicate: 0 });
    const second = await post(body, signature);
    expect(second.status).toBe(200); expect(await second.json()).toMatchObject({ created: 0, duplicate: 1 });
  });
  it('returns 500 when the lead could not be stored so Meta retries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(graphLead), { status: 200 })));
    mocks.ingest.mockResolvedValue({ status: 'error', error: 'db down' });
    const body = envelope();
    expect((await post(body, sign(body))).status).toBe(500);
  });
});

describe('Meta webhook with several Pages', () => {
  const POOL_PAGE = '835963602930453';
  const CONTRACTOR = '2b1f6c1e-6a5e-4b52-9d0e-1c0f6f0a7a11';
  const bearer = (call: unknown[]) => ((call[1] as { headers: { Authorization: string } }).headers.Authorization);
  beforeEach(() => {
    mocks.integration.config.pages = [{ page_id: POOL_PAGE, label: 'Pool Masters Inc.', contractor_id: CONTRACTOR, sender_name: 'Pool Masters' }];
    vi.stubEnv('META_PAGE_ACCESS_TOKEN', '');
    vi.stubEnv(`META_PAGE_ACCESS_TOKEN_${POOL_PAGE}`, 'pool-page-token');
  });

  it('still imports the original HomeQuote Page as a house lead, with the shared token', async () => {
    const send = vi.fn().mockResolvedValue(new Response(JSON.stringify(graphLead), { status: 200 })); vi.stubGlobal('fetch', send);
    const body = envelope('L1', 'page-1');
    expect((await post(body, sign(body))).status).toBe(200);
    expect(bearer(send.mock.calls[0])).toBe('Bearer tok');
    expect(mocks.ingest).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ contractorId: null, senderName: null }));
  });

  it('routes a Pool Masters lead to its contractor and sender, fetched with the own token of that Page', async () => {
    const send = vi.fn().mockResolvedValue(new Response(JSON.stringify(graphLead), { status: 200 })); vi.stubGlobal('fetch', send);
    const body = envelope('L2', POOL_PAGE);
    const res = await post(body, sign(body));
    expect(await res.json()).toMatchObject({ created: 1, skipped: 0 });
    expect(bearer(send.mock.calls[0])).toBe('Bearer pool-page-token');
    expect(mocks.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ page_id: POOL_PAGE }),
      expect.objectContaining({ contractorId: CONTRACTOR, senderName: 'Pool Masters' }),
    );
  });

  it('logs and skips a Page that is not configured (2xx so Meta does not redeliver)', async () => {
    const send = vi.fn(); vi.stubGlobal('fetch', send);
    const body = envelope('L3', 'stranger-page');
    const res = await post(body, sign(body));
    expect(res.status).toBe(200); expect(await res.json()).toMatchObject({ skipped: 1, created: 0 });
    expect(send).not.toHaveBeenCalled(); expect(mocks.ingest).not.toHaveBeenCalled();
    expect(mocks.inserts).toEqual([expect.objectContaining({ status: 'skipped', page_id: 'stranger-page', external_lead_id: 'L3' })]);
  });

  it('answers 500 with an intake error row when the Page token is rejected, and never logs a token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":{"code":190}}', { status: 400 })));
    const body = envelope('L4', POOL_PAGE);
    const res = await post(body, sign(body));
    expect(res.status).toBe(500); expect(await res.json()).toMatchObject({ fetchFailures: 1, created: 0 });
    expect(mocks.inserts).toEqual([expect.objectContaining({ status: 'error', page_id: POOL_PAGE, error: expect.stringContaining('auth') })]);
    expect(mocks.ingest).not.toHaveBeenCalled();
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls) + JSON.stringify(mocks.inserts);
    expect(logged).not.toContain('pool-page-token'); expect(logged).not.toContain('tok"');
  });

  it('answers 500 with an intake error row when no token exists for the Page', async () => {
    vi.stubEnv(`META_PAGE_ACCESS_TOKEN_${POOL_PAGE}`, '');
    mocks.integration.config.page_access_token = null;
    const send = vi.fn(); vi.stubGlobal('fetch', send);
    const body = envelope('L5', POOL_PAGE);
    expect((await post(body, sign(body))).status).toBe(500);
    expect(send).not.toHaveBeenCalled();
    expect(mocks.inserts).toEqual([expect.objectContaining({ status: 'error', error: expect.stringContaining('missing_token') })]);
  });
});
