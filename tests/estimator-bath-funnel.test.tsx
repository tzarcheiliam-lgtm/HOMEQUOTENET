import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import bathroomFunnel from '@/content/funnels/bathroom-remodel.json';
import { HOMEQUOTE_BATHROOM_FUNNEL as SPEC } from '@/content/estimators/homequote-bathroom-funnel';
import { POOL_MASTERS_FUNNEL } from '@/content/estimators/pool-masters-funnel';
import { consentText, funnelSchema } from '@/lib/funnels/schema';

/**
 * HomeQuote Network's simple bathroom funnel (/estimator/bathroom-remodel,
 * experience 'funnel'): the spec, the paths and their follow-up steps, a photo
 * for every pick on every path, the prices, the network wording, the pages and
 * the lead through the published bathroom-remodel funnel (database faked).
 */

const LEAD = '0b9e8a52-5a8e-4f43-9c1e-6a1f3c2d4e5f';
const funnelConfig = funnelSchema.parse(bathroomFunnel);

const m = vi.hoisted(() => ({ funnel: null as unknown, rpc: vi.fn() }));
const SESSION_ID = '0d6f7c4e-8a51-4c3e-9b0a-6f1d2e3c4b5a';

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
import EstimatorPage from '@/app/(estimator)/estimator/[slug]/page';
import FunnelDesignPage, { generateMetadata as designMetadata } from '@/app/(estimator)/estimator/[slug]/design/page';
import EstimatorEmbedPage from '@/app/(estimator-embed)/embed/estimator/[slug]/page';
import { FunnelBookingScreen } from '@/components/estimator/funnel/booking/funnel-booking';
import { plainBookingTitle, priceEyebrow } from '@/components/estimator/funnel/booking/state';
import { FunnelContactScreen } from '@/components/estimator/funnel/contact/funnel-contact';
import { FunnelLanding } from '@/components/estimator/funnel/landing';
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
  stepPhotoFrame,
} from '@/lib/estimator/funnel/engine';
import { estimatorConsentText } from '@/lib/estimator/lead-client';
import { getEstimator } from '@/lib/estimator/registry';
import type { FunnelSelection } from '@/lib/estimator/funnel/types';

const found = getEstimator('bathroom-remodel')!;
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
  m.funnel = { id: 'f-bath', slug: 'bathroom-remodel', is_demo: false, contractor_id: null, integration_id: null, config: funnelConfig };
  m.rpc.mockResolvedValue({ data: { id: SESSION_ID, lead_id: LEAD }, error: null });
});

describe('the bathroom funnel spec', () => {
  it('is the bathroom-remodel page experience, for the HomeQuote Network', () => {
    expect(funnelSpecFor(contractor)).toBe(SPEC);
    expect(contractor).toMatchObject({ experience: 'funnel', network: true, funnelSlug: 'bathroom-remodel', calendarProvider: 'homequote', revealRange: 'after_contact' });
    expect(template.trade).toBe('bathroom');
    expect(template.pricesConfirmed).toBe(false);
    expect(validateTemplate(template)).toEqual([]);
  });

  it('three core taps, then only the follow-ups that apply', () => {
    expect(SPEC.steps.filter((s) => !s.showWhen).map((s) => [s.id, s.label])).toEqual([
      ['size', 'Select your bathroom.'],
      ['finish', 'Choose your finish.'],
      ['layout', 'Choose your layout.'],
    ]);
    expect(SPEC.steps.map((s) => [s.id, s.options.map((o) => o.id)])).toEqual([
      ['size', ['guest', 'full', 'primary']],
      ['finish', ['standard', 'luxe']],
      ['layout', ['walkin', 'combo', 'spa']],
      ['shower', ['frameless', 'curbless', 'bench']],
      ['tub', ['soaking', 'clawfoot', 'stone']],
      ['vanity', ['single', 'double', 'floating']],
    ]);
    expect(SPEC.steps.find((s) => s.id === 'size')!.options.map((o) => o.subtitle)).toEqual(['About 5 × 8 ft', 'About 8 × 10 ft', 'About 12 × 14 ft']);
    // Shower only with a walk-in shower, tub only for the spa bath, vanity only for a full bath or primary suite.
    expect(ids({ size: 'guest', layout: 'combo' })).toEqual(['size', 'finish', 'layout']);
    expect(ids({ size: 'guest', layout: 'walkin' })).toEqual(['size', 'finish', 'layout', 'shower']);
    expect(ids({ size: 'guest', layout: 'spa' })).toEqual(['size', 'finish', 'layout', 'shower', 'tub']);
    expect(ids({ size: 'full', layout: 'combo' })).toEqual(['size', 'finish', 'layout', 'vanity']);
    expect(ids({ size: 'primary', layout: 'spa' })).toEqual(['size', 'finish', 'layout', 'shower', 'tub', 'vanity']);
    expect(defaultFunnelSelection(SPEC)).toEqual({ size: 'full', finish: 'standard', layout: 'walkin', shower: 'frameless', vanity: 'double' });
  });

  it('counts the steps of the path; the last step says "Get my estimate"', () => {
    expect(stepCount(SPEC, normalizeFunnelSelection(SPEC, { size: 'guest', layout: 'combo' }))).toBe(3);
    expect(stepCount(SPEC, normalizeFunnelSelection(SPEC, { size: 'primary', layout: 'spa' }))).toBe(6);
    for (const sel of all) {
      const n = stepCount(SPEC, sel);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
      expect(stepCta(SPEC, n - 1, sel)).toBe('Get my estimate');
      if (n > 1) expect(stepCta(SPEC, 0, sel)).toBe('Continue');
    }
    // 3 x 2 x (walk-in 3 + combo 1 + spa 9) x vanity (1 for guest, 3 otherwise) = 2 x 13 + 2 x 2 x 39.
    expect(all).toHaveLength(2 * 13 + 2 * 2 * 39);
  });

  it('changing an earlier pick drops the follow-ups that no longer apply', () => {
    const spa = normalizeFunnelSelection(SPEC, { size: 'primary', finish: 'luxe', layout: 'spa', shower: 'curbless', tub: 'stone', vanity: 'floating' });
    expect(spa).toMatchObject({ shower: 'curbless', tub: 'stone', vanity: 'floating' });
    const combo = normalizeFunnelSelection(SPEC, { ...spa, layout: 'combo' });
    expect(combo).toEqual({ size: 'primary', finish: 'luxe', layout: 'combo', vanity: 'floating' });
    const guest = normalizeFunnelSelection(SPEC, { ...spa, size: 'guest' });
    expect(guest).not.toHaveProperty('vanity');
    expect(funnelAnswers(SPEC, combo)).not.toHaveProperty('showerStyle');
    expect(funnelAnswers(SPEC, combo)).not.toHaveProperty('tubStyle');
  });
});

describe('photos', () => {
  // Every photo the spec names (a room photo per size x layout x finish, follow-ups edited from them).
  const KEYS = new Set(
    SPEC.steps.flatMap((s) => {
      const r = s.photo;
      const ps = r.kind === 'option' ? Object.values(r.photos) : r.kind === 'variants' ? r.photos.map((v) => v.photo) : r.kind === 'matrix' ? Object.values(r.photos).flatMap((x) => Object.values(x)) : [];
      return ps.map((p) => p.src.match(/\/([^/]+)\.webp$/)![1]);
    }),
  );
  const file = (src: string) => existsSync(join(PUBLIC, src.replace(/^\//, '')));

  it('every shown step on every path has a photo from the agreed set, each with an existing fallback', () => {
    const used = new Set<string>();
    // Once: it walks every path itself (calling it per step timed out under the full suite).
    const missing = new Set(missingFunnelPhotos(SPEC));
    for (const sel of all) {
      for (const s of activeSteps(SPEC, sel)) {
        const p = funnelPhoto(SPEC, s.id, sel);
        const key = p.src.match(/\/estimator\/bathroom\/funnel\/([^/]+)\.webp$/)?.[1];
        expect(key && KEYS.has(key), `${s.id} ${JSON.stringify(sel)} -> ${p.src}`).toBe(true);
        expect(p.srcSm).toBe(`/estimator/bathroom/funnel/${key}-sm.webp`);
        expect(p.alt).toMatch(/AI-generated/);
        expect(p.fallback && file(p.fallback.src), p.fallback?.src).toBe(true);
        // Whatever is on disk today, the screen shows a file that exists.
        const shown = resolvePhoto(p, missing);
        expect(file(shown.src), shown.src).toBe(true);
        used.add(key!);
      }
    }
    expect(used).toEqual(KEYS);
  });

  it('the layout photo follows the size and the finish, and the finish photo shows the layout (a walk-in until it is picked)', () => {
    expect(funnelPhoto(SPEC, 'layout', { size: 'primary', finish: 'luxe', layout: 'spa' }).src).toBe('/estimator/bathroom/funnel/layout-spa-luxe.webp');
    expect(funnelPhoto(SPEC, 'layout', { size: 'full', finish: 'luxe', layout: 'spa' }).src).toBe('/estimator/bathroom/funnel/layout-spa-luxe-full.webp');
    expect(photoKey(SPEC, 'layout', { size: 'guest', finish: 'standard', layout: 'combo' })).toBe('layout-combo-standard-guest');
    expect(funnelPhoto(SPEC, 'finish', { size: 'full', finish: 'luxe' }).src).toBe('/estimator/bathroom/funnel/layout-walkin-luxe-full.webp');
    const swaps = stepOptionPhotos(SPEC, 'layout', { size: 'guest', finish: 'standard' });
    expect(Object.fromEntries(Object.entries(swaps).map(([k, p]) => [k, p.src.split('/').pop()]))).toEqual({
      walkin: 'layout-walkin-standard-guest.webp',
      combo: 'layout-combo-standard-guest.webp',
      // A freestanding tub does not fit a 5 x 8 room (site visit): the nearest size's spa bath.
      spa: 'layout-spa-standard-full.webp',
    });
    // Follow-up photos are asked for (preloaded) even while their step is hidden.
    expect(Object.keys(stepOptionPhotos(SPEC, 'tub', { size: 'guest', layout: 'combo' }))).toEqual(['soaking', 'clawfoot', 'stone']);
  });

  it('every photo is shown whole: room photos on a blurred copy of themselves, the size plans on white', () => {
    expect(SPEC.steps.map((s) => stepPhotoFrame(SPEC, s))).toEqual([
      { fit: 'contain', zoom: 1, backdrop: 'white' },
      ...Array.from({ length: 5 }, () => ({ fit: 'contain', zoom: 1, backdrop: 'blur' })),
    ]);
    // Pool: unchanged (plans and follow-ups contain at 1.3 on white, configurator views cover).
    expect(POOL_MASTERS_FUNNEL.photoFrame).toBeUndefined();
    expect(POOL_MASTERS_FUNNEL.steps.every((s) => s.photoFit === undefined && s.photoZoom === undefined && s.photoBackdrop === undefined)).toBe(true);
  });
});

describe('prices', () => {
  const range = (sel: FunnelSelection) => estimateFunnel(SPEC, template, normalizeFunnelSelection(SPEC, sel)).total!;

  it('every path is priced through computeEstimate on the bathroom template (a range, never a single figure)', () => {
    for (const sel of all) {
      const { estimate, total } = estimateFunnel(SPEC, template, sel);
      expect(total, JSON.stringify(sel)).not.toBeNull();
      expect(total!.low).toBeGreaterThanOrEqual(15000);
      expect(total!.high).toBeLessThanOrEqual(110000);
      expect(total!.low).toBeLessThan(total!.high);
      // Only the site questions (asked in person) are left open.
      expect(estimate.unanswered).toEqual(['plumbing', 'damage', 'location']);
    }
  });

  it('bigger rooms, the luxe finish and each follow-up upgrade cost more', () => {
    const base = { size: 'full', finish: 'standard', layout: 'walkin', shower: 'frameless', vanity: 'single' };
    expect(range({ ...base, size: 'guest' }).low).toBeLessThan(range(base).low);
    expect(range({ ...base, size: 'primary' }).low).toBeGreaterThan(range(base).low);
    expect(range({ ...base, finish: 'luxe' }).low).toBeGreaterThan(range(base).low);
    expect(range({ ...base, layout: 'spa', tub: 'soaking' }).low).toBeGreaterThan(range(base).low);
    expect(range({ ...base, shower: 'curbless' }).low).toBeGreaterThan(range(base).low);
    expect(range({ ...base, shower: 'bench' }).low).toBeGreaterThan(range(base).low);
    expect(range({ ...base, vanity: 'floating' }).low).toBeGreaterThan(range({ ...base, vanity: 'double' }).low);
    expect(range({ ...base, layout: 'spa', tub: 'stone' }).low).toBeGreaterThan(range({ ...base, layout: 'spa', tub: 'clawfoot' }).low);
  });

  it('every option maps to real template answers', () => {
    const answers = funnelAnswers(SPEC, { size: 'primary', finish: 'luxe', layout: 'spa', shower: 'bench', tub: 'clawfoot', vanity: 'floating' });
    expect(answers).toMatchObject({
      project: ['full'],
      size: ['large'],
      bathing: ['tub_and_shower'],
      showerStyle: ['frameless'],
      tubStyle: ['clawfoot'],
      vanity: ['floating_double'],
      showerTile: ['large_porcelain'],
      metal: ['brushed_gold'],
    });
    expect(answers.scope).toEqual(expect.arrayContaining(['bathing', 'vanity', 'floor', 'walls', 'extras']));
    expect(answers.extras).toEqual(expect.arrayContaining(['rain_head', 'led_mirror', 'bench', 'niche']));
    for (const sel of all) {
      for (const [q, picks] of Object.entries(funnelAnswers(SPEC, sel))) {
        const question = template.questions.find((x) => x.id === q);
        expect(question, q).toBeTruthy();
        for (const p of picks) expect(question!.options.some((o) => o.id === p), `${q}.${p}`).toBe(true);
      }
    }
    // A guest bath (no vanity step): a single vanity with the standard finish, a floating one with luxe.
    expect(funnelAnswers(SPEC, { size: 'guest', finish: 'standard', layout: 'combo' }).vanity).toEqual(['single']);
    expect(funnelAnswers(SPEC, { size: 'guest', finish: 'luxe', layout: 'combo' }).vanity).toEqual(['floating']);
  });

  it('no price reaches the browser before the contact step', () => {
    expect(pub.questions.flatMap((q) => q.options).every((o) => o.price === undefined)).toBe(true);
  });
});

describe('network wording (HomeQuote is not a contractor)', () => {
  it('never claims a licence, years, reviews or that it builds; says it connects with licensed local pros', () => {
    expect(specWords).not.toMatch(/CSLB|licensed & insured|since \d{4}|years|we build|we remodel|our (work|projects|crew)|review(s)? from|★/i);
    expect(SPEC.landing.reviews).toBeUndefined();
    expect(SPEC.landing.projects).toBeUndefined();
    expect(SPEC.landing.announcement).toBe('Matched with licensed local bathroom pros');
    expect(SPEC.contactStep.trustLine).toBe('Free in-home consultation · Licensed local pros · No obligation');
    expect(SPEC.bookingStep.exampleFinancing).toBeUndefined();
    expect(SPEC.bookingStep.financingLabel).toBeUndefined();
    expect(SPEC.photoNote).toMatch(/AI-generated/);
    expect(SPEC.photoNote).not.toMatch(/Pool Masters/);
  });

  it('the booking intro names the HomeQuote team host once the calendar loads; the fallback stays sensible', () => {
    expect(SPEC.bookingStep.bookingTitle.replace('{minutes}', '10').replace('{host}', 'Liam from HomeQuote')).toBe(
      'A quick 10-minute call. Liam from HomeQuote will call you at the time you pick.',
    );
    expect(plainBookingTitle(SPEC.bookingStep.bookingTitle)).toBe('A free call. We will call you at the time you pick.');
    // Pool unchanged.
    expect(plainBookingTitle(POOL_MASTERS_FUNNEL.bookingStep.bookingTitle)).toBe('Pick a time for a free call.');
  });
});

describe('pages', () => {
  it('/estimator/bathroom-remodel is the funnel landing: network logo, headline, button, no reviews', async () => {
    const html = renderToStaticMarkup(await EstimatorPage({ params: Promise.resolve({ slug: 'bathroom-remodel' }) }));
    const t = text(html);
    expect(t).toContain('Bathrooms, remodeled just for you');
    expect(t).toContain('Design your bathroom in 60 seconds and get a ballpark price, with a free in‑home consultation.');
    expect(t).toContain('Matched with licensed local bathroom pros');
    expect(html).toContain('href="/estimator/bathroom-remodel/design"');
    expect(t).toContain('HomeQuote Network');
    expect(html).toContain('homequote-logo-primary-horizontal-tight');
    expect(t).not.toMatch(/customers say|Recent .* projects|CSLB/);
    expect(t).toContain('Photos are AI-generated example designs');
    // The hero: the new photo, or the existing example while it is not made yet.
    const heroMissing = missingFunnelPhotos(SPEC).includes(SPEC.landing.heroPhoto.src);
    expect(html).toContain(heroMissing ? '/estimator/hero/bath-example-photo.webp' : '/estimator/bathroom/funnel/layout-spa-luxe.webp');
  });

  it('a missing hero falls back; the pool landing is unchanged', () => {
    const missing = renderToStaticMarkup(<FunnelLanding spec={SPEC} contractor={contractor} designHref="/d" missingPhotos={[SPEC.landing.heroPhoto.src]} />);
    expect(missing).toContain('src="/estimator/hero/bath-example-photo.webp"');
    expect(missing).not.toContain('layout-spa-luxe');
    const present = renderToStaticMarkup(<FunnelLanding spec={SPEC} contractor={contractor} designHref="/d" missingPhotos={[]} />);
    expect(present).toContain('src="/estimator/bathroom/funnel/layout-spa-luxe.webp"');
    const pool = getEstimator('pool-masters')!;
    const poolHtml = renderToStaticMarkup(<FunnelLanding spec={POOL_MASTERS_FUNNEL} contractor={pool.contractor} designHref="/d" missingPhotos={[POOL_MASTERS_FUNNEL.landing.heroPhoto.src]} />);
    expect(poolHtml).toContain(`src="${POOL_MASTERS_FUNNEL.landing.heroPhoto.src}"`);
    expect(text(poolHtml)).not.toContain('HomeQuote Network');
  });

  it('/design opens the steps from the URL, and the embed starts at step 1', async () => {
    const design = renderToStaticMarkup(
      await FunnelDesignPage({
        params: Promise.resolve({ slug: 'bathroom-remodel' }),
        searchParams: Promise.resolve({ step: '3', size: 'primary', finish: 'luxe', layout: 'spa' }),
      }),
    );
    expect(text(design)).toContain('Step 3 of 6');
    expect(text(design)).toContain('Choose your layout.');
    expect(design).toMatch(/<input[^>]*checked=""[^>]*value="spa"/);
    expect(text(design)).toContain('Continue');
    const last = renderToStaticMarkup(
      await FunnelDesignPage({
        params: Promise.resolve({ slug: 'bathroom-remodel' }),
        searchParams: Promise.resolve({ step: '3', size: 'guest', finish: 'standard', layout: 'combo' }),
      }),
    );
    expect(text(last)).toContain('Step 3 of 3');
    expect(text(last)).toContain('Get my estimate');
    const embed = renderToStaticMarkup(await EstimatorEmbedPage({ params: Promise.resolve({ slug: 'bathroom-remodel' }), searchParams: Promise.resolve({}) }));
    expect(text(embed)).toContain('Step 1 of 5');
    expect(text(embed)).toContain('Select your bathroom.');
    const meta = await designMetadata({ params: Promise.resolve({ slug: 'bathroom-remodel' }), searchParams: Promise.resolve({}) });
    expect(meta.description).toBe('Three quick picks, then a ballpark price for your bathroom remodel and a free in-home consultation with a licensed local contractor, through HomeQuote Network.');
    expect(meta.description).not.toMatch(/on-site estimate/);
  });

  it('contact: the network consent wording and trust line', () => {
    const html = renderToStaticMarkup(
      <FunnelContactScreen slug="bathroom-remodel" spec={SPEC} contractor={contractor} template={pub} selection={defaultFunnelSelection(SPEC)} embedded={false} headingId="h" onDone={() => undefined} />,
    );
    const t = text(html);
    expect(t).toContain('Your estimate is ready.');
    expect(t).toContain('Are you the homeowner?');
    expect(t).toContain('Free in-home consultation · Licensed local pros · No obligation');
    // The wording shown is the funnel's own (the lead route rejects anything else).
    expect(estimatorConsentText(contractor.contractorName)).toBe(consentText(funnelConfig));
    expect(t).toContain('HomeQuote Network and the contractor partners it matches me with');
  });

  it('booking: the price card recap, the HomeQuote calendar, and network words without a calendar', () => {
    const sel = normalizeFunnelSelection(SPEC, { size: 'primary', finish: 'luxe', layout: 'spa', shower: 'curbless', tub: 'stone', vanity: 'floating' });
    expect(priceEyebrow(SPEC, sel)).toBe('Primary suite · Luxe · Spa bath · Curbless shower · Stone tub · Floating double vanity');
    const estimate = estimateFunnel(SPEC, template, sel).estimate;
    const result: FunnelLeadResult = {
      estimate, qualified: true, bookingTicket: 'ticket', selection: sel, homeowner: 'yes',
      contact: { firstName: 'Sam', lastName: 'Lee', email: 'sam@example.test' },
    };
    const props = { slug: 'bathroom-remodel', spec: SPEC, contractor, template: pub, selection: sel, embedded: false, headingId: 'h' };
    const html = renderToStaticMarkup(<FunnelBookingScreen {...props} result={result} />);
    expect(text(html)).toContain('Book your free call');
    expect(html).toContain('data-funnel-calendar="homequote"');
    expect(text(html)).toContain('A licensed local contractor sets your firm price at a free in-home consultation.');
    expect(text(html)).toContain('Example prices, not yet confirmed.');
    expect(text(html)).not.toMatch(/Financing|\/mo|on-site/);
    const noCal = text(renderToStaticMarkup(<FunnelBookingScreen {...props} result={{ ...result, bookingTicket: undefined }} />));
    expect(noCal).toContain('A HomeQuote project specialist will call you shortly');
    expect(noCal).not.toMatch(/on-site estimate/);
    const renter = text(renderToStaticMarkup(<FunnelBookingScreen {...props} result={{ ...result, qualified: false, homeowner: 'no', bookingTicket: undefined }} />));
    expect(renter).toContain('We book free consultations online with homeowners. Your details are saved, and the HomeQuote Network team will review them');
  });
});

describe('lead through the bathroom-remodel funnel', () => {
  const contact = { firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.test', phone: '8185550142', consent: true, website: '' };
  const post = (body: unknown) =>
    POST(
      new Request('https://homequote.example/api/estimator/bathroom-remodel/lead', {
        method: 'POST', headers: { origin: 'https://homequote.example' }, body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ slug: 'bathroom-remodel' }) },
    );
  const picks = { size: 'primary', finish: 'luxe', layout: 'spa', shower: 'curbless', tub: 'clawfoot', vanity: 'floating' };
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

  it('re-prices the picks on the server, files a qualified full remodel and returns the booking ticket', async () => {
    const res = await post(lead());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, qualified: true });
    expect(body.estimate.low).toBe(estimateFunnel(SPEC, template, picks).total!.low);
    expect(typeof body.bookingTicket).toBe('string');
    expect(body.calendarUrl).toBeUndefined();
    expect(body.shareUrl).toMatch(/^\/estimator\/bathroom-remodel\/my-design\?size=primary&finish=luxe&layout=spa&shower=curbless&tub=clawfoot&vanity=floating/);
    const args = m.rpc.mock.calls[0]![1] as Record<string, unknown>;
    expect(args).toMatchObject({ p_qualified: true, p_consent: consentText(funnelConfig) });
    expect(args.p_answers).toMatchObject({ service: 'full_remodel', homeowner: 'yes', zip: '92101' });
    expect(String((args.p_answers as Record<string, string>).estimator_room)).toMatch(/14 x 12 ft/);
  });

  it('a non-owner is saved for review, never booked', async () => {
    const body = await (await post(lead({ homeowner: 'no' }))).json();
    expect(body).toMatchObject({ ok: true, qualified: false });
    expect(body.bookingTicket).toBeUndefined();
  });
});
