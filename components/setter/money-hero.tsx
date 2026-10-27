'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, Flame, Target, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney, weekPace, weekPaceMessage } from '@/lib/setter/money';
import { tierFor } from '@/lib/calls/goals';
import { GoalRing, useCountUp } from '@/components/calls/goal/goal-ring';
import type { SetterDashboardData } from '@/lib/data/setter-dashboard';

/**
 * The top of a setter's home: money earned this month (count-up, emerald —
 * money is the one color), what is waiting on a sale, what each sale pays,
 * and the weekly booking ring with pace, streak and records.
 */
export function MoneyHero({ d }: { d: SetterDashboardData }) {
  const shownEarned = useCountUp(Math.round(d.earnedMonth), 900);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const goal = d.weeklyGoal;
  const pace = goal && now ? weekPace(d.weekBookings, goal, now) : null;
  const newWeekPb = d.weekBookings > 0 && d.weekBookings > d.prevBestWeekBookings && d.prevBestWeekBookings > 0;
  const newMonthPb = d.earnedMonth > 0 && d.earnedMonth > d.prevBestMonthEarned && d.prevBestMonthEarned > 0;
  const done = shownEarned === Math.round(d.earnedMonth);

  return (
    <section
      aria-label="Your money"
      className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-card to-card shadow-sm"
    >
      <div className="grid gap-5 p-4 lg:grid-cols-[1.2fr_1fr] lg:gap-8 lg:p-6">
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Earned this month</p>
          <p className="text-4xl font-semibold tabular-nums tracking-tight text-emerald-700 lg:text-5xl" aria-live="polite">
            {done ? formatMoney(d.earnedMonth) : formatMoney(shownEarned)}
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            {d.pendingCount > 0 ? (
              <span className="rounded-full border border-emerald-200 bg-white/70 px-3 py-1">
                <strong className="tabular-nums">{d.pendingCount}</strong> {d.pendingCount === 1 ? 'meeting' : 'meetings'} waiting on a sale
                {d.pendingValue !== null ? (
                  <span className="text-emerald-800"> · {formatMoney(d.pendingValue)} if they all sell</span>
                ) : null}
              </span>
            ) : (
              <span className="rounded-full border bg-white/70 px-3 py-1 text-muted-foreground">No meetings waiting — book one</span>
            )}
            {d.payPerSale !== null ? (
              <span className="rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white">
                Every meeting that sells = +{formatMoney(d.payPerSale)}
              </span>
            ) : (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-900">
                Your pay per sale isn&rsquo;t set yet — ask your admin
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            All-time {formatMoney(d.earnedAllTime)}
            {d.closeRate !== null ? ` · ${Math.round(d.closeRate * 100)}% of your decided meetings sold` : ''}
            {d.bestMonthEarned > 0 ? ` · best month ${formatMoney(d.bestMonthEarned)}` : ''}
          </p>
          {newMonthPb ? (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-950">
              <Trophy className="size-3.5" aria-hidden="true" /> Best month ever
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-4 rounded-xl border bg-card/80 p-4">
          {goal ? (
            <GoalRing count={d.weekBookings} goal={goal} tier={tierFor(d.weekBookings, goal)} size={84} stroke={9} />
          ) : (
            <div className="flex size-[84px] shrink-0 items-center justify-center rounded-full border-[9px] border-muted text-2xl font-semibold tabular-nums">
              {d.weekBookings}
            </div>
          )}
          <div className="min-w-0 space-y-1.5">
            <p className="text-base font-semibold">
              <span className="tabular-nums">
                {d.weekBookings}
                {goal ? ` / ${goal}` : ''}
              </span>{' '}
              meetings booked this week
            </p>
            <p className="text-sm text-muted-foreground">
              {goal && pace ? weekPaceMessage(pace, d.weekBookings, goal) : goal ? ' ' : 'No weekly goal set yet'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {d.todayBookings > 0 ? (
                <Chip icon={CalendarCheck}>{d.todayBookings} today</Chip>
              ) : null}
              {d.streak > 0 ? <Chip icon={Flame}>{d.streak}-day booking streak</Chip> : null}
              {d.bestWeekBookings > 0 ? (
                <Chip icon={newWeekPb ? Trophy : Target} gold={newWeekPb}>
                  {newWeekPb ? 'New best week!' : `Best week: ${d.bestWeekBookings}`}
                </Chip>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Chip({
  icon: Icon,
  gold,
  children,
}: {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
  gold?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        gold ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-900'
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {children}
    </span>
  );
}
