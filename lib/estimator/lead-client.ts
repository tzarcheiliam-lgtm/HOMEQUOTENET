import type { Answers, Estimate, PoolDimensions } from './types.ts';

/**
 * Browser side of estimator lead capture: the request/response contract
 * between the estimator screen and POST /api/estimator/[slug]/lead.
 * The server recomputes the estimate; the client never sends prices.
 */

/** Same choices as the Pool Masters funnel timeline question. */
export const LEAD_TIMELINES = [
  { id: 'asap', label: 'As soon as possible' },
  { id: '1_3_months', label: 'Within 1–3 months' },
  { id: '3_6_months', label: 'Within 3–6 months' },
  { id: 'researching', label: 'Just researching' },
] as const;
export type LeadTimeline = (typeof LEAD_TIMELINES)[number]['id'];

export type EstimatorLeadRequest = {
  answers: Answers;
  dimensions?: PoolDimensions;
  /** Gallery image srcs the homeowner liked. */
  likedLooks?: string[];
  /** "Anything else we should know?" */
  note?: string;
  zip: string;
  homeowner: 'yes' | 'no';
  timeline: LeadTimeline;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    consent: boolean;
    /** Honeypot: must be empty. */
    website: string;
  };
  /** Browser Meta ids for event deduplication (optional). */
  tracking?: { fbc?: string; fbp?: string; eventId?: string; pageUrl?: string };
};

export type EstimatorLeadResponse =
  | {
      ok: true;
      /** Server-computed; the screen shows this one. */
      estimate: Estimate;
      /** false for renters / out-of-area ZIPs (lead still saved for review). */
      qualified: boolean;
      calendarUrl?: string;
    }
  | { ok: false; errors: Record<string, string> };

export async function submitEstimatorLead(
  slug: string,
  request: EstimatorLeadRequest,
): Promise<EstimatorLeadResponse> {
  try {
    const res = await fetch(`/api/estimator/${encodeURIComponent(slug)}/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data = (await res.json().catch(() => null)) as EstimatorLeadResponse | null;
    if (data && typeof data === 'object' && 'ok' in data) return data;
    return { ok: false, errors: { form: 'Something went wrong. Please try again.' } };
  } catch {
    return { ok: false, errors: { form: 'Could not reach the server. Check your connection and try again.' } };
  }
}
