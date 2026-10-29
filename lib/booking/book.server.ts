/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCalendar } from './calendars.server';
import { ensureManageToken } from './notify.server';
import { loadHostBusy } from './slots.server';
import { hashManageToken, isManageTokenShape, newManageToken } from './tokens';
import {
  asBookingError,
  type BookingActorKind,
  type BookingSource,
  type BookResult,
  type ChangeResult,
  type MeetingType,
  type SalesBookingSource,
  type SalesBookResult,
} from './types';

type Db = ReturnType<typeof createAdminClient>;

/**
 * Server-side booking API over the 0070 RPCs (service role). Every write is
 * re-checked in SQL under a per-calendar lock, so these never double-book; the
 * only thing checked here first is the hosts' Google busy time, which SQL
 * cannot see. Callers must already have verified who is asking (funnel session
 * token, manage token, or a signed-in user allowed to book on that calendar).
 * Manage tokens are generated here and returned ONCE; only the hash is stored.
 */

const toIso = (t: string | number | Date) => new Date(t).toISOString();

/**
 * The link every notice carries is derived from the booking id (notify.server
 * ensureManageToken), so swap the random one stored at booking for it now; the
 * thank-you page and the first email then show the same working link. On any
 * failure the random token (already stored) is kept.
 */
async function stableManageToken(db: Db, kind: 'appointment' | 'sales_appointment', id: string, fallback: string, hash: string): Promise<string> {
  try {
    return (await ensureManageToken(db, kind, id, hash)) ?? fallback;
  } catch {
    return fallback;
  }
}

async function hostBusyAt(db: Db, calendarId: string, startMs: number, endMs: number): Promise<boolean> {
  const cal = await getCalendar(calendarId, db);
  if (!cal) return false;
  const busy = await loadHostBusy(db, cal, startMs - 3_600_000, endMs + 3_600_000);
  return busy.some((b) => b.startMs < endMs && startMs < b.endMs);
}

export interface BookInput {
  calendarId: string;
  startsAt: string | number | Date;
  leadId?: string | null;
  assignmentId?: string | null;
  /** Funnel / estimator session + its stored token hash (funnel_sessions.token_hash). */
  sessionId?: string | null;
  sessionHash?: string | null;
  source: BookingSource;
  contact?: { name?: string; phone?: string; email?: string };
  actorId?: string | null;
  actorKind?: BookingActorKind;
  notes?: string | null;
  /** The homeowner's browser zone (IANA). */
  inviteeTimeZone?: string | null;
  /** Staff "book anyway": skips hours/notice/horizon/cap, never a real overlap. */
  override?: boolean;
  /** Read hosts' Google busy first (default true). */
  checkHostBusy?: boolean;
  db?: Db;
}

export async function bookAppointment(input: BookInput): Promise<BookResult> {
  const db = input.db ?? createAdminClient();
  const startMs = new Date(input.startsAt).getTime();
  if (!Number.isFinite(startMs)) return { ok: false, error: 'invalid_time' };
  if (input.checkHostBusy !== false && !input.override) {
    const cal = await getCalendar(input.calendarId, db);
    if (cal && (await hostBusyAt(db, cal.id, startMs, startMs + cal.durationMinutes * 60_000))) return { ok: false, error: 'calendar_busy' };
  }
  const { token, hash } = newManageToken();
  const { data, error } = await db.rpc('book_appointment', {
    p_calendar: input.calendarId,
    p_starts_at: toIso(startMs),
    p_lead: input.leadId ?? null,
    p_assignment: input.assignmentId ?? null,
    p_session: input.sessionId ?? null,
    p_session_hash: input.sessionHash ?? null,
    p_source: input.source,
    p_contact: input.contact ?? {},
    p_manage_token_hash: hash,
    p_actor: input.actorId ?? null,
    p_actor_kind: input.actorKind ?? null,
    p_notes: input.notes ?? null,
    p_invitee_time_zone: input.inviteeTimeZone ?? null,
    p_override: !!input.override,
  });
  if (error || !data) return { ok: false, error: 'unavailable' };
  const r = data as Record<string, any>;
  if (!r.ok) return { ok: false, error: asBookingError(r.error), appointmentId: r.appointment_id ?? null };
  const manageToken = await stableManageToken(db, 'appointment', r.appointment_id, token, hash);
  return { ok: true, appointmentId: r.appointment_id, startsAt: toIso(r.starts_at), endsAt: toIso(r.ends_at), calendarId: r.calendar_id, timeZone: r.time_zone, manageToken };
}

function changeResult(data: any, error: unknown, idKey: 'appointment_id' | 'sales_appointment_id'): ChangeResult {
  if (error || !data) return { ok: false, error: 'unavailable' };
  if (!data.ok) return { ok: false, error: asBookingError(data.error) };
  return {
    ok: true,
    id: data[idKey],
    ...(data.starts_at ? { startsAt: toIso(data.starts_at) } : {}),
    ...(data.ends_at ? { endsAt: toIso(data.ends_at) } : {}),
    ...(data.previous_starts_at ? { previousStartsAt: toIso(data.previous_starts_at) } : {}),
    ...(data.unchanged ? { unchanged: true } : {}),
    ...(data.already ? { already: true } : {}),
  };
}

export interface ChangeOptions {
  actorId?: string | null;
  actorKind?: BookingActorKind;
  override?: boolean;
  checkHostBusy?: boolean;
  db?: Db;
}

async function hostBusyForMove(db: Db, table: 'appointments' | 'prospect_sales_appointments', id: string, startMs: number) {
  const { data } = await db.from(table).select('calendar_id, scheduled_at, ends_at').eq('id', id).maybeSingle();
  if (!data?.calendar_id) return false;
  const len = data.ends_at && data.scheduled_at ? new Date(data.ends_at).getTime() - new Date(data.scheduled_at).getTime() : 30 * 60_000;
  return hostBusyAt(db, data.calendar_id, startMs, startMs + len);
}

export async function rescheduleAppointment(appointmentId: string, startsAt: string | number | Date, opts: ChangeOptions = {}): Promise<ChangeResult> {
  const db = opts.db ?? createAdminClient();
  const startMs = new Date(startsAt).getTime();
  if (!Number.isFinite(startMs)) return { ok: false, error: 'invalid_time' };
  if (opts.checkHostBusy !== false && !opts.override && (await hostBusyForMove(db, 'appointments', appointmentId, startMs))) {
    return { ok: false, error: 'calendar_busy' };
  }
  const { data, error } = await db.rpc('reschedule_appointment', {
    p_appointment: appointmentId, p_starts_at: toIso(startMs), p_actor: opts.actorId ?? null, p_actor_kind: opts.actorKind ?? null, p_override: !!opts.override,
  });
  return changeResult(data, error, 'appointment_id');
}

export async function cancelAppointment(appointmentId: string, reason: string | null, opts: ChangeOptions = {}): Promise<ChangeResult> {
  const db = opts.db ?? createAdminClient();
  const { data, error } = await db.rpc('cancel_appointment', {
    p_appointment: appointmentId, p_reason: reason, p_actor: opts.actorId ?? null, p_actor_kind: opts.actorKind ?? null,
  });
  return changeResult(data, error, 'appointment_id');
}

export interface SalesBookInput {
  calendarId: string;
  startsAt: string | number | Date;
  /** contractor_funnel_submissions.submission_id + its access_token_hash. */
  submissionId?: string | null;
  submissionHash?: string | null;
  prospectId?: string | null;
  /** The setter credited (only when a setter books on someone's behalf). */
  partnerId?: string | null;
  source?: SalesBookingSource;
  contact?: { name?: string; phone?: string; email?: string };
  actorId?: string | null;
  notes?: string | null;
  inviteeTimeZone?: string | null;
  override?: boolean;
  checkHostBusy?: boolean;
  db?: Db;
}

export async function bookSalesAppointment(input: SalesBookInput): Promise<SalesBookResult> {
  const db = input.db ?? createAdminClient();
  const startMs = new Date(input.startsAt).getTime();
  if (!Number.isFinite(startMs)) return { ok: false, error: 'invalid_time' };
  if (input.checkHostBusy !== false && !input.override) {
    const cal = await getCalendar(input.calendarId, db);
    if (cal && (await hostBusyAt(db, cal.id, startMs, startMs + cal.durationMinutes * 60_000))) return { ok: false, error: 'calendar_busy' };
  }
  const { token, hash } = newManageToken();
  const { data, error } = await db.rpc('book_sales_appointment', {
    p_calendar: input.calendarId,
    p_starts_at: toIso(startMs),
    p_submission: input.submissionId ?? null,
    p_submission_hash: input.submissionHash ?? null,
    p_prospect: input.prospectId ?? null,
    p_partner: input.partnerId ?? null,
    p_source: input.source ?? 'sales_funnel',
    p_contact: input.contact ?? {},
    p_manage_token_hash: hash,
    p_actor: input.actorId ?? null,
    p_notes: input.notes ?? null,
    p_invitee_time_zone: input.inviteeTimeZone ?? null,
    p_override: !!input.override,
  });
  if (error || !data) return { ok: false, error: 'unavailable' };
  const r = data as Record<string, any>;
  if (!r.ok) return { ok: false, error: asBookingError(r.error), salesAppointmentId: r.sales_appointment_id ?? null };
  const manageToken = await stableManageToken(db, 'sales_appointment', r.sales_appointment_id, token, hash);
  return {
    ok: true, salesAppointmentId: r.sales_appointment_id, prospectId: r.prospect_id, startsAt: toIso(r.starts_at), endsAt: toIso(r.ends_at),
    calendarId: r.calendar_id, timeZone: r.time_zone, manageToken,
  };
}

export async function rescheduleSalesAppointment(id: string, startsAt: string | number | Date, opts: ChangeOptions = {}): Promise<ChangeResult> {
  const db = opts.db ?? createAdminClient();
  const startMs = new Date(startsAt).getTime();
  if (!Number.isFinite(startMs)) return { ok: false, error: 'invalid_time' };
  if (opts.checkHostBusy !== false && !opts.override && (await hostBusyForMove(db, 'prospect_sales_appointments', id, startMs))) {
    return { ok: false, error: 'calendar_busy' };
  }
  const { data, error } = await db.rpc('reschedule_sales_appointment', {
    p_appointment: id, p_starts_at: toIso(startMs), p_actor: opts.actorId ?? null, p_override: !!opts.override,
  });
  return changeResult(data, error, 'sales_appointment_id');
}

export async function cancelSalesAppointment(id: string, reason: string | null, opts: ChangeOptions = {}): Promise<ChangeResult> {
  const db = opts.db ?? createAdminClient();
  const { data, error } = await db.rpc('cancel_sales_appointment', { p_appointment: id, p_reason: reason, p_actor: opts.actorId ?? null });
  return changeResult(data, error, 'sales_appointment_id');
}

/** What the homeowner's manage page needs (no internal ids beyond the booking's own). */
export interface ManagedBooking {
  kind: 'appointment' | 'sales_appointment';
  id: string;
  calendarId: string | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  /** The calendar's zone (host side). */
  timeZone: string | null;
  /** The invitee's own zone when known. */
  inviteeTimeZone: string | null;
  contactName: string | null;
  meetingType: MeetingType | 'in_person' | null;
  cancelledAt: string | null;
}

/** Look a booking up by the raw token from its manage link. Null for unknown / malformed tokens. */
export async function findByManageToken(token: string, db: Db = createAdminClient()): Promise<ManagedBooking | null> {
  if (!isManageTokenShape(token)) return null;
  const hash = hashManageToken(token);
  const { data: ap } = await db
    .from('appointments')
    .select('id, calendar_id, status, scheduled_at, ends_at, time_zone, invitee_time_zone, contact_name, meeting_type, cancelled_at')
    .eq('manage_token_hash', hash)
    .maybeSingle();
  if (ap) {
    return {
      kind: 'appointment', id: ap.id, calendarId: ap.calendar_id, status: ap.status, startsAt: ap.scheduled_at, endsAt: ap.ends_at,
      timeZone: ap.time_zone, inviteeTimeZone: ap.invitee_time_zone, contactName: ap.contact_name, meetingType: ap.meeting_type, cancelledAt: ap.cancelled_at,
    };
  }
  const { data: sa } = await db
    .from('prospect_sales_appointments')
    .select('id, calendar_id, status, scheduled_at, ends_at, time_zone, decision_maker_name, appointment_type, cancelled_at')
    .eq('manage_token_hash', hash)
    .maybeSingle();
  if (!sa) return null;
  const cal = sa.calendar_id ? await getCalendar(sa.calendar_id, db) : null;
  return {
    kind: 'sales_appointment', id: sa.id, calendarId: sa.calendar_id, status: sa.status, startsAt: sa.scheduled_at, endsAt: sa.ends_at,
    timeZone: cal?.timezone ?? null, inviteeTimeZone: sa.time_zone, contactName: sa.decision_maker_name,
    meetingType: sa.appointment_type === 'video' || sa.appointment_type === 'phone' || sa.appointment_type === 'in_person' ? sa.appointment_type : null,
    cancelledAt: sa.cancelled_at,
  };
}

/** Homeowner / prospect self-service: reschedule through the manage link. */
export async function rescheduleByManageToken(token: string, startsAt: string | number | Date, db: Db = createAdminClient()): Promise<ChangeResult> {
  const b = await findByManageToken(token, db);
  if (!b) return { ok: false, error: 'not_found' };
  return b.kind === 'appointment'
    ? rescheduleAppointment(b.id, startsAt, { actorKind: 'homeowner', db })
    : rescheduleSalesAppointment(b.id, startsAt, { db });
}

/** Homeowner / prospect self-service: cancel through the manage link (optional reason). */
export async function cancelByManageToken(token: string, reason: string | null, db: Db = createAdminClient()): Promise<ChangeResult> {
  const b = await findByManageToken(token, db);
  if (!b) return { ok: false, error: 'not_found' };
  // After the call time the link is read-only (staff record held / no-show).
  if (b.status !== 'cancelled' && b.startsAt && new Date(b.startsAt).getTime() < Date.now()) return { ok: false, error: 'not_active' };
  return b.kind === 'appointment'
    ? cancelAppointment(b.id, reason, { actorKind: 'homeowner', db })
    : cancelSalesAppointment(b.id, reason, { db });
}

/** Claim due 24 h / 1 h reminders (stamped as sent at claim: at most once). For the cron tick. */
export async function claimBookingReminders(
  limit = 50,
  db: Db = createAdminClient()
): Promise<{ kind: 'appointment' | 'sales_appointment'; id: string; reminder: '24h' | '1h'; startsAt: string }[]> {
  const { data, error } = await db.rpc('claim_booking_reminders', { p_limit: limit });
  if (error || !Array.isArray(data)) return [];
  return (data as any[]).map((r) => ({ kind: r.kind, id: r.id, reminder: r.reminder, startsAt: toIso(r.starts_at) }));
}
