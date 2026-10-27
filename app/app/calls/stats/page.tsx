import Link from 'next/link';
import { CalendarCheck, Flame, PhoneOutgoing, Trophy } from 'lucide-react';
import { requireCallWorkspace } from '@/lib/auth';
import { getCallStats, getTeamBoard, isLeaderboardEnabled } from '@/lib/data/call-stats';
import { listCallers } from '@/lib/data/prospects';
import { setLeaderboardEnabled } from '@/lib/actions/call-goals';
import { zonedParts } from '@/lib/calls/goals';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { CallsSubnav } from '@/components/calls/calls-subnav';
import { FunnelChart, GoalHeatmap, HourlyChart } from '@/components/calls/stats/charts';
import { TeamBoard } from '@/components/calls/stats/team-board';

export const metadata = { title: 'Call stats · HomeQuote Network' };

function shortDay(key: string | null): string | null {
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * The calling scoreboard: today by the hour against your best day, four weeks
 * of goal days, the funnel, personal records, badges, and the team board.
 * Everyone sees their own; an administrator can open anyone's (?caller=).
 */
export default async function CallStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requireCallWorkspace();
  const isAdmin = me.role === 'admin';
  const sp = await searchParams;
  const requested = typeof sp.caller === 'string' && /^[0-9a-f-]{36}$/i.test(sp.caller) ? sp.caller : null;
  const targetId = isAdmin && requested ? requested : me.id;

  const [stats, leaderboard] = await Promise.all([getCallStats(targetId), isLeaderboardEnabled()]);
  const board = isAdmin || leaderboard ? await getTeamBoard() : null;
  let targetName = me.full_name || 'You';
  if (targetId !== me.id) {
    const fromBoard = board?.find((r) => r.id === targetId)?.name;
    targetName = fromBoard ?? (await listCallers()).find((c) => c.id === targetId)?.name ?? 'Teammate';
  }
  const mine = targetId === me.id;
  const nowHour = zonedParts(new Date()).hour;
  const best = stats.bests.find((b) => b.id === 'calls');
  const newPbs = stats.bests.filter((b) => b.newToday);
  const earned = stats.badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={mine ? 'Your stats' : `${targetName}'s stats`}
        description={
          mine
            ? 'Every number is a call you actually logged. Beat yesterday, then beat your best.'
            : 'Their calling numbers, counted the same way as their HUD.'
        }
        backHref={mine ? undefined : '/app/calls/stats'}
        backLabel={mine ? undefined : 'Your stats'}
      >
        {isAdmin ? (
          <Link href="/app/calls/payouts" className={buttonVariants({ variant: 'outline' })}>
            Setter payouts
          </Link>
        ) : null}
      </PageHeader>
      <CallsSubnav />

      {newPbs.length > 0 && mine ? (
        <p
          role="status"
          className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-card px-4 py-3 text-sm font-medium text-amber-950"
        >
          🏆 New personal {newPbs.length === 1 ? 'best' : 'bests'} today: {newPbs.map((b) => b.label.toLowerCase()).join(', ')}.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <KpiCard label="Calls today" value={`${stats.today} / ${stats.goal}`} sub={stats.today >= stats.goal ? 'Goal hit 🎯' : `${stats.goal - stats.today} to go`} icon={PhoneOutgoing} />
        <KpiCard label="Goal streak" value={`${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`} sub="Workdays in a row at goal" icon={Flame} />
        <KpiCard label="Best day" value={best?.value ?? 0} sub={best?.dayKey ? shortDay(best.dayKey) ?? undefined : 'Not set yet'} icon={Trophy} />
        <KpiCard label="Booked, all time" value={stats.bookingsAllTime} sub="Sales appointments" icon={CalendarCheck} accent={stats.bookingsAllTime > 0 ? 'money' : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today, hour by hour</CardTitle>
          </CardHeader>
          <CardContent>
            <HourlyChart today={stats.hourlyToday} best={stats.hourlyBest} bestLabel={shortDay(stats.bestDayKey)} nowHour={nowHour} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today&rsquo;s funnel</CardTitle>
            <CardDescription>Cold calls, today against your 7-day average.</CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart today={stats.funnelToday} avg={stats.funnelWeekAvg} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Goal days</CardTitle>
            <CardDescription>Gold means {stats.goal}+ calls.</CardDescription>
          </CardHeader>
          <CardContent>
            <GoalHeatmap days={stats.days} goal={stats.goal} todayKey={stats.todayKey} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Personal bests</CardTitle>
            <CardDescription>Last 90 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {stats.bests.map((b) => (
                <li
                  key={b.id}
                  className={cn(
                    'relative rounded-xl border p-3',
                    b.newToday ? 'border-amber-300 bg-amber-50' : 'bg-card'
                  )}
                >
                  {b.newToday ? (
                    <span className="absolute -top-2 right-2 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                      New PB
                    </span>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{b.label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{b.value === null ? '—' : b.display}</p>
                  {b.dayKey ? <p className="text-[11px] text-muted-foreground">{shortDay(b.dayKey)}</p> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Badges <span className="text-sm font-normal text-muted-foreground">· {earned} of {stats.badges.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {stats.badges.map((b) => (
              <li
                key={b.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3',
                  b.earned ? 'border-primary/25 bg-primary/5' : 'opacity-55 grayscale'
                )}
                aria-label={`${b.label}: ${b.description}${b.earned ? ' — earned' : ' — not yet'}`}
              >
                <span className="text-2xl" aria-hidden="true">
                  {b.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{b.label}</span>
                  <span className="block text-xs leading-tight text-muted-foreground">{b.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {board ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{isAdmin ? 'Team today' : 'Leaderboard'}</CardTitle>
                <CardDescription>
                  {isAdmin
                    ? `Set each person's daily goal here. The leaderboard is ${leaderboard ? 'visible to' : 'hidden from'} callers and setters.`
                    : 'Calls logged today, most first.'}
                </CardDescription>
              </div>
              {isAdmin ? (
                <form action={setLeaderboardEnabled}>
                  <input type="hidden" name="enabled" value={leaderboard ? 'false' : 'true'} />
                  <Button type="submit" size="sm" variant="outline">
                    {leaderboard ? 'Hide leaderboard from team' : 'Show leaderboard to team'}
                  </Button>
                </form>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <TeamBoard rows={board} meId={me.id} isAdmin={isAdmin} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
