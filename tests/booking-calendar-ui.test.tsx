import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { zonedToUtc } from '@/lib/availability/time';
import { AgendaList } from '@/components/calendar/agenda-list';
import { PX_PER_MINUTE, TimeGrid } from '@/components/calendar/time-grid';
import { layoutDay, viewRange, type CalendarEvent } from '@/components/calendar/view';

/**
 * The in-app calendar's views, server-rendered (no DOM, no network): the
 * week grid's blocks by status and position, open-hour shading, the now
 * line on today only, and the phone agenda.
 */
const TZ = 'America/Los_Angeles';
const at = (date: string, h: number, m = 0) => zonedToUtc(date, h * 60 + m, TZ);
const rules = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 540, endMinute: 1020 }));

function ev(id: string, start: number, extra: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id, kind: 'appointment', status: 'scheduled', startMs: start, endMs: start + 30 * 60_000, title: `Lead ${id}`, subtitle: 'Pools', phone: null, email: null,
    city: null, leadId: null, prospectId: null, source: 'funnel', meetingType: 'phone', location: null, notes: null, contractorName: null, cancelReason: null,
    rescheduleCount: 0, design: null, ...extra,
  };
}

// A winter week (PST): Mon Dec 7 – Sun Dec 13, 2026.
const { days } = viewRange('week', '2026-12-09', TZ);
const events = [
  ev('a', at('2026-12-09', 10)),
  ev('b', at('2026-12-09', 10, 15), { status: 'cancelled' }),
  ev('c', at('2026-12-10', 14), { kind: 'visit', endMs: at('2026-12-10', 15) }),
];
const placedByDay = Object.fromEntries(days.map((d) => [d, layoutDay(events, d, TZ)]));

describe('TimeGrid', () => {
  const html = renderToStaticMarkup(
    <TimeGrid days={days} placedByDay={placedByDay} rules={rules} timeZone={TZ} startHour={8} endHour={18} today="2026-12-09"
      initialNowMs={at('2026-12-09', 12)} onSelect={() => {}} />
  );

  it('renders a column per day with today marked', () => {
    expect(html).toContain('data-calendar-grid="week"');
    expect(html.match(/data-calendar-day="/g)).toHaveLength(7);
    expect(html).toContain('aria-current="date"');
    expect(html).toContain('Wed, Dec 9');
  });

  it('places blocks by time, side by side when they overlap, styled by status', () => {
    const block = (id: string) => html.match(new RegExp(`<button[^>]*data-calendar-event="${id}"[^>]*>`))![0];
    expect(block('a')).toContain(`top:${(10 * 60 - 8 * 60) * PX_PER_MINUTE}px`);
    expect(block('a')).toContain('width:calc(50% - 4px)');
    expect(block('b')).toContain('left:calc(50% + 2px)');
    expect(block('b')).toContain('line-through');
    expect(block('c')).toContain('bg-slate-100'); // an on-site visit reads as busy time
    expect(html).toContain('aria-label="Lead a, 10:00 AM, Scheduled"');
    expect(html).toContain('aria-label="Lead c, 2:00 PM, On-site visit"');
  });

  it('shades the open hours on weekdays only and draws the now line on today', () => {
    // Mon–Fri get a white 9–5 band; Sat / Sun none.
    const bands = html.match(/class="absolute inset-x-0 bg-background"/g) ?? [];
    expect(bands).toHaveLength(5);
    expect(html.match(/data-calendar-now=""/g)).toHaveLength(1);
    expect(html).toContain(`top:${(12 * 60 - 8 * 60) * PX_PER_MINUTE}px`);
  });
});

describe('AgendaList', () => {
  const html = renderToStaticMarkup(<AgendaList days={days} events={events} timeZone={TZ} today="2026-12-09" onSelect={() => {}} />);

  it('lists every day, says when a day is free, and shows each booking with its time and status', () => {
    expect(html.match(/<section/g)).toHaveLength(7);
    expect(html).toContain('Wednesday, December 9');
    expect(html).toContain('Today');
    expect(html.match(/Nothing booked/g)).toHaveLength(5);
    expect(html).toContain('10:00 AM – 10:30 AM PST · Pools');
    expect(html).toContain('On-site visit');
    expect(html).toContain('Cancelled');
  });
});
