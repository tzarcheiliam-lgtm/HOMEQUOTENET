/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapCalendar, mapCalendarException, mapRule, type BookingCalendar, type CalendarException, type CalendarRule } from './types';

type Db = ReturnType<typeof createAdminClient>;

/**
 * Calendar lookups and "whose calendar does this booking go on" resolution.
 * Service role: callers authorize the user (or verify the funnel session /
 * manage token) first.
 *   - a funnel or estimator tied to one contractor  -> that contractor's calendar
 *     (created with the default hours the first time it is needed)
 *   - a network funnel with no contractor yet       -> the HomeQuote team calendar
 *   - the contractor sales funnel                   -> the HomeQuote sales calendar
 */

export async function getCalendar(id: string, db: Db = createAdminClient()): Promise<BookingCalendar | null> {
  const { data } = await db.from('booking_calendars').select('*').eq('id', id).maybeSingle();
  return data ? mapCalendar(data) : null;
}

async function singleton(kind: 'team' | 'sales', db: Db): Promise<BookingCalendar | null> {
  const { data } = await db.from('booking_calendars').select('*').eq('kind', kind).limit(1).maybeSingle();
  return data ? mapCalendar(data) : null;
}

export const getTeamCalendar = (db: Db = createAdminClient()) => singleton('team', db);
export const getSalesCalendar = (db: Db = createAdminClient()) => singleton('sales', db);

/** The contractor's calendar; with `create`, made on first use (ensure_contractor_booking_calendar). */
export async function getContractorCalendar(
  contractorId: string,
  opts: { create?: boolean; db?: Db } = {}
): Promise<BookingCalendar | null> {
  const db = opts.db ?? createAdminClient();
  const { data } = await db.from('booking_calendars').select('*').eq('kind', 'contractor').eq('contractor_id', contractorId).maybeSingle();
  if (data) return mapCalendar(data);
  if (!opts.create) return null;
  const { data: id, error } = await db.rpc('ensure_contractor_booking_calendar', { p_contractor: contractorId });
  if (error || !id) return null;
  return getCalendar(id as string, db);
}

/**
 * The calendar a homeowner funnel / estimator books into. A contractor funnel
 * whose calendar was switched off falls back to nothing (never silently to the
 * team) so the page can show its fallback instead.
 */
export async function calendarForFunnel(
  funnel: { contractorId?: string | null },
  db: Db = createAdminClient()
): Promise<BookingCalendar | null> {
  const cal = funnel.contractorId ? await getContractorCalendar(funnel.contractorId, { create: true, db }) : await getTeamCalendar(db);
  return cal && cal.active ? cal : null;
}

/** Estimators resolve exactly like funnels (they run on funnel sessions). */
export const calendarForEstimator = calendarForFunnel;

/** The contractor sales funnel books the HomeQuote sales calendar. */
export async function calendarForContractorFunnel(db: Db = createAdminClient()): Promise<BookingCalendar | null> {
  const cal = await getSalesCalendar(db);
  return cal && cal.active ? cal : null;
}

export async function loadCalendarRules(
  calendarId: string,
  db: Db = createAdminClient()
): Promise<{ rules: CalendarRule[]; exceptions: CalendarException[] }> {
  const [r, e] = await Promise.all([
    db.from('booking_calendar_rules').select('*').eq('calendar_id', calendarId).order('weekday').order('start_minute'),
    db.from('booking_calendar_exceptions').select('*').eq('calendar_id', calendarId).order('date_start'),
  ]);
  return {
    rules: ((r.data ?? []) as any[]).map(mapRule),
    exceptions: ((e.data ?? []) as any[]).map(mapCalendarException),
  };
}

/** Host user ids (notify = true only, unless `all`). */
export async function calendarMembers(calendarId: string, opts: { all?: boolean; db?: Db } = {}): Promise<string[]> {
  const db = opts.db ?? createAdminClient();
  let q = db.from('booking_calendar_members').select('user_id, notify').eq('calendar_id', calendarId);
  if (!opts.all) q = q.eq('notify', true);
  const { data } = await q;
  return ((data ?? []) as any[]).map((m) => m.user_id as string);
}

/** Calendars the signed-in user may see, through THEIR client (RLS: staff all, contractors their own). */
export async function listVisibleCalendars(userDb: any): Promise<BookingCalendar[]> {
  const { data } = await userDb.from('booking_calendars').select('*').order('kind').order('name');
  return ((data ?? []) as any[]).map(mapCalendar);
}
