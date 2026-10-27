'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, PhoneForwarded, Square, Timer, Volume2, VolumeX, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { COMBO_THRESHOLD, paceFor, paceMessage } from '@/lib/calls/goals';
import { useGoal } from './goal-provider';
import { GoalRing } from './goal-ring';

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** Re-renders every `ms` so pace and the power-hour clock stay current. */
function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/**
 * The daily goal, always in view while calling: ring with the count, pace to
 * 5 PM, streak / combo / bookings chips, and the power-hour controls.
 * `variant="leads"` is the setter's homeowner-lead version: same goal (both
 * logs count), with "Next lead" in place of power hour.
 */
export function GoalHud({ variant = 'calls' }: { variant?: 'calls' | 'leads' }) {
  const g = useGoal();
  const router = useRouter();
  const now = useNow(g?.power ? 1000 : 30_000);
  if (!g) return null;

  const pace = paceFor(g.count, g.goal, new Date(now));
  const line = paceMessage(pace, g.count, g.goal);
  const sessionCalls = g.power ? Math.max(0, g.count - g.power.startCount) : 0;

  const chips = (
    <>
      {g.streak > 0 ? (
        <Chip tone="fire" title="Workdays in a row you hit your goal">
          🔥 {g.streak}-day streak
        </Chip>
      ) : null}
      {g.combo >= COMBO_THRESHOLD ? (
        <Chip tone="fire" title="Decision-maker conversations in a row">
          <Zap className="size-3" aria-hidden="true" /> On fire ×{g.combo}
        </Chip>
      ) : null}
      {g.bookedToday > 0 ? (
        <Chip tone="money" title="Sales appointments booked today">
          💰 {g.bookedToday} booked
        </Chip>
      ) : null}
    </>
  );

  return (
    <section
      aria-label="Daily call goal"
      className={cn(
        'rounded-2xl border bg-card px-3 py-2.5 shadow-sm lg:sticky lg:top-3 lg:z-20 lg:px-4 lg:py-3',
        g.tier === 3 && 'border-amber-300 bg-gradient-to-r from-amber-50/80 via-card to-card'
      )}
    >
      <div className="flex items-center gap-3 lg:gap-4">
        <GoalRing count={g.count} goal={g.goal} tier={g.tier} size={48} stroke={6} className="lg:hidden" />
        <GoalRing count={g.count} goal={g.goal} tier={g.tier} className="max-lg:hidden" />

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold lg:text-base">
            <span className="tabular-nums">
              {g.count} / {g.goal} calls today
            </span>
            <span className="hidden flex-wrap gap-1.5 sm:inline-flex">{chips}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground lg:text-sm" aria-live="polite">
            {g.power ? (
              <span className="font-medium text-foreground">
                Power hour · {sessionCalls} {sessionCalls === 1 ? 'call' : 'calls'} · {clock(now - g.power.startedAt)}
                <span className="text-muted-foreground"> · </span>
              </span>
            ) : null}
            {line}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5 sm:hidden">{chips}</div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {variant === 'calls' ? (
            g.power ? (
              <>
                <label className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex" title="Open the dialer as each prospect loads">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-primary"
                    checked={g.autoDial}
                    onChange={(e) => g.setAutoDial(e.target.checked)}
                  />
                  Auto-dial
                </label>
                <Button type="button" size="sm" variant="outline" onClick={g.stopPower} aria-label="End power hour">
                  <Square className="size-3.5" aria-hidden="true" />
                  <span className="max-sm:hidden">End</span>
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  g.startPower();
                  router.push('/app/calls/dial');
                }}
                aria-label="Start power hour"
              >
                <Timer className="size-3.5" aria-hidden="true" />
                <span className="max-sm:hidden">Power hour</span>
              </Button>
            )
          ) : (
            <Link href="/app/leads/next" className={buttonVariants({ size: 'sm' })} aria-label="Call the next lead">
              <PhoneForwarded className="size-3.5" aria-hidden="true" />
              <span className="max-sm:hidden">Next lead</span>
            </Link>
          )}
          <Link
            href="/app/calls/stats"
            className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }), 'max-lg:hidden')}
            aria-label="Your stats"
            title="Your stats"
          >
            <BarChart3 className="size-4" aria-hidden="true" />
          </Link>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => g.setSound(!g.sound)}
            aria-pressed={g.sound}
            aria-label={g.sound ? 'Turn sounds off' : 'Turn sounds on'}
            title={g.sound ? 'Sounds on' : 'Sounds off'}
          >
            {g.sound ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
          </Button>
        </div>
      </div>
    </section>
  );
}

function Chip({
  tone,
  title,
  children,
}: {
  tone: 'fire' | 'money';
  title: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4',
        tone === 'fire' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
      )}
    >
      {children}
    </span>
  );
}
