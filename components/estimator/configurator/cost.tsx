'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Range } from '@/lib/estimator/configurator/types';
import { moneyRange, type CostBreakdown } from './state';

/* ------------------------------------------------------------------ */
/* Count-up                                                            */
/* ------------------------------------------------------------------ */

const STEP = 100;

/** The range eased from its last value to the new one (~450 ms); instant with reduced motion or on the server. */
export function useTweenedRange(target: Range, duration = 450): Range {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const frame = useRef(0);
  useEffect(() => {
    const start = from.current;
    if (start.low === target.low && start.high === target.high) return;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      from.current = target;
      setShown(target);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = {
        low: Math.round((start.low + (target.low - start.low) * e) / STEP) * STEP,
        high: Math.round((start.high + (target.high - start.high) * e) / STEP) * STEP,
      };
      from.current = p < 1 ? cur : target;
      setShown(p < 1 ? cur : target);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target.low, target.high, duration]); // eslint-disable-line react-hooks/exhaustive-deps -- target is compared by value
  return shown;
}

/* ------------------------------------------------------------------ */
/* Breakdown lines                                                     */
/* ------------------------------------------------------------------ */

const plus = (r: Range) => `+${moneyRange(r)}`;

/**
 * Base design, Go Luxe, each upgrade, site-specific work and the total. Used by
 * the bar's drop-up, the cost summary and the result page.
 */
export function BreakdownLines({ breakdown, siteNote, listUpgrades = true }: { breakdown: CostBreakdown; siteNote: string; listUpgrades?: boolean }) {
  const { luxe, upgrades } = breakdown;
  return (
    <dl className="text-[14px] text-[#111]">
      <Line term={`${breakdown.modelLabel}`} sub="Base design: everything marked Included" value={moneyRange(breakdown.base)} />
      {luxe ? <Line term={`${luxe.label} package`} sub={`Saves about ${moneyRange(luxe.saving)}`} value={plus(luxe.price)} /> : null}
      <Line
        term="Your upgrades"
        sub={upgrades.length ? undefined : 'None yet'}
        value={upgrades.length ? plus(breakdown.upgradesTotal) : '$0'}
      />
      {listUpgrades && upgrades.length ? (
        <ul className="-mt-1 mb-2 space-y-1 border-l border-[#e4e0d8] pl-3 text-[13px] text-[#5f5a52]">
          {upgrades.map((u) => (
            <li key={u.rowId} className="flex justify-between gap-3">
              <span className="min-w-0">{u.label}</span>
              <span className="shrink-0 tabular-nums">{plus(u.range)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <Line term="Site-specific work" sub="Access, soil, permits and anything we can only see in person" value={siteNote} muted />
    </dl>
  );
}

function Line({ term, sub, value, muted }: { term: string; sub?: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="min-w-0">
        <span className="block font-medium">{term}</span>
        {sub ? <span className="block text-[12.5px] leading-[18px] text-[#6d675d]">{sub}</span> : null}
      </dt>
      <dd className={`max-w-[55%] shrink-0 text-right tabular-nums ${muted ? 'text-[13px] text-[#5f5a52]' : ''}`}>{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sticky bar                                                          */
/* ------------------------------------------------------------------ */

export function TotalBar({
  breakdown,
  open,
  onOpen,
  onContinue,
  continueLabel = 'Continue',
  examplePrices,
}: {
  breakdown: CostBreakdown;
  open: boolean;
  onOpen: (open: boolean) => void;
  onContinue: () => void;
  continueLabel?: string;
  examplePrices: boolean;
}) {
  const shown = useTweenedRange(breakdown.total);
  return (
    <div className="sticky bottom-0 z-30 border-t border-[#e4e0d8] bg-white shadow-[0_-12px_32px_-24px_rgba(0,0,0,.35)]">
      <div
        id="cfg-breakdown"
        hidden={!open}
        className="max-h-[min(60vh,520px)] overflow-y-auto border-b border-[#efece6] px-5 pb-3 pt-4 sm:px-6"
      >
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6d675d]">Cost breakdown</p>
        <BreakdownLines breakdown={breakdown} siteNote="At your free on-site visit" />
        <p className="mt-1 text-[12px] leading-[18px] text-[#6d675d]">
          Ballpark, not a quote.{examplePrices ? ' Example prices.' : ''} Lines are rounded; the total is priced from your whole design.
        </p>
      </div>
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
        {/* The figure itself opens the breakdown (a big target on phones); the chevron says so. */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="cfg-breakdown"
          onClick={() => onOpen(!open)}
          className="group/total min-w-0 touch-manipulation rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cfg-accent)]"
        >
          <span className="block whitespace-nowrap text-[clamp(18px,5.2vw,26px)] font-semibold leading-tight tracking-[-0.02em] tabular-nums text-[#111]" aria-hidden="true">
            {moneyRange(shown)}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#6d675d] group-hover/total:text-[#111]">
            <span className="sr-only">{open ? 'Hide' : 'Show'} the cost breakdown. </span>
            Your estimate
            <span aria-hidden="true" className="inline-flex size-5 items-center justify-center rounded-full border border-[#d9d4ca]">
              <ChevronDown className={`size-3 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="ml-auto inline-flex h-12 shrink-0 touch-manipulation items-center justify-center rounded-xl bg-[var(--cfg-accent)] px-5 text-[15px] font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-[var(--cfg-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] active:scale-[.98] motion-reduce:transition-none sm:px-8"
        >
          {continueLabel}
        </button>
      </div>
      {/* The figure above tweens; screen readers get the settled value once. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Your estimate: {moneyRange(breakdown.total)}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cost summary (step 2)                                               */
/* ------------------------------------------------------------------ */

export function CostSummary({
  breakdown,
  examplePrices,
  onContinue,
  onBack,
  contractorName,
}: {
  breakdown: CostBreakdown;
  examplePrices: boolean;
  contractorName: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="px-5 pb-10 pt-6 sm:px-6 lg:pt-8">
      <button
        type="button"
        onClick={onBack}
        className="text-[13px] font-medium text-[#4a463f] underline underline-offset-4 hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)]"
      >
        &larr; Back to edit
      </button>
      <h2 id="cfg-summary-title" tabIndex={-1} className="mt-4 text-[26px] font-semibold tracking-[-0.02em] text-[#111] outline-none">
        Cost summary
      </h2>
      <div className="mt-5 rounded-2xl border border-[#e4e0d8] bg-white px-5 pb-5 pt-3">
        <BreakdownLines breakdown={breakdown} siteNote="Confirmed at your free on-site visit" />
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-2 border-[#111] pt-4">
          <p className="text-[19px] font-semibold text-[#111]">Total estimate*</p>
          <p className="whitespace-nowrap text-right text-[22px] font-semibold tracking-[-0.01em] tabular-nums text-[#111]">{moneyRange(breakdown.total)}</p>
        </div>
        <p className="mt-3 text-pretty text-[12.5px] leading-[19px] text-[#5f5a52]">
          *Ballpark, not a quote. {examplePrices ? `Example prices, not yet confirmed by ${contractorName}. ` : ''}Excludes site-specific work
          and permit fees. Your firm, all-in price is confirmed at your free on-site visit.
        </p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-5 inline-flex h-13 w-full touch-manipulation items-center justify-center rounded-xl bg-[var(--cfg-accent)] py-3.5 text-[16px] font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-[var(--cfg-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cfg-accent)] active:scale-[.99] motion-reduce:transition-none"
      >
        Continue
      </button>
      <p className="mt-3 text-center text-[13px] text-[#6d675d]">Next: book your free consultation. No obligation.</p>
    </div>
  );
}
