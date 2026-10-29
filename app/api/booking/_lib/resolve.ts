/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { calendarForContractorFunnel, calendarForFunnel, getCalendar } from '@/lib/booking/calendars.server';
import { ensureManageToken } from '@/lib/booking/notify.server';
import type { BookingCalendar, BookingError } from '@/lib/booking/types';
import { displayPhone, hostVCardPath, resolveHostContact } from '@/lib/booking/host-contact';
import { vcardPhone } from '@/lib/funnels/vcard';
import type { PublicBooking, PublicCalendar, PublicHostContact, PublicMeetingType } from '@/components/booking/types';
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

/** The missed / no-show call a "pick a new time" link (hqr1 grant) was sent for. */
export interface RebookRow {
  id: string;
  lead_id: string;
  /** The missed call's own calendar (null for an on-site visit). */
  calendar_id: string | null;
  status: string;
  scheduled_at: string | null;
  source: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

export type Resolved =
  | { kind: 'session'; source: SessionSource; session: SessionRow; funnel: FunnelRow; calendar: BookingCalendar | null; blocked: BookingError | null }
  | { kind: 'submission'; submission: SubmissionRow; calendar: BookingCalendar | null; blocked: BookingError | null }
  | { kind: 'rebook'; appointment: RebookRow; calendar: BookingCalendar | null; blocked: BookingError | null };

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
  if (grant.kind === 'rebook') return resolveRebook(db, grant.appointmentId);
  const { data: row } = await db.from('contractor_funnel_submissions').select(SUBMISSION_COLUMNS).eq('submission_id', grant.submissionId).maybeSingle();
  if (!row || !submissionTokenMatches(grant.token, (row as any).access_token_hash)) return null;
  const submission = row as unknown as SubmissionRow;
  const calendar = await calendarForContractorFunnel(db);
  const blocked: BookingError | null = submission.qualification_status !== 'qualified' ? 'not_qualified' : !calendar ? 'calendar_inactive' : null;
  return { kind: 'submission', submission, calendar, blocked };
}

/**
 * A "pick a new time" link: the call it was sent for, its lead and the calendar
 * a new call goes on (the call's own calendar; for an on-site visit, the lead's
 * contractor calendar). A call held since then, an archived lead or a lead that
 * moved on (lost / closed) can no longer book from the link.
 */
async function resolveRebook(db: Db, appointmentId: string): Promise<Resolved | null> {
  const { data: a } = await db.from('appointments')
    .select('id, lead_id, assignment_id, calendar_id, status, scheduled_at, source, contact_name, contact_phone, contact_email')
    .eq('id', appointmentId).maybeSingle();
  if (!a) return null;
  const row = a as any;
  let leadId: string | null = row.lead_id ?? null;
  let contractorId: string | null = null;
  if (row.assignment_id) {
    const { data: asg } = await db.from('lead_assignments').select('lead_id, contractor_id').eq('id', row.assignment_id).maybeSingle();
    leadId = leadId ?? (asg as any)?.lead_id ?? null;
    contractorId = (asg as any)?.contractor_id ?? null;
  }
  if (!leadId) return null;
  const { data: lead } = await db.from('leads').select('first_name, last_name, phone, email, status, archived_at').eq('id', leadId).maybeSingle();
  if (!lead) return null;
  const l = lead as any;
  const own = row.calendar_id ? await getCalendar(row.calendar_id, db) : null;
  const calendar = own ? (own.active ? own : null) : await calendarForFunnel({ contractorId }, db);
  const appointment: RebookRow = {
    id: row.id, lead_id: leadId, calendar_id: row.calendar_id ?? null, status: row.status, scheduled_at: row.scheduled_at, source: row.source ?? null,
    contact_name: row.contact_name ?? ([l.first_name, l.last_name].filter(Boolean).join(' ') || null),
    contact_phone: row.contact_phone ?? l.phone ?? null, contact_email: row.contact_email ?? l.email ?? null,
  };
  const movedOn = !!l.archived_at || ['lost', 'cancelled', 'sold'].includes(String(l.status));
  const blocked: BookingError | null = row.status === 'held' || row.status === 'cancelled' || movedOn ? 'not_active' : !calendar ? 'calendar_inactive' : null;
  return { kind: 'rebook', appointment, calendar, blocked };
}

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

export function hostName(cal: Pick<BookingCalendar, 'kind' | 'name'> | null): string {
  if (!cal || cal.kind === 'team') return 'a HomeQuote project specialist';
  if (cal.kind === 'sales') return 'HomeQuote';
  return cal.name;
}

/** The calendar's host contact as the homeowner sees it (business details only). */
export function publicHost(cal: BookingCalendar | null): PublicHostContact | null {
  const h = cal ? resolveHostContact(cal) : null;
  if (!cal || !h) return null;
  const phone = h.phone ? vcardPhone(h.phone) : null;
  return {
    displayName: h.displayName,
    firstName: h.firstName,
    org: h.org,
    phone,
    phoneDisplay: phone ? displayPhone(phone) : null,
    photoUrl: h.photoPath,
    vcardUrl: phone ? hostVCardPath(cal.id) : null,
  };
}

export function publicCalendar(cal: BookingCalendar): PublicCalendar {
  return { hostName: hostName(cal), kind: cal.kind, timeZone: cal.timezone, durationMinutes: cal.durationMinutes, meetingType: cal.meetingType, host: publicHost(cal) };
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
export const icsUrl = (token: string) => `${manageUrl(token)}/calendar.ics`;

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
  hostPhone?: string | null;
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
    kind: f.calendar?.kind ?? (f.sales ? 'sales' : null),
    hostPhone: f.hostPhone ?? null,
    durationMinutes: Math.round((new Date(endsAt).getTime() - startMs) / 60_000) || duration,
    firstName: firstNameOf(f.name),
    phoneHint: type === 'phone' ? phoneHint(f.phone) : null,
    videoLink: type === 'video' ? f.calendar?.videoLink ?? null : null,
    manageUrl: f.token ? manageUrl(f.token) : null,
    icsUrl: f.token ? icsUrl(f.token) : null,
    canChange: (f.sales ? LIVE_SALES : LIVE).has(f.status) && startMs > (f.nowMs ?? Date.now()),
    host: publicHost(f.calendar),
  };
}

/**
 * The live call a session / submission already booked (a refresh, a second tab,
 * a return visit), with its manage link: the link is derived from the booking
 * id (ensureManageToken), so the holder of the grant gets the same link the
 * emails carry. A cancelled call is not "booked": the picker shows again.
 */
export async function existingBooking(db: Db, r: Resolved): Promise<PublicBooking | null> {
  if (r.kind === 'rebook') {
    // A live, still-upcoming call for this lead on a HomeQuote calendar (the moved call itself, or a new one).
    const { data: aps } = await db.from('appointments')
      .select('id, status, scheduled_at, ends_at, time_zone, invitee_time_zone, meeting_type, contact_name, contact_phone, calendar_id, created_at')
      .eq('lead_id', r.appointment.lead_id).eq('status', 'scheduled').not('calendar_id', 'is', null)
      .gt('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(1);
    const live = ((aps ?? []) as any[])[0];
    if (!live) return null;
    const cal = await getCalendar(live.calendar_id, db);
    const token = await ensureManageToken(db, 'appointment', live.id);
    return publicBooking({ status: live.status, startsAt: live.scheduled_at, endsAt: live.ends_at, timeZone: live.time_zone, inviteeTimeZone: live.invitee_time_zone,
      meetingType: live.meeting_type, name: live.contact_name, phone: live.contact_phone, calendar: cal, token });
  }
  if (r.kind === 'session') {
    if (!r.session.booked_at) return null;
    const { data: fbs } = await db.from('funnel_bookings').select('appointment_id, scheduled_at').eq('session_id', r.session.id);
    const rows = (fbs ?? []) as { appointment_id: string | null; scheduled_at: string | null }[];
    const apptIds = rows.map((f) => f.appointment_id).filter((v): v is string => !!v);
    if (apptIds.length) {
      const { data: aps } = await db.from('appointments')
        .select('id, status, scheduled_at, ends_at, time_zone, invitee_time_zone, meeting_type, contact_name, contact_phone, calendar_id, created_at')
        .in('id', apptIds);
      const live = ((aps ?? []) as any[]).filter((a) => a.status !== 'cancelled')
        .sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)))[0];
      if (live) {
        const cal = live.calendar_id ? await getCalendar(live.calendar_id, db) : r.calendar;
        const token = live.calendar_id ? await ensureManageToken(db, 'appointment', live.id) : null;
        return publicBooking({ status: live.status, startsAt: live.scheduled_at, endsAt: live.ends_at, timeZone: live.time_zone, inviteeTimeZone: live.invitee_time_zone,
          meetingType: live.meeting_type, name: live.contact_name, phone: live.contact_phone, calendar: cal, token });
      }
      // Every call this session booked was cancelled: it may book again.
      if (rows.every((f) => f.appointment_id)) return null;
    }
    // Booked through the old calendar (Calendly / GHL): only the time is known.
    const at = rows.find((f) => !f.appointment_id && f.scheduled_at)?.scheduled_at;
    if (!at) return null;
    const c = r.session.contact ?? {};
    return publicBooking({ status: 'scheduled', startsAt: at, endsAt: null, timeZone: null, inviteeTimeZone: null, meetingType: null,
      name: c.firstName, phone: c.phone, calendar: r.calendar });
  }
  const id = r.submission.sales_appointment_id;
  if (!id || !['reported', 'confirmed'].includes(r.submission.booking_status)) return null;
  const { data: sa } = await db.from('prospect_sales_appointments')
    .select('status, scheduled_at, ends_at, time_zone, appointment_type, decision_maker_name, calendar_id').eq('id', id).maybeSingle();
  if (!sa || (sa as any).status === 'cancelled') return null;
  const s = sa as any;
  const cal = s.calendar_id ? await getCalendar(s.calendar_id, db) : r.calendar;
  const token = s.calendar_id ? await ensureManageToken(db, 'sales_appointment', id) : null;
  return publicBooking({ status: s.status, startsAt: s.scheduled_at, endsAt: s.ends_at, timeZone: cal?.timezone ?? null, inviteeTimeZone: s.time_zone,
    meetingType: s.appointment_type, name: s.decision_maker_name, phone: r.submission.phone, calendar: cal, sales: true, token });
}

/** Name + masked phone for the picker's "We'll call you at •••• 0100". */
export function contactOf(r: Resolved): { firstName: string | null; phoneHint: string | null } {
  if (r.kind === 'rebook') return { firstName: firstNameOf(r.appointment.contact_name), phoneHint: phoneHint(r.appointment.contact_phone) };
  if (r.kind === 'session') {
    const c = r.session.contact ?? {};
    return { firstName: firstNameOf(c.firstName), phoneHint: phoneHint(c.phone) };
  }
  return { firstName: firstNameOf(r.submission.name), phoneHint: phoneHint(r.submission.phone) };
}
