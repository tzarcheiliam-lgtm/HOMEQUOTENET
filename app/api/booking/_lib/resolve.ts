/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { calendarForContractorFunnel, calendarForFunnel, getCalendar } from '@/lib/booking/calendars.server';
import type { BookingCalendar, BookingError } from '@/lib/booking/types';
import type { PublicBooking, PublicCalendar, PublicMeetingType } from '@/components/booking/types';
import { parseGrant, submissionTokenMatches, type SessionSource } from './grant';

type Db = ReturnType<typeof createAdminClient>;

/**
 * Turns a verified grant into what the booking routes need: the session or
 * submission row (service role), the calendar it books, why it cannot book
 * (if so), and any call it already booked. Nothing here trusts the browser
 * beyond the grant itself.
 */

export interface SessionRow {
  id: string;
  funnel_id: string;
  token_hash: string;
  lead_id: string | null;
  qualified: boolean | null;
  contact_submitted_at: string | null;
  booked_at: string | null;
  contact: Record<string, unknown> | null;
  attribution: Record<string, any> | null;
  measurement_allowed: boolean | null;
  created_at: string;
}
export interface FunnelRow {
  id: string;
  slug: string;
  is_demo: boolean;
  contractor_id: string | null;
  config: Record<string, any> | null;
}
export interface SubmissionRow {
  id: string;
  submission_id: string;
  access_token_hash: string;
  qualification_status: string;
  booking_status: string;
  sales_appointment_id: string | null;
  name: string | null;
  phone: string | null;
  review_notes: string | null;
  phone_e164: string | null;
}

export type Resolved =
  | { kind: 'session'; source: SessionSource; session: SessionRow; funnel: FunnelRow; calendar: BookingCalendar | null; blocked: BookingError | null }
  | { kind: 'submission'; submission: SubmissionRow; calendar: BookingCalendar | null; blocked: BookingError | null };

const SESSION_COLUMNS = 'id, funnel_id, token_hash, lead_id, qualified, contact_submitted_at, booked_at, contact, attribution, measurement_allowed, created_at, expires_at';
const SUBMISSION_COLUMNS = 'id, submission_id, access_token_hash, qualification_status, booking_status, sales_appointment_id, name, phone, phone_e164, review_notes';

/** Null = the grant is invalid, expired or does not match a row (always the same answer to the caller). */
export async function resolveGrant(db: Db, raw: unknown): Promise<Resolved | null> {
  const grant = parseGrant(raw);
  if (!grant) return null;
  if (grant.kind === 'session') {
    const { data: s } = await db.from('funnel_sessions').select(SESSION_COLUMNS).eq('id', grant.sessionId)
      .gt('expires_at', new Date().toISOString()).maybeSingle();
    if (!s) return null;
    const { data: f } = await db.from('funnels').select('id, slug, is_demo, contractor_id, config').eq('id', (s as any).funnel_id).maybeSingle();
    if (!f) return null;
    const session = s as unknown as SessionRow;
    const funnel = f as unknown as FunnelRow;
    const calendar = await calendarForFunnel({ contractorId: funnel.contractor_id }, db);
    const blocked: BookingError | null = !session.contact_submitted_at || !session.lead_id ? 'session_incomplete'
      : session.qualified !== true ? 'not_qualified'
      : !calendar ? 'calendar_inactive'
      : null;
    return { kind: 'session', source: grant.source, session, funnel, calendar, blocked };
  }
  const { data: row } = await db.from('contractor_funnel_submissions').select(SUBMISSION_COLUMNS).eq('submission_id', grant.submissionId).maybeSingle();
  if (!row || !submissionTokenMatches(grant.token, (row as any).access_token_hash)) return null;
  const submission = row as unknown as SubmissionRow;
  const calendar = await calendarForContractorFunnel(db);
  const blocked: BookingError | null = submission.qualification_status !== 'qualified' ? 'not_qualified' : !calendar ? 'calendar_inactive' : null;
  return { kind: 'submission', submission, calendar, blocked };
}

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

export function hostName(cal: Pick<BookingCalendar, 'kind' | 'name'> | null): string {
  if (!cal || cal.kind === 'team') return 'a HomeQuote project specialist';
  if (cal.kind === 'sales') return 'HomeQuote';
  return cal.name;
}

export function publicCalendar(cal: BookingCalendar): PublicCalendar {
  return { hostName: hostName(cal), kind: cal.kind, timeZone: cal.timezone, durationMinutes: cal.durationMinutes, meetingType: cal.meetingType };
}

export const phoneHint = (phone: unknown): string | null => {
  const digits = typeof phone === 'string' ? phone.replace(/\D/g, '') : '';
  return digits.length >= 4 ? digits.slice(-4) : null;
};

export const firstNameOf = (name: unknown): string | null => {
  const first = typeof name === 'string' ? name.trim().split(/\s+/)[0] : '';
  return first ? first.slice(0, 60) : null;
};

/** The homeowner's manage page and its .ics (canonical route; /book/manage/<token> redirects here). */
export const manageUrl = (token: string) => `/booking/manage/${encodeURIComponent(token)}`;
export const icsUrl = (token: string) => `/api/booking/manage/${encodeURIComponent(token)}/ics`;

const meeting = (v: unknown): PublicMeetingType => (v === 'video' || v === 'in_person' ? v : 'phone');

interface BookingFacts {
  status: string;
  startsAt: string;
  endsAt: string | null;
  timeZone: string | null;
  inviteeTimeZone: string | null;
  meetingType: unknown;
  name: unknown;
  phone: unknown;
  calendar: BookingCalendar | null;
  token?: string | null;
  /** A prospect_sales_appointments row ('confirmed' / 'rescheduled' are still live there). */
  sales?: boolean;
  nowMs?: number;
}

const LIVE = new Set(['scheduled']);
const LIVE_SALES = new Set(['scheduled', 'confirmed', 'rescheduled']);
/** Normalized for the homeowner: a live sales meeting reads as 'scheduled'. */
const statusOf = (status: string, sales?: boolean) => (sales && LIVE_SALES.has(status) ? 'scheduled' : status);

export function publicBooking(f: BookingFacts): PublicBooking {
  const duration = f.calendar?.durationMinutes ?? 30;
  const startMs = new Date(f.startsAt).getTime();
  const endsAt = f.endsAt ?? new Date(startMs + duration * 60_000).toISOString();
  const type = meeting(f.meetingType ?? f.calendar?.meetingType);
  return {
    status: statusOf(f.status, f.sales),
    startsAt: new Date(startMs).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    timeZone: f.timeZone ?? f.calendar?.timezone ?? 'America/Los_Angeles',
    inviteeTimeZone: f.inviteeTimeZone,
    meetingType: type,
    hostName: hostName(f.calendar),
    durationMinutes: Math.round((new Date(endsAt).getTime() - startMs) / 60_000) || duration,
    firstName: firstNameOf(f.name),
    phoneHint: type === 'phone' ? phoneHint(f.phone) : null,
    videoLink: type === 'video' ? f.calendar?.videoLink ?? null : null,
    manageUrl: f.token ? manageUrl(f.token) : null,
    icsUrl: f.token ? icsUrl(f.token) : null,
    canChange: (f.sales ? LIVE_SALES : LIVE).has(f.status) && startMs > (f.nowMs ?? Date.now()),
  };
}

/** The call a session / submission already booked (a refresh, a second tab), without its manage link. */
export async function existingBooking(db: Db, r: Resolved): Promise<PublicBooking | null> {
  if (r.kind === 'session') {
    if (!r.session.booked_at) return null;
    const { data: fb } = await db.from('funnel_bookings').select('appointment_id, scheduled_at').eq('session_id', r.session.id)
      .order('id', { ascending: false }).limit(1).maybeSingle();
    const apptId = (fb as any)?.appointment_id as string | null | undefined;
    if (apptId) {
      const { data: ap } = await db.from('appointments')
        .select('status, scheduled_at, ends_at, time_zone, invitee_time_zone, meeting_type, contact_name, contact_phone, calendar_id')
        .eq('id', apptId).maybeSingle();
      if (ap) {
        const a = ap as any;
        const cal = a.calendar_id ? await getCalendar(a.calendar_id, db) : r.calendar;
        return publicBooking({ status: a.status, startsAt: a.scheduled_at, endsAt: a.ends_at, timeZone: a.time_zone, inviteeTimeZone: a.invitee_time_zone,
          meetingType: a.meeting_type, name: a.contact_name, phone: a.contact_phone, calendar: cal });
      }
    }
    // Booked through the old calendar (Calendly / GHL): only the time is known.
    const at = (fb as any)?.scheduled_at as string | null | undefined;
    if (!at) return null;
    const c = r.session.contact ?? {};
    return publicBooking({ status: 'scheduled', startsAt: at, endsAt: null, timeZone: null, inviteeTimeZone: null, meetingType: null,
      name: c.firstName, phone: c.phone, calendar: r.calendar });
  }
  const id = r.submission.sales_appointment_id;
  if (!id || !['reported', 'confirmed'].includes(r.submission.booking_status)) return null;
  const { data: sa } = await db.from('prospect_sales_appointments')
    .select('status, scheduled_at, ends_at, time_zone, appointment_type, decision_maker_name, calendar_id').eq('id', id).maybeSingle();
  if (!sa) return null;
  const s = sa as any;
  const cal = s.calendar_id ? await getCalendar(s.calendar_id, db) : r.calendar;
  return publicBooking({ status: s.status, startsAt: s.scheduled_at, endsAt: s.ends_at, timeZone: cal?.timezone ?? null, inviteeTimeZone: s.time_zone,
    meetingType: s.appointment_type, name: s.decision_maker_name, phone: r.submission.phone, calendar: cal, sales: true });
}

/** Name + masked phone for the picker's "We'll call you at •••• 0100". */
export function contactOf(r: Resolved): { firstName: string | null; phoneHint: string | null } {
  if (r.kind === 'session') {
    const c = r.session.contact ?? {};
    return { firstName: firstNameOf(c.firstName), phoneHint: phoneHint(c.phone) };
  }
  return { firstName: firstNameOf(r.submission.name), phoneHint: phoneHint(r.submission.phone) };
}
