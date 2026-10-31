import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import aduFunnel from '@/content/funnels/adu.json';
import { HOMEQUOTE_BATHROOM_FUNNEL } from '@/content/estimators/homequote-bathroom-funnel';
import { HOMEQUOTE_ADU_FUNNEL as SPEC } from '@/content/estimators/homequote-adu-funnel';
import { BASE_PRICE, UPGRADE_COST } from '@/lib/adu/pricing-config';
import { consentText, funnelSchema } from '@/lib/funnels/schema';

/**
 * HomeQuote Network's simple ADU funnel (/estimator/adu, experience 'funnel'), in
 * Buildoly's quote-flow format (model, finish, kitchen, bathroom, storage): the ADU template
 * (prices from lib/adu/pricing-config.ts), the spec, the paths, one exact photo
 * for every pick on every path (no fallbacks), the
 * network wording, the pages and the lead through the "adu" funnel (database faked).
 */

const LEAD = '0b9e8a52-5a8e-4f43-9c1e-6a1f3c2d4e60';
const funnelConfig = funnelSchema.parse(aduFunnel);

const m = vi.hoisted(() => ({ funnel: null as unknown, rpc: vi.fn() }));
const SESSION_ID = '0d6f7c4e-8a51-4c3e-9b0a-6f1d2e3c4b60';

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: () => {} }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: m.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ gte: async () => ({ count: 0, error: null }) }) }),
      insert: (row: Record<string, unknown>) => {
        const saved = { data: { ...row, id: SESSION_ID, version: 0, created_at: '2026-10-01T10:00:00Z' }, error: null };
        return Object.assign(Promise.resolve({ error: null }), { select: () => ({ single: async () => saved }) });
      },
      update: () => ({ eq: () => ({ is: async () => ({ error: null }) }) }),
      upsert: async () => ({ error: null }),
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
import EstimatorPage, { generateMetadata as landingMetadata } from '@/app/(estimator)/estimator/[slug]/page';
import FunnelDesignPage, { generateMetadata as designMetadata } from '@/app/(estimator)/estimator/[slug]/design/page';
import EstimatorEmbedPage from '@/app/(estimator-embed)/embed/estimator/[slug]/page';
import { tradeMeta } from '@/components/estimator/builders/meta';
import { getTradeBuilder } from '@/components/estimator/builders';
import { FunnelBookingScreen } from '@/components/estimator/funnel/booking/funnel-booking';
import { plainBookingTitle, priceEyebrow } from '@/components/estimator/funnel/booking/state';
import { FunnelContactScreen } from '@/components/estimator/funnel/contact/funnel-contact';
import { missingFunnelPhotos } from '@/components/estimator/funnel/photo-files';
import type { FunnelLeadResult } from '@/components/estimator/funnel/screens';
import { resolvePhoto, stepCount, stepCta } from '@/components/estimator/funnel/state';
import { publicTemplate } from '@/lib/estimator/config';
import { validateTemplate } from '@/lib/estimator/engine';
import {
  activeSteps,
  allFunnelSelections,
  defaultFunnelSelection,
  estimateFunnel,
  funnelAnswers,
  funnelPhoto,
  funnelSpecFor,
  normalizeFunnelSelection,
  photoKey,
  stepOptionPhotos,
} from '@/lib/estimator/funnel/engine';
import { funnelAnswersFor } from '@/lib/estimator/lead';
import { estimatorConsentText } from '@/lib/estimator/lead-client';
import { ESTIMATOR_SLUGS, getEstimator, TEMPLATES } from '@/lib/estimator/registry';
import { designNoun } from '@/lib/estimator/share';
import { sharedDesignView } from '@/lib/estimator/share-view';
import { ADU_CATALOG } from '@/lib/estimator/catalog/adu';
import { ADU_TEMPLATE, luxeUpgrade, UPGRADE } from '@/lib/estimator/templates/adu';
import type { FunnelSelection } from '@/lib/estimator/funnel/types';

const found = getEstimator('adu')!;
const { template, contractor } = found;
const pub = publicTemplate(template, contractor);
const PUBLIC = join(process.cwd(), 'public');
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const ids = (sel: FunnelSelection) => activeSteps(SPEC, sel).map((s) => s.id);
const all = allFunnelSelections(SPEC);
/** Every word a homeowner can read in the spec. */
const specWords = JSON.stringify(SPEC);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('BOOKING_TICKET_SECRET', 'test-booking-secret');
  m.funnel = { id: 'f-adu', slug: 'adu', is_demo: false, contractor_id: null, integration_id: null, config: funnelConfig };
  m.rpc.mockResolvedValue({ data: { id: SESSION_ID, lead_id: LEAD }, error: null });
});

describe('the ADU template', () => {
  it('is a registered trade with a valid template (example prices from the ADU pricing config)', () => {
    expect(ESTIMATOR_SLUGS).toContain('adu');
    expect(TEMPLATES.adu).toEqual({ template: ADU_TEMPLATE, catalog: ADU_CATALOG });
    expect(ADU_TEMPLATE.trade).toBe('adu');
    expect(ADU_TEMPLATE.pricesConfirmed).toBe(false);
    expect(validateTemplate(ADU_TEMPLATE)).toEqual([]);
    expect(validateTemplate(template)).toEqual([]);
  });

  it('funnel only: no live builder, no builder copy; called an ADU', () => {
    expect(tradeMeta('adu')).toBeNull();
    expect(getTradeBuilder('adu')).toBeNull();
    expect(designNoun('adu')).toBe('ADU');
  });
});

describe('the ADU funnel spec', () => {
  it('is the /estimator/adu page experience, for the HomeQuote Network', () => {
    expect(funnelSpecFor(contractor)).toBe(SPEC);
    expect(contractor).toMatchObject({
      slug: 'adu', trade: 'adu', experience: 'funnel', network: true, funnelSlug: 'adu',
      calendarProvider: 'homequote', revealRange: 'after_contact', adMeasurement: 'opt_out', pricesConfirmed: false,
      contractorName: 'HomeQuote Network', logoUrl: '/brand/homequote-logo-primary-horizontal-tight.png',
    });
    expect(contractor.calendarUrl).toBeUndefined();
    expect(contractor.financingNote).toBeUndefined();
    expect(funnelConfig.clientName).toBe(contractor.contractorName);
    expect(funnelConfig.trackingPixels?.consentMode).toBe('opt_out');
  });

  it("Buildoly's steps plus the bathroom: five (four for a studio, which has no bedroom)", () => {
    expect(SPEC.steps.map((s) => [s.id, s.label, s.options.map((o) => o.id)])).toEqual([
      ['model', 'Select a model.', ['studio', '1bed', '2bed', '3bed']],
      ['finish', 'Choose your finish.', ['standard', 'luxe']],
      ['kitchen', 'Design your kitchen.', ['standard', 'upgraded']],
      ['bath', 'Design your bathroom.', ['standard', 'upgraded']],
      ['storage', 'Choose your storage.', ['standard', 'more']],
    ]);
    expect(SPEC.steps[0].options.map((o) => [o.title, o.subtitle])).toEqual([
      ['Studio', '1 bath, about 350 sq ft'],
      ['One bedroom', '1 bath, about 500 sq ft'],
      ['Two bedroom', '1 or 2 baths, about 750 sq ft'],
      ['Three bedroom', '2 baths, about 1,000 sq ft'],
    ]);
    for (const model of ['1bed', '2bed', '3bed']) expect(ids({ model })).toEqual(['model', 'finish', 'kitchen', 'bath', 'storage']);
    expect(ids({ model: 'studio' })).toEqual(['model', 'finish', 'kitchen', 'bath']);
    expect(defaultFunnelSelection(SPEC)).toEqual({ model: '1bed', finish: 'standard', kitchen: 'standard', bath: 'standard', storage: 'standard' });
    // 3 bedroom models x 2 x 2 x 2 x 2 + the studio x 2 x 2 x 2.
    expect(all).toHaveLength(56);
    for (const sel of all) expect(stepCta(SPEC, stepCount(SPEC, sel) - 1, sel)).toBe('Get my estimate');
    // Switching to a studio drops the storage pick.
    expect(normalizeFunnelSelection(SPEC, { model: 'studio', finish: 'luxe', kitchen: 'upgraded', bath: 'upgraded', storage: 'more' })).toEqual({ model: 'studio', finish: 'luxe', kitchen: 'upgraded', bath: 'upgraded' });
  });
});

describe('photos: one property, built up step by step', () => {
  const DIR = '/estimator/adu/funnel/';
  const key = (src: string) => src.replace(DIR, '').replace(/\.webp$/, '');
  const file = (src: string) => existsSync(join(PUBLIC, src.replace(/^\//, '')));

  it('every shown step on every path has its own photo file (full and small), never a fallback', () => {
    for (const sel of all) {
      for (const s of activeSteps(SPEC, sel)) {
        const p = funnelPhoto(SPEC, s.id, sel);
        expect(p.src.startsWith(DIR), p.src).toBe(true);
        expect(file(p.src), p.src).toBe(true);
        expect(p.srcSm && file(p.srcSm), p.srcSm).toBe(true);
        expect(p.fallback).toBeUndefined();
        expect(p.alt).toMatch(/AI-generated/);
      }
    }
    expect(missingFunnelPhotos(SPEC)).toEqual([]);
    expect(file(SPEC.landing.heroPhoto.src)).toBe(true);
  });

  it('each step shows exactly the ADU picked so far (plan -> that model in the yard -> its inside in that finish)', () => {
    const at = (step: string, sel: FunnelSelection) => key(funnelPhoto(SPEC, step, normalizeFunnelSelection(SPEC, sel)).src);
    for (const model of ['studio', '1bed', '2bed', '3bed']) expect(at('model', { model })).toBe(`plan-${model}`);
    expect(at('finish', { model: 'studio', finish: 'standard' })).toBe('size-detached-studio');
    expect(at('finish', { model: '1bed', finish: 'standard' })).toBe('type-detached');
    expect(at('finish', { model: '3bed', finish: 'standard' })).toBe('size-detached-3bed');
    expect(at('finish', { model: '3bed', finish: 'luxe' })).toBe('finish-detached-3bed-luxe');
    // Every model and finish has its own exterior.
    const exteriors = all.map((s) => at('finish', s));
    expect(new Set(exteriors).size).toBe(8);
    // The inside follows the finish (white vs black frames) and the step's own pick.
    expect(at('kitchen', { model: '2bed', finish: 'luxe', kitchen: 'upgraded' })).toBe('kitchen-luxe-upgraded');
    expect(at('kitchen', { model: 'studio', finish: 'standard', kitchen: 'standard' })).toBe('kitchen-standard');
    expect(at('storage', { model: '3bed', finish: 'standard', kitchen: 'upgraded', storage: 'more' })).toBe('bedroom-standard-more');
    expect(at('storage', { model: '1bed', finish: 'luxe', storage: 'standard' })).toBe('bedroom-luxe');
    expect(at('bath', { model: 'studio', finish: 'standard', bath: 'standard' })).toBe('bath-standard');
    expect(at('bath', { model: '3bed', finish: 'luxe', kitchen: 'standard', bath: 'upgraded' })).toBe('bath-luxe-upgraded');
    // No unused photo ships: every published file is reachable.
    const shown = new Set([...all.flatMap((sel) => activeSteps(SPEC, sel).map((st) => at(st.id, sel))), key(SPEC.landing.heroPhoto.src)]);
    expect(shown.size).toBe(24);
  });
});

describe('prices (the ADU pricing config)', () => {
  const total = (sel: FunnelSelection) => estimateFunnel(SPEC, template, normalizeFunnelSelection(SPEC, sel)).total!;
  /** The low end is the config figure, rounded down to the template's $1,000 step. */
  const floor = (n: number) => Math.floor(n / 1000) * 1000;

  it('every path is priced and complete, a range from the config figure', () => {
    for (const sel of all) {
      const { estimate, total: t } = estimateFunnel(SPEC, template, sel);
      expect(t, JSON.stringify(sel)).not.toBeNull();
      expect(t!.low).toBeLessThan(t!.high);
      expect(estimate.unanswered).toEqual([]);
      expect(estimate.siteVisitItems).toEqual([]);
    }
    const plain = { finish: 'standard', kitchen: 'standard', bath: 'standard', storage: 'standard' };
    expect(total({ model: 'studio', ...plain }).low).toBe(BASE_PRICE.studio1);
    expect(total({ model: '1bed', ...plain }).low).toBe(BASE_PRICE.studio1);
    expect(total({ model: '2bed', ...plain }).low).toBe(BASE_PRICE.b2ba1);
    expect(total({ model: '3bed', ...plain }).low).toBe(BASE_PRICE.b3ba2);
    // Each pick adds its room's upgrade for the model's tier.
    expect(UPGRADE.kitchen('b2ba1')).toBe(UPGRADE_COST.kitchen.premiumPlus!.b2ba1);
    expect(total({ model: '2bed', ...plain, kitchen: 'upgraded' }).low).toBe(floor(BASE_PRICE.b2ba1 + UPGRADE.kitchen('b2ba1')));
    expect(total({ model: '3bed', ...plain, storage: 'more' }).low).toBe(floor(BASE_PRICE.b3ba2 + UPGRADE.storage('b3ba2')));
    // The bathroom upgrade is its own pick now (it used to ride on Luxe).
    expect(UPGRADE.bath('b2ba1')).toBe(UPGRADE_COST.bathroom.premium!.b2ba1);
    expect(UPGRADE.finish('b2ba1')).toBe(UPGRADE_COST.livingRoom.premium!.b2ba1);
    expect(total({ model: '2bed', ...plain, bath: 'upgraded' }).low).toBe(floor(BASE_PRICE.b2ba1 + UPGRADE.bath('b2ba1')));
    // All four upgrades together are every room's top finish (the old single Luxe price).
    const all4 = { finish: 'luxe', kitchen: 'upgraded', bath: 'upgraded', storage: 'more' };
    expect(total({ model: '1bed', ...all4 }).low).toBe(floor(BASE_PRICE.studio1 + luxeUpgrade('studio1')));
    expect(total({ model: '2bed', ...all4 }).low).toBe(floor(BASE_PRICE.b2ba1 + luxeUpgrade('b2ba1')));
    expect(total({ model: '3bed', ...all4 }).low).toBe(floor(BASE_PRICE.b3ba2 + luxeUpgrade('b3ba2')));
    // No bedroom: no closet upgrade.
    expect(total({ model: 'studio', finish: 'luxe', kitchen: 'upgraded', bath: 'upgraded' }).low).toBe(floor(BASE_PRICE.studio1 + luxeUpgrade('studio1') - UPGRADE.storage('studio1')));
  });

  it('every option maps to real template answers', () => {
    expect(funnelAnswers(SPEC, { model: 'studio', finish: 'standard', kitchen: 'standard', bath: 'standard' })).toEqual({ project: ['detached'], model: ['studio'], finish: ['standard'], kitchen: ['standard'], bath: ['standard'] });
    for (const sel of all) {
      for (const [q, picks] of Object.entries(funnelAnswers(SPEC, sel))) {
        const question = template.questions.find((x) => x.id === q);
        expect(question, q).toBeTruthy();
        for (const p of picks) expect(question!.options.some((o) => o.id === p), `${q}.${p}`).toBe(true);
      }
    }
  });

  it('no price reaches the browser before the contact step', () => {
    expect(pub.questions.flatMap((q) => q.options).every((o) => o.price === undefined)).toBe(true);
  });
});

describe('network wording (HomeQuote is not a builder)', () => {
  it('never claims a licence, years, reviews, projects or that it builds; same contact and booking shape as the kitchen funnel', () => {
    expect(specWords).not.toMatch(/CSLB|licensed & insured|since \d{4}|years|we build|our (work|projects|crew)|review(s)? from|★|pool|kitchen remodel|bathroom remodel/i);
    expect(SPEC.landing.reviews).toBeUndefined();
    expect(SPEC.landing.projects).toBeUndefined();
    expect(SPEC.landing.cta).toBe('Design your ADU');
    expect(SPEC.landing.logo).toEqual(HOMEQUOTE_BATHROOM_FUNNEL.landing.logo);
    expect(SPEC.contactStep.homeowner).toEqual(HOMEQUOTE_BATHROOM_FUNNEL.contactStep.homeowner);
    expect(SPEC.bookingStep.bookingTitle).toBe(HOMEQUOTE_BATHROOM_FUNNEL.bookingStep.bookingTitle);
    expect(SPEC.bookingStep.exampleFinancing).toBeUndefined();
  });
});

describe('pages', () => {
  it('/estimator/adu is the funnel landing: network logo, headline, button, no reviews', async () => {
    const html = renderToStaticMarkup(await EstimatorPage({ params: Promise.resolve({ slug: 'adu' }) }));
    const t = text(html);
    expect(t).toContain('Backyard ADUs, designed just for you');
    expect(t).toContain('Matched with licensed local ADU builders');
    expect(html).toContain('href="/estimator/adu/design"');
    expect(html).toContain('homequote-logo-primary-horizontal-tight');
    expect(html).toContain('/estimator/adu/funnel/finish-detached-1bed-luxe.webp');
    expect(t).not.toMatch(/customers say|Recent .* projects|CSLB/);
    const meta = await landingMetadata({ params: Promise.resolve({ slug: 'adu' }) });
    expect(meta.robots).toMatchObject({ index: false });
  });

  it('/design opens the steps from the URL (a studio path has four), and the embed starts at step 1', async () => {
    const design = renderToStaticMarkup(
      await FunnelDesignPage({ params: Promise.resolve({ slug: 'adu' }), searchParams: Promise.resolve({ step: '2', model: '2bed' }) }),
    );
    expect(text(design)).toContain('Step 2 of 5');
    expect(text(design)).toContain('Choose your finish.');
    expect(design).toContain('/estimator/adu/funnel/size-detached-2bed');
    const studio = renderToStaticMarkup(
      await FunnelDesignPage({ params: Promise.resolve({ slug: 'adu' }), searchParams: Promise.resolve({ step: '4', model: 'studio' }) }),
    );
    expect(text(studio)).toContain('Step 4 of 4');
    expect(text(studio)).toContain('Design your bathroom.');
    expect(studio).toContain('/estimator/adu/funnel/bath-standard');
    expect(text(studio)).toContain('Get my estimate');
    const embed = renderToStaticMarkup(await EstimatorEmbedPage({ params: Promise.resolve({ slug: 'adu' }), searchParams: Promise.resolve({}) }));
    expect(text(embed)).toContain('Step 1 of 5');
    expect(text(embed)).toContain('Select a model.');
    expect(embed).toContain('/estimator/adu/funnel/plan-1bed');
  });

  it('booking: the price card recap, the HomeQuote calendar, the ADU share words', () => {
    const sel = normalizeFunnelSelection(SPEC, { model: '2bed', finish: 'luxe', kitchen: 'upgraded', bath: 'upgraded', storage: 'more' });
    expect(priceEyebrow(SPEC, sel)).toBe('Two bedroom · Luxe · Upgraded kitchen · Upgraded bathroom · More closet space');
    const estimate = estimateFunnel(SPEC, template, sel).estimate;
    const result: FunnelLeadResult = {
      estimate, qualified: true, bookingTicket: 'ticket', selection: sel, homeowner: 'yes',
      contact: { firstName: 'Sam', lastName: 'Lee', email: 'sam@example.test' },
    };
    const props = { slug: 'adu', spec: SPEC, contractor, template: pub, selection: sel, embedded: false, headingId: 'h' };
    const html = renderToStaticMarkup(<FunnelBookingScreen {...props} result={result} />);
    expect(text(html)).toContain('Book your free call');
    expect(html).toContain('data-funnel-calendar="homequote"');
    expect(text(html)).toContain('Example prices, not yet confirmed.');
    expect(text(html)).not.toMatch(/Financing|\/mo|pool|bathroom remodel/i);
    expect(sharedDesignView(SPEC, template, sel, true).noun).toBe('ADU');
  });

  it('contact: the network consent wording', () => {
    const html = renderToStaticMarkup(
      <FunnelContactScreen slug="adu" spec={SPEC} contractor={contractor} template={pub} selection={defaultFunnelSelection(SPEC)} embedded={false} headingId="h" onDone={() => undefined} />,
    );
    expect(text(html)).toContain('Are you the homeowner?');
    expect(estimatorConsentText(contractor.contractorName)).toBe(consentText(funnelConfig));
  });
});

describe('lead through the adu funnel', () => {
  const contact = { firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.test', phone: '8185550142', consent: true, website: '' };
  const post = (body: unknown) =>
    POST(
      new Request('https://homequote.example/api/estimator/adu/lead', {
        method: 'POST', headers: { origin: 'https://homequote.example' }, body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ slug: 'adu' }) },
    );
  const picks = { model: '2bed', finish: 'luxe', kitchen: 'upgraded', bath: 'upgraded', storage: 'more' };
  const lead = (over: Record<string, unknown> = {}) => ({
    answers: funnelAnswers(SPEC, picks),
    funnel: picks,
    zip: '92101',
    address: '12 Elm St, San Diego, CA 92101',
    homeowner: 'yes',
    contact,
    consentText: estimatorConsentText(contractor.contractorName),
    measurement: false,
    ...over,
  });

  it('the build type is the funnel’s own service (each qualifies)', () => {
    for (const project of ['detached', 'attached', 'garage']) {
      expect(funnelAnswersFor(funnelConfig, { zip: '92101', homeowner: 'yes', project, trade: 'adu' })).toMatchObject({ service: project });
    }
  });

  it('re-prices the picks on the server, files a qualified ADU lead and returns the booking ticket', async () => {
    const res = await post(lead());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, qualified: true });
    expect(body.estimate.low).toBe(estimateFunnel(SPEC, template, picks).total!.low);
    expect(typeof body.bookingTicket).toBe('string');
    expect(body.shareUrl).toMatch(/^\/estimator\/adu\/my-design\?model=2bed&finish=luxe&kitchen=upgraded&bath=upgraded&storage=more/);
    const args = m.rpc.mock.calls[0]![1] as Record<string, unknown>;
    expect(args).toMatchObject({ p_qualified: true, p_consent: consentText(funnelConfig) });
    expect(args.p_answers).toMatchObject({ service: 'detached', homeowner: 'yes', zip: '92101' });
  });

  it('a non-owner is saved for review, never booked', async () => {
    const body = await (await post(lead({ homeowner: 'no' }))).json();
    expect(body).toMatchObject({ ok: true, qualified: false });
    expect(body.bookingTicket).toBeUndefined();
  });
});
