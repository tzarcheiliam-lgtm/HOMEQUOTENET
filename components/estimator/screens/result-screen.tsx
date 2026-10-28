'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { formatRange } from '@/lib/estimator/engine';
import type { EstimatorLeadResponse } from '@/lib/estimator/lead-client';
import type { ContractorEstimatorConfig, EstimatorTemplate } from '@/lib/estimator/types';
import { card, eyebrow, primaryButton } from '../ui';
import { describeQuantity, safeHttpUrl } from '../use-estimator-flow';

export type LeadSuccess = Extract<EstimatorLeadResponse, { ok: true }>;

/** How long the live builder's range takes to count up to its value. */
const COUNT_MS = 1100;

/**
 * Counts from 60% of the value up to it (ease-out) once, for the builder's
 * reveal; the real value at once under reduced motion or when off. Rounded to
 * $500 steps on the way so the digits roll rather than flicker.
 */
function useCountUp(low: number, high: number, enabled: boolean): [number, number] {
  const [t, setT] = useState(enabled ? 0 : 1);
  useEffect(() => {
    if (!enabled || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setT(1);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_MS);
      setT(1 - (1 - p) ** 3);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);
  if (t >= 1) return [low, high];
  const at = (v: number) => Math.round((v * (0.6 + 0.4 * t)) / 500) * 500;
  return [at(low), at(high)];
}

/**
 * The result: the SERVER's estimate (never recomputed here), laid out as a
 * ballpark range with a line-by-line breakdown, what needs a site visit, what
 * is not included, the disclaimer and license and financing words (no payment
 * amounts) and the booking button. With the live builder (`builder`) the range
 * counts up as it is revealed and the booking button comes right after the
 * range card (whose last line reads "Ballpark, not a quote"), followed by the
 * homeowner's design; every other trade keeps the button last.
 */
export function ResultScreen({
  template,
  contractor,
  result,
  firstName,
  embedded,
  design,
  builder,
}: {
  template: EstimatorTemplate;
  contractor: ContractorEstimatorConfig;
  result: LeadSuccess;
  firstName?: string;
  embedded?: boolean;
  /** The "Your design" list (live builder), shown right after the booking button. */
  design?: ReactNode;
  /** Live builder: count-up reveal, booking button right under the range. */
  builder?: boolean;
}) {
  const rangeId = useId();
  const { estimate, qualified } = result;
  const hasRange = estimate.low !== null && estimate.high !== null;
  const bookingUrl = safeHttpUrl(result.calendarUrl ?? contractor.calendarUrl);
  const [low, high] = useCountUp(estimate.low ?? 0, estimate.high ?? 0, Boolean(builder && hasRange));
  const booking = qualified ? (
    bookingUrl ? (
      <a
        href={bookingUrl}
        target={embedded ? '_top' : undefined}
        rel="noopener"
        className={`${primaryButton} w-full sm:w-auto`}
      >
        Book your free on-site consultation
      </a>
    ) : (
      <p role="status" className="text-sm text-[var(--hq-text)]">
        {contractor.contractorName} will contact you to set up your free on-site consultation.
      </p>
    )
  ) : (
    <p role="status" className="rounded-xl border border-[var(--hq-line-strong)] p-4 text-sm leading-6 text-[var(--hq-text)]">
      Thank you. Our team will review your details and reach out to you directly.
    </p>
  );
  return (
    <div className="space-y-5">
      <section className={card} aria-labelledby={rangeId}>
        <p className={eyebrow}>{firstName ? `${firstName}, your ballpark range` : 'Your ballpark range'}</p>
        {hasRange ? (
          <p id={rangeId} className="mt-3 text-4xl font-semibold tracking-tight text-[var(--hq-text)] tabular-nums sm:text-5xl">
            {/* Screen readers get the final figure once; the rolling digits are decoration. */}
            <span className="sr-only">{formatRange(estimate.low!, estimate.high!)}</span>
            <span aria-hidden="true">{formatRange(low, high)}</span>
          </p>
        ) : (
          <p id={rangeId} className="mt-3 text-2xl font-semibold text-[var(--hq-text)]">
            We will price this with you on site
          </p>
        )}
        <p className="mt-2 text-sm font-semibold text-[var(--hq-text)]">Ballpark, not a quote</p>
        {!template.pricesConfirmed ? (
          <p className="mt-1 text-sm text-[var(--hq-text-muted)]">Example prices: these figures are placeholders until pricing is confirmed.</p>
        ) : null}

        {estimate.lines.length ? (
          <dl className="mt-5 divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)] text-sm">
            {estimate.lines.map((line) => {
              const qty = describeQuantity(line.unit, line.quantity);
              return (
                <div key={`${line.questionId}.${line.optionId}`} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-[var(--hq-text)]">
                    {line.label}
                    {qty ? <span className="block text-xs text-[var(--hq-text-muted)]">{qty}</span> : null}
                  </dt>
                  <dd className="shrink-0 font-medium text-[var(--hq-text)]">{formatRange(line.low, line.high)}</dd>
                </div>
              );
            })}
          </dl>
        ) : null}
      </section>

      {builder ? booking : null}

      {design}

      {estimate.siteVisitItems.length ? (
        <section className="rounded-xl border border-[var(--hq-warn)]/60 bg-[var(--hq-warn)]/10 p-4 text-sm leading-6">
          <h3 className="font-semibold text-[var(--hq-text)]">We will confirm these on site</h3>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[var(--hq-text)]">
            {estimate.siteVisitItems.map((item) => (
              <li key={item.label}>{item.label}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {template.notIncluded.length ? (
        <section className="text-sm leading-6 text-[var(--hq-text-muted)]">
          <h3 className="font-semibold text-[var(--hq-text)]">Not included</h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {template.notIncluded.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="space-y-2 text-xs leading-5 text-[var(--hq-text-dim)]">
        <p>{template.disclaimer}</p>
        {contractor.financingNote ? <p>{contractor.financingNote}</p> : null}
        {contractor.financingDisclosure ? <p>{contractor.financingDisclosure}</p> : null}
        <p>
          {contractor.contractorName} · {contractor.licenseLabel}
        </p>
      </div>

      {builder ? null : booking}
    </div>
  );
}
