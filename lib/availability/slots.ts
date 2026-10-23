import { addDays, localParts, weekdayOfDate, zonedToUtc } from './time';

export interface AvailabilitySettings {
  timezone: string;
  weeklyScheduleEnabled: boolean;
  minNoticeHours: number;
  bufferMinutes: number;
  maxAppointmentsPerDay: number | null;
  defaultDurationMinutes: number;
}

export interface WeeklyRule {
  weekday: number; // 0 = Sunday
  startMinute: number;
  endMinute: number;
}

export interface AvailabilityException {
  id?: string;
  kind: 'blocked' | 'available';
  dateStart: string; // yyyy-mm-dd
  dateEnd: string;
  startMinute: number | null; // null = all day
  endMinute: number | null;
  note?: string | null;
  repeatWeekly: boolean;
  repeatUntil: string | null;
}

/** An existing appointment of this contractor. */
export interface BookedAppointment {
  id?: string;
  startMs: number;
  endMs: number;
}

export interface BusyInterval {
  startMs: number;
  endMs: number;
}

export const DEFAULT_SETTINGS: AvailabilitySettings = {
  timezone: 'America/Los_Angeles',
  weeklyScheduleEnabled: false,
  minNoticeHours: 0,
  bufferMinutes: 0,
  maxAppointmentsPerDay: null,
  defaultDurationMinutes: 60,
};

/**
 * Hours used for a contractor who has never configured availability:
 * Sun 9–7, Mon–Thu 9–6:30, Fri 9–3, Saturday off. Saving anything on the
 * Availability page replaces these with the contractor's own choices.
 */
export const DEFAULT_WEEKLY_RULES: WeeklyRule[] = [
  { weekday: 0, startMinute: 9 * 60, endMinute: 19 * 60 },
  { weekday: 1, startMinute: 9 * 60, endMinute: 18 * 60 + 30 },
  { weekday: 2, startMinute: 9 * 60, endMinute: 18 * 60 + 30 },
  { weekday: 3, startMinute: 9 * 60, endMinute: 18 * 60 + 30 },
  { weekday: 4, startMinute: 9 * 60, endMinute: 18 * 60 + 30 },
  { weekday: 5, startMinute: 9 * 60, endMinute: 15 * 60 },
];

export type UnavailableReason =
  | 'too_soon'
  | 'blocked_time'
  | 'outside_hours'
  | 'conflict'
  | 'daily_cap'
  | 'calendar_busy';

export const REASON_LABELS: Record<UnavailableReason, string> = {
  too_soon: 'inside the contractor’s minimum notice period',
  blocked_time: 'a time the contractor blocked off',
  outside_hours: 'outside the contractor’s available hours',
  conflict: 'too close to another appointment',
  daily_cap: 'over the contractor’s daily appointment limit',
  calendar_busy: 'busy on the contractor’s connected calendar',
};

export interface AvailabilityContext {
  settings: AvailabilitySettings;
  rules: WeeklyRule[];
  exceptions: AvailabilityException[];
  appointments: BookedAppointment[];
  externalBusy: BusyInterval[];
  nowMs: number;
}

export interface Interval {
  startMs: number;
  endMs: number;
}

export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = list.filter((i) => i.endMs > i.startMs).sort((a, b) => a.startMs - b.startMs);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.startMs <= last.endMs) last.endMs = Math.max(last.endMs, i.endMs);
    else out.push({ ...i });
  }
  return out;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

/** True when `[startMs, endMs)` is fully inside one of the merged intervals. */
function covered(target: Interval, merged: Interval[]): boolean {
  return merged.some((i) => i.startMs <= target.startMs && i.endMs >= target.endMs);
}

export function exceptionAppliesOn(e: AvailabilityException, date: string): boolean {
  if (date >= e.dateStart && date <= e.dateEnd) return true;
  if (e.repeatWeekly && date > e.dateStart && (!e.repeatUntil || date <= e.repeatUntil)) {
    return weekdayOfDate(date) === weekdayOfDate(e.dateStart);
  }
  return false;
}

function dayInterval(date: string, startMinute: number | null, endMinute: number | null, tz: string): Interval {
  if (startMinute === null || endMinute === null) {
    return { startMs: zonedToUtc(date, 0, tz), endMs: zonedToUtc(addDays(date, 1), 0, tz) };
  }
  const startMs = zonedToUtc(date, startMinute, tz);
  const endMs = endMinute >= 1440 ? zonedToUtc(addDays(date, 1), 0, tz) : zonedToUtc(date, endMinute, tz);
  return { startMs, endMs };
}

/** Local calendar dates touched by [startMs, endMs), padded by a day each side. */
function datesAround(startMs: number, endMs: number, tz: string): string[] {
  const first = addDays(localParts(startMs, tz).date, -1);
  const last = addDays(localParts(Math.max(startMs, endMs - 1), tz).date, 1);
  const out: string[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Blocked and extra-available UTC intervals across the given dates. */
function exceptionIntervals(ctx: AvailabilityContext, dates: string[]) {
  const tz = ctx.settings.timezone;
  const blocked: Interval[] = [];
  const extra: Interval[] = [];
  for (const date of dates) {
    for (const e of ctx.exceptions) {
      if (!exceptionAppliesOn(e, date)) continue;
      const iv = dayInterval(date, e.startMinute, e.endMinute, tz);
      (e.kind === 'blocked' ? blocked : extra).push(iv);
    }
  }
  return { blocked: mergeIntervals(blocked), extra: mergeIntervals(extra) };
}

function weeklyIntervals(ctx: AvailabilityContext, dates: string[]): Interval[] {
  const tz = ctx.settings.timezone;
  const out: Interval[] = [];
  for (const date of dates) {
    const wd = weekdayOfDate(date);
    for (const r of ctx.rules) {
      if (r.weekday === wd) out.push(dayInterval(date, r.startMinute, r.endMinute, tz));
    }
  }
  return out;
}

/**
 * Why `[startMs, startMs + durationMs)` cannot be booked for this contractor, or
 * null if it can. `excludeAppointmentId` lets a reschedule ignore its own row.
 * With no weekly schedule, no exceptions and no limits configured this always
 * returns null (a contractor who has set nothing is unrestricted).
 */
export function unavailableReason(
  ctx: AvailabilityContext,
  startMs: number,
  durationMinutes?: number,
  excludeAppointmentId?: string
): UnavailableReason | null {
  const { settings } = ctx;
  const tz = settings.timezone;
  const durationMs = (durationMinutes ?? settings.defaultDurationMinutes) * 60_000;
  const target: Interval = { startMs, endMs: startMs + durationMs };

  if (settings.minNoticeHours > 0 && startMs < ctx.nowMs + settings.minNoticeHours * 3_600_000) {
    return 'too_soon';
  }

  const dates = datesAround(target.startMs, target.endMs, tz);
  const { blocked, extra } = exceptionIntervals(ctx, dates);
  if (blocked.some((b) => overlaps(b, target))) return 'blocked_time';

  if (settings.weeklyScheduleEnabled) {
    const allowed = mergeIntervals([...weeklyIntervals(ctx, dates), ...extra]);
    if (!covered(target, allowed)) return 'outside_hours';
  }

  const bufferMs = settings.bufferMinutes * 60_000;
  const others = ctx.appointments.filter((a) => !excludeAppointmentId || a.id !== excludeAppointmentId);
  if (others.some((a) => a.startMs < target.endMs + bufferMs && target.startMs < a.endMs + bufferMs)) {
    return 'conflict';
  }

  if (settings.maxAppointmentsPerDay !== null) {
    const day = localParts(startMs, tz).date;
    const sameDay = others.filter((a) => localParts(a.startMs, tz).date === day).length;
    if (sameDay >= settings.maxAppointmentsPerDay) return 'daily_cap';
  }

  if (ctx.externalBusy.some((b) => overlaps(b, target))) return 'calendar_busy';
  return null;
}

export interface Slot {
  startMs: number;
  endMs: number;
}

/**
 * Bookable start times between two instants on a fixed step (default 30 min),
 * for showing "open slots" to staff.
 */
export function bookableSlots(
  ctx: AvailabilityContext,
  fromMs: number,
  toMs: number,
  opts: { stepMinutes?: number; durationMinutes?: number } = {}
): Slot[] {
  const step = (opts.stepMinutes ?? 30) * 60_000;
  const duration = (opts.durationMinutes ?? ctx.settings.defaultDurationMinutes) * 60_000;
  const out: Slot[] = [];
  const first = Math.ceil(fromMs / step) * step;
  for (let t = first; t + duration <= toMs; t += step) {
    if (unavailableReason(ctx, t, opts.durationMinutes) === null) out.push({ startMs: t, endMs: t + duration });
  }
  return out;
}

/**
 * The UTC intervals in [fromMs, toMs) the contractor has marked unavailable or
 * is busy (blocked exceptions, outside weekly hours, external calendar busy,
 * existing appointments with their buffer). Used for greying out a timeline.
 */
export function unavailableIntervals(ctx: AvailabilityContext, fromMs: number, toMs: number): Interval[] {
  const tz = ctx.settings.timezone;
  const dates = datesAround(fromMs, toMs, tz);
  const { blocked, extra } = exceptionIntervals(ctx, dates);
  const out: Interval[] = [...blocked];
  if (ctx.settings.weeklyScheduleEnabled) {
    const allowed = mergeIntervals([...weeklyIntervals(ctx, dates), ...extra]);
    let cursor = fromMs;
    for (const a of allowed) {
      if (a.endMs <= cursor) continue;
      if (a.startMs > cursor) out.push({ startMs: cursor, endMs: Math.min(a.startMs, toMs) });
      cursor = Math.max(cursor, a.endMs);
      if (cursor >= toMs) break;
    }
    if (cursor < toMs) out.push({ startMs: cursor, endMs: toMs });
  }
  const bufferMs = ctx.settings.bufferMinutes * 60_000;
  for (const a of ctx.appointments) out.push({ startMs: a.startMs - bufferMs, endMs: a.endMs + bufferMs });
  for (const b of ctx.externalBusy) out.push(b);
  return mergeIntervals(out.map((i) => ({ startMs: Math.max(i.startMs, fromMs), endMs: Math.min(i.endMs, toMs) })));
}
