import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PLACES_KEY_ENV } from '../address.ts';
import type { Answers, PoolDimensions } from '../types.ts';
import { bandOrDefault, describeRoof, mapBuildingInsights, roofDimensions, type PricedRoof, type RoofLeadInput, type RoofLookup, type RoofMeasure } from './roof.ts';

/*
 * Server side of the roofing funnel's "Where's your home?" step:
 *
 * - Google Solar API buildingInsights:findClosest (requiredQuality HIGH, then
 *   MEDIUM) for the picked address's coordinates -> the roof's sloped area,
 *   pitch and sections (./roof.ts mapBuildingInsights). Key:
 *   GOOGLE_SOLAR_API_KEY, else GOOGLE_PLACES_API_KEY (the Solar API must be
 *   enabled on that key's Google Cloud project). Server-only, sent in a
 *   header, never to the browser. Replies are cached in memory per instance
 *   for a few hours (Google allows up to 30 days for Solar API content).
 * - The satellite photo: a Maps Static API URL (maptype satellite) built here
 *   with GOOGLE_MAPS_STATIC_KEY, a SEPARATE browser key (it appears in the
 *   <img> URL: restrict it to Maps Static API and this site's referrers),
 *   signed with GOOGLE_MAPS_URL_SIGNING_SECRET when that is set. Shown
 *   unmodified, with Google's logo and attribution inside the image; never
 *   AI-edited. Without the key there is no photo (the numbers still show).
 * - The measurement is signed (HMAC, ESTIMATOR_RENDER_SECRET else the service
 *   role key, like the share links): the lead route prices a measurement only
 *   when its signature verifies, so the browser cannot shrink its own roof.
 *
 * Nothing here logs an address or coordinates.
 */

export const SOLAR_KEY_ENV = 'GOOGLE_SOLAR_API_KEY';
export const STATIC_MAP_KEY_ENV = 'GOOGLE_MAPS_STATIC_KEY';
export const STATIC_MAP_SECRET_ENV = 'GOOGLE_MAPS_URL_SIGNING_SECRET';

const SOLAR_URL = 'https://solar.googleapis.com/v1/buildingInsights:findClosest';
const STATIC_MAP_URL = 'https://maps.googleapis.com/maps/api/staticmap';
const SOLAR_TIMEOUT_MS = 6000;
/** A signed measurement stays valid this long (the lead may come a few days later from the same tab). */
export const MEASURE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 500;

export const solarKey = (): string | null => process.env[SOLAR_KEY_ENV]?.trim() || process.env[PLACES_KEY_ENV]?.trim() || null;

export type { RoofLookup } from './roof.ts';

/* ------------------------------------------------------------------ */
/* Signature                                                           */
/* ------------------------------------------------------------------ */

function measureKey(): Buffer | null {
  const secret = process.env.ESTIMATOR_RENDER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return secret ? createHmac('sha256', secret).update('hqn-estimator-roof-v1').digest() : null;
}

const canonical = (slug: string, m: RoofMeasure, exp: number) => `${slug}|${m.areaSqft}|${m.pitchDeg.toFixed(1)}|${m.segments}|${exp}`;

export function signMeasure(slug: string, m: RoofMeasure, now = Date.now()): (RoofMeasure & { exp: number; sig: string }) | null {
  const key = measureKey();
  if (!key) return null;
  const exp = Math.floor((now + MEASURE_TTL_MS) / 1000);
  const sig = createHmac('sha256', key).update(canonical(slug, m, exp)).digest().subarray(0, 18).toString('base64url');
  return { ...m, exp, sig };
}

/** The measurement when its signature verifies and it has not expired, else null. */
export function verifyMeasure(slug: string, input: unknown, now = Date.now()): RoofMeasure | null {
  const v = (input ?? {}) as Record<string, unknown>;
  const { areaSqft, pitchDeg, segments, exp, sig } = v;
  if (typeof sig !== 'string' || !/^[A-Za-z0-9_-]{24}$/.test(sig)) return null;
  if (![areaSqft, pitchDeg, segments, exp].every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  if ((exp as number) * 1000 < now) return null;
  const key = measureKey();
  if (!key) return null;
  const m: RoofMeasure = { areaSqft: areaSqft as number, pitchDeg: pitchDeg as number, segments: segments as number };
  const expected = createHmac('sha256', key).update(canonical(slug, m, exp as number)).digest().subarray(0, 18).toString('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? m : null;
}

/** What the lead route prices for a roofing lead: the verified measurement, else the band (default medium). */
export function pricedRoofFor(slug: string, input: RoofLeadInput | undefined, now = Date.now()): PricedRoof {
  const measure = input?.measure ? verifyMeasure(slug, input.measure, now) : null;
  return measure ? { source: 'measured', measure } : { source: 'band', band: bandOrDefault(input?.band) };
}

/**
 * What the lead route hands funnelLeadDesign for a roofing lead: the dimensions
 * the roof prices as, the home-size answer for a band, and the roof line that
 * leads the design summary.
 */
export function roofLeadMeasure(slug: string, input: RoofLeadInput | undefined, now = Date.now()): { dimensions: PoolDimensions; answers?: Answers; summary: string[] } {
  const roof = pricedRoofFor(slug, input, now);
  return {
    dimensions: roofDimensions(roof),
    ...(roof.source === 'band' ? { answers: { size: [roof.band] } } : {}),
    summary: [`Roof: ${describeRoof(roof)}`],
  };
}

/* ------------------------------------------------------------------ */
/* Satellite photo                                                     */
/* ------------------------------------------------------------------ */

/**
 * The Maps Static API satellite URL for a point (640 x 400 at scale 2, zoom 20),
 * signed when a URL signing secret is set; null without GOOGLE_MAPS_STATIC_KEY.
 */
export function staticMapUrl(center: { lat: number; lng: number }, env: NodeJS.ProcessEnv = process.env): string | null {
  const key = env[STATIC_MAP_KEY_ENV]?.trim();
  if (!key) return null;
  const params = new URLSearchParams({
    center: `${center.lat.toFixed(6)},${center.lng.toFixed(6)}`,
    zoom: '20',
    size: '640x400',
    scale: '2',
    maptype: 'satellite',
    key,
  });
  const path = `/maps/api/staticmap?${params.toString()}`;
  const secret = env[STATIC_MAP_SECRET_ENV]?.trim();
  if (!secret) return `${STATIC_MAP_URL}?${params.toString()}`;
  // Google's URL signing: HMAC-SHA1 of the path + query with the URL-safe base64 secret, URL-safe base64.
  const signature = createHmac('sha1', Buffer.from(secret.replace(/-/g, '+').replace(/_/g, '/'), 'base64'))
    .update(path)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${STATIC_MAP_URL}?${params.toString()}&signature=${signature}`;
}

/* ------------------------------------------------------------------ */
/* Solar API                                                           */
/* ------------------------------------------------------------------ */

type Cached = { at: number; value: { measure: RoofMeasure; center: { lat: number; lng: number } | null } | null };
const cache = new Map<string, Cached>();

/** Test hook: forget cached roofs. */
export const clearRoofCache = () => cache.clear();

async function findClosest(key: string, lat: number, lng: number, quality: 'HIGH' | 'MEDIUM', fetcher: typeof fetch): Promise<{ status: number; data: unknown }> {
  const url = `${SOLAR_URL}?location.latitude=${lat.toFixed(6)}&location.longitude=${lng.toFixed(6)}&requiredQuality=${quality}`;
  const res = await fetcher(url, { headers: { 'X-Goog-Api-Key': key }, signal: AbortSignal.timeout(SOLAR_TIMEOUT_MS), cache: 'no-store' });
  return { status: res.status, data: res.ok ? await res.json().catch(() => null) : null };
}

/**
 * The roof at a point: HIGH-quality imagery first, then MEDIUM; null when
 * Google has no building there (404) or the one it has is not this house.
 * Throws on other Google errors (the route answers 'error').
 */
export async function solarRoof(key: string, lat: number, lng: number, fetcher: typeof fetch = fetch, now = Date.now()): Promise<Cached['value']> {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.value;
  let value: Cached['value'] = null;
  for (const quality of ['HIGH', 'MEDIUM'] as const) {
    const { status, data } = await findClosest(key, lat, lng, quality, fetcher);
    if (status === 404) continue;
    if (status < 200 || status >= 300) throw new Error(`Solar API ${status}`);
    value = mapBuildingInsights(data, { lat, lng });
    if (value) break;
  }
  cache.delete(cacheKey);
  cache.set(cacheKey, { at: now, value });
  while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  return value;
}

/** The whole lookup the address step asks for: measure, sign, add the satellite URL. */
export async function lookupRoof(slug: string, lat: number, lng: number, fetcher: typeof fetch = fetch): Promise<RoofLookup> {
  const key = solarKey();
  if (!key) return { ok: false, reason: 'disabled' };
  try {
    const found = await solarRoof(key, lat, lng, fetcher);
    if (!found) return { ok: false, reason: 'not_found' };
    const measure = signMeasure(slug, found.measure);
    // Without a signing secret the measurement could not be trusted by the lead route: use the bands.
    if (!measure) return { ok: false, reason: 'disabled' };
    return { ok: true, measure, mapUrl: staticMapUrl(found.center ?? { lat, lng }) };
  } catch (error) {
    console.error('[estimator-roof] lookup failed', error instanceof Error ? error.message.slice(0, 80) : 'unknown');
    return { ok: false, reason: 'error' };
  }
}
