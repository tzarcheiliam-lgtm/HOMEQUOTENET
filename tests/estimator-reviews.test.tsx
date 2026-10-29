import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The funnel landing's Google reviews: 5-star filtering, name shortening,
 * truncation, strict business matching (out-of-state namesakes rejected), the
 * empty state, the admin health route, and the key never reaching any output.
 * fetch is mocked: no real Google call.
 */

vi.mock('server-only', () => ({}));
// unstable_cache needs Next's incremental cache: run the function directly.
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }));
const profile = vi.hoisted(() => ({ current: null as null | { role: string; is_active: boolean } }));
vi.mock('@/lib/auth', () => ({ getProfile: async () => profile.current }));

import { FunnelLanding } from '@/components/estimator/funnel/landing';
import { FunnelReviews } from '@/components/estimator/funnel/reviews';
import { POOL_MASTERS_FUNNEL as SPEC } from '@/content/estimators/pool-masters-funnel';
import type { GoogleBusinessMatch } from '@/lib/estimator/funnel/types';
import { getEstimator } from '@/lib/estimator/registry';
import { loadGoogleReviews, matchesBusiness, pickPlace, selectReviews, shortName, trimReview, type GoogleReview, type SearchPlace } from '@/lib/estimator/reviews';
import { funnelReviewsFor, funnelReviewsHealth } from '@/lib/estimator/reviews.server';
import { GET as health } from '@/app/api/estimator/[slug]/reviews/health/route';

const KEY = 'test-key-AIzaSyNEVER-SHOWN-reviews';
const PLACE = 'ChIJpoolmastersSHERMANoaks01';
const contractor = getEstimator('pool-masters')!.contractor;
const MATCH: GoogleBusinessMatch = SPEC.landing.reviews!.lookup!;

const comps = (city: string, state: string, zip: string) => [
  { longText: city, shortText: city, types: ['neighborhood', 'political'] },
  { longText: 'Los Angeles', shortText: 'Los Angeles', types: ['locality', 'political'] },
  { longText: state === 'CA' ? 'California' : state, shortText: state, types: ['administrative_area_level_1', 'political'] },
  { longText: zip, shortText: zip, types: ['postal_code'] },
];

const REAL: SearchPlace = {
  id: PLACE,
  displayName: { text: 'Pool Masters LA' },
  formattedAddress: '14500 Ventura Blvd, Sherman Oaks, CA 91403, USA',
  addressComponents: comps('Sherman Oaks', 'CA', '91403'),
  websiteUri: 'https://www.poolmastersla.com/',
};
const TEXAS: SearchPlace = {
  id: 'ChIJpoolmastersTEXAS0000001',
  displayName: { text: 'Pool Masters' },
  formattedAddress: '100 Main St, Sherman, TX 75090, USA',
  addressComponents: [
    { longText: 'Sherman', shortText: 'Sherman', types: ['locality'] },
    { longText: 'Texas', shortText: 'TX', types: ['administrative_area_level_1'] },
    { longText: '75090', types: ['postal_code'] },
  ],
  websiteUri: 'https://poolmasterstx.com',
};
const FLORIDA: SearchPlace = {
  id: 'ChIJpoolmastersFLORIDA00001',
  displayName: { text: 'Pool Masters Inc' },
  formattedAddress: '9 Ocean Dr, Naples, FL 34102, USA',
  addressComponents: [{ longText: 'Florida', shortText: 'FL', types: ['administrative_area_level_1'] }],
  // Even a copied website does not make an out-of-state listing match.
  websiteUri: 'https://poolmastersla.com',
};

const review = (over: Partial<GoogleReview>): GoogleReview => ({
  name: `places/${PLACE}/reviews/${Math.random().toString(36).slice(2)}`,
  rating: 5,
  relativePublishTimeDescription: '2 months ago',
  publishTime: '2026-08-01T00:00:00Z',
  text: { text: 'Great job.' },
  authorAttribution: { displayName: 'Sarah Kimball', uri: 'https://www.google.com/maps/contrib/123' },
  googleMapsUri: 'https://www.google.com/maps/reviews/data=abc',
  ...over,
});

const REVIEWS: GoogleReview[] = [
  review({ publishTime: '2026-05-01T00:00:00Z', relativePublishTimeDescription: '5 months ago', text: { text: 'Oldest five-star.' }, authorAttribution: { displayName: 'Old Timer' } }),
  review({ rating: 4, publishTime: '2026-10-20T00:00:00Z', text: { text: 'Four stars, newest.' } }),
  review({ rating: 1, text: { text: 'One star.' } }),
  review({ publishTime: '2026-10-01T00:00:00Z', relativePublishTimeDescription: '4 weeks ago', text: { text: 'Newest five-star.' }, authorAttribution: { displayName: 'daniel ortega' } }),
  review({ publishTime: '2026-09-01T00:00:00Z', text: { text: '   ' } }),
  review({ publishTime: '2026-08-15T00:00:00Z', relativePublishTimeDescription: '2 months ago', text: { text: `Middle five-star. ${'Lovely work on the pool and spa. '.repeat(12)}` } }),
];

function mockGoogle(opts: { search?: SearchPlace[]; reviews?: GoogleReview[]; status?: number } = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, init: init ?? {} });
    if (opts.status) return new Response(JSON.stringify({ error: { message: `bad key ${KEY}` } }), { status: opts.status });
    if (u.includes(':searchText')) return Response.json({ places: opts.search ?? [REAL] });
    return Response.json({ id: PLACE, displayName: { text: 'Pool Masters LA' }, googleMapsUri: 'https://maps.google.com/?cid=42', reviews: opts.reviews ?? REVIEWS });
  });
  vi.stubGlobal('fetch', fn);
  return { fn, calls };
}

beforeEach(() => {
  vi.stubEnv('GOOGLE_PLACES_API_KEY', KEY);
  profile.current = null;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('formatting', () => {
  it('shortens names to first name + last initial', () => {
    expect(shortName('Sarah Kimball')).toBe('Sarah K.');
    expect(shortName('maria de la cruz')).toBe('Maria C.');
    expect(shortName('Sam')).toBe('Sam');
    expect(shortName('  ')).toBe('Google user');
    expect(shortName(undefined)).toBe('Google user');
    expect(shortName('José "Pepe" Álvarez')).toBe('José Á.');
  });

  it('trims to about 220 characters at a word boundary with an ellipsis', () => {
    expect(trimReview('  Short   and sweet. ')).toEqual({ text: 'Short and sweet.', truncated: false });
    const long = trimReview('word '.repeat(80));
    expect(long.truncated).toBe(true);
    expect(long.text.length).toBeLessThanOrEqual(221);
    expect(long.text.endsWith('word…')).toBe(true);
    expect(trimReview('x'.repeat(300)).text).toBe(`${'x'.repeat(220)}…`);
  });

  it('keeps only 5-star reviews with text, newest first, at most 3', () => {
    const { reviews, fiveStarCount } = selectReviews(REVIEWS, 'https://maps.google.com/?cid=42');
    expect(fiveStarCount).toBe(3);
    expect(reviews.map((r) => r.text.slice(0, 17))).toEqual(['Newest five-star.', 'Middle five-star.', 'Oldest five-star.']);
    expect(reviews[0].author).toBe('Daniel O.');
    expect(reviews[0].relativeTime).toBe('4 weeks ago');
    expect(reviews[1].truncated).toBe(true);
    expect(reviews[1].text.length).toBeLessThanOrEqual(221);
    expect(selectReviews(REVIEWS, null, 1).reviews).toHaveLength(1);
    expect(selectReviews([review({ rating: 4 })], null).reviews).toEqual([]);
  });

  it('links only to https Google pages', () => {
    const [r] = selectReviews([review({ googleMapsUri: 'javascript:alert(1)', authorAttribution: { displayName: 'A B', uri: 'https://evil.example/x' } })], 'https://maps.google.com/?cid=42').reviews;
    expect(r.url).toBe('https://maps.google.com/?cid=42');
    expect(r.authorUri).toBeNull();
  });
});

describe('matching the business (Text Search)', () => {
  it('accepts the Sherman Oaks listing and rejects out-of-state namesakes', () => {
    expect(matchesBusiness(REAL, MATCH)).toEqual({ ok: true, byWebsite: true });
    expect(matchesBusiness({ ...REAL, websiteUri: undefined }, MATCH).ok).toBe(true);
    expect(matchesBusiness(TEXAS, MATCH).ok).toBe(false);
    expect(matchesBusiness(FLORIDA, MATCH).ok).toBe(false);
    expect(pickPlace([TEXAS, FLORIDA], MATCH)).toBeNull();
    expect(pickPlace([TEXAS, REAL, FLORIDA], MATCH)).toBe(PLACE);
  });

  it('needs the name, and an address in Sherman Oaks or the website', () => {
    expect(matchesBusiness({ ...REAL, displayName: { text: 'Pool Mastery Supply' } }, MATCH).ok).toBe(false);
    expect(matchesBusiness({ ...REAL, displayName: { text: 'Masters Pool Co' } }, MATCH).ok).toBe(false);
    // Another LA "Pool Masters" (not Sherman Oaks, other website): rejected.
    const pasadena: SearchPlace = { id: 'ChIJpoolmastersPASADENA0001', displayName: { text: 'Pool Masters' }, formattedAddress: '1 Colorado Blvd, Pasadena, CA 91101, USA', addressComponents: comps('Pasadena', 'CA', '91101'), websiteUri: 'https://poolmasterspasadena.com' };
    expect(matchesBusiness(pasadena, MATCH).ok).toBe(false);
    // A service-area listing with no address and no website match: rejected.
    expect(matchesBusiness({ id: PLACE, displayName: { text: 'Pool Masters' } }, MATCH).ok).toBe(false);
    // Two address matches without a website: ambiguous, nothing shown.
    const twin = { ...REAL, id: 'ChIJpoolmastersTWIN00000001', websiteUri: undefined };
    expect(pickPlace([{ ...REAL, websiteUri: undefined }, twin], MATCH)).toBeNull();
  });
});

describe('loading (fetch mocked)', () => {
  it('looks the place up, then asks Place Details for reviews; the key only goes in a header', async () => {
    const { calls } = mockGoogle({ search: [TEXAS, REAL] });
    const r = await loadGoogleReviews(SPEC.landing.reviews!, KEY);
    expect(r.placeId).toBe(PLACE);
    expect(r.placeIdSource).toBe('lookup');
    expect(r.reviews).toHaveLength(3);
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toBe(`https://places.googleapis.com/v1/places/${PLACE}?languageCode=en`);
    expect((calls[1].init.headers as Record<string, string>)['X-Goog-FieldMask']).toBe('id,displayName,googleMapsUri,reviews');
    for (const c of calls) {
      expect(c.url).not.toContain(KEY);
      expect(String(c.init.body ?? '')).not.toContain(KEY);
    }
    expect(JSON.stringify(r)).not.toContain(KEY);
  });

  it('a configured place id skips the lookup; no match means no Details call', async () => {
    const one = mockGoogle();
    await loadGoogleReviews({ enabled: true, googlePlaceId: PLACE }, KEY);
    expect(one.calls.map((c) => c.url.includes(':searchText'))).toEqual([false]);
    const two = mockGoogle({ search: [TEXAS, FLORIDA] });
    const r = await loadGoogleReviews(SPEC.landing.reviews!, KEY);
    expect(r).toMatchObject({ placeId: null, reviews: [] });
    expect(two.calls).toHaveLength(1);
  });

  it('the page gets null (nothing renders) with no key, no 5-star review, or a Google error', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
    const none = mockGoogle();
    expect(await funnelReviewsFor(contractor)).toBeNull();
    expect(none.fn).not.toHaveBeenCalled();

    vi.stubEnv('GOOGLE_PLACES_API_KEY', KEY);
    mockGoogle({ reviews: [review({ rating: 4 }), review({ rating: 5, text: { text: '' } })] });
    expect(await funnelReviewsFor(contractor)).toBeNull();

    mockGoogle({ status: 403 });
    expect(await funnelReviewsFor(contractor)).toBeNull();

    mockGoogle();
    const data = await funnelReviewsFor(contractor);
    expect(data?.heading).toBe('What Pool Masters customers say');
    expect(data?.reviews).toHaveLength(3);
    expect(JSON.stringify(data)).not.toContain(KEY);
  });
});

describe('rendering', () => {
  const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  it('shows the cards under the button: stars, Google label, short name, time, "Read on Google"; never an average or a count', async () => {
    mockGoogle();
    const data = (await funnelReviewsFor(contractor))!;
    const html = renderToStaticMarkup(<FunnelLanding spec={SPEC} contractor={contractor} designHref="/estimator/pool-masters/design" reviews={data} />);
    const t = text(html);
    expect(t).toContain('What Pool Masters customers say');
    expect(html.match(/★★★★★/g)).toHaveLength(3);
    expect(html.match(/Google review/g)).toHaveLength(3);
    expect(html.match(/Read on Google/g)).toHaveLength(3);
    expect(t).toContain('Daniel O.');
    expect(t).toContain('4 weeks ago');
    expect(t).not.toContain('Old Timer');
    expect(t).not.toContain('Four stars');
    expect(t).not.toContain('One star');
    // No average, no count, no "all reviews" wording.
    expect(t).not.toMatch(/\b[1-5]\.\d\b|\d+\s+reviews|rated|our reviews|out of \d+ reviews/i);
    expect(html).not.toContain(KEY);
    // The cards come right after the button, before the photo.
    const button = html.indexOf('Design your pool</a>', html.indexOf('<h1'));
    expect(button).toBeGreaterThan(0);
    expect(html.indexOf('id="fn-reviews"')).toBeGreaterThan(button);
    expect(html.indexOf('fn-hero-photo')).toBeGreaterThan(html.indexOf('id="fn-reviews"'));
  });

  it('renders nothing at all without reviews (the landing is unchanged)', () => {
    expect(renderToStaticMarkup(<FunnelReviews data={{ heading: 'x', placeUri: null, reviews: [] }} />)).toBe('');
    const plain = renderToStaticMarkup(<FunnelLanding spec={SPEC} contractor={contractor} designHref="/d" />);
    const empty = renderToStaticMarkup(<FunnelLanding spec={SPEC} contractor={contractor} designHref="/d" reviews={null} />);
    expect(empty).toBe(plain);
    expect(plain).not.toContain('fn-reviews');
    expect(plain).toContain(contractor.licenseLabel);
  });
});

describe('admin health route', () => {
  const call = () => health(new Request('https://homequote.example/api/estimator/pool-masters/reviews/health'), { params: Promise.resolve({ slug: 'pool-masters' }) });

  it('is admin-only', async () => {
    expect((await call()).status).toBe(401);
    profile.current = { role: 'contractor', is_active: true };
    expect((await call()).status).toBe(403);
    profile.current = { role: 'setter', is_active: true };
    expect((await call()).status).toBe(403);
  });

  it('reports configured / placeIdKnown / count5Star without review text or the key', async () => {
    profile.current = { role: 'admin', is_active: true };
    mockGoogle();
    const res = await call();
    const body = await res.text();
    expect(JSON.parse(body)).toEqual({ enabled: true, configured: true, placeIdKnown: true, placeIdSource: 'lookup', placeId: PLACE, count5Star: 3, shown: 3, error: null });
    expect(body).not.toContain(KEY);
    expect(body).not.toContain('five-star');

    mockGoogle({ status: 403 });
    const failed = await funnelReviewsHealth(contractor);
    expect(failed).toMatchObject({ configured: true, count5Star: 0, error: 'lookup_failed_403' });
    expect(JSON.stringify(failed)).not.toContain(KEY);

    vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
    expect(await funnelReviewsHealth(contractor)).toMatchObject({ enabled: true, configured: false, placeIdKnown: false });
  });
});
