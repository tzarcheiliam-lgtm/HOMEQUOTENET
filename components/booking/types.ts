/**
 * Wire types for the public booking API (app/api/booking/**) shared by the
 * route handlers and the homeowner UI (SlotPicker, BookingFlow, the manage
 * page). Pure: no I/O, safe on both sides. Every time is a UTC ISO string;
 * the UI formats it in the viewer's zone and always shows that zone.
 */
import type { BookingError } from '@/lib/booking/types';

export type PublicMeetingType = 'phone' | 'video' | 'in_person';

/** What the homeowner may know about the calendar they are booking. */
export interface PublicCalendar {
  /** Who the call is with: the contractor's name, "a HomeQuote project specialist", or "HomeQuote". */
  hostName: string;
  kind: 'contractor' | 'team' | 'sales';
  /** The calendar's own zone (hours are set there). */
  timeZone: string;
  durationMinutes: number;
  meetingType: PublicMeetingType;
}

export interface PublicSlot {
  start: string;
  end: string;
}

/** A booked call as the homeowner sees it (confirmation, refresh, manage page). */
export interface PublicBooking {
  status: string;
  startsAt: string;
  endsAt: string;
  /** The calendar's zone. */
  timeZone: string;
  /** The homeowner's zone when we know it. */
  inviteeTimeZone: string | null;
  meetingType: PublicMeetingType;
  hostName: string;
  durationMinutes: number;
  firstName: string | null;
  /** Last four digits of the number we will call, e.g. "0100". */
  phoneHint: string | null;
  videoLink: string | null;
  /** Self-service page (present only right after booking, or on the manage page itself). */
  manageUrl: string | null;
  /** .ics download for Apple / Outlook (same availability as manageUrl). */
  icsUrl: string | null;
  /** Still in the future and scheduled: can be rescheduled or cancelled online. */
  canChange: boolean;
}

export type ApiFailure = { ok: false; error: BookingError | 'rate_limited' | 'invalid_request' | 'forbidden'; message: string };

export type SlotsResponse =
  | {
      ok: true;
      calendar: PublicCalendar;
      slots: PublicSlot[];
      /** Already booked (a refresh after booking): show the confirmation instead of the picker. */
      booked: PublicBooking | null;
      callbackRequested: boolean;
      contact: { firstName: string | null; phoneHint: string | null };
    }
  | ApiFailure;

export type BookResponse =
  | { ok: true; booking: PublicBooking; metaEventId: string | null }
  | (ApiFailure & { booking?: PublicBooking | null; pickAnother?: boolean });

export type CallbackResponse = { ok: true; already: boolean } | ApiFailure;

export type ManageResponse =
  | { ok: true; booking: PublicBooking }
  | (ApiFailure & { pickAnother?: boolean });

export type ManageSlotsResponse =
  | { ok: true; calendar: PublicCalendar; slots: PublicSlot[]; current: string | null }
  | ApiFailure;

/** Grant string for a contractor sales-funnel submission (its id + the token the inquiry route returned). */
export function contractorFunnelGrant(submissionId: string, token: string): string {
  return `hqc1.${submissionId}.${token}`;
}
