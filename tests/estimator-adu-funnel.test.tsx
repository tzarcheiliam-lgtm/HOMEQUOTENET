import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import aduFunnel from '@/content/funnels/adu.json';
import { HOMEQUOTE_BATHROOM_FUNNEL } from '@/content/estimators/homequote-bathroom-funnel';
import { HOMEQUOTE_ADU_FUNNEL as SPEC } from '@/content/estimators/homequote-adu-funnel';
import { BASE_PRICE } from '@/lib/adu/pricing-config';
import { consentText, funnelSchema } from '@/lib/funnels/schema';

/**
 * HomeQuote Network's simple ADU funnel (/estimator/adu, experience 'funnel'):
 * the ADU template (prices from lib/adu/pricing-config.ts), the spec, the
 * paths, ONE chained photo for every pick on every path (no fallbacks), the
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
import { ADU_TEMPLATE, luxeUpgrade } from '@/lib/estimator/templates/adu';
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

  it('three taps (two for a garage conversion: always a studio)', () => {
    expect(SPEC.steps.map((s) => [s.id, s.label, s.options.map((o) => o.id)])).toEqual([
      ['type', 'What would you like to build?', ['detached', 'garage', 'attached']],
      ['size', 'Choose your size.', ['studio', '1bed', '2bed']],
      ['finish', 'Choose your finish.', ['standard', 'luxe']],
    ]);
    expect(SPEC.steps[0].options.map((o) => o.title)).toEqual(['Detached backyard ADU', 'Garage conversion', 'Attached addition']);
    expect(SPEC.steps[1].options.map((o) => [o.title, o.subtitle])).toEqual([['Studio', 'About 400 sq ft'], ['1 bedroom', 'About 600 sq ft'], ['2 bedrooms', 'About 800 sq ft']]);
    expect(ids({ type: 'detached' })).toEqual(['type', 'size', 'finish']);
    expect(ids({ type: 'attached' })).toEqual(['type', 'size', 'finish']);
    expect(ids({ type: 'garage' })).toEqual(['type', 'finish']);
    expect(defaultFunnelSelection(SPEC)).toEqual({ type: 'detached', size: '1bed', finish: 'standard' });
    // 2 types x 3 sizes x 2 finishes + the garage's 2 finishes.
    expect(all).toHaveLength(14);
    for (const sel of all) expect(stepCta(SPEC, stepCount(SPEC, sel) - 1, sel)).toBe('Get my estimate');
    // Switching to a garage conversion drops the size pick.
    expect(normalizeFunnelSelection(SPEC, { type: 'garage', size: '2bed', finish: 'luxe' })).toEqual({ type: 'garage', finish: 'luxe' });
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

  it('each step shows exactly the ADU picked so far (type -> size -> finish), and a pick that changes nothing keeps the photo', () => {
    const at = (step: string, sel: FunnelSelection) => key(funnelPhoto(SPEC, step, normalizeFunnelSelection(SPEC, sel)).src);
    expect(at('type', { type: 'detached' })).toBe('type-detached');
    expect(at('type', { type: 'garage' })).toBe('type-garage');
    expect(at('size', { type: 'detached', size: 'studio' })).toBe('size-detached-studio');
    expect(at('size', { type: 'attached', size: '2bed' })).toBe('size-attached-2bed');
    // The 1 bed is what the type step already showed; Standard is what the size step already showed.
    expect(at('size', { type: 'attached', size: '1bed' })).toBe(at('type', { type: 'attached' }));
    for (const sel of all) {
      if (sel.finish !== 'standard') continue;
      const before = sel.type === 'garage' ? at('type', sel) : at('size', sel);
      expect(at('finish', sel), JSON.stringify(sel)).toBe(before);
    }
    expect(at('finish', { type: 'detached', size: 'studio', finish: 'luxe' })).toBe('finish-detached-studio-luxe');
    expect(at('finish', { type: 'garage', finish: 'luxe' })).toBe('finish-garage-luxe');
    // Every luxe path has its own photo.
    const luxe = all.filter((s) => s.finish === 'luxe').map((s) => at('finish', s));
    expect(new Set(luxe).size).toBe(luxe.length);
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
    expect(total({ type: 'garage', finish: 'standard' }).low).toBe(BASE_PRICE.garage);
    expect(total({ type: 'detached', size: 'studio', finish: 'standard' }).low).toBe(BASE_PRICE.studio1);
    expect(total({ type: 'detached', size: '1bed', finish: 'standard' }).low).toBe(BASE_PRICE.studio1);
    expect(total({ type: 'detached', size: '2bed', finish: 'standard' }).low).toBe(BASE_PRICE.b2ba1);
    expect(total({ type: 'detached', size: '1bed', finish: 'luxe' }).low).toBe(floor(BASE_PRICE.studio1 + luxeUpgrade('studio1')));
    expect(total({ type: 'detached', size: '2bed', finish: 'luxe' }).low).toBe(floor(BASE_PRICE.b2ba1 + luxeUpgrade('b2ba1')));
    expect(total({ type: 'garage', finish: 'luxe' }).low).toBe(floor(BASE_PRICE.garage + luxeUpgrade('garage')));
    // An attached addition is priced like a detached ADU of the same size (no attached price yet).
    expect(total({ type: 'attached', size: '2bed', finish: 'luxe' })).toEqual(total({ type: 'detached', size: '2bed', finish: 'luxe' }));
  });

  it('every option maps to real template answers', () => {
    expect(funnelAnswers(SPEC, { type: 'garage', finish: 'luxe' })).toEqual({ project: ['garage'], size: ['small'], finish: ['luxe'], luxe2bed: ['yes'] });
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
    expect(specWords).not.toMatch(/CSLB|licensed & insured|since \d{4}|years|we build|our (work|projects|crew)|review(s)? from|★|pool|kitchen remodel|bathroom/i);
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

  it('/design opens the steps from the URL (a garage path has two), and the embed starts at step 1', async () => {
    const design = renderToStaticMarkup(
      await FunnelDesignPage({ params: Promise.resolve({ slug: 'adu' }), searchParams: Promise.resolve({ step: '2', type: 'detached', size: '2bed' }) }),
    );
    expect(text(design)).toContain('Step 2 of 3');
    expect(text(design)).toContain('Choose your size.');
    expect(design).toMatch(/<input[^>]*checked=""[^>]*value="2bed"/);
    expect(design).toContain('/estimator/adu/funnel/size-detached-2bed');
    const garage = renderToStaticMarkup(
      await FunnelDesignPage({ params: Promise.resolve({ slug: 'adu' }), searchParams: Promise.resolve({ step: '2', type: 'garage' }) }),
    );
    expect(text(garage)).toContain('Step 2 of 2');
    expect(text(garage)).toContain('Choose your finish.');
    expect(text(garage)).toContain('Get my estimate');
    const embed = renderToStaticMarkup(await EstimatorEmbedPage({ params: Promise.resolve({ slug: 'adu' }), searchParams: Promise.resolve({}) }));
    expect(text(embed)).toContain('Step 1 of 3');
    expect(text(embed)).toContain('What would you like to build?');
  });

  it('booking: the price card recap, the HomeQuote calendar, the ADU share words', () => {
    const sel = normalizeFunnelSelection(SPEC, { type: 'detached', size: '2bed', finish: 'luxe' });
    expect(priceEyebrow(SPEC, sel)).toBe('Detached ADU · 2 bedrooms · Luxe');
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
    expect(text(html)).not.toMatch(/Financing|\/mo|pool|bathroom|kitchen/i);
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
  const picks = { type: 'detached', size: '2bed', finish: 'luxe' };
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
    expect(body.shareUrl).toMatch(/^\/estimator\/adu\/my-design\?type=detached&size=2bed&finish=luxe/);
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
