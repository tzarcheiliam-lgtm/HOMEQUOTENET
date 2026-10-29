import { beforeEach, describe, expect, it, vi } from 'vitest';
import example from '@/content/funnels/pool-demo.json';
import { funnelSchema } from '@/lib/funnels/schema';
import { blankFunnelConfig, nativeCalendarOwner, removeCalendarStep, setCalendarProvider } from '@/lib/funnels/builder';
import { hasCalendarStep } from '@/lib/funnels/schema';

/**
 * Old-style funnels on HomeQuote's own calendar (calendarProvider 'homequote'):
 * the session route moves a qualified visitor to the calendar step, hands the
 * session owner a booking ticket for the public booking API (the funnel cookie is
 * scoped to /api/funnels/<slug>), records calendar_viewed, and never hands one
 * to a demo funnel or an unqualified visitor. The database is faked.
 */

const config = funnelSchema.parse({ ...example, calendarProvider: 'homequote', trackingPixels: { metaPixelId: '933962709362966', consentMode: 'opt_out' } });
const SESSION_ID = '4b8f2a10-3c6d-4e1f-a2b3-5c6d7e8f9a0b';
const m = vi.hoisted(() => ({
  session: null as Record<string, unknown> | null, demo: false, config: null as unknown, rpc: vi.fn(), upserts: [] as { table: string; row: unknown }[],
}));

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: () => undefined }));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: vi.fn(), get: vi.fn() }) }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: m.rpc,
    from: (table: string) => ({
      update: () => ({ eq: async () => ({ error: null }) }),
      upsert: async (row: unknown) => { m.upserts.push({ table, row }); return { error: null }; },
    }),
  }),
}));
vi.mock('@/lib/funnels/server', () => ({
  cookieName: (s: string) => s, hash: (s: string) => s, newToken: () => 't', sameOrigin: () => true,
  readBody: async (r: Request) => r.json(), publicSession: (s: unknown) => s,
  getFunnel: async () => ({ id: 'f1', slug: 'pool', is_demo: m.demo, integration_id: null, contractor_id: null, config: m.config }),
  getSession: async () => m.session,
}));
vi.mock('@/lib/funnels/delivery', () => ({ deliverPendingFunnels: vi.fn() }));
vi.mock('@/lib/leads/notify', () => ({ sendLeadEmailsSoon: vi.fn() }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: vi.fn() }));
vi.mock('@/lib/meta/lead-ids', () => ({ rememberLeadMetaIds: vi.fn(), loadLeadMetaIds: vi.fn() }));
vi.mock('@/lib/meta/capi', async (orig) => ({ ...(await orig<typeof import('@/lib/meta/capi')>()), sendMetaEvent: vi.fn() }));

import { GET, PATCH } from '@/app/api/funnels/[slug]/session/route';
import { parseGrant } from '@/app/api/booking/_lib/grant';

const answers = { service: 'full_remodel', surface: 'worn', remodel_scope: 'pool_only', timeline: 'asap', budget: 'budget_25_50k', homeowner: 'yes', zip: '91301' };
const contact = { firstName: 'Jordan', lastName: 'Rivera', phone: '8185550142', email: 'jordan@example.test', consent: true };
const base = { id: SESSION_ID, token_hash: 'x', version: 3, answers, current_step: 'contact', qualified: true, contact_submitted_at: null, booked_at: null,
  config_snapshot: config, contact: null, created_at: '2026-10-01T10:00:00Z', lead_id: null, attribution: {}, service_area_valid: null };
const onCalendar = { ...base, current_step: 'calendar', contact_submitted_at: '2026-10-01T10:05:00Z', lead_id: 'lead-9', contact };
const patch = (body: unknown) => PATCH(new Request('https://pool.example/api/funnels/pool/session', { method: 'PATCH', headers: { origin: 'https://pool.example' }, body: JSON.stringify(body) }), { params: Promise.resolve({ slug: 'pool' }) });
const get = () => GET(new Request('https://pool.example/api/funnels/pool/session'), { params: Promise.resolve({ slug: 'pool' }) });
const ticketOf = async (res: Response) => ((await res.json()) as { session: { bookingTicket?: string } }).session.bookingTicket;

beforeEach(() => {
  vi.clearAllMocks();
  m.upserts.length = 0;
  m.demo = false;
  m.config = config;
  vi.stubEnv('BOOKING_TICKET_SECRET', 'test-booking-secret');
});

describe('funnel session route on the HomeQuote calendar', () => {
  it('a qualified contact submit goes to the calendar step and gets a booking ticket for this session', async () => {
    m.session = { ...base };
    m.rpc.mockResolvedValue({ data: onCalendar, error: null });
    const res = await patch({ version: 3, contact, measurement: false });
    expect(res.status).toBe(200);
    expect(m.rpc).toHaveBeenCalledWith('save_funnel_session', expect.objectContaining({ p_step: 'calendar' }));
    expect(parseGrant(await ticketOf(res))).toEqual({ kind: 'session', sessionId: SESSION_ID, source: 'funnel' });
  });
  it('a refresh on the calendar step (GET) still gets the ticket, also after booking (the flow then shows the booked call)', async () => {
    m.session = { ...onCalendar };
    expect(parseGrant(await ticketOf(await get()))).toMatchObject({ sessionId: SESSION_ID });
    m.session = { ...onCalendar, booked_at: '2026-10-01T10:06:00Z' };
    expect(await ticketOf(await get())).toBeTruthy();
  });
  it('no ticket for an unqualified visitor, a demo funnel, before the calendar step, or without a secret', async () => {
    m.session = { ...onCalendar, qualified: false };
    expect(await ticketOf(await get())).toBeUndefined();
    m.session = { ...onCalendar };
    m.demo = true;
    expect(await ticketOf(await get())).toBeUndefined();
    m.demo = false;
    m.session = { ...base };
    expect(await ticketOf(await get())).toBeUndefined();
    m.session = { ...onCalendar };
    vi.stubEnv('BOOKING_TICKET_SECRET', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect(await ticketOf(await get())).toBeUndefined();
  });
  it('records calendar_viewed for the native calendar step (no calendarUrl needed)', async () => {
    m.session = { ...onCalendar };
    expect((await patch({ version: 3, calendarViewed: true })).status).toBe(200);
    expect(m.upserts).toEqual([{ table: 'funnel_events', row: { session_id: SESSION_ID, event: 'calendar_viewed', step_id: '' } }]);
  });
  it('a funnel without any calendar still goes straight to thanks (stored configs keep their meaning)', async () => {
    m.config = funnelSchema.parse(example);
    m.session = { ...base, config_snapshot: m.config };
    m.rpc.mockResolvedValue({ data: { ...base, current_step: 'thanks', contact_submitted_at: 'now' }, error: null });
    const res = await patch({ version: 3, contact });
    expect(m.rpc).toHaveBeenCalledWith('save_funnel_session', expect.objectContaining({ p_step: 'thanks' }));
    expect(await ticketOf(res)).toBeUndefined();
  });
  it('a Calendly fallback funnel keeps its prefill and gets no ticket', async () => {
    m.config = funnelSchema.parse({ ...example, calendarProvider: 'calendly', calendarUrl: 'https://calendly.com/pool/consult' });
    m.session = { ...onCalendar, config_snapshot: m.config };
    const body = (await (await get()).json()) as { session: { bookingTicket?: string; prefill?: unknown } };
    expect(body.session.bookingTicket).toBeUndefined();
    expect(body.session.prefill).toEqual({ name: 'Jordan Rivera', email: 'jordan@example.test' });
  });
});

describe('builder calendar panel helpers', () => {
  it('new funnels and "+ Add calendar step" use the HomeQuote calendar; removing it leaves no calendar step', () => {
    const blank = blankFunnelConfig('Acme Roofing', 'Roofing');
    expect(blank.calendarProvider).toBe('homequote');
    expect(hasCalendarStep(blank)).toBe(true);
    const off = removeCalendarStep(blank);
    expect(hasCalendarStep(off)).toBe(false);
    expect(funnelSchema.safeParse(off).success).toBe(true);
    const calendly = setCalendarProvider({ ...off, calendarId: 'x' }, 'calendly');
    expect(calendly).toMatchObject({ calendarProvider: 'calendly', calendarId: undefined });
    const native = setCalendarProvider({ ...calendly, calendarUrl: 'https://calendly.com/pool/consult' }, 'homequote');
    expect(native).toMatchObject({ calendarProvider: 'homequote', calendarUrl: undefined });
    expect(funnelSchema.safeParse(native).success).toBe(true);
  });
  it('says whose calendar a native funnel books', () => {
    expect(nativeCalendarOwner('Pool Masters LA')).toBe('Pool Masters LA’s calendar');
    expect(nativeCalendarOwner(null)).toMatch(/HomeQuote team calendar/);
  });
});
