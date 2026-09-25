import type { RequestStatus, ServiceSlug } from '@/lib/growth/catalog';

export interface RecommendationSignals {
  /** The company's saved website (contractors.website). */
  website: string | null;
  /** The company's existing requests, any status. */
  requests: { service: ServiceSlug; status: RequestStatus }[];
}

export interface Recommendation {
  service: ServiceSlug;
  reason: string;
}

/**
 * At most one contextual suggestion, and only when a fact about the company
 * makes it relevant. Returns null otherwise so the portal stays quiet.
 * Never re-suggests a service the company has already asked about, whatever
 * happened to that request.
 */
export function recommendService(signals: RecommendationSignals): Recommendation | null {
  const asked = new Set(signals.requests.map((r) => r.service));
  const hasWebsite = Boolean(signals.website?.trim());
  if (!hasWebsite && !asked.has('website')) {
    return { service: 'website', reason: 'There’s no website saved for your company yet.' };
  }
  return null;
}
