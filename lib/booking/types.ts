/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import type { CalendarHostFields } from './host-contact';
/**
 * HomeQuote-native booking calendars (migration 0070). Shared types, error
 * codes and row mappers. Times are UTC ISO strings / epoch ms everywhere;
 * wall-clock minutes only appear in rules, in the calendar's own zone.
 */

export type CalendarKind = 'contractor' | 'team' | 'sales';
export type MeetingType = 'phone' | 'video';

/** appointments.source (homeowner) — prospect_sales_appointments.source allows sales_funnel/manual/ai/workflow. */
export type BookingSource = 'funnel' | 'estimator' | 'manual' | 'sales_funnel' | 'ai' | 'workflow';
export type SalesBookingSource = 'sales_funnel' | 'manual' | 'ai' | 'workflow';

/** Who acted. 'homeowner' is recorded on the workflow ledger as actor_type 'contact'. */
export type BookingActorKind = 'homeowner' | 'user' | 'system' | 'workflow' | 'integration';

export interface BookingCalendar {
  id: string;
  kind: CalendarKind;
  contractorId: string | null;
  name: string;
  timezone: string;
  durationMinutes: number;
  slotStepMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  horizonDays: number;
  maxPerDay: number | null;
  meetingType: MeetingType;
  videoLink: string | null;
  active: boolean;
  /** Who calls the homeowner (contact card, wording); see host-contact.ts. Null fields use its defaults. */
  host: CalendarHostFields;
}

export interface CalendarRule {
  id?: string;
  weekday: number; // 0 = Sunday
  startMinute: number;
  endMinute: number;
}

export interface CalendarException {
  id?: string;
  kind: 'blocked' | 'available';
  dateStart: string; // yyyy-mm-dd, calendar zone
  dateEnd: string;
  startMinute: number | null; // null = all day
  endMinute: number | null;
  note?: string | null;
  repeatWeekly: boolean;
  repeatUntil: string | null;
}

/** A row of booking_calendar_busy(): a live booking that occupies the calendar. */
export interface BusyBooking {
  kind: 'appointment' | 'sales_appointment';
  id: string;
  startMs: number;
  endMs: number;
}

/** Why a slot cannot be booked (same codes as SQL booking_slot_problem, plus calendar_busy from Google). */
export type SlotProblem =
  | 'calendar_not_found'
  | 'calendar_inactive'
  | 'invalid_time'
  | 'too_soon'
  | 'too_far'
  | 'blocked_time'
  | 'outside_hours'
  | 'slot_taken'
  | 'daily_cap'
  | 'calendar_busy';

/** Every error code the booking RPCs / helpers can return. */
export type BookingError =
  | SlotProblem
  | 'invalid_source'
  | 'invalid_token'
  | 'wrong_calendar'
  | 'session_invalid'
  | 'session_incomplete'
  | 'not_qualified'
  | 'already_booked'
  | 'lead_not_found'
  | 'assignment_mismatch'
  | 'submission_invalid'
  | 'prospect_required'
  | 'not_found'
  | 'not_bookable'
  | 'not_active'
  | 'unavailable';

/** Plain-English messages safe to show a homeowner. */
export const BOOKING_ERROR_MESSAGES: Record<BookingError, string> = {
  calendar_not_found: 'This calendar is not available.',
  calendar_inactive: 'This calendar is not taking bookings right now.',
  invalid_time: 'Please pick a valid time.',
  too_soon: 'That time is too soon. Please pick a later time.',
  too_far: 'That time is too far ahead. Please pick an earlier time.',
  blocked_time: 'That time is not available. Please pick another time.',
  outside_hours: 'That time is outside the available hours. Please pick another time.',
  slot_taken: 'Sorry, someone just booked that time. Please pick another time.',
  daily_cap: 'That day is fully booked. Please pick another day.',
  calendar_busy: 'That time is no longer available. Please pick another time.',
  invalid_source: 'This booking could not be saved.',
  invalid_token: 'This booking could not be saved.',
  wrong_calendar: 'This calendar cannot be booked here.',
  session_invalid: 'Your session has expired. Please refresh the page and try again.',
  session_incomplete: 'Please finish the form before booking.',
  not_qualified: 'Booking is not available for this request.',
  already_booked: 'You already have a call booked.',
  lead_not_found: 'This booking could not be matched to a request.',
  assignment_mismatch: 'This booking could not be matched to a request.',
  submission_invalid: 'Your session has expired. Please refresh the page and try again.',
  prospect_required: 'This booking could not be matched to a company.',
  not_found: 'We could not find this appointment.',
  not_bookable: 'This appointment cannot be changed online. Please contact us.',
  not_active: 'This appointment can no longer be changed.',
  unavailable: 'Booking is temporarily unavailable. Please try again in a moment.',
};

/** Slot problems a reschedule/book retry can fix by choosing another time. */
export const PICK_ANOTHER_TIME: ReadonlySet<BookingError> = new Set<BookingError>([
  'too_soon', 'too_far', 'blocked_time', 'outside_hours', 'slot_taken', 'daily_cap', 'calendar_busy', 'invalid_time',
]);

export type BookResult =
  | { ok: true; appointmentId: string; startsAt: string; endsAt: string; calendarId: string; timeZone: string; manageToken: string | null }
  | { ok: false; error: BookingError; appointmentId?: string | null };

export type SalesBookResult =
  | { ok: true; salesAppointmentId: string; prospectId: string; startsAt: string; endsAt: string; calendarId: string; timeZone: string; manageToken: string | null }
  | { ok: false; error: BookingError; salesAppointmentId?: string | null };

export type ChangeResult =
  | { ok: true; id: string; startsAt?: string; endsAt?: string; previousStartsAt?: string; unchanged?: boolean; already?: boolean }
  | { ok: false; error: BookingError };

export interface Slot {
  startMs: number;
  endMs: number;
}

/**
 * Column defaults (also the HomeQuote sales calendar: 30-minute calls with
 * contractor prospects). Homeowner calendars use HOMEOWNER_CALL below.
 */
export const DEFAULT_CALENDAR: Omit<BookingCalendar, 'id' | 'kind' | 'contractorId' | 'name' | 'host'> = {
  timezone: 'America/Los_Angeles',
  durationMinutes: 30,
  slotStepMinutes: 30,
  bufferMinutes: 15,
  minNoticeMinutes: 120,
  horizonDays: 14,
  maxPerDay: null,
  meetingType: 'phone',
  videoLink: null,
  active: true,
};

/**
 * Homeowner calls (HomeQuote team calendar, every contractor calendar; owner's
 * decision 2026-10-29): Liam calls each homeowner for a quick 10-minute call to
 * qualify and book the on-site visit. Starts every 15 minutes (9:00, 9:15 …)
 * with 5 minutes between calls. Seeded in 0070 and used by
 * ensure_contractor_booking_calendar.
 */
export const HOMEOWNER_CALL = { durationMinutes: 10, slotStepMinutes: 15, bufferMinutes: 5 } as const;

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

export function mapHostFields(r: Record<string, any>): CalendarHostFields {
  return {
    displayName: text(r.host_display_name),
    firstName: text(r.host_first_name),
    org: text(r.host_org),
    phone: text(r.host_phone),
    email: text(r.host_email),
    photoPath: text(r.host_photo_path),
    note: text(r.host_note),
  };
}

export function mapCalendar(r: Record<string, any>): BookingCalendar {
  return {
    id: r.id,
    kind: r.kind,
    contractorId: r.contractor_id ?? null,
    name: r.name,
    timezone: r.timezone ?? DEFAULT_CALENDAR.timezone,
    durationMinutes: r.duration_minutes ?? DEFAULT_CALENDAR.durationMinutes,
    slotStepMinutes: r.slot_step_minutes ?? DEFAULT_CALENDAR.slotStepMinutes,
    bufferMinutes: r.buffer_minutes ?? DEFAULT_CALENDAR.bufferMinutes,
    minNoticeMinutes: r.min_notice_minutes ?? DEFAULT_CALENDAR.minNoticeMinutes,
    horizonDays: r.horizon_days ?? DEFAULT_CALENDAR.horizonDays,
    maxPerDay: r.max_per_day ?? null,
    meetingType: r.meeting_type === 'video' ? 'video' : 'phone',
    videoLink: r.video_link ?? null,
    active: r.active !== false,
    host: mapHostFields(r),
  };
}

export function mapRule(r: Record<string, any>): CalendarRule {
  return { id: r.id, weekday: r.weekday, startMinute: r.start_minute, endMinute: r.end_minute };
}

/** yyyy-mm-dd from a date column (PostgREST sends 'yyyy-mm-dd'; tolerate ISO timestamps too). */
const dateOnly = (v: unknown): string => String(v ?? '').slice(0, 10);

export function mapCalendarException(r: Record<string, any>): CalendarException {
  return {
    id: r.id,
    kind: r.kind,
    dateStart: dateOnly(r.date_start),
    dateEnd: dateOnly(r.date_end),
    startMinute: r.start_minute,
    endMinute: r.end_minute,
    note: r.note,
    repeatWeekly: !!r.repeat_weekly,
    repeatUntil: r.repeat_until ? dateOnly(r.repeat_until) : null,
  };
}

export function mapBusy(r: Record<string, any>): BusyBooking {
  return { kind: r.kind, id: r.id, startMs: new Date(r.starts_at).getTime(), endMs: new Date(r.ends_at).getTime() };
}

const KNOWN_ERRORS = new Set(Object.keys(BOOKING_ERROR_MESSAGES));
export function asBookingError(code: unknown): BookingError {
  return typeof code === 'string' && KNOWN_ERRORS.has(code) ? (code as BookingError) : 'unavailable';
}
