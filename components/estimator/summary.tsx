'use client';

import { useMemo } from 'react';
import { computeEstimate, formatRange } from '@/lib/estimator/engine';
import type { Answers, EstimatorTemplate, PoolDimensions } from '@/lib/estimator/types';
import { cn } from '@/lib/utils';
import { describeQuantity, visibleAnswers } from './use-estimator-flow';

/**
 * Live running range for revealRange "immediately". One element: a fixed bar at
 * the bottom of the phone, a sticky aside on desktop, and a plain inline block
 * when embedded (no sticky page bars inside an iframe).
 */
export function LiveSummary({
  template,
  answers,
  dimensions,
  embedded,
}: {
  template: EstimatorTemplate;
  answers: Answers;
  dimensions?: PoolDimensions;
  embedded?: boolean;
}) {
  const estimate = useMemo(
    () => computeEstimate(template, { answers: visibleAnswers(template, answers), dimensions }),
    [template, answers, dimensions],
  );
  const hasRange = estimate.low !== null && estimate.high !== null;
  return (
    <aside
      aria-label="Your estimate so far"
      className={cn(
        'border-[var(--hq-line-strong)] bg-[var(--hq-bg-raised)] p-4',
        embedded
          ? 'mt-6 rounded-xl border'
          : 'fixed inset-x-0 bottom-0 z-20 border-t shadow-[0_-8px_24px_rgba(0,0,0,0.35)] lg:static lg:top-6 lg:mt-0 lg:self-start lg:rounded-2xl lg:border lg:shadow-none lg:sticky',
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-accent-bright)]">Your ballpark so far</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--hq-text)] lg:text-3xl" aria-live="polite" aria-atomic="true">
        {hasRange ? formatRange(estimate.low!, estimate.high!) : 'Pick options to see a range'}
      </p>
      <p className="mt-0.5 text-xs text-[var(--hq-text-muted)]">
        Ballpark, not a quote{hasRange && estimate.status === 'incomplete' ? '. It may change as you answer.' : ''}
      </p>
      {estimate.lines.length ? (
        <dl className="mt-3 hidden divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)] text-xs lg:block">
          {estimate.lines.map((line) => {
            const qty = describeQuantity(line.unit, line.quantity);
            return (
              <div key={`${line.questionId}.${line.optionId}`} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-[var(--hq-text-muted)]">
                  {line.label}
                  {qty ? ` · ${qty}` : ''}
                </dt>
                <dd className="shrink-0 font-medium text-[var(--hq-text)]">{formatRange(line.low, line.high)}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}
    </aside>
  );
}
