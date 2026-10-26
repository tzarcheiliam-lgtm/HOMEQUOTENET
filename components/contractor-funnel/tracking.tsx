'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * Tracking for the contractor funnel. Mirrors the homeowner funnel's rules:
 *  - Meta Pixel only loads for a visitor who ticked "Allow optional advertising
 *    measurement" (opt-in; nothing fires before that).
 *  - Events carry a name and a stable event id only. No answers, no contact
 *    details, and nothing contact-related ever goes in a URL.
 *  - Every event is also dispatched as a `hqn:contractor` DOM event for any
 *    other analytics layer.
 */

type Pixel = ((...args: unknown[]) => void) & { queue?: unknown[][]; callMethod?: (...args: unknown[]) => void; push?: Pixel; loaded?: boolean; version?: string };
declare global { interface Window { fbq?: Pixel; _fbq?: Pixel; hqnPixels?: Set<string> } }

export type ContractorEvent = 'CtaClick' | 'QualificationComplete' | 'Lead' | 'Schedule';
const STANDARD = new Set<ContractorEvent>(['Lead', 'Schedule']);
const KEY = 'hqn-contractor-measurement';
const emitted = new Set<string>();

export function readMeasurementChoice(): boolean {
  try { return localStorage.getItem(KEY) === 'yes'; } catch { return false; }
}
function writeMeasurementChoice(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'yes' : 'no'); } catch { /* Optional storage. */ }
}

export function trackContractor(event: ContractorEvent, eventId: string, pixelId: string | null) {
  if (emitted.has(eventId)) return;
  emitted.add(eventId);
  if (pixelId && readMeasurementChoice()) {
    if (!window.fbq) {
      const pixel: Pixel = (...args: unknown[]) => (pixel.callMethod ? pixel.callMethod(...args) : pixel.queue!.push(args));
      pixel.queue = []; pixel.push = pixel; pixel.loaded = true; pixel.version = '2.0';
      window.fbq = pixel; window._fbq = pixel;
      const script = document.createElement('script');
      script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
    window.hqnPixels ??= new Set();
    if (!window.hqnPixels.has(pixelId)) { window.fbq('init', pixelId); window.hqnPixels.add(pixelId); window.fbq('trackSingle', pixelId, 'PageView'); }
    window.fbq(STANDARD.has(event) ? 'trackSingle' : 'trackSingleCustom', pixelId, event, { content_name: 'contractor_funnel' }, { eventID: eventId });
  }
  window.dispatchEvent(new CustomEvent('hqn:contractor', { detail: { event, eventId } }));
}

/** "Allow optional advertising measurement", only rendered when a pixel is configured. */
export function MeasurementToggle({ pixelId, onChange }: { pixelId: string | null; onChange?: (on: boolean) => void }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(readMeasurementChoice()); }, []);
  if (!pixelId) return null;
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-[var(--hq-text-muted)]">
      <input
        type="checkbox"
        className="size-4 accent-[var(--hq-accent)]"
        checked={on}
        onChange={(e) => { setOn(e.target.checked); writeMeasurementChoice(e.target.checked); onChange?.(e.target.checked); }}
      />
      Allow optional advertising measurement
    </label>
  );
}

/** Landing-page CTA that records a CtaClick (when permitted) then navigates. */
export function TrackedCta({
  href, pixelId, location, className, children,
}: { href: string; pixelId: string | null; location: string; className: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackContractor('CtaClick', `cta:${location}:${Date.now()}`, pixelId)}
    >
      {children}
    </Link>
  );
}
