import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/funnels/server';
import { WindowLimiter, autocompleteSchema, googleAutocomplete, placesKey, readSmallJson, visitorKey } from '@/lib/estimator/address';
import type { AutocompleteResponse } from '@/lib/estimator/address-client';
import { originAllowed } from '@/lib/estimator/lead';
import { getEstimator } from '@/lib/estimator/registry';

/**
 * Address suggestions for the funnel's "Home address" field: a proxy for
 * Google Places API (New) Autocomplete (US street addresses, biased to
 * Southern California). The key stays on the server. Without
 * GOOGLE_PLACES_API_KEY (preview, local) it answers {ok:false, reason:'disabled'}
 * and the field works as a plain input. Never logs what was typed.
 */
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ slug: string }> };

// Typing fires one request per pause (~200 ms debounce): 90 per 5 minutes is generous for a person.
const limiter = new WindowLimiter(90, 5 * 60 * 1000);

const reply = (data: AutocompleteResponse, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request) && !originAllowed(request)) return reply({ ok: false, reason: 'forbidden' }, 403);
  if (!getEstimator((await context.params).slug)) return reply({ ok: false, reason: 'not_found' }, 404);
  const key = placesKey();
  if (!key) return reply({ ok: false, reason: 'disabled' });
  const parsed = autocompleteSchema.safeParse(await readSmallJson(request));
  if (!parsed.success) return reply({ ok: false, reason: 'invalid' }, 400);
  if (!limiter.take(visitorKey(request))) return reply({ ok: false, reason: 'limit' }, 429);
  const result = await googleAutocomplete(key, parsed.data.input, parsed.data.sessionToken);
  if (!result.ok) console.error('[estimator-address] autocomplete failed', result.reason);
  return reply(result);
}
