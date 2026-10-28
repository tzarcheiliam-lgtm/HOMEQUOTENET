'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RewardStep = {
  id: string;
  label: string;
  /** Earned: shows a tick (which pops in when it changes to done). */
  done: boolean;
  /** Not reachable yet: shows a lock. Ignored when done. */
  locked?: boolean;
};

/** done > locked > in progress. */
export function rewardState(step: RewardStep): 'done' | 'locked' | 'active' {
  return step.done ? 'done' : step.locked ? 'locked' : 'active';
}

/** What a screen reader hears for one step, e.g. "Price, locked". */
export function rewardText(step: RewardStep): string {
  const state = rewardState(step);
  return `${step.label}, ${state === 'done' ? 'done' : state === 'locked' ? 'locked' : 'in progress'}`;
}

/**
 * Labels of steps that are done now but were not before (for the "unlocked"
 * announcement), leaving out `quiet` ids that something else announces.
 */
export function newlyDone(previous: readonly RewardStep[], next: readonly RewardStep[], quiet: readonly string[] = []): string[] {
  const before = new Set(previous.filter((s) => s.done).map((s) => s.id));
  return next.filter((s) => s.done && !before.has(s.id) && !quiet.includes(s.id)).map((s) => s.label);
}

const CSS = `
.es-tick{animation:es-tick .46s cubic-bezier(.34,1.7,.64,1) both}
@keyframes es-tick{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.es-tick{animation:none}}
`;

/**
 * "Design (tick) > Price (lock) > Realistic photo (lock)": the rewards the
 * visitor is working toward and which are earned. Purely presentational: the
 * parent decides done/locked. When a step turns done its tick pops in and a
 * polite live region says "<label> unlocked" (not on first render).
 */
export function RewardTracker({
  steps,
  className,
  label = 'What you get',
  quiet,
}: {
  steps: readonly RewardStep[];
  className?: string;
  label?: string;
  /** Step ids whose unlocking is announced elsewhere (one announcement per event). */
  quiet?: readonly string[];
}) {
  const previous = useRef<readonly RewardStep[] | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (previous.current) {
      const earned = newlyDone(previous.current, steps, quiet);
      if (earned.length) setAnnouncement(`${earned.join(' and ')} unlocked`);
    }
    previous.current = steps;
  }, [steps, quiet]);

  return (
    <div className={cn('min-w-0', className)}>
      <style>{CSS}</style>
      <ol aria-label={label} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] leading-5">
        {steps.map((step, i) => {
          const state = rewardState(step);
          return (
            <li key={step.id} data-state={state} className="inline-flex items-center gap-1.5">
              {i > 0 ? <ChevronRight aria-hidden="true" className="size-3.5 text-[var(--hq-text-dim)]" strokeWidth={2.5} /> : null}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5',
                  state === 'done' && 'bg-[var(--es-aqua,#2ec5d3)]/12 text-[var(--hq-text)]',
                  state === 'active' && 'text-[var(--hq-text)]',
                  state === 'locked' && 'text-[var(--hq-text-dim)]',
                )}
              >
                <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center">
                  {state === 'done' ? (
                    // Keyed on the state so a step that becomes done remounts and pops.
                    <span key="done" className="es-tick grid size-5 place-items-center rounded-full bg-[var(--es-aqua,#2ec5d3)] text-[var(--hq-navy)]">
                      <Check className="size-3" strokeWidth={3.2} />
                    </span>
                  ) : state === 'locked' ? (
                    <span key="locked" className="grid size-5 place-items-center rounded-full border border-[var(--hq-line-strong)]">
                      <Lock className="size-2.5" strokeWidth={2.8} />
                    </span>
                  ) : (
                    <span key="active" className="size-3.5 rounded-full border-2 border-[var(--es-aqua,#2ec5d3)]" />
                  )}
                </span>
                <span aria-hidden="true" className="whitespace-nowrap font-medium">
                  {step.label}
                </span>
                <span className="sr-only">{rewardText(step)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
