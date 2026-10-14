'use client';

import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveWeeklySchedule, type AvailabilityState } from '@/lib/actions/availability';
import { Feedback } from './settings-form';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Display Monday first.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Win {
  start: string;
  end: string;
}

const toTime = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const toMinute = (t: string, isEnd: boolean) => {
  const [h, m] = t.split(':').map(Number);
  const v = h * 60 + m;
  return isEnd && v === 0 ? 1440 : v;
};

export function WeeklyEditor({
  contractorId,
  rules,
  readOnly,
}: {
  contractorId: string;
  rules: { weekday: number; startMinute: number; endMinute: number }[];
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState<AvailabilityState, FormData>(saveWeeklySchedule, undefined);
  const [days, setDays] = useState<Record<number, Win[]>>(() => {
    const init: Record<number, Win[]> = {};
    for (const d of ORDER) init[d] = [];
    for (const r of rules) init[r.weekday].push({ start: toTime(r.startMinute), end: r.endMinute >= 1440 ? '00:00' : toTime(r.endMinute) });
    return init;
  });

  const setWindow = (day: number, index: number, patch: Partial<Win>) =>
    setDays((d) => ({ ...d, [day]: d[day].map((w, i) => (i === index ? { ...w, ...patch } : w)) }));
  const serialized = JSON.stringify(
    ORDER.flatMap((weekday) =>
      days[weekday].filter((w) => w.start && w.end).map((w) => ({ weekday, startMinute: toMinute(w.start, false), endMinute: toMinute(w.end, true) }))
    )
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="contractor_id" value={contractorId} />
      <input type="hidden" name="rules" value={serialized} />
      <ul className="divide-y rounded-lg border">
        {ORDER.map((day) => (
          <li key={day} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="w-28 shrink-0 pt-2 text-sm font-medium">{DAYS[day]}</div>
            <div className="flex-1 space-y-2">
              {days[day].length === 0 && <p className="pt-2 text-sm text-muted-foreground">Unavailable</p>}
              {days[day].map((w, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input type="time" aria-label={`${DAYS[day]} start`} value={w.start} onChange={(e) => setWindow(day, i, { start: e.target.value })} className="w-32" disabled={readOnly} />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input type="time" aria-label={`${DAYS[day]} end`} value={w.end} onChange={(e) => setWindow(day, i, { end: e.target.value })} className="w-32" disabled={readOnly} />
                  {!readOnly && (
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove window" onClick={() => setDays((d) => ({ ...d, [day]: d[day].filter((_, j) => j !== i) }))}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {!readOnly && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDays((d) => ({ ...d, [day]: [...d[day], d[day].length ? { start: '13:00', end: '17:00' } : { start: '08:00', end: '17:00' }] }))}>
                <Plus className="size-4" /> Add hours
              </Button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save weekly hours'}</Button>
          <Feedback state={state} />
        </div>
      )}
    </form>
  );
}
