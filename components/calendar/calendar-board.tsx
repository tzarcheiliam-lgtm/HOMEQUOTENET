'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { AgendaList } from './agenda-list';
import { BookCallButton, BookCallSheet } from './book-call-sheet';
import { EventSheet } from './event-sheet';
import { useNow } from './now-line';
import { TimeGrid } from './time-grid';
import { layoutDay, visibleHours, type CalendarEvent, type CalendarViewMode, type HourRule } from './view';

export interface BoardCalendar {
  id: string;
  name: string;
  kind: 'contractor' | 'team' | 'sales';
  timezone: string;
  active: boolean;
}

/**
 * The interactive half of the calendar page: the grid (day, or week from md
 * up), the phone week agenda, the details sheet and "Book a call". The
 * server page loads everything (RLS-scoped) and passes it in; actions
 * revalidate the page, so the board just re-renders with fresh props.
 */
export function CalendarBoard({
  calendar,
  mode,
  days,
  events,
  rules,
  today,
  nowMs,
  canWork,
  allowOverride,
  toolbar,
}: {
  calendar: BoardCalendar;
  mode: CalendarViewMode;
  days: string[];
  events: CalendarEvent[];
  rules: HourRule[];
  today: string;
  nowMs: number;
  canWork: boolean;
  allowOverride: boolean;
  /** Server-rendered navigation (switcher, prev / next, day / week). */
  toolbar: ReactNode;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const tz = calendar.timezone;
  const now = useNow(nowMs);

  const placedByDay = useMemo(() => Object.fromEntries(days.map((d) => [d, layoutDay(events, d, tz)])), [days, events, tz]);
  const { startHour, endHour } = useMemo(() => visibleHours(rules, Object.values(placedByDay).flat()), [rules, placedByDay]);
  // Look the selection up in the CURRENT events so the sheet shows fresh data after an action.
  const selected = selectedKey ? events.find((e) => `${e.kind}:${e.id}` === selectedKey) ?? null : null;
  const select = (e: CalendarEvent) => setSelectedKey(`${e.kind}:${e.id}`);
  const live = events.filter((e) => e.status !== 'cancelled').length;

  return (
    <div className="space-y-3" data-calendar-board={calendar.kind}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {toolbar}
        {canWork && calendar.active ? <BookCallButton onClick={() => setBooking(true)} /> : null}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {live === 0 ? 'Nothing booked in this view.' : `${live} booked in this view.`}
        {!calendar.active ? ' This calendar is switched off: nobody can book it online.' : ''}
      </p>

      {mode === 'week' ? (
        <>
          <AgendaList className="md:hidden" days={days} events={events} rules={rules} timeZone={tz} today={today} onSelect={select} />
          <TimeGrid
            className="hidden md:block"
            days={days} placedByDay={placedByDay} rules={rules} timeZone={tz}
            startHour={startHour} endHour={endHour} today={today} initialNowMs={nowMs} onSelect={select}
          />
        </>
      ) : (
        <TimeGrid
          days={days} placedByDay={placedByDay} rules={rules} timeZone={tz}
          startHour={startHour} endHour={endHour} today={today} initialNowMs={nowMs} onSelect={select}
        />
      )}

      <EventSheet
        event={selected}
        calendarId={calendar.id}
        timeZone={tz}
        canWork={canWork}
        allowOverride={allowOverride}
        nowMs={now}
        onClose={() => setSelectedKey(null)}
      />
      {canWork ? (
        <BookCallSheet
          calendarId={calendar.id}
          calendarName={calendar.name}
          calendarKind={calendar.kind}
          timeZone={tz}
          allowOverride={allowOverride}
          open={booking}
          onOpenChange={setBooking}
        />
      ) : null}
    </div>
  );
}
