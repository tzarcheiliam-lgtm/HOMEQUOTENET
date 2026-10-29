'use client';

import { memo, useMemo } from 'react';
import { Check, Lock, Sparkles } from 'lucide-react';
import type { Answers, EstimatorTemplate, PoolDimensions } from '@/lib/estimator/types';
import { PHOTO_REWARD_LABEL } from '../builder-progress';
import type { TradeBuilder } from '../builders';
import { builderFor } from '../scene/scene-panel';

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

const CSS = `
.eu-shine{animation:eu-shine 3.2s cubic-bezier(.65,0,.35,1) 1s infinite}
@keyframes eu-shine{0%{transform:translateX(-60%);opacity:0}25%{opacity:1}60%,100%{transform:translateX(160%);opacity:0}}
@media (prefers-reduced-motion:reduce){.eu-shine{animation:none;opacity:0}}
`;

const row = 'flex items-center gap-1.5 text-xs font-semibold sm:text-sm';

/**
 * The prize on the unlock screens (ZIP and contact). Only what is actually
 * locked looks locked: their design is shown clearly and marked ready; the
 * ballpark price is a frosted placeholder (bars, never a number); with renders
 * on, the right half of the picture is a "developing" frost marked as the
 * realistic photo that comes about a minute after they unlock. The picture is
 * decorative (the big picture already describes the design); the words carry
 * the meaning for screen readers. The little scene is still (no moving water)
 * and memoized: typing in the contact fields does not redraw it.
 */
export const UnlockPreview = memo(function UnlockPreview({
  template,
  builder: builderProp,
  answers,
  dimensions,
  rendersEnabled,
  promise,
}: {
  template: EstimatorTemplate;
  /** The trade adapter; picked from template.trade when omitted. */
  builder?: TradeBuilder<unknown>;
  answers: Answers;
  dimensions?: PoolDimensions;
  rendersEnabled: boolean;
  /** unlockCopy(rendersEnabled).promise */
  promise: string;
}) {
  const builder = builderProp ?? builderFor(template);
  const { Scene } = builder;
  const scene = useMemo(() => builder.buildSpec(template, { answers, dimensions }), [builder, template, answers, dimensions]);
  return (
    <div data-unlock-preview="" className="mb-6">
      {rendersEnabled ? <style>{CSS}</style> : null}
      <div className="relative flex items-stretch gap-3.5 overflow-hidden rounded-[18px] border border-[var(--es-aqua,#2ec5d3)]/30 bg-[#06122b]/55 p-2.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div aria-hidden="true" className="relative aspect-[3/2] w-[44%] max-w-52 shrink-0 self-center overflow-hidden rounded-[10px] bg-[#d8d2c3] outline-1 -outline-offset-1 outline-white/10">
          <Scene scene={scene} mode={builder.modes[0].id} label="" still className="absolute inset-0 block size-full" />
          {rendersEnabled ? (
            // The photo still to come: the right half "developing" (a frost with one slow shine), not their design hidden.
            <span className="absolute inset-y-0 right-0 w-1/2 overflow-hidden bg-[linear-gradient(90deg,rgba(226,240,255,0.35),rgba(226,240,255,0.72))] shadow-[inset_1px_0_0_rgba(255,255,255,0.9)]">
              <span className="eu-shine absolute inset-y-0 -left-1/2 w-full bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,0.75)_50%,transparent_70%)]" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-8 place-items-center rounded-full bg-[#06122b]/80 text-white ring-1 ring-white/30">
                  <Sparkles className="size-4 text-[#ffd666]" strokeWidth={2.2} />
                </span>
              </span>
            </span>
          ) : null}
        </div>

        <ul className="flex min-w-0 flex-1 flex-col justify-center gap-2.5 py-1 pr-1">
          <li>
            <p className={`${row} text-[var(--hq-text)]`}>
              <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center rounded-full bg-[var(--es-aqua,#2ec5d3)] text-[var(--hq-navy)]">
                <Check className="size-2.5" strokeWidth={3.4} />
              </span>
              Your design<span className="sr-only">, ready</span>
              <span aria-hidden="true" className="font-medium text-[var(--hq-text-muted)]">ready</span>
            </p>
          </li>
          <li>
            <p className={`${row} text-[var(--hq-text-muted)]`}>
              <Lock aria-hidden="true" className="size-3.5 shrink-0 text-[var(--es-aqua,#2ec5d3)]" strokeWidth={2.8} />
              Ballpark price<span className="sr-only">, unlocks when you finish</span>
            </p>
            <span aria-hidden="true" className="mt-1.5 flex items-center gap-1.5">
              <Placeholder width="42%" />
              <span className="h-0.5 w-2.5 shrink-0 rounded-full bg-white/30" />
              <Placeholder width="48%" />
            </span>
          </li>
          {rendersEnabled ? (
            <li>
              <p className={`${row} text-[var(--hq-text-muted)]`}>
                <Lock aria-hidden="true" className="size-3.5 shrink-0 text-[var(--es-aqua,#2ec5d3)]" strokeWidth={2.8} />
                {PHOTO_REWARD_LABEL}
              </p>
              <p className="mt-0.5 pl-5 text-[11px] leading-4 text-[var(--hq-text-dim)] sm:text-xs">Ready about a minute after you unlock</p>
            </li>
          ) : null}
        </ul>
      </div>
      <p className="mt-3 text-sm leading-6 text-pretty text-[var(--hq-text-muted)]">{promise}</p>
    </div>
  );
});
