'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { GoalTier } from '@/lib/calls/goals';

/** Ring color per tier: slate → brand blue → bright blue → gold at the goal. */
export const TIER_STROKE: Record<GoalTier, string> = {
  0: '#5B6B8C',
  1: '#0038B8',
  2: '#2563EB',
  3: '#F5B700',
};

/** Tweens a number toward `value` (~450ms); jumps straight there with reduced motion. */
export function useCountUp(value: number, ms = 450): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    let reduce = false;
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      /* ignore */
    }
    const start = from.current;
    if (reduce || start === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = Math.round(start + (value - start) * eased);
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

/** Progress ring with the count in the middle. Past the goal it stays full and gold. */
export function GoalRing({
  count,
  goal,
  tier,
  size = 64,
  stroke = 7,
  className,
}: {
  count: number;
  goal: number;
  tier: GoalTier;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const shown = useCountUp(count);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, goal > 0 ? shown / goal : 0);
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TIER_STROKE[tier]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className="transition-[stroke] duration-500"
        />
      </svg>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center font-semibold tabular-nums tracking-tight',
          size >= 56 ? 'text-lg' : 'text-xs'
        )}
      >
        {shown}
      </span>
    </div>
  );
}
