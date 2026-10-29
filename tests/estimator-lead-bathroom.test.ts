import { beforeEach, describe, expect, it, vi } from 'vitest';
import bathroomFunnel from '@/content/funnels/bathroom-remodel.json';
import poolMasters from '@/content/funnels/clients/pool-masters-la.json';
import { consentText, funnelSchema } from '@/lib/funnels/schema';
import { computeEstimate } from '@/lib/estimator/engine';
import type { Answers } from '@/lib/estimator/types';
import { FIXTURE_CONTRACTOR, FIXTURE_TEMPLATE } from './fixtures/estimator-template';

/**
 * Bathroom leads through HomeQuote Network's published "bathroom-remodel"
 * funnel: the real registered estimator, the real funnel JSON, and the save
 * route with the database faked (as in estimator-lead.test.ts).
 */

const LEAD = '0b9e8a52-5a8e-4f43-9c1e-6a1f3c2d4e5f';
const funnelConfig = funnelSchema.parse(bathroomFunnel);

const m = vi.hoisted(() => ({
  funnel: null as unknown, rpc: vi.fn(), inserts: [] as { table: string; row: Record<string, unknown> }[],
}));

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: () => {} }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: m.rpc,
    from: (table: string) => ({
      select: () => ({ eq: () => ({ gte: async () => ({ count: 0, error: null }) }) }),
      insert: (row: Record<string, unknown>) => {
        m.inserts.push({ table, row });
        const saved = { data: { ...row, id: 'sess-1', version: 0, created_at: '2026-10-01T10:00:00Z' }, error: null };
        return Object.assign(Promise.resolve({ error: null }), { select: () => ({ single: async () => saved }) });
      },
    }),
  }),
}));
vi.mock('@/lib/funnels/server', () => ({
  hash: (s: string) => `h:${s}`, newToken: () => 'tok', readBody: async (r: Request) => r.json(), sameOrigin: () => true,
  getFunnel: async () => m.funnel,
}));
vi.mock('@/lib/funnels/delivery', () => ({ deliverPendingFunnels: vi.fn() }));
vi.mock('@/lib/leads/notify', () => ({ sendLeadEmailsSoon: vi.fn() }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: vi.fn() }));
vi.mock('@/lib/ai-calling/run.server', () => ({ runAiCallQueue: vi.fn() }));
vi.mock('@/lib/sms/config', () => ({ smsConfigured: () => false }));
vi.mock('@/lib/sms/service', () => ({ startSmsForLead: vi.fn() }));
vi.mock('@/lib/meta/lead-ids', () => ({ rememberLeadMetaIds: vi.fn() }));
vi.mock('@/lib/meta/audit.server', () => ({ directSendAudit: () => ({ reserve: async () => 'ok', finish: async () => {} }) }));
vi.mock('@/lib/meta/capi', async (orig) => ({ ...(await orig<typeof import('@/lib/meta/capi')>()), sendMetaEvent: vi.fn() }));

import { POST } from '@/app/api/estimator/[slug]/lead/route';
import { buildLeadPayload, describeSize, funnelAnswersFor, parseLeadRequest, qualifyLead } from '@/lib/estimator/lead';
import { getEstimator } from '@/lib/estimator/registry';
import { verifyRenderToken } from '@/lib/estimator/render';

const registered = getEstimator('bathroom-remodel')!;
const { template, contractor } = registered;

const answers: Answers = {
  project: ['full'], size: ['medium'], package: ['signature'], scope: ['bathing', 'vanity', 'floor', 'walls', 'extras'],
  bathing: ['walk_in'], showerTile: ['zellige'], vanity: ['double'], vanityFinish: ['wood'], counter: ['quartz_white'],
  floor: ['hex_mosaic'], paint: ['sage'], metal: ['brushed_gold'], extras: ['niche', 'bench'],
  plumbing: ['no'], damage: ['no'], location: ['no'],
};
const contact = { firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.test', phone: '8185550142', consent: true, website: '' };
const valid = { answers, zip: '92101', homeowner: 'yes', timeline: 'asap', contact, consentText: consentText(funnelConfig), measurement: false };

const request = (over: Record<string, unknown> = {}) => {
  const r = parseLeadRequest({ ...valid, ...over });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.data;
};
const build = (ans: Answers = answers, over: Record<string, unknown> = {}) => {
  const estimate = computeEstimate(template, { answers: ans, dimensions: request(over).dimensions });
  return { estimate, payload: buildLeadPayload({
    template, contractor, funnel: { slug: 'bathroom-remodel', contractorId: null, config: funnelConfig },
    request: request(over), answers: ans, estimate, likedLooks: [],
  }) };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('KIE_API_KEY', 'test-kie-key');
  vi.stubEnv('ESTIMATOR_RENDER_SECRET', 'test-secret');
  m.inserts.length = 0;
  m.funnel = { id: 'f-bath', slug: 'bathroom-remodel', is_demo: false, contractor_id: null, integration_id: null, config: funnelConfig };
  m.rpc.mockResolvedValue({ data: { id: 'sess-1', lead_id: LEAD }, error: null });
});

describe('bathroom estimator registration', () => {
  it('files under the network bathroom funnel, prices revealed only after contact', () => {
    expect(template.trade).toBe('bathroom');
    expect(contractor).toMatchObject({ funnelSlug: 'bathroom-remodel', contractorName: 'HomeQuote Network', revealRange: 'after_contact' });
    expect(template.pricesConfirmed).toBe(false);
  });
});

describe('consent for the network funnel', () => {
  it('names HomeQuote Network and its matched contractor partners, from the funnel helper', () => {
    expect(funnelConfig.clientName).toBe('HomeQuote Network');
    expect(consentText(funnelConfig)).toContain('HomeQuote Network and the contractor partners it matches me with');
    expect(consentText(funnelConfig)).not.toBe(consentText(funnelSchema.parse(poolMasters)));
  });
});

describe('bathroom payload mapping', () => {
  it('answers the funnel service question for every project pick', () => {
    const service = (project: string) => funnelAnswersFor(funnelConfig, { zip: '92101', homeowner: 'yes', timeline: 'asap', project, trade: 'bathroom' }).service;
    expect(service('full')).toBe('full_remodel');
    // A cosmetic refresh is not a full remodel: it is filed as "other" and reviewed.
    expect(service('refresh')).toBe('other');
    expect(service('tub_to_shower')).toBe('tub_to_shower');
    // Aliases are per trade: a pool project id means nothing to the bathroom funnel.
    expect(service('remodel')).toBeUndefined();
  });
  it('qualifies a homeowner anywhere (no service-area list) and sends a renter to review', () => {
    for (const project of ['full', 'tub_to_shower']) {
      expect(build({ ...answers, project: [project] }).payload.qualified).toBe(true);
    }
    expect(build({ ...answers, project: ['refresh'] }).payload.qualified).toBe(false);
    expect(build(answers, { homeowner: 'no' }).payload.qualified).toBe(false);
    expect(build(answers, { zip: '10001' }).payload).toMatchObject({ qualified: true, areaValid: true });
    const base = funnelAnswersFor(funnelConfig, { zip: '92101', homeowner: 'yes', timeline: 'asap', project: 'full', trade: 'bathroom' });
    expect(qualifyLead(funnelConfig, { ...base, service: 'repair' })).toBe(false);
  });
  it('gives the contractor readable bathroom keys: source, range, room size, picks', () => {
    const { payload, estimate } = build();
    expect(payload.funnelAnswers).toMatchObject({
      service: 'full_remodel', zip: '92101', homeowner: 'yes', timeline: 'asap',
      estimator_source: 'Bathroom estimator', estimator_status: estimate.status,
      estimator_room: 'about 10 x 8 ft, 80 sq ft of floor (medium preset)',
    });
    expect(payload.funnelAnswers).not.toHaveProperty('estimator_pool');
    expect(payload.funnelAnswers.estimator_range).toMatch(/^\$[\d,]+ – \$[\d,]+$/);
    expect(payload.funnelAnswers.estimator_picks).toContain('Shower tile: Zellige');
    expect(payload.funnelAnswers.estimator_picks).toContain('Fixtures: Brushed gold');
    expect(payload.funnelAnswers.estimator_picks).not.toMatch(/pool|coping|plaster/i);
    expect(Object.values(payload.funnelAnswers).every((v) => typeof v === 'string')).toBe(true);
    // Books the HomeQuote team calendar from the result screen.
    expect(payload).toMatchObject({ qualified: true, nextStep: 'calendar', completed: 'timeline' });
    expect(payload.activity.metadata).not.toHaveProperty('contractor_id');
    expect(payload.activity.body).toMatch(/^Bathroom estimator: ballpark \$[\d,]+ – \$[\d,]+ \(not a quote; example prices\)/);
    expect(payload.activity.body).toContain('- Shower tile: Zellige: $');
  });
  it('describes typed dimensions and an unknown size', () => {
    expect(build(answers, { dimensions: { lengthFt: 9, widthFt: 7 } }).payload.funnelAnswers.estimator_room).toBe('about 9 x 7 ft, 63 sq ft of floor (typed dimensions)');
    const unsure = build({ ...answers, size: ['unsure'] }).payload;
    expect(unsure.funnelAnswers.estimator_room).toBe('about 10 x 8 ft, 80 sq ft of floor assumed (size to be measured)');
    expect(unsure.funnelAnswers.estimator_site_visit).toBeTruthy();
    expect(unsure.activity.body).toContain('Needs a site visit');
  });
  it('keeps the pool size line exactly as before', () => {
    const pool = computeEstimate(FIXTURE_TEMPLATE, { answers: { project: ['remodel'], shape: ['rectangle'], size: ['medium'] } });
    expect(describeSize(FIXTURE_TEMPLATE, pool.geometry)).toEqual(['estimator_pool', `rectangle, about ${pool.geometry.lengthFt} x ${pool.geometry.widthFt} ft (medium preset)`]);
    expect(FIXTURE_CONTRACTOR.trade ?? 'pool').toBe('pool');
  });
});

describe('POST /api/estimator/bathroom-remodel/lead', () => {
  const post = (body: unknown) => POST(new Request('https://homequote.example/api/estimator/bathroom-remodel/lead', {
    method: 'POST', headers: { origin: 'https://homequote.example' }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ slug: 'bathroom-remodel' }) });

  it('saves through the bathroom funnel, qualified, with a render token and no booking link', async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, qualified: true });
    expect(body.calendarUrl).toBeUndefined();
    expect(verifyRenderToken('bathroom-remodel', body.renderToken)?.leadId).toBe(LEAD);
    expect(verifyRenderToken('pool-masters', body.renderToken)).toBeNull();

    const args = m.rpc.mock.calls[0]![1] as Record<string, unknown>;
    expect(args).toMatchObject({ p_qualified: true, p_step: 'thanks', p_consent: consentText(funnelConfig), p_service_area_valid: true });
    expect(args.p_answers).toMatchObject({ service: 'full_remodel', estimator_source: 'Bathroom estimator' });
    const timeline = m.inserts.find((i) => i.table === 'lead_activities')!;
    expect(timeline.row.body).toMatch(/^Bathroom estimator: ballpark/);
    expect(timeline.row.metadata).toMatchObject({ estimator: { slug: 'bathroom-remodel', funnel: 'bathroom-remodel', pricesConfirmed: false } });
  });
  it('a renter is saved for review (the funnel reviews, never stops) and still gets a render token', async () => {
    const body = await (await post({ ...valid, homeowner: 'no' })).json();
    expect(body).toMatchObject({ ok: true, qualified: false });
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(body.renderToken).toBeTruthy();
  });
  it('rejects the pool funnel consent wording, saving nothing', async () => {
    const res = await post({ ...valid, consentText: consentText(funnelSchema.parse(poolMasters)) });
    expect(res.status).toBe(409);
    expect(m.rpc).not.toHaveBeenCalled();
  });
});
