'use client';

import { memo, useMemo } from 'react';
import { Lock } from 'lucide-react';
import { buildScene } from '@/lib/estimator/scene/scene';
import type { Answers, EstimatorTemplate, PoolDimensions } from '@/lib/estimator/types';
import { PHOTO_REWARD_LABEL } from '../builder-progress';
import { PoolScene } from '../scene/pool-scene';

/**
 * A frosted bar standing in for hidden figures. Deliberately no digits and no
 * "$": the price is not on this device until the contact step is sent.
 */
function Placeholder({ width }: { width: string }) {
  return (
    <span
      className="block h-5 rounded-md bg-[linear-gradient(90deg,rgba(255,255,255,.34),rgba(255,255,255,.16))] blur-[1.5px] sm:h-6"
      style={{ width }}
    />
  );
}

/**
 * The prize on the unlock screens (ZIP and contact): the homeowner's own
 * design, frosted behind a lock, beside a locked ballpark price (placeholder
 * bars, never a number) and, when renders are on, the locked realistic photo,
 * with one honest line about what they get. The picture is decorative (the
 * big picture beside or above already describes the design); the words carry
 * the meaning for screen readers. Memoized: typing in the contact fields does
 * not redraw the little picture.
 */
export const UnlockPreview = memo(function UnlockPreview({
  template,
  answers,
  dimensions,
  rendersEnabled,
  promise,
}: {
  template: EstimatorTemplate;
  answers: Answers;
  dimensions?: PoolDimensions;
  rendersEnabled: boolean;
  /** unlockCopy(rendersEnabled).promise */
  promise: string;
}) {
  const scene = useMemo(() => buildScene(template, { answers, dimensions }), [template, answers, dimensions]);
  return (
    <div data-unlock-preview="" className="mb-6">
      <div className="relative flex items-stretch gap-3.5 overflow-hidden rounded-[18px] border border-[var(--es-aqua,#2ec5d3)]/30 bg-[#06122b]/55 p-2.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div aria-hidden="true" className="relative aspect-[3/2] w-[44%] max-w-52 shrink-0 overflow-hidden rounded-lg bg-[#d8d2c3] outline-1 -outline-offset-1 outline-white/10">
          {/* Frosted: blurred and slightly enlarged so the blur never shows a soft edge. */}
          <div className="absolute -inset-[8%] [filter:blur(5px)_saturate(1.15)]">
            <PoolScene scene={scene} label="" className="block size-full" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,18,43,0.05),rgba(6,18,43,0.45))]" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-10 place-items-center rounded-full bg-[#06122b]/75 text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)] ring-1 ring-white/25">
              <Lock className="size-4" strokeWidth={2.4} />
            </span>
          </span>
        </div>

        <ul className="flex min-w-0 flex-1 flex-col justify-center gap-3 py-1 pr-1">
          <li>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--hq-text-muted)] sm:text-sm">
              <Lock aria-hidden="true" className="size-3 shrink-0 text-[var(--es-aqua,#2ec5d3)]" strokeWidth={2.8} />
              Ballpark price<span className="sr-only">, locked</span>
            </p>
            <span aria-hidden="true" className="mt-1.5 flex items-center gap-1.5">
              <Placeholder width="42%" />
              <span className="h-0.5 w-2.5 shrink-0 rounded-full bg-white/30" />
              <Placeholder width="48%" />
            </span>
          </li>
          {rendersEnabled ? (
            <li>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--hq-text-muted)] sm:text-sm">
                <Lock aria-hidden="true" className="size-3 shrink-0 text-[var(--es-aqua,#2ec5d3)]" strokeWidth={2.8} />
                {PHOTO_REWARD_LABEL}
                <span className="sr-only">, locked</span>
              </p>
            </li>
          ) : null}
        </ul>
      </div>
      <p className="mt-3 text-sm leading-6 text-pretty text-[var(--hq-text-muted)]">{promise}</p>
    </div>
  );
});
