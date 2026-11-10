import { calendarFrameUrl } from '@/components/estimator/configurator/result/booking-state';
import { formatRange } from '@/lib/estimator/engine';
import { pickedOptions } from '@/lib/estimator/funnel/engine';
import type { FunnelSelection, FunnelSpec } from '@/lib/estimator/funnel/types';
import type { Estimate } from '@/lib/estimator/types';

/*
 * Pure helpers for the funnel's booking screen (no React). Unit-tested in
 * tests/estimator-funnel-lead.test.ts.
 */

/** "Classic · Luxe · Zero-edge spa" (shown in small caps): each pick's short title, or its title; an empty short is left out. */
export function priceEyebrow(spec: Pick<FunnelSpec, 'steps' | 'bookingStep'>, selection: FunnelSelection): string {
  const picks = pickedOptions(spec as FunnelSpec, selection)
    .map((o) => o.short ?? o.title)
    .filter(Boolean);
  return spec.bookingStep.priceEyebrow.replace('{options}', picks.join(' · '));
}

/** "$65,000 – $106,500", or null when the estimate has no range (then the screen says it is priced on site). */
export function priceRange(estimate: Pick<Estimate, 'low' | 'high'>): string | null {
  return estimate.low !== null && estimate.high !== null && estimate.high > 0 ? formatRange(estimate.low, estimate.high) : null;
}

/**
 * The booking title without the native calendar's placeholders, for the
 * external-calendar fallback (no calendar facts to fill in):
 * "Pick a time for a quick {minutes}-minute call with {host}." -> "Pick a time for a free call."
 */
export function plainBookingTitle(title: string): string {
  return title
    .replace(/\s+with \{host\}/g, '')
    .replace(/\{host\} will call/g, 'We will call')
    .replace(/\b([Aa] )?quick \{minutes\}-minute /g, '$1free ')
    .replace(/\{minutes\}-minute /g, '')
    .replace(/\{host\}/g, 'us');
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
