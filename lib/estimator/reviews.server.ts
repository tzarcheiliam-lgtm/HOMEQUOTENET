import 'server-only';
import { unstable_cache } from 'next/cache';
import { funnelSpecFor } from './funnel/engine.ts';
import type { FunnelReviewsConfig } from './funnel/types.ts';
import { placesKey } from './address.ts';
import { ReviewsError, loadGoogleReviews, reviewsHeading, selectReviews, type FunnelReviewsData, type GoogleReview, type ReviewsResult } from './reviews.ts';
import type { ContractorEstimatorConfig } from './types.ts';

/**
 * Cached entry point for the funnel landing's Google reviews. One Google
 * Place Details call (plus one Text Search when no place id is configured)
 * per contractor per day: unstable_cache, revalidate 24 h, and the landing
 * page itself revalidates daily. A failure throws inside the cache (so it is
 * not stored) and the page renders without reviews.
 *
 * Local visual QA: with NODE_ENV=development and ESTIMATOR_REVIEWS_FIXTURE=1
 * the sample reviews below render instead (never in production or tests).
 */

export const REVIEWS_REVALIDATE_S = 86_400;

const cached = (slug: string, config: FunnelReviewsConfig) =>
  unstable_cache(
    async (): Promise<ReviewsResult> => {
      const key = placesKey();
      if (!key) throw new ReviewsError('details', null);
      return loadGoogleReviews(config, key);
    },
    ['estimator-google-reviews', slug, JSON.stringify(config)],
    { revalidate: REVIEWS_REVALIDATE_S, tags: [`estimator-reviews:${slug}`] },
  )();

const reviewsConfig = (contractor: ContractorEstimatorConfig) => {
  const config = funnelSpecFor(contractor)?.landing.reviews;
  return config?.enabled ? config : null;
};

const fixtureOn = () => process.env.NODE_ENV === 'development' && process.env.ESTIMATOR_REVIEWS_FIXTURE === '1';

/** What the landing shows, or null (nothing renders): off, no key, no 5-star review, or Google failed. */
export async function funnelReviewsFor(contractor: ContractorEstimatorConfig): Promise<FunnelReviewsData | null> {
  const config = reviewsConfig(contractor);
  if (!config) return null;
  const heading = reviewsHeading(config, contractor.contractorName);
  if (fixtureOn()) {
    const placeUri = 'https://maps.google.com/?cid=0';
    return { heading, placeUri, reviews: selectReviews(SAMPLE_REVIEWS, placeUri, config.max).reviews };
  }
  if (!placesKey()) return null;
  try {
    const result = await cached(contractor.slug, config);
    return result.reviews.length ? { heading, placeUri: result.placeUri, reviews: result.reviews } : null;
  } catch {
    return null;
  }
}

export type ReviewsHealth = {
  enabled: boolean;
  configured: boolean;
  placeIdKnown: boolean;
  placeIdSource: ReviewsResult['placeIdSource'];
  /** Public Google place id (pin it as googlePlaceId once the lookup found it). */
  placeId: string | null;
  count5Star: number;
  shown: number;
  error: string | null;
};

/** Staff diagnostic (no review text, no key): is the key set, is the place known, how many 5-star reviews qualify. */
export async function funnelReviewsHealth(contractor: ContractorEstimatorConfig): Promise<ReviewsHealth> {
  const config = reviewsConfig(contractor);
  const base: ReviewsHealth = {
    enabled: !!config,
    configured: !!config && !!placesKey(),
    placeIdKnown: !!config?.googlePlaceId,
    placeIdSource: config?.googlePlaceId ? 'config' : null,
    placeId: config?.googlePlaceId ?? null,
    count5Star: 0,
    shown: 0,
    error: null,
  };
  if (!config || !base.configured) return base;
  try {
    const r = await cached(contractor.slug, config);
    return { ...base, placeIdKnown: !!r.placeId, placeIdSource: r.placeIdSource, placeId: r.placeId, count5Star: r.fiveStarCount, shown: r.reviews.length };
  } catch (e) {
    const err = e instanceof ReviewsError ? `${e.stage}_failed${e.status ? `_${e.status}` : ''}` : 'failed';
    return { ...base, error: err };
  }
}

/** Dev-only sample data for screenshots (made up; never shipped to a real page). */
const SAMPLE_REVIEWS: GoogleReview[] = [
  {
    name: 'sample/1',
    rating: 5,
    relativePublishTimeDescription: '2 months ago',
    publishTime: '2026-08-20T18:00:00Z',
    text: { text: 'Pool Masters resurfaced our pool and redid the coping and waterline tile. The crew showed up on time every day, kept the yard clean and walked us through every choice. It looks brand new and the price matched the estimate.' },
    authorAttribution: { displayName: 'Sarah Kimball', uri: 'https://www.google.com/maps/contrib/0' },
  },
  {
    name: 'sample/2',
    rating: 4,
    relativePublishTimeDescription: '3 weeks ago',
    publishTime: '2026-10-05T18:00:00Z',
    text: { text: 'Good work, a little slower than planned.' },
    authorAttribution: { displayName: 'Four Star' },
  },
  {
    name: 'sample/3',
    rating: 5,
    relativePublishTimeDescription: 'a month ago',
    publishTime: '2026-09-25T18:00:00Z',
    text: { text: 'From the first visit to the final walkthrough, they were honest and easy to work with. Our new pebble finish and spa are beautiful.' },
    authorAttribution: { displayName: 'Daniel Ortega' },
  },
  {
    name: 'sample/4',
    rating: 5,
    relativePublishTimeDescription: '5 months ago',
    publishTime: '2026-05-20T18:00:00Z',
    text: { text: 'Great communication and fair pricing. They replaced our old pump and filter and rebuilt the deck around the pool. Highly recommend.' },
    authorAttribution: { displayName: 'Michelle Tran' },
  },
];
