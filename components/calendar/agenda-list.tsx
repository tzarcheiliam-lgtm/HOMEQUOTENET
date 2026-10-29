'use client';

import { ChevronRight } from 'lucide-react';
import { formatRange } from '@/lib/booking/format';
import { localParts } from '@/lib/availability/time';
import { cn } from '@/lib/utils';
import { longDayLabel, statusStyle, type CalendarEvent } from './view';

/**
 * The week on a phone: one section per day, each booking a full-width row
 * (name, time, project, status) that opens the details sheet. Days with
 * nothing booked say so, so the week still reads as a week.
 */
export function AgendaList({
  days,
  events,
  timeZone,
  today,
  onSelect,
  className,
}: {
  days: string[];
  events: CalendarEvent[];
  timeZone: string;
  today: string;
  onSelect: (event: CalendarEvent) => void;
  className?: string;
}) {
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const d = localParts(e.startMs, timeZone).date;
    byDay.set(d, [...(byDay.get(d) ?? []), e]);
  }
  return (
    <div className={cn('space-y-4', className)} data-calendar-agenda="">
      {days.map((d) => {
        const list = byDay.get(d) ?? [];
        return (
          <section key={d} aria-labelledby={`agenda-${d}`}>
            <h2 id={`agenda-${d}`} className={cn('mb-1.5 text-sm font-semibold', d === today ? 'text-primary' : 'text-foreground')}>
              {longDayLabel(d)}
              {d === today ? <span className="ml-1.5 text-xs font-medium text-muted-foreground">Today</span> : null}
            </h2>
            {list.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">Nothing booked</p>
            ) : (
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {list.map((e) => {
                  const s = statusStyle(e.kind, e.status);
                  return (
                    <li key={`${e.kind}:${e.id}`}>
                      <button
                        type="button"
                        onClick={() => onSelect(e)}
                        className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-accent"
                        data-calendar-event={e.id}
                      >
                        <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', s.dot)} />
                        <span className="min-w-0 flex-1">
                          <span className={cn('block truncate text-sm font-medium', e.status === 'cancelled' && 'text-muted-foreground line-through')}>{e.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {formatRange(e.startMs, e.endMs, timeZone)}
                            {e.subtitle ? ` · ${e.subtitle}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{s.label}</span>
                        <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
