import { cn } from '@/lib/utils';
import { WORKDAY, isWorkday } from '@/lib/calls/goals';

/**
 * The calling stats charts. Plain SVG and CSS — no chart library — so they
 * render on the server and weigh nothing. Every chart carries a text summary
 * for screen readers; color is never the only signal (gold days also get a
 * check, ghost bars are outlined, not just lighter).
 */

const HOURS = Array.from(
  { length: WORKDAY.endHour - WORKDAY.startHour + 2 },
  (_, i) => WORKDAY.startHour - 1 + i
); // 7 AM … 5 PM, with an hour either side of the 8–5 day

function hourLabel(h: number): string {
  const ap = h < 12 ? 'a' : 'p';
  const v = h % 12 === 0 ? 12 : h % 12;
  return `${v}${ap}`;
}

/** Today's calls by hour against the best earlier day (outlined ghost bars). */
export function HourlyChart({
  today,
  best,
  bestLabel,
  nowHour,
}: {
  today: number[];
  best: number[];
  bestLabel: string | null;
  nowHour: number;
}) {
  const max = Math.max(4, ...HOURS.map((h) => Math.max(today[h] ?? 0, best[h] ?? 0)));
  const sum = (arr: number[], upto: number) => arr.slice(0, upto + 1).reduce((a, b) => a + b, 0);
  const todaySoFar = sum(today, nowHour);
  const bestSoFar = sum(best, nowHour);
  const diff = todaySoFar - bestSoFar;
  const summary = bestLabel
    ? diff > 0
      ? `Ahead of your best day by ${diff} at this hour 🚀`
      : diff === 0
        ? 'Tied with your best day at this hour'
        : `${-diff} behind your best day at this hour — catch it`
    : 'Your first day on the board — set the bar';

  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={cn('font-medium', diff > 0 && bestLabel && 'text-emerald-700')}>{summary}</span>
        <span className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-2.5 rounded-sm bg-primary" aria-hidden="true" /> Today
          </span>
          {bestLabel ? (
            <span className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-sm border border-dashed border-muted-foreground" aria-hidden="true" /> Best day ({bestLabel})
            </span>
          ) : null}
        </span>
      </figcaption>
      <div className="flex h-40 items-end gap-1 sm:gap-1.5" role="img" aria-label={`Calls by hour today: ${HOURS.map((h) => `${hourLabel(h)} ${today[h] ?? 0}`).join(', ')}`}>
        {HOURS.map((h) => {
          const t = today[h] ?? 0;
          const b = best[h] ?? 0;
          const current = h === nowHour;
          return (
            <div key={h} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <div className="relative flex h-full w-full items-end justify-center">
                {b > 0 ? (
                  <div
                    className="absolute bottom-0 w-full rounded-t-md border border-dashed border-muted-foreground/60"
                    style={{ height: `${(b / max) * 100}%` }}
                    aria-hidden="true"
                  />
                ) : null}
                <div
                  className={cn(
                    'relative w-3/4 rounded-t-md transition-[height] duration-700',
                    t > b && b > 0 ? 'bg-emerald-500' : 'bg-primary',
                    current && 'ring-2 ring-amber-400 ring-offset-1'
                  )}
                  style={{ height: `${(t / max) * 100}%`, minHeight: t > 0 ? 4 : 0 }}
                  title={`${hourLabel(h)}: ${t} today${bestLabel ? `, ${b} on your best day` : ''}`}
                />
              </div>
              <span className={cn('text-[10px] tabular-nums text-muted-foreground', current && 'font-semibold text-foreground')}>
                {hourLabel(h)}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Four Monday-aligned weeks; each day filled by calls ÷ goal, gold when hit. */
export function GoalHeatmap({
  days,
  goal,
  todayKey,
}: {
  days: { key: string; calls: number }[];
  goal: number;
  todayKey: string;
}) {
  const weeks: { key: string; calls: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const hit = days.filter((d) => d.calls >= goal).length;
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium">
        {hit} goal {hit === 1 ? 'day' : 'days'} in the last four weeks
      </figcaption>
      <div className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1.5 text-[10px] text-muted-foreground">
        <span />
        {DOW.map((d) => (
          <span key={d} className="text-center">
            {d}
          </span>
        ))}
        {weeks.map((w, wi) => (
          <Week key={wi} week={w} goal={goal} todayKey={todayKey} />
        ))}
      </div>
    </figure>
  );
}

function Week({ week, goal, todayKey }: { week: { key: string; calls: number }[]; goal: number; todayKey: string }) {
  return (
    <>
      <span className="self-center pr-1 tabular-nums">{week[0]?.key.slice(5).replace('-', '/')}</span>
      {Array.from({ length: 7 }, (_, i) => {
        const d = week[i];
        if (!d) return <span key={i} className="aspect-square rounded-md border border-dashed border-muted" aria-hidden="true" />;
        const f = Math.min(1, d.calls / goal);
        const done = d.calls >= goal;
        const label = `${d.key}: ${d.calls} calls${done ? ' — goal hit' : ''}`;
        return (
          <span
            key={d.key}
            title={label}
            aria-label={label}
            role="img"
            className={cn(
              'relative flex aspect-square items-center justify-center rounded-md border text-[10px] font-semibold tabular-nums',
              done ? 'border-amber-400 bg-amber-300 text-amber-950' : 'border-transparent',
              !isWorkday(d.key) && !done && 'opacity-70',
              d.key === todayKey && 'ring-2 ring-primary ring-offset-1'
            )}
            style={done ? undefined : { backgroundColor: `rgba(0, 56, 184, ${d.calls > 0 ? 0.12 + f * 0.7 : 0.05})`, color: f > 0.55 ? 'white' : undefined }}
          >
            {done ? '✓' : d.calls > 0 ? d.calls : ''}
          </span>
        );
      })}
    </>
  );
}

/** Dials → decision-makers → interested → booked, today vs the 7-day daily average. */
export function FunnelChart({
  today,
  avg,
}: {
  today: { attempts: number; dmConversations: number; interested: number; appointmentsBooked: number };
  avg: { attempts: number; dmConversations: number; interested: number; appointmentsBooked: number };
}) {
  const rows = [
    { label: 'Dials', t: today.attempts, a: avg.attempts },
    { label: 'Decision-makers', t: today.dmConversations, a: avg.dmConversations },
    { label: 'Interested', t: today.interested, a: avg.interested },
    { label: 'Booked', t: today.appointmentsBooked, a: avg.appointmentsBooked, money: true },
  ];
  const max = Math.max(1, ...rows.map((r) => Math.max(r.t, r.a)));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="space-y-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{r.label}</span>
            <span className="tabular-nums">
              <span className={cn('font-semibold', r.money && r.t > 0 && 'text-emerald-700')}>{r.t}</span>
              <span className="text-xs text-muted-foreground"> · avg {r.a.toFixed(r.a < 10 ? 1 : 0)}</span>
            </span>
          </div>
          <div className="relative h-2.5 rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full', r.money ? 'bg-emerald-500' : r.t >= r.a && r.t > 0 ? 'bg-primary' : 'bg-primary/60')}
              style={{ width: `${(r.t / max) * 100}%` }}
            />
            {r.a > 0 ? (
              <span
                className="absolute -top-1 h-4.5 w-0.5 rounded bg-foreground/70"
                style={{ left: `calc(${(r.a / max) * 100}% - 1px)` }}
                title={`7-day average: ${r.a.toFixed(1)}`}
                aria-hidden="true"
              />
            ) : null}
          </div>
        </li>
      ))}
      <li className="text-xs text-muted-foreground">Bar = today · tick = your average per calling day over the last 7 days.</li>
    </ul>
  );
}

/** A tiny trend line for KPI tiles. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 64;
  const h = 18;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`).join(' ');
  const last = values[values.length - 1];
  const lx = w;
  const ly = h - 2 - (last / max) * (h - 4);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={cn('overflow-visible text-primary', className)} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
      <circle cx={lx} cy={ly} r={2.25} fill="currentColor" />
    </svg>
  );
}
