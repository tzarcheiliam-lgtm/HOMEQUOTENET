import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/funnels/server';
import { WindowLimiter, detailsSchema, googlePlaceDetails, placesKey, readSmallJson, visitorKey } from '@/lib/estimator/address';
import type { DetailsResponse } from '@/lib/estimator/address-client';
import { originAllowed } from '@/lib/estimator/lead';
import { getEstimator } from '@/lib/estimator/registry';
import { lookupRoof, type RoofLookup } from '@/lib/estimator/roofing/roof.server';
import { z } from 'zod';

/**
 * The picked suggestion's full address for the funnel's "Home address" field:
 * a proxy for Google Places API (New) Place Details with Essentials fields only
 * (formattedAddress, addressComponents, location) -> {address, zip, city,
 * state, lat, lng}. The ZIP is what the service-area gate uses. Same guards as
 * the autocomplete route; never logs the address.
 *
 * Roofing (an estimator whose funnel has addressFirst 'roof'): the same route,
 * body { roof: { lat, lng } } (the picked place's coordinates), measures the
 * roof from above instead (lib/estimator/roofing/roof.server.ts lookupRoof:
 * Google Solar API, a signed measurement and the satellite photo URL). Kept
 * in this route so the roof step adds no serverless function.
 */
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ slug: string }> };

// One per picked suggestion: 30 per 5 minutes per visitor.
const limiter = new WindowLimiter(30, 5 * 60 * 1000);

// One per picked address on the roofing funnel: 20 per 10 minutes per visitor.
const roofLimiter = new WindowLimiter(20, 10 * 60 * 1000);
const roofSchema = z.object({ roof: z.object({ lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180) }) });

const reply = (data: DetailsResponse | RoofLookup, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request) && !originAllowed(request)) return reply({ ok: false, reason: 'forbidden' }, 403);
  const slug = (await context.params).slug;
  const registered = getEstimator(slug);
  if (!registered) return reply({ ok: false, reason: 'not_found' }, 404);
  const body = await readSmallJson(request);
  const roof = roofSchema.safeParse(body);
  if (roof.success) {
    if (registered.contractor.funnel?.addressFirst?.kind !== 'roof') return reply({ ok: false, reason: 'invalid' }, 400);
    if (!roofLimiter.take(visitorKey(request))) return reply({ ok: false, reason: 'limit' }, 429);
    return reply(await lookupRoof(slug, roof.data.roof.lat, roof.data.roof.lng));
  }
  const key = placesKey();
  if (!key) return reply({ ok: false, reason: 'disabled' });
  const parsed = detailsSchema.safeParse(body);
  if (!parsed.success) return reply({ ok: false, reason: 'invalid' }, 400);
  if (!limiter.take(visitorKey(request))) return reply({ ok: false, reason: 'limit' }, 429);
  const result = await googlePlaceDetails(key, parsed.data.placeId, parsed.data.sessionToken);
  if (!result.ok) console.error('[estimator-address] details failed', result.reason);
  return reply(result);
}
