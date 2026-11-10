/**
 * Pure slot computation for booking calendars. Mirrors the SQL re-check in
 * booking_slot_problem (migration 0070) and reuses the DST-safe availability
 * engine in lib/availability (rules, exceptions, buffer, daily cap, external busy).
 * The SQL check is the authority at booking time; this only decides what to offer.
 */
import { unavailableReason, type AvailabilityContext } from '@/lib/availability/slots';
import { addDays, localParts, zonedToUtc } from '@/lib/availability/time';
import type { BookingCalendar, BusyBooking, CalendarException, CalendarRule, Slot, SlotProblem } from './types';

export interface CalendarState {
  calendar: BookingCalendar;
  rules: CalendarRule[];
  exceptions: CalendarException[];
  /** Live bookings on the calendar (booking_calendar_busy). */
  busy: BusyBooking[];
  /** Busy time from the hosts' connected calendars (start/end only). */
  externalBusy: { startMs: number; endMs: number }[];
  nowMs: number;
}

/** The lib/availability context for a booking calendar (weekly hours always enforced). */
export function availabilityContext(s: CalendarState, excludeId?: string): AvailabilityContext {
  return {
    settings: {
      timezone: s.calendar.timezone,
      weeklyScheduleEnabled: true,
      // unavailableReason wants hours; fractional hours are fine (it multiplies by 3.6e6).
      minNoticeHours: s.calendar.minNoticeMinutes / 60,
      bufferMinutes: s.calendar.bufferMinutes,
      maxAppointmentsPerDay: s.calendar.maxPerDay,
      defaultDurationMinutes: s.calendar.durationMinutes,
    },
    rules: s.rules.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute })),
    exceptions: s.exceptions.map((e) => ({ ...e, note: e.note ?? null })),
    appointments: s.busy.filter((b) => !excludeId || b.id !== excludeId).map((b) => ({ id: b.id, startMs: b.startMs, endMs: b.endMs })),
    externalBusy: s.externalBusy,
    nowMs: s.nowMs,
  };
}

/**
 * Why a start time cannot be booked (null = bookable). `override` mirrors the
 * staff "book anyway": only a real overlap with another booking still blocks.
 */
export function slotProblem(
  s: CalendarState,
  startMs: number,
  opts: { excludeId?: string; override?: boolean; durationMinutes?: number } = {}
): SlotProblem | null {
  const cal = s.calendar;
  if (!cal.active) return 'calendar_inactive';
  if (!Number.isFinite(startMs)) return 'invalid_time';
  const durationMs = (opts.durationMinutes ?? cal.durationMinutes) * 60_000;
  const endMs = startMs + durationMs;
  const others = s.busy.filter((b) => !opts.excludeId || b.id !== opts.excludeId);

  if (opts.override) {
    return others.some((b) => b.startMs < endMs && startMs < b.endMs) ? 'slot_taken' : null;
  }
  if (startMs < s.nowMs + cal.minNoticeMinutes * 60_000) return 'too_soon';
  if (startMs > s.nowMs + cal.horizonDays * 86_400_000) return 'too_far';

  // A call sits inside one local day (ending exactly at midnight is fine).
  const startLocal = localParts(startMs, cal.timezone);
  const endLocal = localParts(endMs, cal.timezone);
  if (endLocal.date !== startLocal.date && !(endLocal.date === addDays(startLocal.date, 1) && endLocal.minuteOfDay === 0)) {
    return 'outside_hours';
  }

  const reason = unavailableReason(availabilityContext(s, opts.excludeId), startMs, durationMs / 60_000);
  if (reason !== null) return reason === 'conflict' ? 'slot_taken' : reason;
  // Starts sit on the calendar's grid in its own wall clock (as the SQL check requires).
  if (startMs % 60_000 !== 0 || startLocal.minuteOfDay % Math.max(5, cal.slotStepMinutes) !== 0) return 'invalid_time';
  return null;
}

/**
 * Bookable start times in [fromMs, toMs), on the calendar's step in its own wall
 * clock (9:00, 9:30, … local), clipped to notice and horizon.
 */
export function calendarSlots(s: CalendarState, fromMs: number, toMs: number, opts: { excludeId?: string } = {}): Slot[] {
  const cal = s.calendar;
  if (!cal.active) return [];
  const tz = cal.timezone;
  const durationMs = cal.durationMinutes * 60_000;
  const lo = Math.max(fromMs, s.nowMs + cal.minNoticeMinutes * 60_000);
  const hi = Math.min(toMs, s.nowMs + cal.horizonDays * 86_400_000 + durationMs);
  if (hi <= lo) return [];
  const step = Math.max(5, cal.slotStepMinutes);
  const out: Slot[] = [];
  const seen = new Set<number>();
  const lastDate = localParts(hi, tz).date;
  for (let date = localParts(lo, tz).date; date <= lastDate; date = addDays(date, 1)) {
    for (let m = 0; m + cal.durationMinutes <= 1440; m += step) {
      const t = zonedToUtc(date, m, tz);
      // Skip wall times that do not exist (spring-forward gap) and repeats (fall-back overlap).
      if (localParts(t, tz).minuteOfDay !== m || seen.has(t)) continue;
      if (t < lo || t + durationMs > hi) continue;
      seen.add(t);
      if (slotProblem(s, t, { excludeId: opts.excludeId }) === null) out.push({ startMs: t, endMs: t + durationMs });
    }
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

export interface SlotDay {
  /** yyyy-mm-dd in the viewer's zone. */
  date: string;
  slots: Slot[];
}

/** Slots grouped by day in the viewer's zone (the homeowner's browser zone, or the host's). */
export function groupSlotsByDay(slots: Slot[], timeZone: string): SlotDay[] {
  const days = new Map<string, Slot[]>();
  for (const slot of [...slots].sort((a, b) => a.startMs - b.startMs)) {
    const date = localParts(slot.startMs, timeZone).date;
    const list = days.get(date);
    if (list) list.push(slot);
    else days.set(date, [slot]);
  }
  return [...days.entries()].map(([date, list]) => ({ date, slots: list }));
}
