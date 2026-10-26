'use client';

import { useActionState, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { addAvailabilityException, deleteAvailabilityException, type AvailabilityState } from '@/lib/actions/availability';
import { exceptionAppliesOn, type AvailabilityException } from '@/lib/availability/slots';
import { pad, weekdayOfDate } from '@/lib/availability/time';
import { cn } from '@/lib/utils';
import { Feedback } from './settings-form';

type Ex = AvailabilityException & { id: string };

const fmtTime = (m: number | null) => {
  if (m === null) return '';
  const h = Math.floor(m / 60) % 24;
  return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? 'AM' : 'PM'}`;
};
const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function describe(e: Ex): string {
  const days = e.repeatWeekly
    ? `Every ${new Date(`${e.dateStart}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })} from ${fmtDate(e.dateStart)}${e.repeatUntil ? ` until ${fmtDate(e.repeatUntil)}` : ''}`
    : e.dateStart === e.dateEnd
      ? fmtDate(e.dateStart)
      : `${fmtDate(e.dateStart)} – ${fmtDate(e.dateEnd)}`;
  const time = e.startMinute === null ? 'all day' : `${fmtTime(e.startMinute)} – ${fmtTime(e.endMinute)}`;
  return `${days} · ${time}`;
}

export function ExceptionsPanel({
  contractorId,
  exceptions,
  weeklyEnabled,
  weeklyDays,
  today,
  readOnly,
}: {
  contractorId: string;
  exceptions: Ex[];
  weeklyEnabled: boolean;
  /** weekdays (0=Sun) with at least one weekly window */
  weeklyDays: number[];
  /** yyyy-mm-dd in the contractor's zone, computed on the server */
  today: string;
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState<AvailabilityState, FormData>(addAvailabilityException, undefined);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [picked, setPicked] = useState(today);
  const [allDay, setAllDay] = useState(true);
  const [repeat, setRepeat] = useState(false);

  const cells = useMemo(() => {
    const first = `${month}-01`;
    const lead = weekdayOfDate(first);
    const [y, m] = month.split('-').map(Number);
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= count; d++) out.push(`${month}-${pad(d)}`);
    return out;
  }, [month]);

  const shift = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  };
  const monthLabel = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const upcoming = exceptions.filter((e) => (e.repeatWeekly ? !e.repeatUntil || e.repeatUntil >= today : e.dateEnd >= today));

  function dayStatus(date: string) {
    const active = exceptions.filter((e) => exceptionAppliesOn(e, date));
    const blockedAll = active.some((e) => e.kind === 'blocked' && e.startMinute === null);
    const blockedPart = active.some((e) => e.kind === 'blocked' && e.startMinute !== null);
    const extra = active.some((e) => e.kind === 'available');
    const off = weeklyEnabled && !weeklyDays.includes(weekdayOfDate(date)) && !extra;
    return { blockedAll, blockedPart, extra, off };
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="icon" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft className="size-4" /></Button>
          <h3 className="text-sm font-semibold">{monthLabel}</h3>
          <Button type="button" variant="ghost" size="icon" aria-label="Next month" onClick={() => shift(1)}><ChevronRight className="size-4" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const s = dayStatus(date);
            return (
              <button
                key={date}
                type="button"
                disabled={readOnly}
                onClick={() => setPicked(date)}
                aria-label={`${fmtDate(date)}${s.blockedAll ? ', blocked' : s.blockedPart ? ', partly blocked' : s.off ? ', weekly day off' : ''}`}
                className={cn(
                  'relative flex h-11 flex-col items-center justify-center rounded-md border text-sm',
                  date === picked && 'ring-2 ring-ring',
                  s.blockedAll && 'border-red-300 bg-red-100 text-red-900',
                  !s.blockedAll && s.blockedPart && 'border-amber-300 bg-amber-100 text-amber-900',
                  !s.blockedAll && !s.blockedPart && s.off && 'bg-muted text-muted-foreground',
                  !s.blockedAll && !s.blockedPart && s.extra && 'border-emerald-300 bg-emerald-100 text-emerald-900',
                  date === today && 'font-bold'
                )}
              >
                {Number(date.slice(8))}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><i className="size-3 rounded border border-red-300 bg-red-100" /> Blocked day</span>
          <span className="flex items-center gap-1"><i className="size-3 rounded border border-amber-300 bg-amber-100" /> Some hours blocked</span>
          <span className="flex items-center gap-1"><i className="size-3 rounded border border-emerald-300 bg-emerald-100" /> Extra availability</span>
          {weeklyEnabled && <span className="flex items-center gap-1"><i className="size-3 rounded border bg-muted" /> Weekly day off</span>}
        </div>
      </div>

      <div className="space-y-4">
        {!readOnly && (
          <form action={action} className="space-y-3 rounded-lg border p-3">
            <input type="hidden" name="contractor_id" value={contractorId} />
            <h3 className="text-sm font-semibold">Block time off or add extra hours</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>What</span>
                <Select name="kind" defaultValue="blocked">
                  <option value="blocked">I’m unavailable</option>
                  <option value="available">Extra availability</option>
                </Select>
              </label>
              <label className="space-y-1 text-sm">
                <span>{repeat ? 'Starting' : 'From'}</span>
                <Input name="date_start" type="date" required value={picked} onChange={(e) => setPicked(e.target.value)} />
              </label>
              {!repeat && (
                <label className="space-y-1 text-sm">
                  <span>Through (optional)</span>
                  <Input name="date_end" type="date" min={picked} />
                </label>
              )}
              {repeat && (
                <label className="space-y-1 text-sm">
                  <span>Repeat until (optional)</span>
                  <Input name="repeat_until" type="date" min={picked} />
                </label>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="all_day" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day
            </label>
            {!allDay && (
              <div className="flex flex-wrap items-center gap-2">
                <Input name="start_time" type="time" defaultValue="09:00" className="w-32" required aria-label="Start time" />
                <span className="text-sm text-muted-foreground">to</span>
                <Input name="end_time" type="time" defaultValue="12:00" className="w-32" required aria-label="End time" />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="repeat_weekly" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> Repeat every week on this day
            </label>
            <label className="block space-y-1 text-sm">
              <span>Note (optional)</span>
              <Input name="note" maxLength={300} placeholder="Vacation, other job, doctor…" />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Add'}</Button>
              <Feedback state={state} />
            </div>
          </form>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Upcoming blocks and extra hours</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <p className={cn('font-medium', e.kind === 'blocked' ? 'text-red-800' : 'text-emerald-800')}>
                      {e.kind === 'blocked' ? 'Unavailable' : 'Extra availability'}
                    </p>
                    <p className="text-muted-foreground">{describe(e)}</p>
                    {e.note && <p className="mt-0.5 break-words">{e.note}</p>}
                  </div>
                  {!readOnly && (
                    <form action={deleteAvailabilityException}>
                      <input type="hidden" name="contractor_id" value={contractorId} />
                      <input type="hidden" name="id" value={e.id} />
                      <Button type="submit" variant="ghost" size="icon" aria-label="Remove"><Trash2 className="size-4" /></Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
