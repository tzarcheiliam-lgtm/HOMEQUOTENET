/**
 * Wire types for the public booking API (app/api/booking/**) shared by the
 * route handlers and the homeowner UI (SlotPicker, BookingFlow, the manage
 * page). Pure: no I/O, safe on both sides. Every time is a UTC ISO string;
 * the UI formats it in the viewer's zone and always shows that zone.
 */
import type { BookingError } from '@/lib/booking/types';

export type PublicMeetingType = 'phone' | 'video' | 'in_person';

/**
 * Who will call (the calendar's host contact, lib/booking/host-contact.ts):
 * business details only. `vcardUrl` is the "Save Liam's number" card; null
 * when there is no number to save.
 */
export interface PublicHostContact {
  /** "Liam from Pool Masters" */
  displayName: string;
  /** "Liam" */
  firstName: string | null;
  /** "Pool Masters LA" */
  org: string;
  /** E.164 */
  phone: string | null;
  /** "(747) 217-5713" */
  phoneDisplay: string | null;
  /** Logo / photo under /images (shown as the card's avatar). */
  photoUrl: string | null;
  vcardUrl: string | null;
}

/** What the homeowner may know about the calendar they are booking. */
export interface PublicCalendar {
  /** Who the call is with: the contractor's name, "a HomeQuote project specialist", or "HomeQuote". */
  hostName: string;
  kind: 'contractor' | 'team' | 'sales';
  /** The calendar's own zone (hours are set there). */
  timeZone: string;
  durationMinutes: number;
  meetingType: PublicMeetingType;
  /** Who will call; null = the wording names hostName (a contractor calendar with no host set). */
  host: PublicHostContact | null;
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
  /** Whose calendar: decides the wording (sales calls get email only). Null for an old external booking. */
  kind: PublicCalendar['kind'] | null;
  /** A number the homeowner can call about the booking (manage page), E.164 or as entered. */
  hostPhone: string | null;
  durationMinutes: number;
  firstName: string | null;
  /** Last four digits of the number we will call, e.g. "0100". */
  phoneHint: string | null;
  videoLink: string | null;
  /** Self-service page (derived from the booking, so present after a refresh too; null for an external booking). */
  manageUrl: string | null;
  /** .ics download for Apple / Outlook (same availability as manageUrl). */
  icsUrl: string | null;
  /** Still in the future and scheduled: can be rescheduled or cancelled online. */
  canChange: boolean;
  /** Who will call (contact card, wording). */
  host: PublicHostContact | null;
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
