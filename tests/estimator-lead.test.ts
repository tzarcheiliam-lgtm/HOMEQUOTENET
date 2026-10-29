import { beforeEach, describe, expect, it, vi } from 'vitest';
import poolMasters from '@/content/funnels/clients/pool-masters-la.json';
import { consentText, funnelSchema } from '@/lib/funnels/schema';
import { computeEstimate } from '@/lib/estimator/engine';
import type { Answers, ContractorEstimatorConfig } from '@/lib/estimator/types';
import { FIXTURE_CONTRACTOR, FIXTURE_TEMPLATE } from './fixtures/estimator-template';

const funnelConfig = funnelSchema.parse(poolMasters);
const contractor: ContractorEstimatorConfig = {
  ...FIXTURE_CONTRACTOR,
  gallery: [
    { src: '/g/one.webp', alt: 'Pool one', caption: 'Lit pool' },
    { src: '/g/two.webp', alt: 'Pool two' },
  ],
};

const m = vi.hoisted(() => ({
  registered: null as unknown, funnel: null as unknown, count: 0, sameOrigin: true,
  rpc: vi.fn(), inserts: [] as { table: string; row: Record<string, unknown> }[], send: vi.fn(), remember: vi.fn(),
  later: [] as Promise<unknown>[], deliver: vi.fn(), emails: vi.fn(), flush: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => { m.later.push(Promise.resolve().then(fn)); } }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: m.rpc,
    from: (table: string) => ({
      select: () => ({ eq: () => ({ gte: async () => ({ count: m.count, error: null }) }) }),
      insert: (row: Record<string, unknown>) => {
        m.inserts.push({ table, row });
        const saved = { data: { ...row, id: 'sess-1', version: 0, created_at: '2026-10-01T10:00:00Z' }, error: null };
        return Object.assign(Promise.resolve({ error: null }), { select: () => ({ single: async () => saved }) });
      },
    }),
  }),
}));
vi.mock('@/lib/estimator/registry', () => ({ ESTIMATOR_SLUGS: [], getEstimator: (slug: string) => (slug === 'fixture-pools' ? m.registered : null) }));
vi.mock('@/lib/funnels/server', () => ({
  hash: (s: string) => `h:${s}`, newToken: () => 'tok', readBody: async (r: Request) => r.json(), sameOrigin: () => m.sameOrigin,
  getFunnel: async () => m.funnel,
}));
vi.mock('@/lib/funnels/delivery', () => ({ deliverPendingFunnels: m.deliver }));
vi.mock('@/lib/leads/notify', () => ({ sendLeadEmailsSoon: m.emails }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: m.flush }));
vi.mock('@/lib/ai-calling/run.server', () => ({ runAiCallQueue: vi.fn() }));
vi.mock('@/lib/sms/config', () => ({ smsConfigured: () => false }));
vi.mock('@/lib/sms/service', () => ({ startSmsForLead: vi.fn() }));
vi.mock('@/lib/meta/lead-ids', () => ({ rememberLeadMetaIds: m.remember }));
vi.mock('@/lib/meta/audit.server', () => ({ directSendAudit: () => ({ reserve: async () => 'ok', finish: async () => {} }) }));
vi.mock('@/lib/meta/capi', async (orig) => ({ ...(await orig<typeof import('@/lib/meta/capi')>()), sendMetaEvent: m.send }));

import { POST } from '@/app/api/estimator/[slug]/lead/route';
import { areaValidFor, bookingUrl, buildLeadPayload, estimatorBooking, funnelAnswersFor, isHoneypot, parseLeadRequest, pickLikedLooks, qualifyLead, sanitizeEstimatorAnswers } from '@/lib/estimator/lead';

const answers: Answers = {
  project: ['remodel'], shape: ['rectangle'], size: ['medium'], package: ['refresh'],
  scope: ['surface', 'coping'], surface: ['plaster'], coping: ['precast'], cracks: ['no'],
};
const contact = { firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.test', phone: '8185550142', consent: true, website: '' };
const valid = { answers, zip: '91301', homeowner: 'yes', timeline: 'asap', contact, consentText: consentText(funnelConfig), measurement: false };
const measured = { ...valid, measurement: true };
const post = (body: unknown, slug = 'fixture-pools') =>
  POST(new Request('https://pool.example/api/estimator/x/lead', { method: 'POST', headers: { origin: 'https://pool.example', 'user-agent': 'Mozilla/5.0 (iPhone) Mobile' }, body: JSON.stringify(body) }), { params: Promise.resolve({ slug }) });
const flush = () => Promise.all(m.later.splice(0));
const rpcArgs = () => m.rpc.mock.calls[0][1] as Record<string, unknown>;
const expected = computeEstimate(FIXTURE_TEMPLATE, { answers });

beforeEach(() => {
  vi.clearAllMocks();
  m.later.length = 0; m.inserts.length = 0; m.count = 0; m.sameOrigin = true;
  m.registered = { template: FIXTURE_TEMPLATE, contractor };
  m.funnel = { id: 'f1', slug: 'pool-masters', is_demo: false, contractor_id: 'c1', integration_id: 'i1', config: funnelConfig };
  m.rpc.mockResolvedValue({ data: { id: 'sess-1', lead_id: 'lead-9' }, error: null });
});

describe('request validation', () => {
  it('accepts a complete request', () => {
    const r = parseLeadRequest({ ...valid, note: '  Dog in the yard  ', likedLooks: ['/g/one.webp'], dimensions: { lengthFt: 30, widthFt: 14 }, tracking: { eventId: 'e1', pageUrl: 'https://pool.example/p' } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.note).toBe('Dog in the yard');
  });
  it.each([
    ['zip', { ...valid, zip: '9130' }],
    ['zip', { ...valid, zip: '91301-1' }],
    ['homeowner', { ...valid, homeowner: 'maybe' }],
    ['timeline', { ...valid, timeline: 'whenever' }],
    ['note', { ...valid, note: 'x'.repeat(1001) }],
    ['answers', { ...valid, answers: { surface: 'plaster' } }],
    ['email', { ...valid, contact: { ...contact, email: 'nope' } }],
    ['phone', { ...valid, contact: { ...contact, phone: '123' } }],
    ['firstName', { ...valid, contact: { ...contact, firstName: ' ' } }],
    ['consent', { ...valid, contact: { ...contact, consent: false } }],
    ['likedLooks', { ...valid, likedLooks: Array.from({ length: 25 }, (_, i) => `/g/${i}`) }],
  ])('rejects a bad %s with an error keyed by that field', (field, body) => {
    const r = parseLeadRequest(body);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[field]).toBeTruthy();
  });
  it('does not treat a filled honeypot as a validation error', () => {
    const r = parseLeadRequest({ ...valid, contact: { ...contact, website: 'http://spam.example' } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(isHoneypot(r.data)).toBe(true);
  });
  it('only keeps liked looks that are in the contractor gallery, without repeats', () => {
    expect(pickLikedLooks(contractor, ['/g/two.webp', '/evil.webp', '/g/two.webp', '/g/one.webp']).map((l) => l.src)).toEqual(['/g/two.webp', '/g/one.webp']);
    expect(pickLikedLooks({}, ['/g/one.webp'])).toEqual([]);
  });
  it('cuts answers down to what the template shows', () => {
    const clean = sanitizeEstimatorAnswers(FIXTURE_TEMPLATE, { ...answers, deck: ['pavers'], surface: ['plaster', 'pebble'], coping: ['made-up'], mystery: ['x'] });
    expect(clean.deck).toBeUndefined(); // deck is hidden: scope has no deck
    expect(clean.surface).toEqual(['plaster']); // single question keeps one pick
    expect(clean.coping).toBeUndefined();
    expect(clean.mystery).toBeUndefined();
  });
});

describe('POST /api/estimator/[slug]/lead', () => {
  it('404s for an unknown slug', async () => {
    const res = await post(valid, 'nope');
    expect(res.status).toBe(404);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('403s for a foreign origin', async () => {
    m.sameOrigin = false;
    const res = await POST(new Request('https://pool.example/api/estimator/x/lead', { method: 'POST', headers: { origin: 'https://evil.example' }, body: JSON.stringify(valid) }), { params: Promise.resolve({ slug: 'fixture-pools' }) });
    expect(res.status).toBe(403);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('422s with field errors for a bad request and saves nothing', async () => {
    const res = await post({ ...valid, zip: 'abc', contact: { ...contact, email: 'bad' } });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(Object.keys(body.errors)).toEqual(expect.arrayContaining(['zip', 'email']));
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.inserts).toEqual([]);
  });
  it('429s past the hourly cap', async () => {
    m.count = 30;
    expect((await post(valid)).status).toBe(429);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('honeypot: answers like a success and saves nothing', async () => {
    const res = await post({ ...valid, contact: { ...contact, website: 'http://spam.example' } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, qualified: false });
    expect(body.calendarUrl).toBeUndefined();
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.inserts).toEqual([]);
    expect(m.send).not.toHaveBeenCalled();
  });
  it('recomputes the estimate on the server and ignores any client price', async () => {
    const res = await post({
      ...valid, estimate: { low: 1, high: 2 }, low: 1, high: 2, price: 1,
      answers: { ...answers, deck: ['pavers'], surface: ['plaster', 'pebble'], mystery: ['x'] },
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.estimate.low).toBe(expected.low);
    expect(body.estimate.high).toBe(expected.high);
    expect(body.estimate.lines).toEqual(expected.lines);
    const activity = m.inserts.find((i) => i.table === 'lead_activities')!.row;
    expect(activity.metadata).toMatchObject({ contractor_id: 'c1', estimator: { low: expected.low, high: expected.high, answers } });
  });
  it('saves through the funnel path: session, landing event, save_funnel_session, timeline entry', async () => {
    const res = await post({ ...valid, likedLooks: ['/g/one.webp', '/nope.webp'], note: 'Dog in the yard', dimensions: { lengthFt: 30, widthFt: 14 }, tracking: { pageUrl: 'https://pool.example/estimate?utm_source=meta&utm_campaign=spring' } });
    expect(res.status).toBe(200);
    const session = m.inserts.find((i) => i.table === 'funnel_sessions')!.row;
    expect(session).toMatchObject({ funnel_id: 'f1', current_step: 'contact', config_snapshot: funnelConfig, measurement_allowed: false });
    expect(session.attribution).toMatchObject({ utm_source: 'meta', utm_campaign: 'spring', device_type: 'mobile', landing_page_url: 'https://pool.example/estimate' });
    expect(m.inserts.find((i) => i.table === 'funnel_events')!.row).toMatchObject({ session_id: 'sess-1', event: 'landing_view' });
    const args = rpcArgs();
    expect(m.rpc).toHaveBeenCalledWith('save_funnel_session', expect.anything());
    expect(args).toMatchObject({ p_id: 'sess-1', p_hash: 'h:tok', p_version: 0, p_step: 'calendar', p_qualified: true, p_service_area_valid: true, p_completed: 'timeline' });
    expect(args.p_consent).toContain('Pool Masters LA');
    expect(args.p_contact).toEqual({ firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.test', phone: '8185550142', consent: true });
    expect(args.p_answers).toMatchObject({
      service: 'full_remodel', zip: '91301', homeowner: 'yes', timeline: 'asap',
      estimator_source: 'Pool estimator', notes: 'Dog in the yard', estimator_looks: 'Lit pool',
    });
    const activity = m.inserts.find((i) => i.table === 'lead_activities')!.row;
    expect(activity).toMatchObject({ lead_id: 'lead-9', type: 'system' });
    expect(activity.metadata).toMatchObject({ estimator: { likedLooks: ['/g/one.webp'], note: 'Dog in the yard' } });
    await flush();
    expect(m.emails).toHaveBeenCalled();
    expect(m.deliver).toHaveBeenCalled();
  });
  it('qualified on a HomeQuote-calendar funnel: no external booking link (the booking API books it)', async () => {
    const body = await (await post(valid)).json();
    expect(body.qualified).toBe(true);
    expect(body.calendarUrl).toBeUndefined();
    expect(rpcArgs().p_step).toBe('calendar');
  });
  it('fallback: an estimator set to an external link returns it', async () => {
    m.registered = { template: FIXTURE_TEMPLATE, contractor: { ...contractor, calendarProvider: 'link' } };
    const body = await (await post(valid)).json();
    const url = new URL(body.calendarUrl);
    expect(url.origin + url.pathname).toBe('https://example.com/book');
    expect(body.bookingTicket).toBeUndefined();
  });
  it('fallback: a Calendly link prefills the homeowner', async () => {
    m.registered = { template: FIXTURE_TEMPLATE, contractor: { ...contractor, calendarProvider: 'link', calendarUrl: 'https://calendly.com/pool/30min' } };
    const body = await (await post(valid)).json();
    const url = new URL(body.calendarUrl);
    expect(url.searchParams.get('name')).toBe('Jordan Rivera');
    expect(url.searchParams.get('email')).toBe('jordan@example.test');
  });
  it('renter: saved for review, qualified=false, no booking link', async () => {
    const res = await post({ ...valid, homeowner: 'no' });
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, qualified: false });
    expect(body.calendarUrl).toBeUndefined();
    expect(rpcArgs()).toMatchObject({ p_qualified: false, p_step: 'thanks', p_service_area_valid: true });
  });
  it('out-of-area ZIP: saved for review, qualified=false, flagged out of area, no Meta Lead', async () => {
    const res = await post({ ...measured, zip: '10001', tracking: { eventId: 'evt-1', fbp: 'fb.1.1.111' } });
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, qualified: false });
    expect(body.calendarUrl).toBeUndefined();
    expect(rpcArgs()).toMatchObject({ p_qualified: false, p_service_area_valid: false });
    await flush();
    expect(m.send).not.toHaveBeenCalled();
  });
  it('a funnel that stops unqualified visitors keeps its rule: nothing is saved', async () => {
    m.funnel = { id: 'f1', slug: 'pool-masters', is_demo: false, contractor_id: 'c1', integration_id: null, config: funnelSchema.parse({ ...poolMasters, unqualifiedAction: 'stop' }) };
    const body = await (await post({ ...valid, homeowner: 'no' })).json();
    expect(body).toMatchObject({ ok: true, qualified: false });
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('a demo funnel sends no alerts and no Meta event', async () => {
    m.funnel = { id: 'f1', slug: 'pool-masters', is_demo: true, contractor_id: null, integration_id: 'i1', config: funnelConfig };
    await post({ ...measured, tracking: { eventId: 'evt-1' } }); await flush();
    expect(m.emails).not.toHaveBeenCalled();
    expect(m.send).not.toHaveBeenCalled();
    expect(m.inserts.some((i) => i.table === 'lead_activities')).toBe(false);
  });
  it('rejects a consent wording that differs from what the funnel stores, saving nothing', async () => {
    const res = await post({ ...valid, consentText: 'I agree to be contacted by Pool Masters LA.' });
    expect(res.status).toBe(409);
    expect((await res.json()).errors).toHaveProperty('consent');
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('503s when the funnel is unavailable or the save fails', async () => {
    m.funnel = null;
    expect((await post(valid)).status).toBe(503);
    m.funnel = { id: 'f1', slug: 'pool-masters', is_demo: false, contractor_id: 'c1', integration_id: null, config: funnelConfig };
    m.rpc.mockResolvedValue({ data: null, error: { code: 'XX000' } });
    const res = await post(valid);
    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
  });
});

describe('Meta Lead event', () => {
  it('sends the funnel Lead event with the browser event id and stores the ids', async () => {
    const res = await post({ ...measured, tracking: { eventId: 'evt-1', fbp: 'fb.1.1.111', fbc: 'fb.1.2.cookie' } });
    expect((await res.json()).ok).toBe(true);
    await flush();
    expect(rpcArgs()).toBeTruthy();
    expect(m.inserts.find((i) => i.table === 'funnel_sessions')!.row).toMatchObject({ measurement_allowed: true });
    expect(m.send).toHaveBeenCalledTimes(1);
    expect(m.send.mock.calls[0][0]).toMatchObject({
      pixelId: '933962709362966', eventName: 'Lead', eventId: 'evt-1',
      user: { email: 'jordan@example.test', zip: '91301', state: 'CA', fbp: 'fb.1.1.111', fbc: 'fb.1.2.cookie' },
      customData: { niche: 'pool' },
    });
    expect(m.remember).toHaveBeenCalledWith(expect.anything(), 'lead-9', { fbp: 'fb.1.1.111', fbc: 'fb.1.2.cookie' });
  });
  it('sends nothing and keeps no ids when the visitor did not allow measurement, even with ids present', async () => {
    await post({ ...valid, tracking: { eventId: 'evt-1', fbp: 'fb.1.1.111', fbc: 'fb.1.2.cookie' } }); await flush();
    expect(m.inserts.find((i) => i.table === 'funnel_sessions')!.row).toMatchObject({ measurement_allowed: false });
    expect(m.send).not.toHaveBeenCalled();
    expect(m.remember).not.toHaveBeenCalled();
  });
  it('falls back to the funnel event id formula when only Meta ids are present', async () => {
    await post({ ...measured, tracking: { fbp: 'fb.1.1.111' } }); await flush();
    expect(m.send.mock.calls[0][0]).toMatchObject({ eventId: 'sess-1:Lead' });
  });
});

describe('payload mapping', () => {
  const request = (over: Record<string, unknown> = {}) => {
    const r = parseLeadRequest({ ...valid, ...over });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    return r.data;
  };
  const build = (over: Record<string, unknown> = {}, ans: Answers = answers, cfg = funnelConfig) => {
    const estimate = computeEstimate(FIXTURE_TEMPLATE, { answers: ans });
    return { estimate, payload: buildLeadPayload({
      template: FIXTURE_TEMPLATE, contractor, funnel: { slug: 'pool-masters', contractorId: 'c1', config: cfg },
      request: request(over), answers: ans, estimate, likedLooks: pickLikedLooks(contractor, ['/g/one.webp', '/g/two.webp']),
    }) };
  };

  it('maps onto the funnel questions and adds readable estimator keys', () => {
    const { payload, estimate } = build({ note: 'Gate code 1234' });
    expect(payload.funnelAnswers).toMatchObject({
      service: 'full_remodel', zip: '91301', homeowner: 'yes', timeline: 'asap',
      estimator_source: 'Pool estimator', estimator_status: estimate.status, notes: 'Gate code 1234',
      estimator_looks: 'Lit pool; Pool two',
    });
    expect(payload.funnelAnswers.estimator_range).toMatch(/^\$[\d,]+ – \$[\d,]+$/);
    expect(payload.funnelAnswers.estimator_picks).toContain('Surface: Plaster');
    expect(Object.values(payload.funnelAnswers).every((v) => typeof v === 'string')).toBe(true);
    expect(payload).toMatchObject({ qualified: true, areaValid: true, nextStep: 'calendar', completed: 'timeline' });
    expect(payload.activity.metadata).toMatchObject({ contractor_id: 'c1' });
    expect(payload.activity.body).toContain('not a quote');
  });
  it('maps the backyard project and omits the contractor scope for a house funnel', () => {
    const { payload } = build({}, { ...answers, project: ['backyard'] });
    expect(payload.funnelAnswers.service).toBe('backyard');
    const house = buildLeadPayload({
      template: FIXTURE_TEMPLATE, contractor, funnel: { slug: 'h', contractorId: null, config: funnelConfig },
      request: request(), answers, estimate: expected, likedLooks: [],
    });
    expect(house.activity.metadata).not.toHaveProperty('contractor_id');
  });
  it('lists site-visit items and says so when the range is still open', () => {
    const { payload } = build({}, { ...answers, size: ['unsure'], cracks: ['yes'] });
    expect(payload.funnelAnswers.estimator_site_visit).toContain('Pool size to be measured');
    expect(payload.activity.body).toContain('Needs a site visit');
    const empty = build({}, {}).payload;
    expect(empty.funnelAnswers.estimator_range).toBe('To be confirmed on site');
  });
  it('does not claim a booking when neither the funnel nor the estimator has a calendar', () => {
    const noCalendar = funnelSchema.parse({ ...poolMasters, calendarUrl: undefined, calendarProvider: 'ghl' });
    const estimate = computeEstimate(FIXTURE_TEMPLATE, { answers });
    const payload = buildLeadPayload({
      template: FIXTURE_TEMPLATE, contractor: { ...contractor, calendarUrl: undefined }, funnel: { slug: 'pool-masters', contractorId: 'c1', config: noCalendar },
      request: request(), answers, estimate, likedLooks: [],
    });
    expect(payload.nextStep).toBe('thanks');
  });
  it('estimatorBooking: the estimator’s own setting, then the funnel’s provider, then any link', () => {
    const native = funnelSchema.parse(poolMasters);
    const ghl = funnelSchema.parse({ ...poolMasters, calendarProvider: 'ghl' });
    expect(estimatorBooking({ calendarProvider: 'homequote' }, ghl)).toBe('homequote');
    expect(estimatorBooking({ calendarProvider: 'link', calendarUrl: 'https://calendly.com/x/30min' }, native)).toBe('link');
    expect(estimatorBooking({ calendarProvider: 'link' }, native)).toBe('none');
    expect(estimatorBooking({ calendarUrl: 'https://calendly.com/x/30min' }, native)).toBe('homequote');
    expect(estimatorBooking({ calendarUrl: 'https://calendly.com/x/30min' }, ghl)).toBe('link');
    expect(estimatorBooking({}, ghl)).toBe('none');
    expect(estimatorBooking({ calendarProvider: 'none', calendarUrl: 'https://calendly.com/x/30min' }, native)).toBe('none');
  });
  it('qualifies like the funnel: renter, out of area, and out of state fail', () => {
    const base = funnelAnswersFor(funnelConfig, { zip: '91301', homeowner: 'yes', timeline: 'asap', project: 'remodel' });
    expect(qualifyLead(funnelConfig, base)).toBe(true);
    expect(qualifyLead(funnelConfig, { ...base, homeowner: 'no' })).toBe(false);
    expect(qualifyLead(funnelConfig, { ...base, zip: '92101' })).toBe(false); // California, outside the LA radius
    expect(qualifyLead(funnelConfig, { ...base, zip: '10001' })).toBe(false);
    expect(areaValidFor(funnelConfig, { ...base, zip: '10001' })).toBe(false);
    expect(areaValidFor(funnelConfig, base)).toBe(true);
  });
  it('leaves a funnel question it cannot answer open and still decides from the rules', () => {
    const extra = funnelSchema.parse({
      ...poolMasters,
      questions: [...poolMasters.questions, { id: 'budget', type: 'choice', headline: 'Budget?', options: [{ value: 'a', label: 'A' }] }],
    });
    const a = funnelAnswersFor(extra, { zip: '91301', homeowner: 'yes', timeline: 'asap', project: 'remodel' });
    expect(a.budget).toBeUndefined();
    expect(qualifyLead(extra, a)).toBe(true);
    const rule = funnelSchema.parse({ ...extra, qualificationRules: [...extra.qualificationRules, { question: 'budget', operator: 'equals', values: ['a'] }] });
    expect(qualifyLead(rule, a)).toBe(false);
  });
  it('bookingUrl leaves non-Calendly links alone', () => {
    expect(bookingUrl('https://example.com/book', { firstName: 'A', lastName: 'B', email: 'a@b.co' })).toBe('https://example.com/book');
    expect(bookingUrl(undefined, { firstName: 'A', lastName: 'B', email: 'a@b.co' })).toBeUndefined();
  });
});
