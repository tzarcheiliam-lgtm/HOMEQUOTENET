import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { isHqnAdministrator } from '@/lib/permissions';
import { getEstimator } from '@/lib/estimator/registry';
import { funnelReviewsHealth } from '@/lib/estimator/reviews.server';

/**
 * Admin-only check of the funnel landing's Google reviews after a deploy:
 * {enabled, configured, placeIdKnown, placeIdSource, placeId, count5Star,
 * shown, error}. Never review text, never the key. Uses the same 24 h cache
 * as the page, so it costs no extra Google call while the cache is warm.
 */
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ slug: string }> };

const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(_request: Request, context: Context) {
  let profile;
  try {
    profile = await getProfile();
  } catch {
    return reply({ error: 'Please try again' }, 503);
  }
  if (!profile || !profile.is_active) return reply({ error: 'Sign in required' }, 401);
  if (!isHqnAdministrator(profile)) return reply({ error: 'Forbidden' }, 403);
  const found = getEstimator((await context.params).slug);
  if (!found) return reply({ error: 'Not found' }, 404);
  return reply(await funnelReviewsHealth(found.contractor));
}
