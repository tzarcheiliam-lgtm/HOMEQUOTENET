import Link from 'next/link';
import { CalendarDays, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { fmtDateTime } from '@/components/calls/format';
import type { SetterDashboardData } from '@/lib/data/setter-dashboard';
import { MoneyHero } from './money-hero';
import { MoneyQueue } from './money-queue';
import { HeadToHead } from './head-to-head';
import { SaleCelebrator, WeeklyRecap } from './setter-moments';

/**
 * The appointment setter's home, built around money: what you've earned, what
 * is waiting on a sale, who to call next to earn more, and the race. One
 * responsive layout for phone and desktop.
 */
export function SetterDashboard({ d, name }: { d: SetterDashboardData; name: string | null }) {
  const first = name?.split(' ')[0];
  return (
    <div className="space-y-5 lg:space-y-6">
      <SaleCelebrator sold={d.recentSold} />
      <PageHeader
        showTitleOnMobile
        title={first ? `Let's get paid, ${first}` : "Let's get paid"}
        description="Book contractor sales meetings. Every one that sells puts money in your pocket."
      >
        <Link href="/app/calls/dial" className={buttonVariants()}>
          <Timer className="size-4" aria-hidden="true" /> Start power hour
        </Link>
      </PageHeader>

      <MoneyHero d={d} />

      <WeeklyRecap
        weekKey={d.lastWeek.weekKey}
        bookings={d.lastWeek.bookings}
        sold={d.lastWeek.sold}
        earned={d.lastWeek.earned}
        goal={d.weeklyGoal}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="min-w-0 lg:col-span-2">
          <MoneyQueue items={d.queue} chances={d.chances} payPerSale={d.payPerSale} />
        </div>
        <div className="min-w-0 space-y-4 lg:space-y-6">
          {d.rivals ? (
            <HeadToHead rivals={d.rivals} me={{ weekBookings: d.weekBookings, monthEarned: d.earnedMonth }} />
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Your next meetings</CardTitle>
                <Link href="/app/calls/appointments" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                  All
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {d.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing booked ahead. Your next booking shows up here.</p>
              ) : (
                <ul className="space-y-2">
                  {d.upcoming.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 text-sm">
                      <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{m.company}</span>
                        <span className="block text-xs text-muted-foreground tabular-nums">{fmtDateTime(m.scheduledAt)}</span>
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          m.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                        )}
                      >
                        {m.status === 'confirmed' ? 'Confirmed' : 'Confirm it'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Badges{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  · {d.badges.filter((b) => b.earned).length} of {d.badges.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-2 gap-2 [&>li]:min-w-0">
                {d.badges.map((b) => (
                  <li
                    key={b.id}
                    title={b.description}
                    aria-label={`${b.label}: ${b.description}${b.earned ? ' — earned' : ' — not yet'}`}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-2',
                      b.earned ? 'border-primary/25 bg-primary/5' : 'opacity-50 grayscale'
                    )}
                  >
                    <span className="text-lg" aria-hidden="true">
                      {b.emoji}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold leading-tight">{b.label}</span>
                      <span className="block truncate text-[11px] leading-tight text-muted-foreground">{b.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
