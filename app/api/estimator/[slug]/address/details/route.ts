import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/funnels/server';
import { WindowLimiter, detailsSchema, googlePlaceDetails, placesKey, readSmallJson, visitorKey } from '@/lib/estimator/address';
import type { DetailsResponse } from '@/lib/estimator/address-client';
import { originAllowed } from '@/lib/estimator/lead';
import { getEstimator } from '@/lib/estimator/registry';

/**
 * The picked suggestion's full address for the funnel's "Home address" field:
 * a proxy for Google Places API (New) Place Details with Essentials fields only
 * (formattedAddress, addressComponents, location) -> {address, zip, city,
 * state, lat, lng}. The ZIP is what the service-area gate uses. Same guards as
 * the autocomplete route; never logs the address.
 */
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ slug: string }> };

// One per picked suggestion: 30 per 5 minutes per visitor.
const limiter = new WindowLimiter(30, 5 * 60 * 1000);

const reply = (data: DetailsResponse, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request) && !originAllowed(request)) return reply({ ok: false, reason: 'forbidden' }, 403);
  if (!getEstimator((await context.params).slug)) return reply({ ok: false, reason: 'not_found' }, 404);
  const key = placesKey();
  if (!key) return reply({ ok: false, reason: 'disabled' });
  const parsed = detailsSchema.safeParse(await readSmallJson(request));
  if (!parsed.success) return reply({ ok: false, reason: 'invalid' }, 400);
  if (!limiter.take(visitorKey(request))) return reply({ ok: false, reason: 'limit' }, 429);
  const result = await googlePlaceDetails(key, parsed.data.placeId, parsed.data.sessionToken);
  if (!result.ok) console.error('[estimator-address] details failed', result.reason);
  return reply(result);
}
