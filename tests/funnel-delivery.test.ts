import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ update: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => mocks }));
import { allowedWebhook, deliverPendingFunnels } from '@/lib/funnels/delivery';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
function database() {
  mocks.rpc.mockResolvedValue({ data: [{ id: 'event-1', session_id: 'session-1', integration_id: 'integration-1', attempts: 1 }], error: null });
  mocks.from.mockImplementation((table: string) => {
    const rows: Record<string, unknown> = {
      integrations: { config: { funnelWebhookUrl: 'https://services.leadconnectorhq.com/hooks/test' }, secret: 'secret', is_enabled: true },
      funnel_sessions: { id: 'session-1', funnel_id: 'funnel-1', lead_id: 'lead-1', contact: { firstName: 'Test' }, answers: { zip: '91301' }, attribution: { fbclid: 'click-1' }, qualified: true },
      funnels: { slug: 'test', contractor_id: 'client-1' },
    };
    return { select: () => ({ eq: () => ({ single: async () => ({ data: rows[table], error: null }) }) }),
      update: (data: unknown) => { mocks.update(data); return { eq: async () => ({ error: null }) }; } };
  });
}
describe('funnel CRM delivery', () => {
  it('rejects untrusted hosts, URL credentials, redirects and non-HTTPS destinations', () => {
    for (const url of ['http://services.leadconnectorhq.com/hook', 'https://localhost/hook', 'https://user:secret@services.leadconnectorhq.com/hook', 'https://services.leadconnectorhq.com:444/hook']) expect(() => allowedWebhook(url)).toThrow();
    expect(allowedWebhook('https://services.leadconnectorhq.com/hook')).toBe('https://services.leadconnectorhq.com/hook');
  });
  it('sends the client association, answers and attribution with a stable signed event ID', async () => {
    database(); const send = vi.fn().mockResolvedValue(new Response('{}', { status: 200 })); vi.stubGlobal('fetch', send);
    expect(await deliverPendingFunnels()).toEqual({ sent: 1, failed: 0 });
    const options = send.mock.calls[0][1];
    expect(JSON.parse(options.body)).toMatchObject({ clientId: 'client-1', sessionId: 'session-1', answers: { zip: '91301' }, attribution: { fbclid: 'click-1' } });
    expect(options.headers['X-HomeQuote-Event-Id']).toBe('event-1');
    expect(options.headers['X-HomeQuote-Signature']).toMatch(/^[a-f0-9]{64}$/);
    expect(options.redirect).toBe('error'); expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' }));
  });
  it('keeps failed deliveries retryable and never marks them sent', async () => {
    database(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private provider details', { status: 500 })));
    expect(await deliverPendingFunnels()).toEqual({ sent: 0, failed: 1 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', available_at: expect.any(String) }));
    expect(mocks.update).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' }));
    expect(JSON.stringify(mocks.update.mock.calls)).not.toContain('private provider details');
  });
});
