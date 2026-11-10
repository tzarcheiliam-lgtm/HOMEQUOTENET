import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import roofFunnel from '@/content/funnels/roof-replacement.json';
import { HOMEQUOTE_ROOFING_FUNNEL as SPEC } from '@/content/estimators/homequote-roofing-funnel';
import { consentText, funnelSchema } from '@/lib/funnels/schema';

/**
 * HomeQuote Network's roof replacement funnel (/estimator/roofing): the
 * roofing template and prices, the Google Solar measurement (fetch mocked: no
 * real Google call), its signature, the address screen in the shell, the
 * steps and photos, the lead through the roof-replacement funnel (database
 * faked) and the "See it on your house" prompt.
 */

const LEAD = '0b9e8a52-5a8e-4f43-9c1e-6a1f3c2d4e61';
const SESSION_ID = '0d6f7c4e-8a51-4c3e-9b0a-6f1d2e3c4b61';
const funnelConfig = funnelSchema.parse(roofFunnel);
const m = vi.hoisted(() => ({ funnel: null as unknown, rpc: vi.fn() }));

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
  hash: (s: string) => `h:${s}`, newToken: () => 'tok', readBody: async (r: Request) => r.json(),
  sameOrigin: (r: Request) => r.headers.get('origin') === new URL(r.url).origin,
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

import { POST as lead } from '@/app/api/estimator/[slug]/lead/route';
import { POST as details } from '@/app/api/estimator/[slug]/address/details/route';
import { FunnelBookingScreen } from '@/components/estimator/funnel/booking/funnel-booking';
import { roofLeadInput, readRoofState, writeRoofState, type RoofState } from '@/components/estimator/funnel/address/state';
import { funnelLeadRequest, emptyFunnelFields } from '@/components/estimator/funnel/contact/state';
import { missingFunnelPhotos } from '@/components/estimator/funnel/photo-files';
import type { FunnelLeadResult } from '@/components/estimator/funnel/screens';
import { nextScreen, parseScreen, prevScreen, progress, screenParam, stepLabel } from '@/components/estimator/funnel/state';
import { publicTemplate } from '@/lib/estimator/config';
import { validateTemplate } from '@/lib/estimator/engine';
import { activeSteps, allFunnelSelections, funnelAnswers, funnelPhoto, stepOptionPhotos } from '@/lib/estimator/funnel/engine';
import { estimatorConsentText } from '@/lib/estimator/lead-client';
import { funnelAnswersFor, parseLeadRequest } from '@/lib/estimator/lead';
import { ESTIMATOR_SLUGS, getEstimator, TEMPLATES } from '@/lib/estimator/registry';
import { ROOFING_CATALOG } from '@/lib/estimator/catalog/roofing';
import { ROOFING_TEMPLATE } from '@/lib/estimator/templates/roofing';
import { PRICE_PER_SQUARE } from '@/lib/estimator/roofing/pricing-config';
import { describeRoof, mapBuildingInsights, pitchFactor, pitchRise, pricedRoofSqft, roofDimensions, roofRepaintPrompt } from '@/lib/estimator/roofing/roof';
import { clearRoofCache, lookupRoof, pricedRoofFor, roofLeadMeasure, signMeasure, solarRoof, staticMapUrl, verifyMeasure } from '@/lib/estimator/roofing/roof.server';
import { computeEstimate } from '@/lib/estimator/engine';
import { designNoun } from '@/lib/estimator/share';

const found = getEstimator('roofing')!;
const { template, contractor } = found;
const PUBLIC = join(process.cwd(), 'public');
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

/** A Google buildingInsights reply: 224 m² of roof (2,410 sq ft), two segments at 30° and 20°. */
const insights = (over: Record<string, unknown> = {}) => ({
  center: { latitude: 34.1501, longitude: -118.6001 },
  imageryQuality: 'HIGH',
  solarPotential: {
    wholeRoofStats: { areaMeters2: 224 },
    roofSegmentStats: [
      { pitchDegrees: 30, stats: { areaMeters2: 150 } },
      { pitchDegrees: 20, stats: { areaMeters2: 74 } },
    ],
  },
  ...over,
});
const HERE = { lat: 34.15, lng: -118.6 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('BOOKING_TICKET_SECRET', 'test-booking-secret');
  vi.stubEnv('ESTIMATOR_RENDER_SECRET', 'test-render-secret');
  vi.stubEnv('GOOGLE_SOLAR_API_KEY', '');
  vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
  vi.stubEnv('GOOGLE_MAPS_STATIC_KEY', '');
  vi.stubEnv('GOOGLE_MAPS_URL_SIGNING_SECRET', '');
  clearRoofCache();
  m.funnel = { id: 'f-roof', slug: 'roof-replacement', is_demo: false, contractor_id: null, integration_id: null, config: funnelConfig };
  m.rpc.mockResolvedValue({ data: { id: SESSION_ID, lead_id: LEAD }, error: null });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('the roofing template', () => {
  it('is a registered funnel-only trade with a valid template and catalog (example prices)', () => {
    expect(ESTIMATOR_SLUGS).toContain('roofing');
    expect(TEMPLATES.roofing).toEqual({ template: ROOFING_TEMPLATE, catalog: ROOFING_CATALOG });
    expect(validateTemplate(ROOFING_TEMPLATE)).toEqual([]);
    expect(template.pricesConfirmed).toBe(false);
    expect(contractor).toMatchObject({ trade: 'roofing', experience: 'funnel', network: true, funnelSlug: 'roof-replacement', calendarProvider: 'homequote', revealRange: 'after_contact' });
    expect(designNoun('roofing')).toBe('roof');
  });

  it('never sends prices to the browser before the contact step', () => {
    const pub = publicTemplate(template, contractor);
    expect(JSON.stringify(pub.questions)).not.toMatch(/"price"/);
  });

  it('prices a band: roof x waste, per square / 100 (medium asphalt: 2,800 priced sq ft)', () => {
    expect(pricedRoofSqft({ source: 'band', band: 'medium' })).toBe(2800);
    const est = computeEstimate(template, { answers: funnelAnswers(SPEC, { material: 'asphalt', asphaltColor: 'charcoal' }), dimensions: roofDimensions({ source: 'band', band: 'medium' }) });
    expect(est.lines).toHaveLength(1);
    expect(est.lines[0]).toMatchObject({ questionId: 'material', quantity: 2800, low: 2800 * (PRICE_PER_SQUARE.asphalt.low / 100), high: 2800 * (PRICE_PER_SQUARE.asphalt.high / 100) });
    expect([est.low, est.high]).toEqual([15000, 21000]);
  });

  it('a measured roof adds the pitch factor (30° = steep, x1.1), and tile and metal cost more', () => {
    const roof = { source: 'measured' as const, measure: { areaSqft: 2410, pitchDeg: 30, segments: 4 } };
    expect(pricedRoofSqft(roof)).toBe(2969);
    const price = (material: string, colorStep: string, color: string) =>
      computeEstimate(template, { answers: funnelAnswers(SPEC, { material, [colorStep]: color }), dimensions: roofDimensions(roof) });
    expect([price('asphalt', 'asphaltColor', 'charcoal').low, price('asphalt', 'asphaltColor', 'charcoal').high]).toEqual([16000, 22500]);
    expect(price('tile', 'tileColor', 'terracotta').low).toBeGreaterThan(30000);
    expect(price('metal', 'metalColor', 'galvalume').high!).toBeGreaterThan(price('tile', 'tileColor', 'terracotta').high!);
  });

  it('pitch tiers and roofer words', () => {
    expect([pitchFactor(18), pitchFactor(26.57), pitchFactor(30), pitchFactor(35), pitchFactor(45)]).toEqual([1, 1, 1.1, 1.2, 1.3]);
    expect(pitchRise(26.57)).toBe('6/12');
    expect(pitchRise(45)).toBe('12/12');
    expect(describeRoof({ source: 'measured', measure: { areaSqft: 2410, pitchDeg: 5, segments: 1 } })).toMatch(/1 section, 1\/12 pitch \(measured from above; low-slope roof/);
    expect(describeRoof({ source: 'band', band: 'large' })).toMatch(/3,400 sq ft of roof assumed/);
  });
});

describe('the Google Solar measurement', () => {
  it('maps a reply: sq ft rounded to 10, the area-weighted pitch, the sections', () => {
    expect(mapBuildingInsights(insights(), HERE)).toEqual({ measure: { areaSqft: 2410, pitchDeg: 26.7, segments: 2 }, center: { lat: 34.1501, lng: -118.6001 } });
  });

  it('rejects a neighbour’s building, a shed, a whole block and a reply with no roof', () => {
    expect(mapBuildingInsights(insights({ center: { latitude: 34.151, longitude: -118.6 } }), HERE)).toBeNull(); // ~110 m away
    expect(mapBuildingInsights(insights({ solarPotential: { wholeRoofStats: { areaMeters2: 20 } } }), HERE)).toBeNull();
    expect(mapBuildingInsights(insights({ solarPotential: { wholeRoofStats: { areaMeters2: 5000 } } }), HERE)).toBeNull();
    expect(mapBuildingInsights({}, HERE)).toBeNull();
    expect(mapBuildingInsights(null)).toBeNull();
  });

  it('asks HIGH quality first, then MEDIUM, with the key in a header; caches the answer', async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('requiredQuality=HIGH')) return new Response('{}', { status: 404 });
      return new Response(JSON.stringify(insights()), { status: 200 });
    });
    const roof = await solarRoof('solar-key', HERE.lat, HERE.lng, fetcher as unknown as typeof fetch);
    expect(roof?.measure.areaSqft).toBe(2410);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [url, init] = fetcher.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toMatch(/^https:\/\/solar\.googleapis\.com\/v1\/buildingInsights:findClosest\?location\.latitude=34\.150000&location\.longitude=-118\.600000&requiredQuality=MEDIUM$/);
    expect(url).not.toContain('solar-key');
    expect((init.headers as Record<string, string>)['X-Goog-Api-Key']).toBe('solar-key');
    await solarRoof('solar-key', HERE.lat, HERE.lng, fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('a lookup is signed, carries the satellite URL with a separate key, and fails quietly', async () => {
    expect(await lookupRoof('roofing', HERE.lat, HERE.lng)).toEqual({ ok: false, reason: 'disabled' });
    vi.stubEnv('GOOGLE_SOLAR_API_KEY', 'solar-key');
    vi.stubEnv('GOOGLE_MAPS_STATIC_KEY', 'static-browser-key');
    const ok = await lookupRoof('roofing', HERE.lat, HERE.lng, (async () => new Response(JSON.stringify(insights()))) as unknown as typeof fetch);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(verifyMeasure('roofing', ok.measure)).toEqual({ areaSqft: 2410, pitchDeg: 26.7, segments: 2 });
    expect(ok.mapUrl).toMatch(/^https:\/\/maps\.googleapis\.com\/maps\/api\/staticmap\?center=34\.150100%2C-118\.600100&zoom=20&size=640x400&scale=2&maptype=satellite&key=static-browser-key$/);
    expect(JSON.stringify(ok)).not.toContain('solar-key');
    clearRoofCache();
    const err = await lookupRoof('roofing', HERE.lat, HERE.lng, (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch);
    expect(err).toEqual({ ok: false, reason: 'error' });
    clearRoofCache();
    const none = await lookupRoof('roofing', HERE.lat, HERE.lng, (async () => new Response('{}', { status: 404 })) as unknown as typeof fetch);
    expect(none).toEqual({ ok: false, reason: 'not_found' });
  });

  it('signs Static Maps URLs when a URL signing secret is set', () => {
    const url = staticMapUrl(HERE, { GOOGLE_MAPS_STATIC_KEY: 'k', GOOGLE_MAPS_URL_SIGNING_SECRET: 'c2VjcmV0LXNpZ25pbmcta2V5' } as unknown as NodeJS.ProcessEnv)!;
    expect(url).toMatch(/&signature=[A-Za-z0-9_-]+=*$/);
    expect(staticMapUrl(HERE, {} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('only a signature from this server, for this estimator, before it expires, is priced', () => {
    const now = Date.UTC(2026, 9, 30);
    const signed = signMeasure('roofing', { areaSqft: 2410, pitchDeg: 26.7, segments: 2 }, now)!;
    expect(verifyMeasure('roofing', signed, now)).not.toBeNull();
    expect(verifyMeasure('roofing', { ...signed, areaSqft: 900 }, now)).toBeNull(); // shrunk in the browser
    expect(verifyMeasure('kitchen-remodel', signed, now)).toBeNull();
    expect(verifyMeasure('roofing', signed, now + 8 * 24 * 3600 * 1000)).toBeNull(); // expired
    expect(pricedRoofFor('roofing', { measure: { ...signed, areaSqft: 900 }, band: 'large' }, now)).toEqual({ source: 'band', band: 'large' });
    expect(pricedRoofFor('roofing', { band: 'nonsense' }, now)).toEqual({ source: 'band', band: 'medium' });
    expect(roofLeadMeasure('roofing', { measure: signed }, now).summary[0]).toMatch(/^Roof: About 2,410 sq ft of roof, 2 sections, 6\/12 pitch/);
  });
});

describe('the address route’s roof branch', () => {
  const post = (body: unknown, slug = 'roofing') =>
    details(
      new Request(`https://homequote.example/api/estimator/${slug}/address/details`, {
        method: 'POST', headers: { origin: 'https://homequote.example', 'x-forwarded-for': `10.9.0.${Math.floor(Math.random() * 250)}` }, body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ slug }) },
    );

  it('measures the roof for the roofing estimator only', async () => {
    vi.stubEnv('GOOGLE_SOLAR_API_KEY', 'solar-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(insights()))));
    const res = await post({ roof: HERE });
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.measure).toMatchObject({ areaSqft: 2410, segments: 2 });
    expect(body.mapUrl).toBeNull(); // no Maps Static key: the numbers only
    expect((await post({ roof: HERE }, 'kitchen-remodel')).status).toBe(400);
    expect((await (await post({ roof: { lat: 999, lng: 0 } })).json()).ok).toBe(false);
  });
});

describe('the address screen in the shell', () => {
  it('comes first ("Step 1 of 3"), then the material and the colour', () => {
    const sel = { material: 'tile', tileColor: 'sandstone' };
    expect(parseScreen(SPEC, null)).toEqual({ kind: 'address' });
    expect(parseScreen(SPEC, 'address')).toEqual({ kind: 'address' });
    expect(parseScreen(SPEC, '1', sel)).toEqual({ kind: 'step', index: 0 });
    expect(parseScreen(SPEC, 'junk', sel)).toEqual({ kind: 'address' });
    expect(screenParam({ kind: 'address' })).toBe('address');
    expect(stepLabel(SPEC, { kind: 'address' }, sel)).toBe('Step 1 of 3');
    expect(stepLabel(SPEC, { kind: 'step', index: 0 }, sel)).toBe('Step 2 of 3');
    expect(stepLabel(SPEC, { kind: 'step', index: 1 }, sel)).toBe('Step 3 of 3');
    expect(progress(SPEC, { kind: 'address' }, sel)).toBeCloseTo(0.25);
    expect(nextScreen(SPEC, { kind: 'address' }, sel)).toEqual({ kind: 'step', index: 0 });
    expect(prevScreen(SPEC, { kind: 'step', index: 0 }, sel)).toEqual({ kind: 'address' });
    expect(prevScreen(SPEC, { kind: 'address' }, sel)).toBeNull();
    expect(activeSteps(SPEC, sel).map((s) => s.id)).toEqual(['material', 'tileColor']);
  });

  it('keeps the roof in sessionStorage and sends only the right thing with the lead', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => void values.set(k, v), removeItem: (k: string) => void values.delete(k) };
    const signed = signMeasure('roofing', { areaSqft: 2410, pitchDeg: 26.7, segments: 2 })!;
    const state: RoofState = { v: 1, address: '12 Elm St, Calabasas, CA 91302', place: null, status: 'found', measure: signed, mapUrl: 'https://evil.example/x.png', band: 'small' };
    writeRoofState('roofing', state, storage);
    const back = readRoofState('roofing', storage)!;
    expect(back.measure).toEqual(signed);
    expect(back.mapUrl).toBeNull(); // only Google's own Static Maps URLs are shown
    expect(roofLeadInput(back, '12 Elm St, Calabasas, CA 91302')).toEqual({ measure: signed });
    expect(roofLeadInput(back, '99 Other Rd, Calabasas, CA 91302')).toEqual({ band: 'small' }); // changed on the contact step
    expect(roofLeadInput(null)).toEqual({ band: 'medium' });
    const req = funnelLeadRequest({ spec: SPEC, selection: { material: 'metal', metalColor: 'dark_bronze' }, fields: { ...emptyFunnelFields(), address: '12 Elm St, Calabasas, CA 91302', homeowner: 'yes' }, consentText: 'x', measurement: false, consentOnSubmit: true, roof: { measure: signed } });
    expect(req.roof).toEqual({ measure: signed });
    expect(parseLeadRequest({ ...req, contact: { ...req.contact, firstName: 'A', lastName: 'B', email: 'a@b.co', phone: '8185550142' } }).ok).toBe(true);
  });
});

describe('steps and photos', () => {
  it('every path is material + its own colour step; each pick maps to template answers', () => {
    const paths = allFunnelSelections(SPEC);
    expect(paths).toHaveLength(9);
    for (const sel of paths) {
      const answers = funnelAnswers(SPEC, sel);
      expect(answers.material).toEqual([sel.material]);
      const colourId = `${sel.material}Color`;
      expect(template.questions.find((q) => q.id === colourId)!.options.map((o) => o.id)).toContain(answers[colourId][0]);
      // Every template question the picks show is answered (nothing left "incomplete" but the site visit).
      expect(computeEstimate(template, { answers }).unanswered).toEqual([]);
    }
  });

  it('every photo is the same house with that roof, with a drawing fallback that exists', () => {
    for (const sel of allFunnelSelections(SPEC)) {
      for (const step of activeSteps(SPEC, sel)) {
        for (const photo of Object.values(stepOptionPhotos(SPEC, step.id, sel))) {
          expect(photo.src).toMatch(/^\/estimator\/roofing\/funnel\/roof-(asphalt|tile|metal)-[a-z_]+\.webp$/);
          expect(existsSync(join(PUBLIC, photo.fallback!.src))).toBe(true);
        }
      }
    }
    expect(funnelPhoto(SPEC, 'tileColor', { material: 'tile', tileColor: 'slate_grey' }).src).toBe('/estimator/roofing/funnel/roof-tile-slate_grey.webp');
    expect(existsSync(join(PUBLIC, SPEC.addressFirst!.photo.fallback!.src))).toBe(true);
    expect(existsSync(join(PUBLIC, SPEC.landing.heroFallback!.src))).toBe(true);
    // The missing-photo check covers the address screen's photo too (once its folder exists).
    if (existsSync(join(PUBLIC, 'estimator/roofing/funnel')) && !existsSync(join(PUBLIC, 'estimator/roofing/funnel/house-before.webp'))) {
      expect(missingFunnelPhotos(SPEC, PUBLIC)).toContain('/estimator/roofing/funnel/house-before.webp');
    }
  });

  it('network wording only: no licence, years, reviews or "we build"', () => {
    const words = JSON.stringify(SPEC);
    expect(words).not.toMatch(/years in business|we build|our crew|reviews|CSLB|licen[cs]e #/i);
    expect(SPEC.landing.reviews).toBeUndefined();
    expect(words).toMatch(/licensed local roof/i);
  });
});

describe('lead through the roof-replacement funnel', () => {
  const contact = { firstName: 'Jordan', lastName: 'Rivera', email: 'jordan@example.test', phone: '8185550142', consent: true, website: '' };
  const picks = { material: 'tile', tileColor: 'terracotta' };
  const post = (over: Record<string, unknown> = {}) =>
    lead(
      new Request('https://homequote.example/api/estimator/roofing/lead', {
        method: 'POST', headers: { origin: 'https://homequote.example' },
        body: JSON.stringify({
          answers: funnelAnswers(SPEC, picks), funnel: picks, zip: '91302', address: '12 Elm St, Calabasas, CA 91302', homeowner: 'yes', contact,
          consentText: estimatorConsentText(contractor.contractorName), measurement: false, ...over,
        }),
      }),
      { params: Promise.resolve({ slug: 'roofing' }) },
    );

  it('the project maps onto the funnel’s own service (a replacement qualifies)', () => {
    expect(funnelAnswersFor(funnelConfig, { zip: '91302', homeowner: 'yes', project: 'replace', trade: 'roofing' })).toMatchObject({ service: 'roof_replacement' });
    expect(estimatorConsentText(contractor.contractorName)).toBe(consentText(funnelConfig));
  });

  it('prices the verified measured roof, files a qualified replacement and returns the booking ticket', async () => {
    const measure = signMeasure('roofing', { areaSqft: 2410, pitchDeg: 30, segments: 4 })!;
    const res = await post({ roof: { measure } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, qualified: true });
    const expected = computeEstimate(template, { answers: funnelAnswers(SPEC, picks), dimensions: roofDimensions({ source: 'measured', measure: { areaSqft: 2410, pitchDeg: 30, segments: 4 } }) });
    expect([body.estimate.low, body.estimate.high]).toEqual([expected.low, expected.high]);
    expect(typeof body.bookingTicket).toBe('string');
    const args = m.rpc.mock.calls[0]![1] as Record<string, unknown>;
    expect(args.p_answers).toMatchObject({ service: 'roof_replacement', homeowner: 'yes', zip: '91302' });
    expect(String((args.p_answers as Record<string, string>).estimator_roof)).toMatch(/2,969 sq ft of priced roof/);
  });

  it('a tampered or missing measurement is priced from the band, never from the browser', async () => {
    const measure = signMeasure('roofing', { areaSqft: 2410, pitchDeg: 30, segments: 4 })!;
    const tampered = await (await post({ roof: { measure: { ...measure, areaSqft: 500 }, band: 'small' } })).json();
    const small = computeEstimate(template, { answers: funnelAnswers(SPEC, picks), dimensions: roofDimensions({ source: 'band', band: 'small' }) });
    expect([tampered.estimate.low, tampered.estimate.high]).toEqual([small.low, small.high]);
    const none = await (await post()).json();
    const medium = computeEstimate(template, { answers: funnelAnswers(SPEC, picks), dimensions: roofDimensions({ source: 'band', band: 'medium' }) });
    expect([none.estimate.low, none.estimate.high]).toEqual([medium.low, medium.high]);
  });
});

describe('"See it on your house"', () => {
  it('the repaint prompt changes only the roof, in the picked material and colour', () => {
    const p = roofRepaintPrompt('metal', 'Dark bronze');
    expect(p).toMatch(/Replace ONLY the roof covering/);
    expect(p).toMatch(/standing-seam metal roof/);
    expect(p).toMatch(/"Dark bronze"/);
    expect(p).toMatch(/Keep everything else exactly as it is/);
  });

  it('shows on the booking screen only with a render token (after the lead is saved)', () => {
    const sel = { material: 'asphalt', asphaltColor: 'pewter' };
    const result: FunnelLeadResult = {
      estimate: computeEstimate(template, { answers: funnelAnswers(SPEC, sel) }), qualified: true, contact: { firstName: 'Jordan', lastName: 'R', email: 'j@x.co' }, selection: sel, saved: true,
    };
    const props = { slug: 'roofing', spec: SPEC, contractor, template: publicTemplate(template, contractor), selection: sel, embedded: false, headingId: 'h' };
    const without = renderToStaticMarkup(<FunnelBookingScreen {...props} result={result} />);
    expect(without).not.toContain('data-funnel-roof-preview');
    const withToken = renderToStaticMarkup(<FunnelBookingScreen {...props} result={{ ...result, renderToken: 'tok' }} />);
    expect(withToken).toContain('data-funnel-roof-preview');
    expect(text(withToken)).toContain('See it on your house');
    expect(text(withToken)).toContain('pewter grey asphalt shingle roof');
    expect(text(withToken)).toContain('A licensed local roofer sets your firm price after a free inspection.');
  });
});
