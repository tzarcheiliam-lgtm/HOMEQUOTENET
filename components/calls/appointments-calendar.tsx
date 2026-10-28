'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Phone, StickyNote, User, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SalesAppointmentBadge } from '@/components/calls/disposition-badge';
import { AddToCalendar, type AddToCalendarProps } from '@/components/calls/add-to-calendar';
import { groupByDay, initialDay, monthGrid, monthLabel, weekdayOf, type MonthKey } from '@/lib/calls/calendar-grid';
import { CALL_TZ } from '@/lib/calls/goals';
import type { SalesAppointmentStatus } from '@/lib/types';

export interface CalendarItem {
  id: string;
  scheduled_at: string;
  timeZone: string;
  status: SalesAppointmentStatus;
  company: string;
  prospectHref: string;
  decisionMaker: string | null;
  type: string | null;
  phone: string | null;
  tel: string | null;
  contactInfo: string | null;
  notes: string | null;
  partnerName: string | null;
  calendar: AddToCalendarProps;
}

/** Colour per status: the chip in the grid, its dot on phones, and the agenda's time rail. */
const TONE: Record<SalesAppointmentStatus, { chip: string; dot: string; rail: string }> = {
  scheduled: { chip: 'bg-primary/10 text-primary border-primary', dot: 'bg-primary', rail: 'bg-primary' },
  confirmed: {
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-200',
    dot: 'bg-emerald-500',
    rail: 'bg-emerald-500',
  },
  rescheduled: {
    chip: 'bg-amber-50 text-amber-800 border-amber-500 dark:bg-amber-900/30 dark:text-amber-200',
    dot: 'bg-amber-500',
    rail: 'bg-amber-500',
  },
  completed: {
    chip: 'bg-slate-100 text-slate-700 border-slate-400 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-400',
    rail: 'bg-slate-400',
  },
  no_show: {
    chip: 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-900/30 dark:text-rose-200',
    dot: 'bg-rose-400',
    rail: 'bg-rose-400',
  },
  cancelled: {
    chip: 'bg-muted text-muted-foreground border-muted-foreground/40 line-through',
    dot: 'bg-muted-foreground/40',
    rail: 'bg-muted-foreground/40',
  },
};

const LEGEND: { status: SalesAppointmentStatus; label: string }[] = [
  { status: 'scheduled', label: 'Scheduled' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'rescheduled', label: 'Rescheduled' },
  { status: 'completed', label: 'Completed' },
  { status: 'no_show', label: 'No-show' },
  { status: 'cancelled', label: 'Cancelled' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: CALL_TZ, hour: 'numeric', minute: '2-digit' });
const timeIn = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));
/** "9:30a" for the small grid chips. */
const chipTime = (iso: string) => timeFmt.format(new Date(iso)).replace(/:00(?= )/, '').replace(' AM', 'a').replace(' PM', 'p');
const dayTitle = (key: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`));

const TYPE: Record<string, { label: string; icon: typeof Phone }> = {
  phone: { label: 'Phone call', icon: Phone },
  video: { label: 'Video call', icon: Video },
  in_person: { label: 'In person', icon: MapPin },
};

const MAX_CHIPS = 3;

/**
 * Month calendar of sales appointments with the picked day's agenda beside it
 * (below it on phones). Days and times are in the calling workspace's zone.
 */
export function AppointmentsCalendar({
  month,
  todayKey,
  prevHref,
  nextHref,
  todayHref,
  items,
  showPartner,
}: {
  month: MonthKey;
  todayKey: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  items: CalendarItem[];
  showPartner: boolean;
}) {
  const days = useMemo(() => monthGrid(month), [month]);
  const byDay = useMemo(() => groupByDay(items), [items]);
  const [picked, setPicked] = useState<string | null>(null);
  // A different month (via the arrows) resets the pick to that month's default.
  const selected = picked && picked.startsWith(month) ? picked : initialDay(month, todayKey, byDay);
  const agendaRef = useRef<HTMLDivElement>(null);

  const inMonth = [...byDay].filter(([k]) => k.startsWith(month)).flatMap(([, list]) => list);
  const active = inMonth.filter((i) => i.status !== 'cancelled' && i.status !== 'no_show');
  const confirmed = inMonth.filter((i) => i.status === 'confirmed').length;
  const agenda = byDay.get(selected) ?? [];

  const pick = (k: string) => {
    setPicked(k);
    // On phones the agenda sits under the grid: bring it into view.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => agendaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <Card className="min-w-0 gap-0 overflow-hidden p-0 lg:gap-0 lg:py-0">
        {/* Month header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold tracking-tight sm:text-xl">{monthLabel(month)}</h2>
            <p className="text-xs text-muted-foreground">
              {active.length} {active.length === 1 ? 'meeting' : 'meetings'}
              {confirmed ? ` · ${confirmed} confirmed` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link href={todayHref} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mr-1')}>
              Today
            </Link>
            <Link href={prevHref} aria-label="Previous month" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
              <ChevronLeft />
            </Link>
            <Link href={nextHref} aria-label="Next month" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
              <ChevronRight />
            </Link>
          </div>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              <span className="sm:hidden">{d[0]}</span>
              <span className="max-sm:hidden">{d}</span>
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7" role="grid" aria-label={monthLabel(month)}>
          {days.map((k, i) => {
            const list = byDay.get(k) ?? [];
            const outside = !k.startsWith(month);
            const isToday = k === todayKey;
            const isSelected = k === selected;
            const weekend = [0, 6].includes(weekdayOf(k));
            const label = `${dayTitle(k)}, ${list.length} ${list.length === 1 ? 'meeting' : 'meetings'}`;
            return (
              <button
                key={k}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-label={label}
                onClick={() => pick(k)}
                className={cn(
                  'group relative flex min-w-0 flex-col items-stretch gap-1 border-b p-1 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[116px] sm:p-1.5',
                  'h-16 sm:h-auto',
                  i % 7 !== 0 && 'border-l',
                  weekend && !outside && 'bg-muted/20',
                  outside && 'bg-muted/40 text-muted-foreground/60',
                  isSelected ? 'bg-primary/[0.06] ring-2 ring-inset ring-primary/40' : 'hover:bg-accent/60'
                )}
              >
                <span
                  className={cn(
                    'flex size-7 items-center justify-center self-center rounded-full text-sm tabular-nums sm:self-start',
                    isToday && 'bg-primary font-semibold text-primary-foreground shadow-sm',
                    !isToday && isSelected && 'font-semibold text-primary'
                  )}
                >
                  {Number(k.slice(8))}
                </span>

                {/* Phones: one dot per meeting (up to three). */}
                {list.length > 0 ? (
                  <span className="flex justify-center gap-0.5 sm:hidden" aria-hidden="true">
                    {list.slice(0, 3).map((a) => (
                      <span key={a.id} className={cn('size-1.5 rounded-full', TONE[a.status].dot)} />
                    ))}
                  </span>
                ) : null}

                {/* Larger screens: time + company chips. */}
                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex" aria-hidden="true">
                  {list.slice(0, MAX_CHIPS).map((a) => (
                    <span
                      key={a.id}
                      className={cn('block truncate rounded-[5px] border-l-[3px] px-1.5 py-0.5 text-[11px] leading-4', TONE[a.status].chip)}
                    >
                      <span className="font-semibold tabular-nums">{chipTime(a.scheduled_at)}</span> {a.company}
                    </span>
                  ))}
                  {list.length > MAX_CHIPS ? (
                    <span className="px-1.5 text-[11px] font-medium text-muted-foreground">+{list.length - MAX_CHIPS} more</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-xs text-muted-foreground sm:px-5">
          {LEGEND.map((l) => (
            <span key={l.status} className="inline-flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', TONE[l.status].dot)} aria-hidden="true" />
              {l.label}
            </span>
          ))}
        </div>
      </Card>

      {/* Agenda for the picked day */}
      <div ref={agendaRef} className="min-w-0 scroll-mt-4 lg:sticky lg:top-4">
        <Card className="gap-0 overflow-hidden p-0 lg:gap-0 lg:py-0">
          <div className="border-b px-4 py-3 sm:px-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {selected === todayKey ? 'Today' : 'Agenda'}
            </p>
            <h3 className="font-display text-base font-semibold tracking-tight">{dayTitle(selected)}</h3>
          </div>
          {agenda.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted">
                <CalendarDays className="size-5 text-muted-foreground" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium">No meetings this day</p>
              <p className="text-xs text-muted-foreground">Pick a day with a dot or a chip to see its meetings.</p>
            </div>
          ) : (
            <ol className="divide-y">
              {agenda.map((a) => {
                const t = TYPE[a.type ?? ''];
                const TypeIcon = t?.icon ?? Phone;
                const otherZone = a.timeZone && a.timeZone !== CALL_TZ;
                return (
                  <li key={a.id} className="flex gap-3 px-4 py-4 sm:px-5">
                    <span className={cn('w-1 shrink-0 rounded-full', TONE[a.status].rail)} aria-hidden="true" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={cn('text-lg font-semibold leading-tight tabular-nums', a.status === 'cancelled' && 'text-muted-foreground line-through')}>
                            {timeFmt.format(new Date(a.scheduled_at))}
                          </p>
                          {otherZone ? <p className="text-xs text-muted-foreground">{timeIn(a.scheduled_at, a.timeZone)} for them</p> : null}
                        </div>
                        <SalesAppointmentBadge value={a.status} />
                      </div>
                      <Link href={a.prospectHref} className="block truncate text-base font-medium hover:underline">
                        {a.company}
                      </Link>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {a.decisionMaker ? (
                          <li className="flex items-center gap-2">
                            <User className="size-3.5 shrink-0" aria-hidden="true" /> {a.decisionMaker}
                          </li>
                        ) : null}
                        <li className="flex min-w-0 items-center gap-2">
                          <TypeIcon className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {t?.label ?? 'Sales call'}
                            {a.contactInfo ? ` · ${a.contactInfo}` : ''}
                          </span>
                        </li>
                        {showPartner && a.partnerName ? (
                          <li className="text-xs">Booked by {a.partnerName}</li>
                        ) : null}
                        {a.notes ? (
                          <li className="flex gap-2 text-xs">
                            <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                            <span className="line-clamp-2">{a.notes}</span>
                          </li>
                        ) : null}
                      </ul>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {a.tel && a.status !== 'cancelled' ? (
                          <a href={a.tel} className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}>
                            <Phone aria-hidden="true" /> Call
                          </a>
                        ) : null}
                        <AddToCalendar {...a.calendar} compact />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

