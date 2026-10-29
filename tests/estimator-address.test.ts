import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The funnel's "Home address" field: the two Google Places proxy routes
 * (fetch mocked: no real Google call), the browser ZIP rules and the
 * client helpers. The key must never appear in a reply.
 */

vi.mock('server-only', () => ({}));
vi.mock('@/lib/funnels/server', () => ({
  sameOrigin: (r: Request) => r.headers.get('origin') === new URL(r.url).origin,
}));

import { POST as autocomplete } from '@/app/api/estimator/[slug]/address/autocomplete/route';
import { POST as details } from '@/app/api/estimator/[slug]/address/details/route';
import { WindowLimiter, mapPlace, mapSuggestions } from '@/lib/estimator/address';
import { addressZip, currentPlace, extractZip, fetchAddressDetails, fetchAddressSuggestions } from '@/lib/estimator/address-client';

const KEY = 'test-key-AIzaSyNEVER-SHOWN';
const TOKEN = '6f1c1d3e-8a7b-4c2d-9e0f-1a2b3c4d5e6f';
const PLACE_ID = 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA';

let ipCounter = 0;
function req(path: 'autocomplete' | 'details', body: unknown, opts: { origin?: string; slug?: string; ip?: string; raw?: string } = {}) {
  const slug = opts.slug ?? 'pool-masters';
  const request = new Request(`https://homequote.example/api/estimator/${slug}/address/${path}`, {
    method: 'POST',
    headers: { origin: opts.origin ?? 'https://homequote.example', 'content-type': 'application/json', 'x-forwarded-for': opts.ip ?? `10.0.0.${++ipCounter}` },
    body: opts.raw ?? JSON.stringify(body),
  });
  const context = { params: Promise.resolve({ slug }) };
  return path === 'autocomplete' ? autocomplete(request, context) : details(request, context);
}

const googleSuggestions = {
  suggestions: [
    {
      placePrediction: {
        placeId: PLACE_ID,
        text: { text: '4521 Park Granada, Calabasas, CA, USA' },
        structuredFormat: { mainText: { text: '4521 Park Granada' }, secondaryText: { text: 'Calabasas, CA, USA' } },
      },
    },
    ...Array.from({ length: 6 }, (_, i) => ({
      placePrediction: { placeId: `ChIJplace${i}abcdefgh`, structuredFormat: { mainText: { text: `${i + 1} Park Ave` }, secondaryText: { text: 'Los Angeles, CA, USA' } } },
    })),
    { queryPrediction: { text: { text: 'park' } } },
  ],
};
const googlePlace = {
  formattedAddress: '4521 Park Granada, Calabasas, CA 91302, USA',
  addressComponents: [
    { longText: '4521', shortText: '4521', types: ['street_number'] },
    { longText: 'Park Granada', shortText: 'Park Granada', types: ['route'] },
    { longText: 'Calabasas', shortText: 'Calabasas', types: ['locality', 'political'] },
    { longText: 'California', shortText: 'CA', types: ['administrative_area_level_1', 'political'] },
    { longText: '91302', shortText: '91302', types: ['postal_code'] },
  ],
  location: { latitude: 34.1561, longitude: -118.6388 },
};

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('GOOGLE_PLACES_API_KEY', KEY);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('autocomplete route', () => {
  it('without GOOGLE_PLACES_API_KEY answers disabled and calls nobody', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
    const res = await req('autocomplete', { input: '4521 Park', sessionToken: TOKEN });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, reason: 'disabled' });
    expect(fetchMock).not.toHaveBeenCalled();
    const d = await req('details', { placeId: PLACE_ID, sessionToken: TOKEN });
    expect(await d.json()).toEqual({ ok: false, reason: 'disabled' });
  });

  it('calls Places API (New) with the key in a header, US street addresses, a SoCal bias and the session token', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(googleSuggestions), { status: 200 }));
    const res = await req('autocomplete', { input: '4521 Park', sessionToken: TOKEN });
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://places.googleapis.com/v1/places:autocomplete');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['X-Goog-Api-Key']).toBe(KEY);
    expect(url).not.toContain(KEY);
    const sent = JSON.parse(String(init.body));
    expect(sent).toMatchObject({
      input: '4521 Park',
      sessionToken: TOKEN,
      includedRegionCodes: ['us'],
      includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
      locationBias: { circle: { center: { latitude: 34.05, longitude: -118.25 }, radius: 50000 } },
    });
    expect(init.signal).toBeDefined();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.suggestions).toHaveLength(5);
    expect(body.suggestions[0]).toEqual({ placeId: PLACE_ID, main: '4521 Park Granada', secondary: 'Calabasas, CA' });
    expect(JSON.stringify(body)).not.toContain(KEY);
  });

  it('validates the input: too short, too long, a bad session token or no JSON', async () => {
    for (const body of [{ input: 'ab', sessionToken: TOKEN }, { input: 'x'.repeat(201), sessionToken: TOKEN }, { input: '4521 Park', sessionToken: 'bad token!' }, { input: 4521 }]) {
      const res = await req('autocomplete', body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, reason: 'invalid' });
    }
    expect((await req('autocomplete', null, { raw: 'not json' })).status).toBe(400);
    expect((await req('autocomplete', null, { raw: JSON.stringify({ input: 'x'.repeat(3000), sessionToken: TOKEN }) })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses another site and an unknown estimator', async () => {
    const cross = await req('autocomplete', { input: '4521 Park', sessionToken: TOKEN }, { origin: 'https://evil.example' });
    expect(cross.status).toBe(403);
    const unknown = await req('autocomplete', { input: '4521 Park', sessionToken: TOKEN }, { slug: 'no-such-estimator' });
    expect(unknown.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('limits one visitor per window (429), without calling Google past the limit', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(googleSuggestions), { status: 200 }));
    const statuses: number[] = [];
    for (let i = 0; i < 92; i++) statuses.push((await req('autocomplete', { input: '4521 Park', sessionToken: TOKEN }, { ip: '203.0.113.9' })).status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(90);
    expect(statuses.slice(-2)).toEqual([429, 429]);
    expect(fetchMock).toHaveBeenCalledTimes(90);
    // Someone else is not affected.
    expect((await req('autocomplete', { input: '4521 Park', sessionToken: TOKEN }, { ip: '203.0.113.10' })).status).toBe(200);
  });

  it('a Google error or a timeout is a quiet failure, never the raw error or the key', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: `API key ${KEY} not valid` } }), { status: 403 }));
    const res = await req('autocomplete', { input: '4521 Park', sessionToken: TOKEN });
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: false, reason: 'forbidden' });
    expect(text).not.toContain(KEY);
    fetchMock.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'));
    expect(await (await req('autocomplete', { input: '4521 Park', sessionToken: TOKEN })).json()).toEqual({ ok: false, reason: 'error' });
    // Nothing typed is logged.
    for (const call of (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls) expect(JSON.stringify(call)).not.toMatch(/4521|Park|test-key/);
  });
});

describe('details route', () => {
  it('asks for Essentials fields only and maps the place to {address, zip, city, state, lat, lng}', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(googlePlace), { status: 200 }));
    const res = await req('details', { placeId: PLACE_ID, sessionToken: TOKEN });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.startsWith(`https://places.googleapis.com/v1/places/${PLACE_ID}?`)).toBe(true);
    expect(new URL(url).searchParams.get('sessionToken')).toBe(TOKEN);
    expect(url).not.toContain(KEY);
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>)['X-Goog-FieldMask']).toBe('formattedAddress,addressComponents,location');
    expect((init.headers as Record<string, string>)['X-Goog-Api-Key']).toBe(KEY);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ ok: true, address: '4521 Park Granada, Calabasas, CA 91302', zip: '91302', city: 'Calabasas', state: 'CA', lat: 34.1561, lng: -118.6388 });
    expect(text).not.toContain(KEY);
  });

  it('validates the place id and answers a missing place quietly', async () => {
    expect((await req('details', { placeId: '../../x', sessionToken: TOKEN })).status).toBe(400);
    expect((await req('details', { placeId: PLACE_ID })).status).toBe(400);
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }));
    expect(await (await req('details', { placeId: PLACE_ID, sessionToken: TOKEN })).json()).toEqual({ ok: false, reason: 'not_found' });
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    expect(await (await req('details', { placeId: PLACE_ID, sessionToken: TOKEN })).json()).toEqual({ ok: false, reason: 'not_found' });
  });

  it('limits picks per visitor', async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify(googlePlace), { status: 200 }));
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) statuses.push((await req('details', { placeId: PLACE_ID, sessionToken: TOKEN }, { ip: '198.51.100.7' })).status);
    expect(statuses.at(-1)).toBe(429);
    expect(statuses.filter((s) => s === 200)).toHaveLength(30);
  });
});

describe('mapping', () => {
  it('skips malformed suggestions and drops ", USA"', () => {
    expect(mapSuggestions(null)).toEqual([]);
    expect(mapSuggestions({ suggestions: [{ placePrediction: { placeId: 'short' } }, { placePrediction: { placeId: PLACE_ID, text: { text: '1 Main St, Pasadena, CA, USA' } } }] })).toEqual([
      { placeId: PLACE_ID, main: '1 Main St, Pasadena, CA', secondary: '' },
    ]);
  });
  it('a place without a ZIP or a city still maps, with nulls', () => {
    expect(mapPlace({ formattedAddress: 'Somewhere, CA, USA', addressComponents: [{ longText: 'California', shortText: 'CA', types: ['administrative_area_level_1'] }] })).toEqual({
      ok: true, address: 'Somewhere, CA', zip: null, city: null, state: 'CA', lat: null, lng: null,
    });
    expect(mapPlace({})).toBeNull();
  });
  it('the window limiter forgets old hits', () => {
    const l = new WindowLimiter(2, 1000);
    expect([l.take('a', 0), l.take('a', 10), l.take('a', 20)]).toEqual([true, true, false]);
    expect(l.take('a', 1100)).toBe(true);
  });
});

describe('ZIP from the address (browser)', () => {
  it.each([
    ['4521 Park Granada, Calabasas, CA 91302', '91302'],
    ['4521 Park Granada, Calabasas, CA 91302, USA', '91302'],
    ['4521 Park Granada Calabasas CA 91302-1234', '91302'],
    ['12 Elm St 90210', '90210'],
    ['12 Elm St, Beverly Hills, CA 90210 USA', '90210'],
    ['CA 91302', '91302'],
  ])('%s -> %s', (address, zip) => expect(extractZip(address)).toBe(zip));
  it.each(['12345 Ventura Blvd, Studio City', '4521 Park Granada, Calabasas, CA', '91302', '', 'Calabasas'])('no ZIP in "%s"', (address) => expect(extractZip(address)).toBeNull());

  it('a picked place gives its ZIP only while the field shows its address', () => {
    const place = { address: '4521 Park Granada, Calabasas, CA', zip: '91302', city: 'Calabasas', state: 'CA', lat: 1, lng: 2 };
    expect(addressZip(place.address, place)).toBe('91302');
    expect(currentPlace(place.address, place)).toBe(place);
    expect(addressZip('4521 Park Granada, Calabasas', place)).toBeNull();
    expect(addressZip('4521 Park Granada, Calabasas, CA 91301', place)).toBe('91301');
    expect(currentPlace('4521 Park Granada', place)).toBeNull();
  });

  it('the client helpers post to our routes only and never throw', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ ok: true, suggestions: [] })));
    expect(await fetchAddressSuggestions('pool-masters', '4521 Park', TOKEN, { fetch: f as unknown as typeof fetch })).toEqual({ ok: true, suggestions: [] });
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('/api/estimator/pool-masters/address/autocomplete');
    const broken = vi.fn(async () => {
      throw new TypeError('offline');
    });
    expect(await fetchAddressDetails('pool-masters', PLACE_ID, TOKEN, { fetch: broken as unknown as typeof fetch })).toEqual({ ok: false, reason: 'error' });
  });
});
