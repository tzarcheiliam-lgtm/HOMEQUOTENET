import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ADDRESS_MAX, AUTOCOMPLETE_INPUT_MAX, AUTOCOMPLETE_MIN, type AddressFailure, type AddressSuggestion, type AutocompleteResponse, type DetailsResponse } from './address-client.ts';

/**
 * Server side of the funnel's "Home address" field: thin proxies for Google
 * Places API (New), used by POST /api/estimator/[slug]/address/autocomplete
 * and /details. The key (GOOGLE_PLACES_API_KEY, server-only, the same one
 * prospect sourcing uses: lib/prospecting/google-places.ts) is only ever sent
 * to Google in a header; replies carry suggestions or one place, never the key
 * or Google's raw error text. Nothing here logs an address.
 *
 * Cost: autocomplete requests that end in a details call share a session
 * token (one billing session); details asks for Essentials fields only
 * (formattedAddress, addressComponents, location).
 */

export const PLACES_KEY_ENV = 'GOOGLE_PLACES_API_KEY';
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DETAILS_URL = 'https://places.googleapis.com/v1/places/';
const DETAILS_FIELDS = 'formattedAddress,addressComponents,location';
/** Southern California (downtown LA), 50 km: the API's largest bias radius. A bias, not a limit. */
export const SOCAL_BIAS = { circle: { center: { latitude: 34.05, longitude: -118.25 }, radius: 50000 } };
export const ADDRESS_TYPES = ['street_address', 'premise', 'subpremise'];
export const MAX_SUGGESTIONS = 5;
const AUTOCOMPLETE_TIMEOUT_MS = 3000;
const DETAILS_TIMEOUT_MS = 4000;
export const MAX_ADDRESS_BODY = 2000;

export const placesKey = (): string | null => process.env[PLACES_KEY_ENV]?.trim() || null;

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

// Google: a URL- and filename-safe string of at most 36 characters (a UUID).
const sessionToken = z.string().regex(/^[A-Za-z0-9_-]{8,36}$/);
export const autocompleteSchema = z.object({
  input: z.string().trim().min(AUTOCOMPLETE_MIN).max(AUTOCOMPLETE_INPUT_MAX),
  sessionToken,
});
export const detailsSchema = z.object({
  placeId: z.string().regex(/^[A-Za-z0-9_-]{10,300}$/),
  sessionToken,
});

/** The JSON body, or null when it is missing, not JSON or bigger than `max` bytes. */
export async function readSmallJson(request: Request, max = MAX_ADDRESS_BODY): Promise<unknown | null> {
  if (Number(request.headers.get('content-length') ?? 0) > max) return null;
  try {
    const text = await request.text();
    if (text.length > max) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Per-visitor limit (per server instance, no storage)                 */
/* ------------------------------------------------------------------ */

/**
 * A small sliding-window counter per visitor, kept in memory like the lead
 * route's ReplayCache (per instance, bounded). The key is a hash of the IP and
 * the day (the funnel routes' rate_key idea): no raw IP is kept.
 */
export class WindowLimiter {
  private hits = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number, private maxKeys = 5000) {}
  /** True when this hit is allowed (and counts it). */
  take(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.delete(key);
    this.hits.set(key, recent);
    while (this.hits.size > this.maxKeys) this.hits.delete(this.hits.keys().next().value as string);
    return true;
  }
}

export function visitorKey(request: Request, now = new Date()): string {
  const ip = (request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  return createHash('sha256').update(`${ip}:${now.toISOString().slice(0, 10)}`).digest('hex').slice(0, 32);
}

/* ------------------------------------------------------------------ */
/* Google calls                                                        */
/* ------------------------------------------------------------------ */

type GoogleText = { text?: string };
type GooglePrediction = { placeId?: string; text?: GoogleText; structuredFormat?: { mainText?: GoogleText; secondaryText?: GoogleText } };
type GoogleAutocomplete = { suggestions?: { placePrediction?: GooglePrediction }[] };
type GoogleComponent = { longText?: string; shortText?: string; types?: string[] };
type GooglePlace = { formattedAddress?: string; addressComponents?: GoogleComponent[]; location?: { latitude?: number; longitude?: number } };

/** ", USA" is noise on a US-only form. */
const tidy = (text: string) => text.replace(/,\s*(USA|United States)$/i, '').trim();

/** Google's reply as at most five {placeId, main, secondary}; anything malformed is skipped. */
export function mapSuggestions(data: unknown): AddressSuggestion[] {
  const out: AddressSuggestion[] = [];
  for (const s of (data as GoogleAutocomplete | null)?.suggestions ?? []) {
    const p = s?.placePrediction;
    const placeId = p?.placeId;
    if (typeof placeId !== 'string' || !/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) continue;
    const main = tidy(p?.structuredFormat?.mainText?.text ?? p?.text?.text ?? '');
    if (!main) continue;
    const secondary = tidy(p?.structuredFormat?.secondaryText?.text ?? '');
    out.push({ placeId, main: main.slice(0, 200), secondary: secondary.slice(0, 200) });
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

function component(place: GooglePlace, ...types: string[]): GoogleComponent | undefined {
  for (const type of types) {
    const hit = place.addressComponents?.find((c) => c.types?.includes(type));
    if (hit) return hit;
  }
  return undefined;
}

const finite = (n: unknown, limit: number) => (typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= limit ? n : null);

/** Google's place as {address, zip, city, state, lat, lng}; null without a formatted address. */
export function mapPlace(data: unknown): Extract<DetailsResponse, { ok: true }> | null {
  const place = (data ?? {}) as GooglePlace;
  const address = typeof place.formattedAddress === 'string' ? tidy(place.formattedAddress).slice(0, ADDRESS_MAX) : '';
  if (!address) return null;
  const zipText = component(place, 'postal_code')?.longText ?? '';
  const zip = /^\d{5}$/.test(zipText) ? zipText : null;
  const city = component(place, 'locality', 'postal_town', 'sublocality', 'neighborhood', 'administrative_area_level_3')?.longText?.slice(0, 80) ?? null;
  const stateText = component(place, 'administrative_area_level_1')?.shortText ?? '';
  const state = /^[A-Z]{2}$/.test(stateText) ? stateText : null;
  return { ok: true, address, zip, city, state, lat: finite(place.location?.latitude, 90), lng: finite(place.location?.longitude, 180) };
}

function failureFor(status: number): AddressFailure {
  if (status === 429) return 'limit';
  if (status === 404) return 'not_found';
  if (status === 400) return 'invalid';
  if (status === 401 || status === 403) return 'forbidden';
  return 'error';
}

export async function googleAutocomplete(key: string, input: string, sessionToken: string, fetcher: typeof fetch = fetch): Promise<AutocompleteResponse> {
  try {
    const res = await fetcher(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
      body: JSON.stringify({
        input,
        sessionToken,
        includedRegionCodes: ['us'],
        includedPrimaryTypes: ADDRESS_TYPES,
        locationBias: SOCAL_BIAS,
        languageCode: 'en',
      }),
      signal: AbortSignal.timeout(AUTOCOMPLETE_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, reason: failureFor(res.status) };
    return { ok: true, suggestions: mapSuggestions(await res.json().catch(() => null)) };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export async function googlePlaceDetails(key: string, placeId: string, sessionToken: string, fetcher: typeof fetch = fetch): Promise<DetailsResponse> {
  try {
    const url = `${DETAILS_URL}${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}&languageCode=en&regionCode=us`;
    const res = await fetcher(url, {
      method: 'GET',
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': DETAILS_FIELDS },
      signal: AbortSignal.timeout(DETAILS_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, reason: failureFor(res.status) };
    return mapPlace(await res.json().catch(() => null)) ?? { ok: false, reason: 'not_found' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
