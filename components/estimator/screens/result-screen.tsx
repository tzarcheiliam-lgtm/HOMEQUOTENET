'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { formatRange } from '@/lib/estimator/engine';
import type { EstimatorLeadResponse } from '@/lib/estimator/lead-client';
import type { ContractorEstimatorConfig, EstimatorTemplate } from '@/lib/estimator/types';
import { cn } from '@/lib/utils';
import { card, eyebrow, primaryButton } from '../ui';
import { describeQuantity, safeHttpUrl } from '../use-estimator-flow';
import { RevealStyles } from './reveal-styles';

export type LeadSuccess = Extract<EstimatorLeadResponse, { ok: true }>;

/** The live builder's count-up: a short beat (the page scrolls to the result), then the roll. */
const COUNT_DELAY_MS = 250;
const COUNT_MS = 1400;
/** Where the roll starts, as a share of the final figures (close enough that the digit count rarely changes). */
const COUNT_FROM = 0.45;

// Server markup has no layout effects; the browser runs the count-up before first paint.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Ease-out-quint: fast at first, then a long settle, so the last digits land gently. */
function easeOutQuint(p: number): number {
  return 1 - (1 - p) ** 5;
}

/** The range part-way through the roll, in $500 steps so the digits roll rather than flicker. */
export function countUpRange(low: number, high: number, t: number): [number, number] {
  if (t >= 1) return [low, high];
  const k = COUNT_FROM + (1 - COUNT_FROM) * easeOutQuint(Math.max(0, t));
  const at = (v: number) => Math.round((v * k) / 500) * 500;
  return [at(low), at(high)];
}

/**
 * The builder's reveal: rolls the range up to its value once by writing the
 * text straight into `ref` (no React render per frame), then reports `landed`
 * so the figure can settle with a small pop. The server markup and reduced
 * motion show the real value at once.
 */
function useCountUp(ref: RefObject<HTMLSpanElement | null>, low: number, high: number, enabled: boolean): boolean {
  const [landed, setLanded] = useState(false);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const show = (t: number) => {
      const [a, b] = countUpRange(low, high, t);
      el.textContent = formatRange(a, b);
    };
    show(0);
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now + COUNT_DELAY_MS;
      const p = Math.min(1, Math.max(0, (now - start) / COUNT_MS));
      show(p);
      if (p < 1) frame = requestAnimationFrame(tick);
      else setLanded(true);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      show(1);
    };
  }, [ref, enabled, low, high]);
  return landed;
}

/**
 * The result: the SERVER's estimate (never recomputed here), laid out as a
 * ballpark range with a line-by-line breakdown, what needs a site visit, what
 * is not included, the disclaimer and license and financing words (no payment
 * amounts) and the booking button. With the live builder (`builder`) the range
 * counts up as it is revealed and the booking button sits right under it
 * (after "Ballpark, not a quote"), before the breakdown, followed by the
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
  const rollRef = useRef<HTMLSpanElement>(null);
  const landed = useCountUp(rollRef, estimate.low ?? 0, estimate.high ?? 0, Boolean(builder && hasRange));
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
      {builder ? <RevealStyles /> : null}
      <section className={card} aria-labelledby={rangeId}>
        <p className={eyebrow}>
          {builder ? 'Your ballpark price' : firstName ? `${firstName}, your ballpark range` : 'Your ballpark range'}
        </p>
        {hasRange ? (
          <p
            id={rangeId}
            className={cn(
              'mt-3 grid origin-left text-4xl font-semibold tracking-tight text-[var(--hq-text)] tabular-nums sm:text-5xl',
              landed && 'er-land',
            )}
          >
            {/* Screen readers get the final figure once; the rolling digits are decoration. */}
            <span className="sr-only">{formatRange(estimate.low!, estimate.high!)}</span>
            {/* The final figure reserves the space (invisible), so the roll never moves anything around it. */}
            <span aria-hidden="true" className="invisible col-start-1 row-start-1">
              {formatRange(estimate.low!, estimate.high!)}
            </span>
            <span ref={rollRef} aria-hidden="true" className="col-start-1 row-start-1">
              {formatRange(estimate.low!, estimate.high!)}
            </span>
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

        {/* Live builder: booking is the next thing they see, right under the price. */}
        {builder ? <div className="mt-5">{booking}</div> : null}

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
