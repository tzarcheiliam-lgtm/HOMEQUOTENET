import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import kitchenFunnel from '@/content/funnels/kitchen-remodel.json';
import { HOMEQUOTE_BATHROOM_FUNNEL } from '@/content/estimators/homequote-bathroom-funnel';
import { HOMEQUOTE_KITCHEN_FUNNEL as SPEC } from '@/content/estimators/homequote-kitchen-funnel';
import { consentText, funnelSchema } from '@/lib/funnels/schema';

/**
 * HomeQuote Network's simple kitchen funnel (/estimator/kitchen-remodel,
 * experience 'funnel'): the new kitchen template, the spec, the paths and
 * their follow-up steps, a photo for every pick on every path, the prices,
 * the network wording, the pages and the lead through the published
 * kitchen-remodel funnel (database faked).
 */

const LEAD = '0b9e8a52-5a8e-4f43-9c1e-6a1f3c2d4e60';
const funnelConfig = funnelSchema.parse(kitchenFunnel);

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
import { KITCHEN_CATALOG } from '@/lib/estimator/catalog/kitchen';
import { KITCHEN_TEMPLATE } from '@/lib/estimator/templates/kitchen';
import type { FunnelSelection } from '@/lib/estimator/funnel/types';

const found = getEstimator('kitchen-remodel')!;
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
  m.funnel = { id: 'f-kitchen', slug: 'kitchen-remodel', is_demo: false, contractor_id: null, integration_id: null, config: funnelConfig };
  m.rpc.mockResolvedValue({ data: { id: SESSION_ID, lead_id: LEAD }, error: null });
});

describe('the kitchen template', () => {
  it('is a registered trade with a valid template and catalog (example prices)', () => {
    expect(ESTIMATOR_SLUGS).toContain('kitchen-remodel');
    expect(TEMPLATES.kitchen).toEqual({ template: KITCHEN_TEMPLATE, catalog: KITCHEN_CATALOG });
    expect(KITCHEN_TEMPLATE.trade).toBe('kitchen');
    expect(KITCHEN_TEMPLATE.pricesConfirmed).toBe(false);
    expect(validateTemplate(KITCHEN_TEMPLATE)).toEqual([]);
    expect(validateTemplate(template)).toEqual([]);
    // The catalog repeats the template's options (no drift) and adds only options off by default.
    for (const [q, options] of Object.entries(KITCHEN_CATALOG)) {
      const tq = KITCHEN_TEMPLATE.questions.find((x) => x.id === q)!;
      expect(options.slice(0, tq.options.length)).toEqual(tq.options);
      expect(template.questions.find((x) => x.id === q)!.options.map((o) => o.id)).toEqual(tq.options.map((o) => o.id));
    }
  });

  it('funnel only: no live builder, no builder copy (the pages use the funnel)', () => {
    expect(tradeMeta('kitchen')).toBeNull();
    expect(getTradeBuilder('kitchen')).toBeNull();
    expect(designNoun('kitchen')).toBe('kitchen');
    expect(designNoun('bathroom')).toBe('bathroom');
    expect(designNoun('pool')).toBe('pool');
  });
});

describe('the kitchen funnel spec', () => {
  it('is the kitchen-remodel page experience, for the HomeQuote Network', () => {
    expect(funnelSpecFor(contractor)).toBe(SPEC);
    expect(contractor).toMatchObject({
      slug: 'kitchen-remodel', trade: 'kitchen', experience: 'funnel', network: true, funnelSlug: 'kitchen-remodel',
      calendarProvider: 'homequote', revealRange: 'after_contact', adMeasurement: 'opt_out', pricesConfirmed: false,
      contractorName: 'HomeQuote Network', logoUrl: '/brand/homequote-logo-primary-horizontal-tight.png',
    });
    expect(contractor.calendarUrl).toBeUndefined();
    expect(contractor.financingNote).toBeUndefined();
    // Mirrors the published funnel.
    expect(funnelConfig.clientName).toBe(contractor.contractorName);
    expect(funnelConfig.trackingPixels?.consentMode).toBe('opt_out');
  });

  it('three core taps, then only the follow-ups that apply', () => {
    expect(SPEC.steps.filter((s) => !s.showWhen && s.id !== 'cabinets').map((s) => [s.id, s.label])).toEqual([
      ['size', 'Select your kitchen.'],
      ['finish', 'Choose your finish.'],
      ['layout', 'Choose your layout.'],
    ]);
    expect(SPEC.steps.map((s) => [s.id, s.options.map((o) => o.id)])).toEqual([
      ['size', ['compact', 'medium', 'large']],
      ['finish', ['standard', 'luxe']],
      ['layout', ['l', 'u', 'island']],
      ['cabinets', ['white', 'wood', 'twotone']],
      ['island', ['prep', 'seating', 'sink']],
      ['appliances', ['stainless', 'pro', 'panel']],
    ]);
    expect(SPEC.steps.map((s) => s.label)).toEqual([
      'Select your kitchen.', 'Choose your finish.', 'Choose your layout.', 'Choose your cabinets.', 'Choose your island.', 'Choose your appliances.',
    ]);
    expect(SPEC.steps[0].options.map((o) => [o.title, o.subtitle])).toEqual([
      ['Compact / galley', 'About 10 × 10 ft'],
      ['Medium', 'About 12 × 14 ft'],
      ['Large open kitchen', 'About 16 × 18 ft'],
    ]);
    expect(SPEC.steps[1].options.map((o) => o.subtitle)).toEqual([
      'Shaker cabinets, quartz counters, stainless appliances',
      'Custom cabinets, quartzite counters, pro-style range, brass hardware',
    ]);
    expect(SPEC.steps[2].options.map((o) => o.title)).toEqual(['L-shaped', 'U-shaped', 'Kitchen with island']);
    expect(SPEC.steps[4].options.map((o) => o.title)).toEqual(['Prep island', 'Seating island with waterfall edge', 'Island with sink']);
    expect(SPEC.steps[5].options.map((o) => o.title)).toEqual(['Stainless package', 'Pro range & hood', 'Panel-ready built-ins']);
    // Cabinets always, island only with an island, appliances only for Luxe.
    expect(ids({ finish: 'standard', layout: 'l' })).toEqual(['size', 'finish', 'layout', 'cabinets']);
    expect(ids({ finish: 'standard', layout: 'island' })).toEqual(['size', 'finish', 'layout', 'cabinets', 'island']);
    expect(ids({ finish: 'luxe', layout: 'u' })).toEqual(['size', 'finish', 'layout', 'cabinets', 'appliances']);
    expect(ids({ finish: 'luxe', layout: 'island' })).toEqual(['size', 'finish', 'layout', 'cabinets', 'island', 'appliances']);
    expect(defaultFunnelSelection(SPEC)).toEqual({ size: 'medium', finish: 'standard', layout: 'island', cabinets: 'white', island: 'seating' });
  });

  it('counts the steps of the path; the last step says "Get my estimate"', () => {
    expect(stepCount(SPEC, normalizeFunnelSelection(SPEC, { finish: 'standard', layout: 'l' }))).toBe(4);
    expect(stepCount(SPEC, normalizeFunnelSelection(SPEC, { finish: 'luxe', layout: 'island' }))).toBe(6);
    for (const sel of all) {
      const n = stepCount(SPEC, sel);
      expect(n).toBeGreaterThanOrEqual(4);
      expect(n).toBeLessThanOrEqual(6);
      expect(stepCta(SPEC, n - 1, sel)).toBe('Get my estimate');
      expect(stepCta(SPEC, 0, sel)).toBe('Continue');
    }
    // 3 sizes x (standard: 2 x 3 + 3 x 3 = 15, luxe: 2 x 3 x 3 + 3 x 3 x 3 = 45).
    expect(all).toHaveLength(3 * (15 + 45));
  });

  it('changing an earlier pick drops the follow-ups that no longer apply', () => {
    const luxe = normalizeFunnelSelection(SPEC, { size: 'large', finish: 'luxe', layout: 'island', cabinets: 'wood', island: 'sink', appliances: 'panel' });
    expect(luxe).toMatchObject({ cabinets: 'wood', island: 'sink', appliances: 'panel' });
    const l = normalizeFunnelSelection(SPEC, { ...luxe, layout: 'l' });
    expect(l).toEqual({ size: 'large', finish: 'luxe', layout: 'l', cabinets: 'wood', appliances: 'panel' });
    const standard = normalizeFunnelSelection(SPEC, { ...luxe, finish: 'standard' });
    expect(standard).not.toHaveProperty('appliances');
    expect(funnelAnswers(SPEC, l)).not.toHaveProperty('islandStyle');
    // Standard gets the stainless package its finish promises, whatever was picked on the luxe path.
    expect(funnelAnswers(SPEC, standard).appliances).toEqual(['stainless']);
  });
});

describe('photos', () => {
  const KEYS = new Set([
    'size-compact', 'size-medium', 'size-large',
    ...['l', 'u', 'island'].flatMap((l) => ['standard', 'luxe'].map((f) => `layout-${l}-${f}`)),
    'cabinets-white', 'cabinets-wood', 'cabinets-twotone', 'island-prep', 'island-seating', 'island-sink',
    'appliances-stainless', 'appliances-pro', 'appliances-panel',
  ]);
  const file = (src: string) => existsSync(join(PUBLIC, src.replace(/^\//, '')));

  it('every shown step on every path has a photo from the agreed set, each with an existing fallback', () => {
    const used = new Set<string>();
    const missing = new Set(missingFunnelPhotos(SPEC));
    for (const sel of all) {
      for (const s of activeSteps(SPEC, sel)) {
        const p = funnelPhoto(SPEC, s.id, sel);
        const key = p.src.match(/\/estimator\/kitchen\/funnel\/([^/]+)\.webp$/)?.[1];
        expect(key && KEYS.has(key), `${s.id} ${JSON.stringify(sel)} -> ${p.src}`).toBe(true);
        expect(p.srcSm).toBe(`/estimator/kitchen/funnel/${key}-sm.webp`);
        expect(p.alt).toMatch(/AI-generated/);
        expect(p.fallback && file(p.fallback.src), p.fallback?.src).toBe(true);
        expect(p.fallback!.alt).toMatch(/stock photo/);
        const shown = resolvePhoto(p, missing);
        expect(file(shown.src), shown.src).toBe(true);
        used.add(key!);
      }
    }
    expect(used).toEqual(KEYS);
  });

  it('every photo file is in public/ (so the photo note is true: no stock fallback shows)', () => {
    expect(missingFunnelPhotos(SPEC)).toEqual([]);
    expect(SPEC.photoNote).toBe('Photos are AI-generated example designs, not finished projects.');
  });

  it('the layout photo follows the finish, and the finish photo shows the layout (the island until it is picked)', () => {
    expect(funnelPhoto(SPEC, 'layout', { finish: 'luxe', layout: 'u' }).src).toBe('/estimator/kitchen/funnel/layout-u-luxe.webp');
    expect(photoKey(SPEC, 'layout', { finish: 'standard', layout: 'l' })).toBe('layout-l-standard');
    expect(funnelPhoto(SPEC, 'finish', { finish: 'luxe' }).src).toBe('/estimator/kitchen/funnel/layout-island-luxe.webp');
    const swaps = stepOptionPhotos(SPEC, 'layout', { finish: 'standard' });
    expect(Object.fromEntries(Object.entries(swaps).map(([k, p]) => [k, p.src.split('/').pop()]))).toEqual({
      l: 'layout-l-standard.webp',
      u: 'layout-u-standard.webp',
      island: 'layout-island-standard.webp',
    });
    // Follow-up photos are asked for (preloaded) even while their step is hidden.
    expect(Object.keys(stepOptionPhotos(SPEC, 'appliances', { finish: 'standard' }))).toEqual(['stainless', 'pro', 'panel']);
    expect(SPEC.landing.heroPhoto.src).toBe('/estimator/kitchen/funnel/layout-island-luxe.webp');
  });
});

describe('prices', () => {
  const range = (sel: FunnelSelection) => estimateFunnel(SPEC, template, normalizeFunnelSelection(SPEC, sel)).total!;

  it('every path is priced through computeEstimate on the kitchen template (a range, never a single figure)', () => {
    for (const sel of all) {
      const { estimate, total } = estimateFunnel(SPEC, template, sel);
      expect(total, JSON.stringify(sel)).not.toBeNull();
      expect(total!.low).toBeGreaterThanOrEqual(30000);
      expect(total!.high).toBeLessThanOrEqual(260000);
      expect(total!.low).toBeLessThan(total!.high);
      // Only the site questions (asked in person) are left open.
      expect(estimate.unanswered).toEqual(['plumbing', 'damage', 'location']);
    }
    // Plausible Southern California example ranges.
    expect(range({ size: 'compact', finish: 'standard', layout: 'l', cabinets: 'white' })).toEqual({ low: 32000, high: 60000 });
    expect(range({ size: 'large', finish: 'luxe', layout: 'island', cabinets: 'wood', island: 'seating', appliances: 'panel' })).toEqual({ low: 136000, high: 248000 });
  });

  it('bigger kitchens, the luxe finish and each follow-up upgrade cost more', () => {
    const base = { size: 'medium', finish: 'standard', layout: 'l', cabinets: 'white' };
    expect(range({ ...base, size: 'compact' }).low).toBeLessThan(range(base).low);
    expect(range({ ...base, size: 'large' }).low).toBeGreaterThan(range(base).low);
    expect(range({ ...base, finish: 'luxe', appliances: 'stainless' }).low).toBeGreaterThan(range(base).low);
    expect(range({ ...base, layout: 'u' }).low).toBeGreaterThan(range(base).low);
    expect(range({ ...base, layout: 'island', island: 'prep' }).low).toBeGreaterThan(range({ ...base, layout: 'u' }).low);
    expect(range({ ...base, layout: 'island', island: 'seating' }).low).toBeGreaterThan(range({ ...base, layout: 'island', island: 'prep' }).low);
    expect(range({ ...base, layout: 'island', island: 'sink' }).low).toBeGreaterThan(range({ ...base, layout: 'island', island: 'prep' }).low);
    expect(range({ ...base, cabinets: 'wood' }).low).toBeGreaterThan(range(base).low);
    const luxe = { ...base, finish: 'luxe' };
    expect(range({ ...luxe, appliances: 'pro' }).low).toBeGreaterThan(range({ ...luxe, appliances: 'stainless' }).low);
    expect(range({ ...luxe, appliances: 'panel' }).low).toBeGreaterThan(range({ ...luxe, appliances: 'pro' }).low);
  });

  it('every option maps to real template answers', () => {
    const answers = funnelAnswers(SPEC, { size: 'large', finish: 'luxe', layout: 'island', cabinets: 'twotone', island: 'sink', appliances: 'panel' });
    expect(answers).toEqual({
      project: ['full'],
      paint: ['paint'],
      size: ['large'],
      cabinets: ['custom'],
      counter: ['quartzite'],
      backsplash: ['slab'],
      appliances: ['panel'],
      floor: ['hardwood'],
      lighting: ['designer'],
      hardware: ['brass'],
      layout: ['island'],
      cabinetFinish: ['two_tone'],
      islandStyle: ['sink'],
    });
    expect(funnelAnswers(SPEC, { size: 'compact', finish: 'standard', layout: 'l', cabinets: 'white' })).toMatchObject({
      size: ['small'], cabinets: ['stock'], counter: ['quartz'], appliances: ['stainless'], layout: ['l_shape'], cabinetFinish: ['white'],
    });
    for (const sel of all) {
      for (const [q, picks] of Object.entries(funnelAnswers(SPEC, sel))) {
        const question = template.questions.find((x) => x.id === q);
        expect(question, q).toBeTruthy();
        for (const p of picks) expect(question!.options.some((o) => o.id === p), `${q}.${p}`).toBe(true);
      }
    }
  });

  it('flags in-person checks: an island sink, built-in appliances, an island in a compact kitchen', () => {
    const items = (sel: FunnelSelection) => estimateFunnel(SPEC, template, normalizeFunnelSelection(SPEC, sel)).estimate.siteVisitItems.map((i) => i.label);
    expect(items({ size: 'medium', finish: 'standard', layout: 'island', island: 'sink' })).toEqual(['Island sink (plumbing and venting check)']);
    expect(items({ size: 'medium', finish: 'luxe', layout: 'l', appliances: 'panel' })).toEqual(['Built-in appliances (cut-outs and electrical check)']);
    expect(items({ size: 'compact', finish: 'standard', layout: 'island', island: 'prep' })).toEqual(['Island in a compact kitchen (clearance check)']);
    expect(items({ size: 'medium', finish: 'standard', layout: 'l' })).toEqual([]);
  });

  it('no price reaches the browser before the contact step', () => {
    expect(pub.questions.flatMap((q) => q.options).every((o) => o.price === undefined)).toBe(true);
  });
});

describe('network wording (HomeQuote is not a contractor)', () => {
  it('never claims a licence, years, reviews, projects or that it builds; says it connects with licensed local pros', () => {
    expect(specWords).not.toMatch(/CSLB|licensed & insured|since \d{4}|years|we build|we remodel|our (work|projects|crew)|review(s)? from|★/i);
    expect(SPEC.landing.reviews).toBeUndefined();
    expect(SPEC.landing.projects).toBeUndefined();
    expect(SPEC.landing).toMatchObject({
      announcement: 'Matched with licensed local kitchen pros',
      headline: 'Kitchens, remodeled just for you',
      subline: 'Design your kitchen in 60 seconds and get a ballpark price, with a free in-home consultation.',
      cta: 'Design your kitchen',
    });
    expect(SPEC.contactStep.trustLine).toBe('Free in-home consultation · Licensed local pros · No obligation');
    expect(SPEC.bookingStep.exampleFinancing).toBeUndefined();
    expect(SPEC.bookingStep.financingLabel).toBeUndefined();
    // Same shape and wording as the bathroom funnel, kitchen words only.
    expect(SPEC.contactStep).toEqual(HOMEQUOTE_BATHROOM_FUNNEL.contactStep);
    expect(SPEC.bookingStep).toEqual(HOMEQUOTE_BATHROOM_FUNNEL.bookingStep);
    expect(SPEC.landing.logo).toEqual(HOMEQUOTE_BATHROOM_FUNNEL.landing.logo);
    expect(SPEC.finalCta).toBe('Get my estimate');
    expect(specWords).not.toMatch(/bathroom|pool/i);
  });

  it('the booking intro names the HomeQuote team host once the calendar loads', () => {
    expect(SPEC.bookingStep.bookingTitle.replace('{minutes}', '10').replace('{host}', 'Liam from HomeQuote')).toBe(
      'A quick 10-minute call. Liam from HomeQuote will call you at the time you pick.',
    );
    expect(plainBookingTitle(SPEC.bookingStep.bookingTitle)).toBe('A free call. We will call you at the time you pick.');
  });
});

describe('pages', () => {
  it('/estimator/kitchen-remodel is the funnel landing: network logo, headline, button, no reviews', async () => {
    const html = renderToStaticMarkup(await EstimatorPage({ params: Promise.resolve({ slug: 'kitchen-remodel' }) }));
    const t = text(html);
    expect(t).toContain('Kitchens, remodeled just for you');
    expect(t).toContain('Design your kitchen in 60 seconds and get a ballpark price, with a free in‑home consultation.');
    expect(t).toContain('Matched with licensed local kitchen pros');
    expect(html).toContain('href="/estimator/kitchen-remodel/design"');
    expect(t).toContain('HomeQuote Network');
    expect(html).toContain('homequote-logo-primary-horizontal-tight');
    expect(html).toContain('/estimator/kitchen/funnel/layout-island-luxe.webp');
    expect(t).not.toMatch(/customers say|Recent .* projects|CSLB/);
    const meta = await landingMetadata({ params: Promise.resolve({ slug: 'kitchen-remodel' }) });
    expect(meta.description).toBe('Three quick picks, then a ballpark price for your kitchen remodel and a free in-home consultation with a licensed local contractor, through HomeQuote Network.');
    expect(meta.robots).toMatchObject({ index: false });
    expect(String(meta.title && typeof meta.title === 'object' && 'absolute' in meta.title ? meta.title.absolute : meta.title)).toBe('Kitchen Remodel Price Estimator · HomeQuote Network');
  });

  it('/design opens the steps from the URL, and the embed starts at step 1', async () => {
    const design = renderToStaticMarkup(
      await FunnelDesignPage({
        params: Promise.resolve({ slug: 'kitchen-remodel' }),
        searchParams: Promise.resolve({ step: '3', size: 'large', finish: 'luxe', layout: 'island' }),
      }),
    );
    expect(text(design)).toContain('Step 3 of 6');
    expect(text(design)).toContain('Choose your layout.');
    expect(design).toMatch(/<input[^>]*checked=""[^>]*value="island"/);
    // The room photo is shown whole, on its blurred copy.
    expect(design).toContain('fn-backdrop');
    const last = renderToStaticMarkup(
      await FunnelDesignPage({
        params: Promise.resolve({ slug: 'kitchen-remodel' }),
        searchParams: Promise.resolve({ step: '4', size: 'compact', finish: 'standard', layout: 'u', cabinets: 'wood' }),
      }),
    );
    expect(text(last)).toContain('Step 4 of 4');
    expect(text(last)).toContain('Choose your cabinets.');
    expect(text(last)).toContain('Get my estimate');
    const embed = renderToStaticMarkup(await EstimatorEmbedPage({ params: Promise.resolve({ slug: 'kitchen-remodel' }), searchParams: Promise.resolve({}) }));
    expect(text(embed)).toContain('Step 1 of 5');
    expect(text(embed)).toContain('Select your kitchen.');
    // The size plans sit on white (no blurred copy).
    expect(embed).not.toContain('fn-backdrop');
    const meta = await designMetadata({ params: Promise.resolve({ slug: 'kitchen-remodel' }), searchParams: Promise.resolve({}) });
    expect(meta.description).toBe('Three quick picks, then a ballpark price for your kitchen remodel and a free in-home consultation with a licensed local contractor, through HomeQuote Network.');
  });

  it('contact: the network consent wording and trust line', () => {
    const html = renderToStaticMarkup(
      <FunnelContactScreen slug="kitchen-remodel" spec={SPEC} contractor={contractor} template={pub} selection={defaultFunnelSelection(SPEC)} embedded={false} headingId="h" onDone={() => undefined} />,
    );
    const t = text(html);
    expect(t).toContain('Your estimate is ready.');
    expect(t).toContain('Are you the homeowner?');
    expect(t).toContain('Free in-home consultation · Licensed local pros · No obligation');
    expect(estimatorConsentText(contractor.contractorName)).toBe(consentText(funnelConfig));
    expect(t).toContain('HomeQuote Network and the contractor partners it matches me with');
  });

  it('booking: the price card recap, the HomeQuote calendar, the kitchen share words', () => {
    const sel = normalizeFunnelSelection(SPEC, { size: 'large', finish: 'luxe', layout: 'island', cabinets: 'twotone', island: 'seating', appliances: 'panel' });
    expect(priceEyebrow(SPEC, sel)).toBe('Large kitchen · Luxe · Island kitchen · Two-tone cabinets · Waterfall island · Built-in appliances');
    const estimate = estimateFunnel(SPEC, template, sel).estimate;
    const result: FunnelLeadResult = {
      estimate, qualified: true, bookingTicket: 'ticket', selection: sel, homeowner: 'yes',
      contact: { firstName: 'Sam', lastName: 'Lee', email: 'sam@example.test' },
    };
    const props = { slug: 'kitchen-remodel', spec: SPEC, contractor, template: pub, selection: sel, embedded: false, headingId: 'h' };
    const html = renderToStaticMarkup(<FunnelBookingScreen {...props} result={result} />);
    expect(text(html)).toContain('Book your free call');
    expect(html).toContain('data-funnel-calendar="homequote"');
    expect(text(html)).toContain('A licensed local contractor sets your firm price at a free in-home consultation.');
    expect(text(html)).toContain('Example prices, not yet confirmed.');
    expect(text(html)).not.toMatch(/Financing|\/mo|on-site|pool|bathroom/i);
    const noCal = text(renderToStaticMarkup(<FunnelBookingScreen {...props} result={{ ...result, bookingTicket: undefined }} />));
    expect(noCal).toContain('A HomeQuote project specialist will call you shortly');
    // The shared design page calls it a kitchen.
    expect(sharedDesignView(SPEC, template, sel, true).noun).toBe('kitchen');
  });
});

describe('lead through the kitchen-remodel funnel', () => {
  const contact = { firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.test', phone: '8185550142', consent: true, website: '' };
  const post = (body: unknown) =>
    POST(
      new Request('https://homequote.example/api/estimator/kitchen-remodel/lead', {
        method: 'POST', headers: { origin: 'https://homequote.example' }, body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ slug: 'kitchen-remodel' }) },
    );
  const picks = { size: 'large', finish: 'luxe', layout: 'island', cabinets: 'wood', island: 'seating', appliances: 'pro' };
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

  it('the project maps onto the funnel’s own services (a full remodel qualifies)', () => {
    expect(funnelAnswersFor(funnelConfig, { zip: '92101', homeowner: 'yes', project: 'full', trade: 'kitchen' })).toMatchObject({ service: 'full_remodel' });
    expect(funnelAnswersFor(funnelConfig, { zip: '92101', homeowner: 'yes', project: 'refresh', trade: 'kitchen' })).toMatchObject({ service: 'cabinets_counters' });
  });

  it('re-prices the picks on the server, files a qualified full remodel and returns the booking ticket', async () => {
    const res = await post(lead());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, qualified: true });
    expect(body.estimate.low).toBe(estimateFunnel(SPEC, template, picks).total!.low);
    expect(typeof body.bookingTicket).toBe('string');
    expect(body.calendarUrl).toBeUndefined();
    expect(body.shareUrl).toMatch(/^\/estimator\/kitchen-remodel\/my-design\?size=large&finish=luxe&layout=island&cabinets=wood&island=seating&appliances=pro/);
    const args = m.rpc.mock.calls[0]![1] as Record<string, unknown>;
    expect(args).toMatchObject({ p_qualified: true, p_consent: consentText(funnelConfig) });
    expect(args.p_answers).toMatchObject({ service: 'full_remodel', homeowner: 'yes', zip: '92101' });
    expect(String((args.p_answers as Record<string, string>).estimator_room)).toMatch(/18 x 16 ft/);
  });

  it('prices from the picks alone, whatever answers the browser sends', async () => {
    const body = await (await post(lead({ answers: { cabinets: ['stock'] } }))).json();
    expect(body.estimate.low).toBe(estimateFunnel(SPEC, template, picks).total!.low);
  });

  it('a non-owner is saved for review, never booked', async () => {
    const body = await (await post(lead({ homeowner: 'no' }))).json();
    expect(body).toMatchObject({ ok: true, qualified: false });
    expect(body.bookingTicket).toBeUndefined();
  });
});
