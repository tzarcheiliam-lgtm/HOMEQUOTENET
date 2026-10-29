/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getExternalBusy } from '@/lib/calendar/busy.server';
import { accessTokenFor, CONNECTION_COLUMNS, recordConnectionError, type ConnectionRow } from '@/lib/calendar/connections.server';
import { CalendarAuthError, queryFreeBusy } from '@/lib/calendar/google';
import { getCalendar, loadCalendarRules } from './calendars.server';
import { calendarSlots, slotProblem, type CalendarState } from './slots';
import { mapBusy, type BookingCalendar, type BusyBooking, type Slot, type SlotProblem } from './types';

type Db = ReturnType<typeof createAdminClient>;

/** Padding so buffers and the daily cap around the window are seen. */
const PAD_MS = 36 * 3_600_000;

/** Live bookings on the calendar (the same rows the SQL re-check uses). */
export async function loadBusy(db: Db, calendarId: string, fromMs: number, toMs: number, excludeId?: string): Promise<BusyBooking[]> {
  const { data, error } = await db.rpc('booking_calendar_busy', {
    p_calendar: calendarId,
    p_from: new Date(fromMs).toISOString(),
    p_to: new Date(toMs).toISOString(),
    p_exclude: excludeId ?? null,
  });
  if (error) throw new Error(`booking busy lookup failed: ${error.message}`);
  return ((Array.isArray(data) ? data : []) as any[]).map(mapBusy);
}

/**
 * Busy time from the hosts' connected Google calendars. A contractor calendar
 * reads the company's connections (as availability does); team / sales read
 * their members' own connections. A calendar outage never blocks booking.
 */
export async function loadHostBusy(db: Db, calendar: BookingCalendar, fromMs: number, toMs: number): Promise<{ startMs: number; endMs: number }[]> {
  try {
    if (calendar.kind === 'contractor' && calendar.contractorId) return await getExternalBusy(calendar.contractorId, fromMs, toMs, db);
    const { data: members } = await db.from('booking_calendar_members').select('user_id').eq('calendar_id', calendar.id);
    const ids = ((members ?? []) as any[]).map((m) => m.user_id as string);
    if (!ids.length) return [];
    const { data } = await db
      .from('calendar_connections')
      .select(CONNECTION_COLUMNS)
      .in('user_id', ids)
      .eq('provider', 'google')
      .eq('status', 'active')
      .eq('import_busy', true);
    const out: { startMs: number; endMs: number }[] = [];
    for (const c of (data ?? []) as ConnectionRow[]) {
      try {
        out.push(...(await queryFreeBusy(await accessTokenFor(db, c), c.calendar_id, fromMs, toMs)));
      } catch (e) {
        if (!(e instanceof CalendarAuthError)) await recordConnectionError(db, c.id, e instanceof Error ? e.message : 'Calendar busy lookup failed');
      }
    }
    return out;
  } catch {
    return [];
  }
}

export interface LoadOptions {
  db?: Db;
  /** Read hosts' Google busy time (default true). */
  includeExternalBusy?: boolean;
  /** Ignore this booking (rescheduling it). */
  excludeId?: string;
  nowMs?: number;
}

/** Everything needed to evaluate a window on one calendar. Null for an unknown calendar. */
export async function loadCalendarState(calendarId: string, fromMs: number, toMs: number, opts: LoadOptions = {}): Promise<CalendarState | null> {
  const db = opts.db ?? createAdminClient();
  const calendar = await getCalendar(calendarId, db);
  if (!calendar) return null;
  const [{ rules, exceptions }, busy, externalBusy] = await Promise.all([
    loadCalendarRules(calendarId, db),
    loadBusy(db, calendarId, fromMs - PAD_MS, toMs + PAD_MS, opts.excludeId),
    opts.includeExternalBusy === false ? Promise.resolve([]) : loadHostBusy(db, calendar, fromMs - PAD_MS, toMs + PAD_MS),
  ]);
  return { calendar, rules, exceptions, busy, externalBusy, nowMs: opts.nowMs ?? Date.now() };
}

/**
 * Open start times on a calendar between two instants (defaults: now → the
 * calendar's horizon). This is what the slot picker shows.
 */
export async function getSlots(
  calendarId: string,
  fromMs?: number,
  toMs?: number,
  opts: LoadOptions = {}
): Promise<{ calendar: BookingCalendar; slots: Slot[] } | null> {
  const now = opts.nowMs ?? Date.now();
  const from = fromMs ?? now;
  // The horizon is per calendar; read it first when no end was given.
  const cal = toMs === undefined ? await getCalendar(calendarId, opts.db ?? createAdminClient()) : null;
  const to = toMs ?? now + ((cal?.horizonDays ?? 14) + 1) * 86_400_000;
  const state = await loadCalendarState(calendarId, from, to, { ...opts, nowMs: now });
  if (!state) return null;
  return { calendar: state.calendar, slots: calendarSlots(state, from, to, { excludeId: opts.excludeId }) };
}

/** Pre-check one start time (includes Google busy, which SQL cannot see). */
export async function checkSlot(
  calendarId: string,
  startMs: number,
  opts: LoadOptions & { override?: boolean } = {}
): Promise<SlotProblem | null> {
  const state = await loadCalendarState(calendarId, startMs, startMs + 86_400_000, opts);
  if (!state) return 'calendar_not_found';
  return slotProblem(state, startMs, { excludeId: opts.excludeId, override: opts.override });
}
