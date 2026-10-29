import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getContractorCalendar, listVisibleCalendars, loadCalendarRules } from '@/lib/booking/calendars.server';
import { localParts } from '@/lib/availability/time';
import { zoneLabel } from '@/components/booking/zone-label';
import { canManageCalendar, canOverrideSlots, canViewCalendar, canWorkCalendar, isCalendarStaff, type CalendarViewer } from '@/components/calendar/access';
import { CalendarBoard } from '@/components/calendar/calendar-board';
import { CalendarSwitcher } from '@/components/calendar/calendar-switcher';
import { parseViewDate, parseViewMode, rangeTitle, shiftViewDate, viewRange, type CalendarViewMode } from '@/components/calendar/view';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { loadCalendarEvents } from './data.server';

export const metadata = { title: 'Calendar · HomeQuote Network' };

/**
 * HomeQuote's own booking calendar (0068). Staff (admin, setter) switch
 * between the HomeQuote team calendar, HomeQuote sales and every contractor's;
 * a contractor sees only its own. Day / week; click a booking for details,
 * reschedule, cancel or held / no-show; "Book a call" books on someone's
 * behalf. Everything shows in the calendar's own zone, which is named.
 */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const profile = await requireRole(['admin', 'setter', 'contractor']);
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined));
  const viewer: CalendarViewer = { id: profile.id, role: profile.role, contractor_id: profile.contractor_id, contractor_role: profile.contractor_role };
  if (profile.role === 'contractor' && !profile.contractor_id) {
    return <PageHeader title="Calendar" description="Your account is not linked to a company yet." />;
  }
  const userDb = await createClient();
  const staff = isCalendarStaff(viewer);

  // A contractor's calendar is made (with the default 9–5 weekday hours) the first time it is needed.
  if (!staff && profile.contractor_id) {
    try {
      await getContractorCalendar(profile.contractor_id, { create: true, db: createAdminClient() });
    } catch {
      /* shown as "no calendar" below */
    }
  }
  // Staff can open a contractor that has no calendar yet: ?contractor=<id>.
  const forContractor = one('contractor');
  if (staff && forContractor && /^[0-9a-f-]{36}$/i.test(forContractor)) {
    const cal = await getContractorCalendar(forContractor, { create: true, db: createAdminClient() }).catch(() => null);
    if (cal) redirect(`/app/calendar?cal=${cal.id}`);
  }

  const calendars = (await listVisibleCalendars(userDb)).filter((c) => canViewCalendar(viewer, c));
  if (!calendars.length) {
    return (
      <div className="space-y-4">
        <PageHeader title="Calendar" />
        <EmptyState icon={CalendarDays} title="No booking calendar yet" description="Calendars appear here once migration 0068 is applied." />
      </div>
    );
  }
  const requested = one('cal');
  const calendar =
    calendars.find((c) => c.id === requested)
    ?? (staff ? calendars.find((c) => c.kind === 'team') : calendars.find((c) => c.kind === 'contractor' && c.contractorId === profile.contractor_id))
    ?? calendars[0];

  const tz = calendar.timezone;
  const nowMs = Date.now();
  const mode: CalendarViewMode = parseViewMode(one('view'));
  const date = parseViewDate(one('date'), tz, nowMs);
  const today = localParts(nowMs, tz).date;
  const { days, fromMs, toMs } = viewRange(mode, date, tz);

  const [events, { rules }] = await Promise.all([
    loadCalendarEvents(userDb, calendar, fromMs, toMs),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the user's client (RLS) where the helper defaults to the service role
    loadCalendarRules(calendar.id, userDb as any),
  ]);

  const href = (patch: Record<string, string>) => {
    const qs = new URLSearchParams({ cal: calendar.id, view: mode, date, ...patch });
    return `/app/calendar?${qs.toString()}`;
  };
  const navBtn = cn(buttonVariants({ variant: 'outline', size: 'icon' }));
  const toolbar = (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      {staff && calendars.length > 1 ? (
        <CalendarSwitcher
          options={calendars.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
          current={calendar.id}
          query={{ view: mode, date }}
        />
      ) : null}
      <div className="flex items-center gap-1">
        <Link href={href({ date: shiftViewDate(mode, date, -1) })} className={navBtn} aria-label={mode === 'week' ? 'Previous week' : 'Previous day'}>
          <ChevronLeft className="size-4" />
        </Link>
        <Link href={href({ date: today })} className={cn(buttonVariants({ variant: 'outline' }))} aria-current={days.includes(today) ? 'date' : undefined}>
          Today
        </Link>
        <Link href={href({ date: shiftViewDate(mode, date, 1) })} className={navBtn} aria-label={mode === 'week' ? 'Next week' : 'Next day'}>
          <ChevronRight className="size-4" />
        </Link>
      </div>
      <nav aria-label="View" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(['day', 'week'] as const).map((m) => (
          <Link
            key={m}
            href={href({ view: m })}
            replace
            aria-current={mode === m ? 'page' : undefined}
            className={cn(
              'flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-medium capitalize',
              mode === m ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
            )}
          >
            {m}
          </Link>
        ))}
      </nav>
      <h2 className="w-full text-base font-semibold sm:w-auto sm:pl-1" aria-live="polite">{rangeTitle(mode, days)}</h2>
    </div>
  );

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageHeader
        title={staff ? `Calendar · ${calendar.name}` : 'Calendar'}
        description={`${calendar.durationMinutes}-minute calls on ${staff ? 'this' : 'your'} calendar. Times in ${zoneLabel(nowMs, tz)}.`}
      >
        <Link href={`/app/calendar/settings?cal=${calendar.id}`} className={cn(buttonVariants({ variant: 'outline' }))}>
          <Settings aria-hidden /> {canManageCalendar(viewer, calendar) ? 'Calendar settings' : 'Hours & hosts'}
        </Link>
      </PageHeader>
      <CalendarBoard
        calendar={{ id: calendar.id, name: calendar.name, kind: calendar.kind, timezone: tz, active: calendar.active }}
        mode={mode}
        days={days}
        events={events}
        rules={rules.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute }))}
        today={today}
        nowMs={nowMs}
        canWork={canWorkCalendar(viewer, calendar)}
        allowOverride={canOverrideSlots(viewer)}
        toolbar={toolbar}
      />
    </div>
  );
}
