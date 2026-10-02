import { beforeEach, describe, expect, it, vi } from 'vitest';
import example from '@/content/funnels/pool-demo.json';
import { funnelSchema } from '@/lib/funnels/schema';

const config = funnelSchema.parse({
  ...example, calendarUrl: 'https://calendly.com/pool-masters/estimate', calendarProvider: 'calendly',
  trackingPixels: { metaPixelId: '933962709362966', consentMode: 'opt_out' },
});
const m = vi.hoisted(() => ({
  session: null as Record<string, unknown> | null, rpc: vi.fn(), updates: [] as Record<string, unknown>[], updateError: null as { code: string } | null, send: vi.fn(), remember: vi.fn(), load: vi.fn(), later: [] as Promise<unknown>[],
}));

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => { m.later.push(Promise.resolve().then(fn)); } }));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: vi.fn(), get: vi.fn() }) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: m.rpc, from: () => ({ update: (v: Record<string, unknown>) => ({ eq: async () => { m.updates.push(v); return { error: m.updateError }; } }) }) }) }));
vi.mock('@/lib/funnels/server', () => ({
  cookieName: (s: string) => s, hash: (s: string) => s, newToken: () => 't', sameOrigin: () => true,
  readBody: async (r: Request) => r.json(), publicSession: (s: unknown) => s,
  getFunnel: async () => ({ id: 'f1', slug: 'pool', is_demo: false, integration_id: null, config }),
  getSession: async () => m.session,
}));
vi.mock('@/lib/funnels/calendly', () => ({ verifyCalendlyBooking: async () => ({ verified: true, startTime: '2026-10-05T17:00:00Z' }) }));
vi.mock('@/lib/funnels/delivery', () => ({ deliverPendingFunnels: vi.fn() }));
vi.mock('@/lib/leads/notify', () => ({ sendLeadEmailsSoon: vi.fn() }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: vi.fn() }));
vi.mock('@/lib/meta/lead-ids', () => ({ rememberLeadMetaIds: m.remember, loadLeadMetaIds: m.load }));
vi.mock('@/lib/meta/capi', async (orig) => ({ ...(await orig<typeof import('@/lib/meta/capi')>()), sendMetaEvent: m.send }));

import { PATCH } from '@/app/api/funnels/[slug]/session/route';

const answers = { service: 'full_remodel', surface: 'worn', remodel_scope: 'pool_only', timeline: 'asap', budget: 'budget_25_50k', homeowner: 'yes', zip: '91301' };
const contact = { firstName: 'Jordan', lastName: 'Rivera', phone: '8185550142', email: 'jordan@example.test', consent: true };
const base = { id: 'sess-1', token_hash: 'x', version: 3, answers, current_step: 'contact', qualified: true, contact_submitted_at: null, booked_at: null,
  config_snapshot: config, contact: null, created_at: '2026-10-01T10:00:00Z', lead_id: null,
  attribution: { landing_page_url: 'https://pool.example/estimate/pool', fbclid: 'click-1' }, service_area_valid: null };
const patch = (body: unknown) => PATCH(new Request('https://pool.example/api/funnels/pool/session', { method: 'PATCH', headers: { origin: 'https://pool.example' }, body: JSON.stringify(body) }), { params: Promise.resolve({ slug: 'pool' }) });
const flush = () => Promise.all(m.later.splice(0));

beforeEach(() => { vi.clearAllMocks(); m.later.length = 0; m.updates.length = 0; m.updateError = null; m.load.mockResolvedValue({}); });

describe('website lead: fbp/fbc and the Schedule event', () => {
  it('stores the cookie ids with the lead and keeps the Lead event_id formula', async () => {
    m.session = { ...base };
    m.rpc.mockResolvedValue({ data: { ...base, current_step: 'calendar', contact_submitted_at: 'now', lead_id: 'lead-9' }, error: null });
    const res = await patch({ version: 3, contact, meta: { fbp: 'fb.1.1.111', fbc: 'fb.1.2.cookie' } }); expect(await res.clone().json()).toEqual(expect.not.objectContaining({ error: expect.anything() })); expect(res.status).toBe(200);
    await flush();
    expect(m.remember).toHaveBeenCalledWith(expect.anything(), 'lead-9', { fbp: 'fb.1.1.111', fbc: 'fb.1.2.cookie' });
    expect(m.send).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'Lead', eventId: 'sess-1:Lead', user: expect.objectContaining({ fbp: 'fb.1.1.111', fbc: 'fb.1.2.cookie' }) }));
  });
  it('stores nothing when the visitor has no cookie ids and arrived without an fbclid', async () => {
    m.session = { ...base, attribution: { landing_page_url: 'https://pool.example/estimate/pool' } };
    m.rpc.mockResolvedValue({ data: { ...base, contact_submitted_at: 'now', lead_id: 'lead-9' }, error: null });
    await patch({ version: 3, contact }); await flush();
    expect(m.remember).not.toHaveBeenCalled();
  });
  it('derives fbc from the real fbclid (Meta format) when the cookie is absent', async () => {
    m.session = { ...base };
    m.rpc.mockResolvedValue({ data: { ...base, contact_submitted_at: 'now', lead_id: 'lead-9' }, error: null });
    await patch({ version: 3, contact }); await flush();
    expect(m.remember).toHaveBeenCalledWith(expect.anything(), 'lead-9', { fbp: undefined, fbc: `fb.1.${Date.parse('2026-10-01T10:00:00Z')}.click-1` });
  });
  it('sends Schedule with the fbp/fbc saved on the lead and the same Schedule event_id', async () => {
    m.session = { ...base, contact_submitted_at: 'now', current_step: 'calendar', lead_id: 'lead-9', contact };
    m.load.mockResolvedValue({ fbp: 'fb.1.1.111', fbc: 'fb.1.2.cookie' });
    m.rpc.mockResolvedValue({ data: { ...base, booked_at: 'now' }, error: null });
    const eventUri = 'https://api.calendly.com/scheduled_events/ABC'; const inviteeUri = `${eventUri}/invitees/DEF`;
    expect((await patch({ version: 3, calendlyBooking: { eventUri, inviteeUri } })).status).toBe(200);
    await flush();
    expect(m.load).toHaveBeenCalledWith(expect.anything(), 'lead-9');
    expect(m.send).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'Schedule', eventId: 'sess-1:Schedule', user: expect.objectContaining({ fbp: 'fb.1.1.111', fbc: 'fb.1.2.cookie' }) }));
  });
  it('still sends Schedule (without ids) when the lead has none saved', async () => {
    m.session = { ...base, contact_submitted_at: 'now', current_step: 'calendar', lead_id: 'lead-9', contact };
    m.rpc.mockResolvedValue({ data: { ...base, booked_at: 'now' }, error: null });
    const eventUri = 'https://api.calendly.com/scheduled_events/ABC';
    await patch({ version: 3, calendlyBooking: { eventUri, inviteeUri: `${eventUri}/invitees/DEF` } }); await flush();
    expect(m.send).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'Schedule', user: expect.objectContaining({ fbp: undefined, fbc: undefined }) }));
  });
});

describe('advertising-measurement choice is persisted and honored server-side', () => {
  const booking = () => { const eventUri = 'https://api.calendly.com/scheduled_events/ABC'; return { calendlyBooking: { eventUri, inviteeUri: `${eventUri}/invitees/DEF` } }; };
  const submitted = (over: Record<string, unknown> = {}) => ({ ...base, contact_submitted_at: 'now', current_step: 'calendar', lead_id: 'lead-9', contact, ...over });
  const optIn = funnelSchema.parse({ ...config, trackingPixels: { metaPixelId: '933962709362966', consentMode: 'opt_in' } });
  const sentNames = () => m.send.mock.calls.map(c => c[0].eventName);
  const submitRpc = () => m.rpc.mockResolvedValue({ data: { ...base, current_step: 'calendar', contact_submitted_at: 'now', lead_id: 'lead-9' }, error: null });

  it('opt-in: records the choice, sends Lead and stores fbp/fbc', async () => {
    m.session = { ...base }; submitRpc();
    expect((await patch({ version: 3, contact, measurement: true, meta: { fbp: 'fb.1.1.111' } })).status).toBe(200); await flush();
    expect(m.updates).toEqual([{ measurement_allowed: true }]);
    expect(sentNames()).toEqual(['Lead']); expect(m.remember).toHaveBeenCalled();
  });
  it('opt-out: still saves the lead, records the choice, and sends nothing to Meta (no ids stored either)', async () => {
    m.session = { ...base }; submitRpc();
    expect((await patch({ version: 3, contact, measurement: false })).status).toBe(200); await flush();
    expect(m.rpc).toHaveBeenCalledWith('save_funnel_session', expect.objectContaining({ p_contact: expect.objectContaining({ email: contact.email }) }));
    expect(m.updates).toEqual([{ measurement_allowed: false }]);
    expect(m.send).not.toHaveBeenCalled(); expect(m.remember).not.toHaveBeenCalled();
  });
  it('a stored opt-out holds for a later Schedule even when the request omits the choice', async () => {
    m.session = submitted({ measurement_allowed: false });
    m.rpc.mockResolvedValue({ data: { ...base, booked_at: 'now' }, error: null });
    expect((await patch({ version: 3, ...booking() })).status).toBe(200); await flush();
    expect(m.send).not.toHaveBeenCalled(); expect(m.load).not.toHaveBeenCalled(); expect(m.updates).toEqual([]);
  });
  it('a visitor who opts out AFTER submitting is honored at Schedule time and the change is persisted', async () => {
    m.session = submitted({ measurement_allowed: true });
    m.rpc.mockResolvedValue({ data: { ...base, booked_at: 'now' }, error: null });
    await patch({ version: 3, ...booking(), measurement: false }); await flush();
    expect(m.updates).toEqual([{ measurement_allowed: false }]); expect(m.send).not.toHaveBeenCalled();
  });
  it('a stored opt-in sends Schedule without re-writing the unchanged choice', async () => {
    m.session = submitted({ measurement_allowed: true });
    m.rpc.mockResolvedValue({ data: { ...base, booked_at: 'now' }, error: null });
    await patch({ version: 3, ...booking(), measurement: true }); await flush();
    expect(m.updates).toEqual([]); expect(sentNames()).toEqual(['Schedule']);
  });
  it('never-recorded choice falls back to the funnel default: opt_out sends, opt_in does not', async () => {
    m.rpc.mockResolvedValue({ data: { ...base, booked_at: 'now' }, error: null });
    m.session = submitted({ measurement_allowed: null }); await patch({ version: 3, ...booking() }); await flush();
    expect(sentNames()).toEqual(['Schedule']);
    m.send.mockClear(); m.session = submitted({ measurement_allowed: null, config_snapshot: optIn }); await patch({ version: 3, ...booking() }); await flush();
    expect(m.send).not.toHaveBeenCalled();
  });
  it('fails safe: if a changed choice cannot be recorded, nothing is sent to Meta and the submission still succeeds', async () => {
    m.session = { ...base }; submitRpc(); m.updateError = { code: 'XX000' };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await patch({ version: 3, contact, measurement: true, meta: { fbp: 'fb.1.1.111' } })).status).toBe(200); await flush();
    expect(m.send).not.toHaveBeenCalled(); expect(m.remember).not.toHaveBeenCalled();
  });
});
