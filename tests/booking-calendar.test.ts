/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { zonedToUtc } from '@/lib/availability/time';
import {
  designFromActivity, designsByLead, isLive, layoutDay, mapAppointmentRow, mapSalesRow, openBands, parseViewDate, parseViewMode,
  rangeTitle, shiftViewDate, statusActions, statusStyle, viewRange, visibleHours, weekStart, type CalendarEvent,
} from '@/components/calendar/view';
import { canManageCalendar, canOverrideSlots, canUseCalendarPage, canViewCalendar, canWorkCalendar, type CalendarViewer } from '@/components/calendar/access';

/**
 * The in-app booking calendar: the pure view model (ranges, DST, layout,
 * status, row mapping, the estimator design), the role matrix, and the
 * reschedule / cancel / held / no-show actions over a recorded fake client
 * (the PGlite suite, booking-calendar-db, covers settings + booking end to end).
 */
const TZ = 'America/Los_Angeles';
const la = (date: string, hh: number, mm = 0) => zonedToUtc(date, hh * 60 + mm, TZ);

function ev(id: string, start: number, minutes = 30, extra: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id, kind: 'appointment', status: 'scheduled', startMs: start, endMs: start + minutes * 60_000, title: id, subtitle: null, phone: null, email: null,
    city: null, leadId: null, prospectId: null, source: null, meetingType: null, location: null, notes: null, contractorName: null, cancelReason: null,
    rescheduleCount: 0, design: null, ...extra,
  };
}

describe('calendar view ranges', () => {
  it('runs weeks Monday to Sunday, local midnight to midnight, across the DST change', () => {
    expect(weekStart('2026-10-29')).toBe('2026-10-26'); // Thursday -> Monday
    expect(weekStart('2026-11-01')).toBe('2026-10-26'); // Sunday stays in the week it ends
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
    const w = viewRange('week', '2026-10-29', TZ);
    expect(w.days).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(new Date(w.fromMs).toISOString()).toBe('2026-10-26T07:00:00.000Z'); // PDT
    expect(new Date(w.toMs).toISOString()).toBe('2026-11-02T08:00:00.000Z'); // PST: clocks fell back on Nov 1
    expect(w.toMs - w.fromMs).toBe((7 * 24 + 1) * 3_600_000);
    const d = viewRange('day', '2026-11-01', TZ);
    expect(d.days).toEqual(['2026-11-01']);
    expect(d.toMs - d.fromMs).toBe(25 * 3_600_000);
  });

  it('reads ?date= and ?view= safely and pages by a day or a week', () => {
    const now = Date.parse('2026-10-30T05:00:00Z'); // still Oct 29 in Los Angeles
    expect(parseViewDate(undefined, TZ, now)).toBe('2026-10-29');
    expect(parseViewDate('2026-02-30', TZ, now)).toBe('2026-10-29');
    expect(parseViewDate('nope', TZ, now)).toBe('2026-10-29');
    expect(parseViewDate('2026-12-31', TZ, now)).toBe('2026-12-31');
    expect(parseViewMode('day')).toBe('day');
    expect(parseViewMode('month')).toBe('week');
    expect(shiftViewDate('week', '2026-12-30', 1)).toBe('2027-01-06');
    expect(shiftViewDate('day', '2026-03-01', -1)).toBe('2026-02-28');
    expect(rangeTitle('week', viewRange('week', '2026-10-29', TZ).days)).toBe('Oct 26 – Nov 1, 2026');
    expect(rangeTitle('week', viewRange('week', '2026-10-14', TZ).days)).toBe('Oct 12 – 18, 2026');
    expect(rangeTitle('day', ['2026-10-29'])).toBe('Thursday, October 29, 2026');
  });
});

describe('calendar layout', () => {
  it('puts overlapping bookings side by side and lone ones full width', () => {
    const day = '2026-10-29';
    const placed = layoutDay([
      ev('a', la(day, 9)),
      ev('b', la(day, 9, 15)),
      ev('c', la(day, 9, 30)), // overlaps b only; a's lane is free again
      ev('d', la(day, 13)),
      ev('other-day', la('2026-10-30', 9)),
    ], day, TZ);
    const by = Object.fromEntries(placed.map((p) => [p.event.id, p]));
    expect(Object.keys(by).sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(by.a).toMatchObject({ startMin: 540, endMin: 570, lane: 0, lanes: 2 });
    expect(by.b).toMatchObject({ lane: 1, lanes: 2 });
    expect(by.c).toMatchObject({ lane: 0, lanes: 2 });
    expect(by.d).toMatchObject({ lane: 0, lanes: 1 });
  });

  it('keeps short bookings tappable, clips at midnight and counts minutes on DST days', () => {
    const placed = layoutDay([ev('short', la('2026-10-29', 10), 5), ev('late', la('2026-10-29', 23, 45), 60)], '2026-10-29', TZ);
    expect(placed.find((p) => p.event.id === 'short')).toMatchObject({ startMin: 600, endMin: 615 });
    expect(placed.find((p) => p.event.id === 'late')).toMatchObject({ startMin: 1425, endMin: 1440 });
    // Nov 1: 1 AM happens twice, so 9 AM local is 600 minutes after midnight.
    expect(layoutDay([ev('x', la('2026-11-01', 9))], '2026-11-01', TZ)[0].startMin).toBe(600);
  });

  it('shades open hours per weekday and widens the visible hours to fit', () => {
    const rules = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 540, endMinute: 1020 }));
    expect(openBands(rules, '2026-10-29')).toEqual([{ startMin: 540, endMin: 1020 }]);
    expect(openBands(rules, '2026-10-31')).toEqual([]); // Saturday
    expect(visibleHours(rules, [])).toEqual({ startHour: 8, endHour: 18 });
    const early = layoutDay([ev('e', la('2026-10-29', 6, 30)), ev('l', la('2026-10-29', 19, 15))], '2026-10-29', TZ);
    expect(visibleHours(rules, early)).toEqual({ startHour: 6, endHour: 20 });
    expect(visibleHours([{ weekday: 1, startMinute: 420, endMinute: 1260 }], [])).toEqual({ startHour: 7, endHour: 21 });
  });
});

describe('status and actions', () => {
  it('styles by status and treats a scheduled visit as busy time', () => {
    expect(statusStyle('appointment', 'scheduled').label).toBe('Scheduled');
    expect(statusStyle('appointment', 'no_show').label).toBe('No-show');
    expect(statusStyle('sales_appointment', 'completed').label).toBe('Held');
    expect(statusStyle('visit', 'scheduled').label).toBe('On-site visit');
    expect(statusStyle('appointment', 'cancelled').block).toMatch(/line-through/);
    expect(isLive('appointment', 'scheduled')).toBe(true);
    expect(isLive('appointment', 'rescheduled')).toBe(false);
    expect(isLive('sales_appointment', 'confirmed')).toBe(true);
  });

  it('offers held / no-show once the time has come, never on a cancelled booking', () => {
    const now = Date.parse('2026-10-29T18:00:00Z');
    expect(statusActions('appointment', 'scheduled', now + 3_600_000, now)).toEqual([]);
    expect(statusActions('appointment', 'scheduled', now - 60_000, now).map((a) => a.value)).toEqual(['held', 'no_show']);
    expect(statusActions('sales_appointment', 'confirmed', now - 60_000, now).map((a) => a.value)).toEqual(['completed', 'no_show']);
    expect(statusActions('appointment', 'held', now - 60_000, now).map((a) => a.value)).toEqual(['no_show']);
    expect(statusActions('appointment', 'cancelled', now - 60_000, now)).toEqual([]);
  });
});

describe('rows -> events', () => {
  it('takes the lead from lead_id, else the assignment, else the stored contact', () => {
    const team = mapAppointmentRow({
      id: 'a1', calendar_id: 'cal', scheduled_at: '2026-10-29T17:00:00Z', ends_at: '2026-10-29T17:30:00Z', status: 'scheduled', source: 'funnel',
      meeting_type: 'phone', contact_phone: '+13105550100', reschedule_count: 2,
      lead: { id: 'L1', first_name: 'Pat', last_name: 'Doe', phone: '+13105550199', city: 'Pasadena', vertical: { name: 'Pools' }, sub_service: { name: 'Remodel' } },
      assignment: null,
    });
    expect(team).toMatchObject({ kind: 'appointment', title: 'Pat Doe', subtitle: 'Pools · Remodel', phone: '+13105550100', leadId: 'L1', city: 'Pasadena', rescheduleCount: 2 });
    expect(team!.endMs - team!.startMs).toBe(30 * 60_000);

    const visit = mapAppointmentRow({
      id: 'v1', calendar_id: null, scheduled_at: '2026-10-29T17:00:00Z', ends_at: null, status: 'scheduled', location: '12 Main St',
      lead: null, assignment: { contractor: { name: 'Pool Masters LA' }, lead: { id: 'L2', first_name: 'Sam', phone: '+1' } },
    });
    expect(visit).toMatchObject({ kind: 'visit', title: 'Sam', leadId: 'L2', contractorName: 'Pool Masters LA', meetingType: 'in_person' });
    expect(visit!.endMs - visit!.startMs).toBe(60 * 60_000);

    expect(mapAppointmentRow({ id: 'c', calendar_id: 'cal', scheduled_at: '2026-10-29T17:00:00Z', contact_name: 'Jo Lee', lead: null })!.title).toBe('Jo Lee');
    expect(mapAppointmentRow({ id: 'n', scheduled_at: null })).toBeNull();
  });

  it('maps sales meetings to the prospect', () => {
    const s = mapSalesRow({
      id: 's1', prospect_id: 'P1', scheduled_at: '2026-10-29T17:00:00Z', status: 'confirmed', decision_maker_name: 'Ana Ruiz', appointment_type: 'video',
      prospect: { id: 'P1', company_name: 'Blue Pools', phone: '(818) 555-0142', city: 'Burbank' },
    });
    expect(s).toMatchObject({ kind: 'sales_appointment', title: 'Ana Ruiz', subtitle: 'Blue Pools', prospectId: 'P1', meetingType: 'video', leadId: null });
    expect(mapSalesRow({ id: 's2', scheduled_at: '2026-10-29T17:00:00Z', prospect: { company_name: 'Blue Pools' } })!).toMatchObject({ title: 'Blue Pools', subtitle: null });
  });

  it('reads the estimator design summary and first photo from the lead timeline', () => {
    const metadata = {
      contractor_id: 'c1',
      estimator: {
        low: 48000, high: 62000,
        configurator: {
          summary: ['Shape: Freeform', 'Finish: Pebble, midnight blue'],
          photos: [{ view: 'v', label: 'Pool', url: 'https://homequotenet.com/estimator/pool.webp', alt: 'Freeform pool' }],
          designUrl: 'https://homequotenet.com/estimator/pool-masters?d=1',
        },
      },
    };
    expect(designFromActivity(metadata)).toEqual({
      lines: ['Shape: Freeform', 'Finish: Pebble, midnight blue'],
      photo: { url: 'https://homequotenet.com/estimator/pool.webp', alt: 'Freeform pool' },
      designUrl: 'https://homequotenet.com/estimator/pool-masters?d=1',
      range: '$48,000 – $62,000',
    });
    expect(designFromActivity({ estimator: { configurator: { photos: [{ url: 'javascript:alert(1)' }] } } })).toBeNull();
    expect(designFromActivity({ provider: 'homequote' })).toBeNull();
    const map = designsByLead([
      { lead_id: 'L1', metadata: { estimator: { low: 1, high: 2 } } }, // newest first
      { lead_id: 'L1', metadata },
      { lead_id: 'L2', metadata: {} },
    ]);
    expect(map.get('L1')!.range).toBe('$1 – $2');
    expect(map.has('L2')).toBe(false);
  });
});

describe('who may do what', () => {
  const admin: CalendarViewer = { id: 'a', role: 'admin', contractor_id: null, contractor_role: null };
  const setter: CalendarViewer = { id: 's', role: 'setter', contractor_id: null, contractor_role: null };
  const owner: CalendarViewer = { id: 'o', role: 'contractor', contractor_id: 'cA', contractor_role: 'owner' };
  const staff: CalendarViewer = { id: 'st', role: 'contractor', contractor_id: 'cA', contractor_role: 'staff' };
  const caller: CalendarViewer = { id: 'c', role: 'caller', contractor_id: null, contractor_role: null };
  const team = { kind: 'team' as const, contractorId: null };
  const sales = { kind: 'sales' as const, contractorId: null };
  const calA = { kind: 'contractor' as const, contractorId: 'cA' };
  const calB = { kind: 'contractor' as const, contractorId: 'cB' };

  it('matches the RLS: contractors see and work only their own calendar', () => {
    for (const c of [team, sales, calA, calB]) {
      expect(canViewCalendar(admin, c) && canWorkCalendar(admin, c) && canManageCalendar(admin, c)).toBe(true);
      expect(canViewCalendar(setter, c) && canWorkCalendar(setter, c)).toBe(true);
      expect(canManageCalendar(setter, c)).toBe(false);
    }
    expect([team, sales, calA, calB].map((c) => canViewCalendar(owner, c))).toEqual([false, false, true, false]);
    expect([team, sales, calA, calB].map((c) => canWorkCalendar(staff, c))).toEqual([false, false, true, false]);
    expect(canManageCalendar(owner, calA)).toBe(true);
    expect(canManageCalendar(staff, calA)).toBe(false);
    expect(canManageCalendar(owner, calB)).toBe(false);
    expect(canUseCalendarPage(caller)).toBe(false);
    expect(canUseCalendarPage({ ...owner, contractor_id: null })).toBe(false);
    expect([admin, setter, owner].map(canOverrideSlots)).toEqual([true, true, false]);
  });
});

/* ------------------------------------------------------------------ */
/* Actions over a recorded fake client                                 */
/* ------------------------------------------------------------------ */

type Call = [string, unknown[]];
const m = vi.hoisted(() => ({
  profile: null as any,
  calls: [] as { table: string; calls: Call[] }[],
  resolve: (() => ({ data: null, error: null })) as (table: string, calls: Call[]) => { data: unknown; error: unknown },
  book: {
    rescheduleAppointment: vi.fn(), rescheduleSalesAppointment: vi.fn(), cancelAppointment: vi.fn(), cancelSalesAppointment: vi.fn(),
    bookAppointment: vi.fn(), bookSalesAppointment: vi.fn(),
  },
  notify: vi.fn(),
}));
function fakeDb() {
  return {
    from: (table: string) => {
      const rec = { table, calls: [] as Call[] };
      m.calls.push(rec);
      const p: unknown = new Proxy(function () {}, {
        get(_t, prop) {
          if (prop === 'then') return (res: (v: unknown) => unknown) => res(m.resolve(table, rec.calls));
          return (...args: unknown[]) => { rec.calls.push([String(prop), args]); return p; };
        },
      });
      return p;
    },
  };
}
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({ requireProfile: async () => m.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => fakeDb() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => fakeDb() }));
vi.mock('@/lib/booking/book.server', () => m.book);
vi.mock('@/lib/booking/slots.server', () => ({ getSlots: vi.fn() }));
vi.mock('@/lib/booking/notify.server', () => ({ notifyBookingSoon: m.notify }));
vi.mock('@/lib/notifications/outbox', () => ({ flushNotificationsSoon: vi.fn() }));
vi.mock('@/lib/calendar/sync.server', () => ({ flushCalendarSyncSoon: vi.fn() }));

import * as actions from '@/lib/actions/booking';

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const CAL_TEAM = { id: U(1), kind: 'team', contractor_id: null, name: 'HomeQuote team', timezone: TZ, duration_minutes: 30 };
const CAL_A = { id: U(2), kind: 'contractor', contractor_id: 'cA', name: 'Pool Masters LA', timezone: TZ, duration_minutes: 30 };
const OWNER_A = { id: U(10), role: 'contractor', contractor_id: 'cA', contractor_role: 'owner' };
const SETTER = { id: U(11), role: 'setter', contractor_id: null, contractor_role: null };
const APPT = U(20);
const SALES = U(21);

/** What the user's client "sees": an appointment on `calendar`, optionally via an assignment of `asgContractor`. */
function world(opts: { appt?: Record<string, unknown> | null; calendars?: Record<string, unknown>[]; sales?: Record<string, unknown> | null; updated?: boolean }) {
  m.resolve = (table, calls) => {
    const eq = calls.find(([n, a]) => n === 'eq' && a[0] === 'id')?.[1][1];
    if (table === 'booking_calendars') return { data: (opts.calendars ?? []).find((c) => c.id === eq) ?? null, error: null };
    if (table === 'appointments' && calls.some(([n]) => n === 'update')) return { data: opts.updated === false ? [] : [{ id: eq }], error: null };
    if (table === 'appointments') return { data: opts.appt ?? null, error: null };
    if (table === 'prospect_sales_appointments' && calls.some(([n]) => n === 'update')) return { data: opts.updated === false ? [] : [{ id: eq }], error: null };
    if (table === 'prospect_sales_appointments') return { data: opts.sales ?? null, error: null };
    return { data: null, error: null };
  };
}
const writes = (table: string, op: 'update' | 'insert') => m.calls.filter((c) => c.table === table && c.calls.some(([n]) => n === op)).map((c) => c.calls.find(([n]) => n === op)![1][0]);

beforeEach(() => {
  m.calls.length = 0;
  m.notify.mockReset();
  for (const f of Object.values(m.book)) f.mockReset();
});

describe('reschedule / cancel / status actions', () => {
  it('lets a contractor reschedule a call on its own calendar and tells the homeowner', async () => {
    m.profile = OWNER_A;
    world({ calendars: [CAL_A], appt: { id: APPT, calendar_id: CAL_A.id, lead_id: 'L1', scheduled_at: '2026-11-03T17:00:00Z', status: 'scheduled', assignment: { contractor_id: 'cA', lead_id: 'L1' } } });
    m.book.rescheduleAppointment.mockResolvedValue({ ok: true, id: APPT, startsAt: '2026-11-03T18:00:00.000Z', previousStartsAt: '2026-11-03T17:00:00.000Z' });
    const r = await actions.rescheduleCalendarEvent({ kind: 'appointment', id: APPT, startsAt: '2026-11-03T18:00:00Z', override: true });
    expect(r).toEqual({ ok: true, startsAt: '2026-11-03T18:00:00.000Z' });
    // A contractor's "book anyway" is ignored.
    expect(m.book.rescheduleAppointment).toHaveBeenCalledWith(APPT, '2026-11-03T18:00:00Z', { actorId: OWNER_A.id, actorKind: 'user', override: false });
    expect(m.notify).toHaveBeenCalledWith({ kind: 'appointment', id: APPT, change: 'rescheduled', previousStartsAt: '2026-11-03T17:00:00.000Z', actorKind: 'user' });
  });

  it('never lets a contractor change a team call it can see through its assignment', async () => {
    m.profile = OWNER_A;
    world({ calendars: [CAL_TEAM], appt: { id: APPT, calendar_id: CAL_TEAM.id, lead_id: 'L1', scheduled_at: '2026-11-03T17:00:00Z', status: 'scheduled', assignment: { contractor_id: 'cA' } } });
    expect((await actions.cancelCalendarEvent({ kind: 'appointment', id: APPT })).ok).toBe(false);
    expect((await actions.rescheduleCalendarEvent({ kind: 'appointment', id: APPT, startsAt: '2026-11-03T18:00:00Z' })).ok).toBe(false);
    expect(m.book.cancelAppointment).not.toHaveBeenCalled();
    expect(m.book.rescheduleAppointment).not.toHaveBeenCalled();
    // Nor a sales meeting, ever.
    world({ sales: { id: SALES, calendar_id: null, scheduled_at: '2026-11-03T17:00:00Z', status: 'scheduled' } });
    expect((await actions.cancelCalendarEvent({ kind: 'sales_appointment', id: SALES })).ok).toBe(false);
  });

  it('passes staff overrides through and turns slot errors into "pick another time"', async () => {
    m.profile = SETTER;
    world({ calendars: [CAL_TEAM], appt: { id: APPT, calendar_id: CAL_TEAM.id, lead_id: 'L1', scheduled_at: '2026-11-03T17:00:00Z', status: 'scheduled', assignment: null } });
    m.book.rescheduleAppointment.mockResolvedValue({ ok: false, error: 'slot_taken' });
    expect(await actions.rescheduleCalendarEvent({ kind: 'appointment', id: APPT, startsAt: '2026-11-03T18:00:00Z', override: true }))
      .toEqual({ ok: false, error: 'Sorry, someone just booked that time. Please pick another time.', pickAnother: true });
    expect(m.book.rescheduleAppointment.mock.calls[0][2]).toMatchObject({ override: true });
    expect(m.notify).not.toHaveBeenCalled();
  });

  it('refuses to reschedule an on-site visit (it has no calendar) but can cancel it', async () => {
    m.profile = OWNER_A;
    world({ appt: { id: APPT, calendar_id: null, lead_id: 'L1', scheduled_at: '2026-11-03T17:00:00Z', status: 'scheduled', assignment: { contractor_id: 'cA', lead_id: 'L1' } } });
    expect(await actions.rescheduleCalendarEvent({ kind: 'visit', id: APPT, startsAt: '2026-11-03T18:00:00Z' }))
      .toEqual({ ok: false, error: 'This appointment is not on a booking calendar. Change it from the lead.' });
    m.book.cancelAppointment.mockResolvedValue({ ok: true, id: APPT });
    expect(await actions.cancelCalendarEvent({ kind: 'visit', id: APPT, reason: '  Rained out ' })).toEqual({ ok: true });
    expect(m.book.cancelAppointment).toHaveBeenCalledWith(APPT, 'Rained out', { actorId: OWNER_A.id, actorKind: 'user' });
    expect(m.notify).not.toHaveBeenCalled(); // visits are not calendar bookings: their notices stay with workflows
    // Another company's visit.
    world({ appt: { id: APPT, calendar_id: null, lead_id: 'L1', scheduled_at: '2026-11-03T17:00:00Z', status: 'scheduled', assignment: { contractor_id: 'cB' } } });
    expect((await actions.cancelCalendarEvent({ kind: 'visit', id: APPT })).ok).toBe(false);
  });

  it('cancels a sales meeting for staff, once', async () => {
    m.profile = SETTER;
    world({ sales: { id: SALES, calendar_id: null, scheduled_at: '2026-11-03T17:00:00Z', status: 'scheduled' } });
    m.book.cancelSalesAppointment.mockResolvedValue({ ok: true, id: SALES, already: true });
    expect(await actions.cancelCalendarEvent({ kind: 'sales_appointment', id: SALES })).toEqual({ ok: true });
    expect(m.notify).not.toHaveBeenCalled(); // `already`: nothing new to tell anyone
  });

  it('records held on a contractor call (lead completed) but not on a team call', async () => {
    m.profile = OWNER_A;
    world({ calendars: [CAL_A], appt: { id: APPT, calendar_id: CAL_A.id, lead_id: 'L1', scheduled_at: '2026-10-01T17:00:00Z', status: 'scheduled', assignment: { contractor_id: 'cA' } } });
    expect(await actions.setCalendarEventStatus({ kind: 'appointment', id: APPT, status: 'held' })).toEqual({ ok: true });
    expect(writes('appointments', 'update')).toEqual([{ status: 'held' }]);
    expect(writes('leads', 'update')).toEqual([{ status: 'appointment_completed' }]);
    expect(writes('lead_activities', 'insert')[0]).toMatchObject({ lead_id: 'L1', actor_id: OWNER_A.id, body: 'Appointment completed', metadata: { appointment_id: APPT, contractor_id: 'cA' } });

    m.calls.length = 0;
    m.profile = SETTER;
    world({ calendars: [CAL_TEAM], appt: { id: APPT, calendar_id: CAL_TEAM.id, lead_id: 'L1', scheduled_at: '2026-10-01T17:00:00Z', status: 'scheduled', assignment: null } });
    expect(await actions.setCalendarEventStatus({ kind: 'appointment', id: APPT, status: 'held' })).toEqual({ ok: true });
    expect(writes('leads', 'update')).toEqual([]);
    expect(writes('lead_activities', 'insert')[0]).toMatchObject({ body: 'Call with the HomeQuote team held', metadata: { appointment_id: APPT } });
    expect((writes('lead_activities', 'insert')[0] as any).metadata.contractor_id).toBeUndefined();

    expect((await actions.setCalendarEventStatus({ kind: 'appointment', id: APPT, status: 'cancelled' })).ok).toBe(false);
    expect((await actions.setCalendarEventStatus({ kind: 'appointment', id: APPT, status: 'completed' })).ok).toBe(false);
  });

  it('leaves sales meeting status to the RLS write rule (admin or the booking setter)', async () => {
    m.profile = SETTER;
    world({ sales: { id: SALES, calendar_id: null, scheduled_at: '2026-10-01T17:00:00Z', status: 'confirmed' }, updated: false });
    expect(await actions.setCalendarEventStatus({ kind: 'sales_appointment', id: SALES, status: 'completed' }))
      .toEqual({ ok: false, error: 'Only an admin or the setter who booked this meeting can change it.' });
    world({ sales: { id: SALES, calendar_id: null, scheduled_at: '2026-10-01T17:00:00Z', status: 'cancelled' } });
    expect((await actions.setCalendarEventStatus({ kind: 'sales_appointment', id: SALES, status: 'no_show' })).ok).toBe(false);
  });

  it('turns callers away and ignores malformed ids', async () => {
    m.profile = { id: U(12), role: 'caller', contractor_id: null, contractor_role: null };
    expect((await actions.cancelCalendarEvent({ kind: 'appointment', id: APPT })).ok).toBe(false);
    m.profile = SETTER;
    expect((await actions.cancelCalendarEvent({ kind: 'appointment', id: 'nope' })).ok).toBe(false);
    expect(m.calls).toHaveLength(0);
  });
});
