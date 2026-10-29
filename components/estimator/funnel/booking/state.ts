import { calendarFrameUrl } from '@/components/estimator/configurator/result/booking-state';
import { formatRange } from '@/lib/estimator/engine';
import { pickedTitles } from '@/lib/estimator/funnel/engine';
import type { FunnelSelection, FunnelSpec } from '@/lib/estimator/funnel/types';
import type { Estimate } from '@/lib/estimator/types';

/*
 * Pure helpers for the funnel's booking screen (no React). Unit-tested in
 * tests/estimator-funnel-lead.test.ts.
 */

/** "Classic · Luxe · Add a spa · Ballpark price" (shown in small caps). */
export function priceEyebrow(spec: Pick<FunnelSpec, 'steps' | 'bookingStep'>, selection: FunnelSelection): string {
  return spec.bookingStep.priceEyebrow.replace('{options}', pickedTitles(spec as FunnelSpec, selection).join(' · '));
}

/** "$65,000 – $106,500", or null when the estimate has no range (then the screen says it is priced on site). */
export function priceRange(estimate: Pick<Estimate, 'low' | 'high'>): string | null {
  return estimate.low !== null && estimate.high !== null && estimate.high > 0 ? formatRange(estimate.low, estimate.high) : null;
}

/** The inline Calendly URL (embed params, name / email kept), or null for a non-Calendly link. */
export const bookingFrameUrl = (calendarUrl: string | undefined, host: string) => calendarFrameUrl(calendarUrl, host);

export type CalendlyMessage = { kind: 'height'; height: number } | { kind: 'scheduled' } | null;

/**
 * A postMessage from the Calendly iframe: its content height (to size the frame
 * with no inner scroll) or "event scheduled". Anything else, or from another
 * origin, is null.
 */
export function readCalendlyMessage(origin: string, data: unknown): CalendlyMessage {
  if (origin !== 'https://calendly.com' || !data || typeof data !== 'object') return null;
  const d = data as { event?: unknown; payload?: { height?: unknown } };
  if (d.event === 'calendly.event_scheduled') return { kind: 'scheduled' };
  if (d.event === 'calendly.page_height') {
    const h = Number.parseInt(String(d.payload?.height ?? ''), 10);
    return Number.isFinite(h) && h > 0 ? { kind: 'height', height: Math.min(Math.max(h, 480), 1600) } : null;
  }
  return null;
}
