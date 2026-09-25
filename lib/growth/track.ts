'use client';

/**
 * Growth Tools events: upsell_viewed, upsell_clicked, upsell_requested.
 *
 * HomeQuote has no product-analytics platform (the only tracking is the
 * funnel's Meta Pixel, see lib/funnels/tracking.ts), so this doesn't start
 * one. Like the funnel's `hqn:funnel` event, it emits a browser event,
 * `hqn:upsell`, that an analytics tool can listen to once one exists.
 * Requests themselves are durable in service_requests. No PII is included.
 */
export type UpsellEvent = 'upsell_viewed' | 'upsell_clicked' | 'upsell_requested';

export interface UpsellEventDetail {
  event: UpsellEvent;
  contractor_id: string;
  upsell_type: string;
  timestamp: string;
}

const viewed = new Set<string>();

export function trackUpsell(event: UpsellEvent, contractorId: string, upsellType: string): void {
  if (typeof window === 'undefined') return;
  // One view per upsell per page load.
  if (event === 'upsell_viewed') {
    const key = `${contractorId}:${upsellType}`;
    if (viewed.has(key)) return;
    viewed.add(key);
  }
  const detail: UpsellEventDetail = {
    event,
    contractor_id: contractorId,
    upsell_type: upsellType,
    timestamp: new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent<UpsellEventDetail>('hqn:upsell', { detail }));
}

/** Test helper: forget which upsells were already counted as viewed. */
export function resetUpsellTracking(): void {
  viewed.clear();
}
