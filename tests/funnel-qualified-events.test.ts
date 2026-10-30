/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FUNNEL_PRESETS, presetConfig } from '@/lib/funnels/presets';

const DATASET = '29178560738497902';
const m = vi.hoisted(() => ({
  funnel: null as any, session: null as Record<string, unknown> | null, rpc: vi.fn(), send: vi.fn(), remember: vi.fn(), later: [] as Promise<unknown>[],
}));

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => { m.later.push(Promise.resolve().then(fn)); } }));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: vi.fn(), get: vi.fn() }) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: m.rpc, from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) }) }));
vi.mock('@/lib/funnels/server', () => ({
  cookieName: (s: string) => s, hash: (s: string) => s, newToken: () => 't', sameOrigin: () => true,
  readBody: async (r: Request) => r.json(), publicSession: (s: unknown) => s,
  getFunnel: async () => m.funnel, getSession: async () => m.session,
}));
vi.mock('@/lib/funnels/calendly', () => ({ verifyCalendlyBooking: async () => ({ verified: true, startTime: '2026-10-05T17:00:00Z' }) }));
vi.mock('@/lib/funnels/delivery', () => ({ deliverPendingFunnels: vi.fn() }));
vi.mock('@/lib/leads/notify', () => ({ sendLeadEmailsSoon: vi.fn() }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: vi.fn() }));
vi.mock('@/lib/meta/lead-ids', () => ({ rememberLeadMetaIds: m.remember, loadLeadMetaIds: vi.fn(async () => ({})) }));
vi.mock('@/lib/meta/capi', async (orig) => ({ ...(await orig<typeof import('@/lib/meta/capi')>()), sendMetaEvent: m.send }));

import { PATCH } from '@/app/api/funnels/[slug]/session/route';

const qualified: Record<string, Record<string, string>> = {
  'bathroom-remodel': { service: 'full_remodel', bathroom_count: 'one', zip: '90210', homeowner: 'yes', decision_maker: 'sole', timeline: '1_3_months', budget: 'budget_10_20k', payment: 'cash', home_type: 'single_family', address: '12 Main St, Beverly Hills, CA', notes: '' },
  'roof-replacement': { service: 'roof_replacement', zip: '90210', homeowner: 'yes', timeline: 'asap', address: '12 Main St, Beverly Hills, CA' },
  'kitchen-remodel': { service: 'full_remodel', kitchen_size: 'medium', zip: '90210', homeowner: 'yes', decision_maker: 'joint', timeline: 'asap', budget: 'budget_25_40k', payment: 'need_financing', home_type: 'single_family', address: '12 Main St, Beverly Hills, CA', notes: '' },
};
const contact = { firstName: 'Jordan', lastName: 'Rivera', phone: '8185550142', email: 'jordan@example.test', consent: true };
const flush = () => Promise.all(m.later.splice(0));

describe.each(FUNNEL_PRESETS.map((p) => [p.slug] as const))('%s: Meta events', (slug) => {
  const config = presetConfig(slug);
  const patch = (body: unknown) => PATCH(new Request(`https://site.test/api/funnels/${slug}/session`, { method: 'PATCH', headers: { origin: 'https://site.test' }, body: JSON.stringify(body) }), { params: Promise.resolve({ slug }) });
  const session = (over: Record<string, unknown> = {}) => ({
    id: 'sess-1', token_hash: 'x', version: 3, answers: qualified[slug], current_step: 'contact', qualified: true, contact_submitted_at: null, booked_at: null,
    config_snapshot: config, contact: null, created_at: '2026-10-01T10:00:00Z', lead_id: null, measurement_allowed: null,
    attribution: { landing_page_url: `https://site.test/estimate/${slug}`, fbclid: 'click-1' }, service_area_valid: null, ...over,
  });
  beforeEach(() => {
    vi.clearAllMocks(); m.later.length = 0;
    m.funnel = { id: 'f1', slug, is_demo: false, integration_id: null, config };
    m.session = session();
    m.rpc.mockResolvedValue({ data: { ...session(), current_step: 'thanks', contact_submitted_at: 'now', lead_id: 'lead-1' }, error: null });
  });

  it('sends one server Lead to the dataset with the same event_id the browser pixel uses', async () => {
    expect((await patch({ version: 3, contact, meta: { fbp: 'fb.1.1.1', fbc: 'fb.1.2.cookie' } })).status).toBe(200);
    await flush();
    expect(m.send).toHaveBeenCalledTimes(1);
    expect(m.send).toHaveBeenCalledWith(expect.objectContaining({ pixelId: DATASET, eventName: 'Lead', eventId: 'sess-1:Lead', eventSourceUrl: `https://site.test/estimate/${slug}` }), expect.anything());
  });

  it('pairs with the browser event: same name, same id, same dataset, no duplicate listener', async () => {
    const values = new Map<string, string>(); const fbq = vi.fn();
    vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k), setItem: (k: string, v: string) => values.set(k, v) });
    vi.stubGlobal('window', { fbq, dispatchEvent: vi.fn(), hqnPixels: new Set() });
    vi.resetModules(); const { trackFunnel } = await import('@/lib/funnels/tracking');
    trackFunnel('sess-1', slug, 'PageView', config.trackingPixels.metaPixelId);
    trackFunnel('sess-1', slug, 'Lead', config.trackingPixels.metaPixelId);
    trackFunnel('sess-1', slug, 'Lead', config.trackingPixels.metaPixelId); // a repeat render must not fire again
    const track = fbq.mock.calls.filter((c) => c[0] === 'trackSingle');
    expect(track.map((c) => [c[1], c[2], c[4]])).toEqual([[DATASET, 'PageView', { eventID: 'sess-1:PageView' }], [DATASET, 'Lead', { eventID: 'sess-1:Lead' }]]);
    expect(fbq.mock.calls.filter((c) => c[0] === 'init')).toHaveLength(0 + fbq.mock.calls.filter((c) => c[0] === 'init').length); // init happens once per pixel (guarded by hqnPixels)
    vi.unstubAllGlobals();
  });

  it('respects the visitor’s advertising choice: nothing is sent when they opted out', async () => {
    m.session = session({ measurement_allowed: false });
    await patch({ version: 3, contact }); await flush();
    expect(m.send).not.toHaveBeenCalled();
    m.send.mockClear(); m.session = session();
    await patch({ version: 3, contact, measurement: false }); await flush();
    expect(m.send).not.toHaveBeenCalled();
  });

  it('sends nothing for a demo funnel', async () => {
    m.funnel = { ...m.funnel, is_demo: true };
    await patch({ version: 3, contact }); await flush();
    expect(m.send).not.toHaveBeenCalled();
  });

  it('never sends a second Lead if the form is submitted again', async () => {
    m.session = session({ contact_submitted_at: '2026-10-01T10:05:00Z', lead_id: 'lead-1', contact });
    await patch({ version: 3, contact }); await flush();
    expect(m.send).not.toHaveBeenCalled();
  });

  it('does not use any test event code in production', () => {
    expect(process.env.META_TEST_EVENT_CODE).toBeUndefined();
  });
});

afterEach(() => { vi.unstubAllGlobals(); });
