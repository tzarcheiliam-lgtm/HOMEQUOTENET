'use server';

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSlots } from '@/lib/booking/slots.server';
import {
  bookAppointment,
  bookSalesAppointment,
  cancelAppointment,
  cancelSalesAppointment,
  rescheduleAppointment,
  rescheduleSalesAppointment,
} from '@/lib/booking/book.server';
import { notifyBookingSoon } from '@/lib/booking/notify.server';
import { BOOKING_ERROR_MESSAGES, mapCalendar, PICK_ANOTHER_TIME, type BookingCalendar, type BookingError } from '@/lib/booking/types';
import { isValidTimeZone } from '@/lib/availability/time';
import { flushNotificationsSoon } from '@/lib/notifications/outbox';
import { flushCalendarSyncSoon } from '@/lib/calendar/sync.server';
import { canManageCalendar, canOverrideSlots, canUseCalendarPage, canWorkCalendar, type CalendarViewer } from '@/components/calendar/access';
import type { PublicSlot } from '@/components/booking/types';
import type { Profile } from '@/lib/types';

/**
 * In-app calendar actions (app/app/calendar): slots for the picker, book a
 * call on someone's behalf, reschedule, cancel, held / no-show, and the
 * booking-calendar settings.
 *
 * Every action first reads the calendar / booking / lead through the
 * signed-in user's OWN client, so RLS (0068) decides whether they may see it,
 * then applies the role rules in components/calendar/access.ts (a contractor
 * works only its own calendar). Only then does the service-role booking RPC
 * run, which re-checks the slot under the calendar lock. Status changes and
 * settings stay on the user's client (RLS write policies apply as they are).
 * Homeowner / prospect notices go out after the response (notifyBookingSoon);
 * push and Google sync come from the DB triggers and are flushed here.
 */

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; pickAnother?: boolean };
export type SettingsState = { error?: string; success?: string } | undefined;

type EventKindInput = 'appointment' | 'visit' | 'sales_appointment';

/** Host-facing wording (the homeowner messages say "you"; staff need to know what happened). */
const HOST_MESSAGES: Partial<Record<BookingError, string>> = {
  already_booked: 'This lead already has a call booked from the funnel.',
  not_bookable: 'This appointment is not on a booking calendar. Change it from the lead.',
  not_active: 'Only a scheduled call can be changed.',
  lead_not_found: 'Lead not found.',
  assignment_mismatch: 'That lead is not assigned to this contractor.',
  wrong_calendar: 'This lead cannot be booked on that calendar.',
  calendar_busy: 'A host’s Google Calendar is busy then. Pick another time.',
};
const messageFor = (e: BookingError) => HOST_MESSAGES[e] ?? BOOKING_ERROR_MESSAGES[e];
const failed = (e: BookingError): { ok: false; error: string; pickAnother?: boolean } => ({ ok: false, error: messageFor(e), pickAnother: PICK_ANOTHER_TIME.has(e) || undefined });
const denied = { ok: false as const, error: 'You don’t have access to this calendar.' };

const uuid = z.string().uuid();
const iso = z.string().refine((v) => Number.isFinite(Date.parse(v)), 'Pick a valid time');

interface Ctx {
  profile: Profile;
  viewer: CalendarViewer;
  userDb: any;
}

async function context(): Promise<Ctx | null> {
  const profile = await requireProfile();
  const viewer: CalendarViewer = { id: profile.id, role: profile.role, contractor_id: profile.contractor_id, contractor_role: profile.contractor_role };
  if (!canUseCalendarPage(viewer)) return null;
  return { profile, viewer, userDb: await createClient() };
}

/** The calendar, read through the user's client (RLS), or null. */
async function visibleCalendar(userDb: any, id: string): Promise<BookingCalendar | null> {
  if (!uuid.safeParse(id).success) return null;
  const { data } = await userDb.from('booking_calendars').select('*').eq('id', id).maybeSingle();
  return data ? mapCalendar(data) : null;
}

interface BookingRef {
  kind: 'appointment' | 'sales_appointment';
  id: string;
  calendar: BookingCalendar | null;
  /** Contractor that owns a visit (no calendar) through its assignment. */
  visitContractorId: string | null;
  leadId: string | null;
  scheduledAt: string | null;
  status: string;
}

/** A booking the user can see (RLS) + whether the role rules let them work it. */
async function workableBooking(ctx: Ctx, kind: EventKindInput, id: string): Promise<BookingRef | null> {
  if (!uuid.safeParse(id).success) return null;
  if (kind === 'sales_appointment') {
    const { data } = await ctx.userDb.from('prospect_sales_appointments').select('id, calendar_id, scheduled_at, status').eq('id', id).maybeSingle();
    if (!data) return null;
    // Sales meetings are HomeQuote's own: never a contractor's.
    if (ctx.viewer.role !== 'admin' && ctx.viewer.role !== 'setter') return null;
    const calendar = data.calendar_id ? await visibleCalendar(ctx.userDb, data.calendar_id) : null;
    return { kind, id, calendar, visitContractorId: null, leadId: null, scheduledAt: data.scheduled_at, status: data.status };
  }
  const { data } = await ctx.userDb
    .from('appointments')
    .select('id, calendar_id, lead_id, scheduled_at, status, assignment:lead_assignments(contractor_id, lead_id)')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const asg = Array.isArray(data.assignment) ? data.assignment[0] : data.assignment;
  const calendar = data.calendar_id ? await visibleCalendar(ctx.userDb, data.calendar_id) : null;
  const ref: BookingRef = {
    kind: 'appointment', id, calendar, visitContractorId: data.calendar_id ? null : asg?.contractor_id ?? null,
    leadId: data.lead_id ?? asg?.lead_id ?? null, scheduledAt: data.scheduled_at, status: data.status,
  };
  if (calendar) return canWorkCalendar(ctx.viewer, calendar) ? ref : null;
  // A visit with no calendar: staff, or the contractor whose assignment it is.
  const staff = ctx.viewer.role === 'admin' || ctx.viewer.role === 'setter';
  return staff || (ref.visitContractorId !== null && ref.visitContractorId === ctx.viewer.contractor_id) ? ref : null;
}

function refreshCalendar(leadId?: string | null) {
  revalidatePath('/app/calendar');
  revalidatePath('/app/appointments');
  if (leadId) {
    revalidatePath('/app/leads');
    revalidatePath(`/app/leads/${leadId}`);
  }
}

function afterChange(leadId?: string | null) {
  flushNotificationsSoon();
  flushCalendarSyncSoon();
  refreshCalendar(leadId);
}

async function auditOverride(actorId: string, metadata: Record<string, unknown>) {
  // Service role: audit_logs is insert-restricted to admins by RLS, but setters may override too (as on the lead page).
  await createAdminClient().from('audit_logs').insert({ actor_id: actorId, action: 'appointment.availability_override', target_user_id: null, metadata });
}

/* ------------------------------------------------------------------ */
/* Slots                                                               */
/* ------------------------------------------------------------------ */

export interface SlotsPayload {
  slots: PublicSlot[];
  timeZone: string;
  durationMinutes: number;
  /** The booking's current start (rescheduling). */
  current: string | null;
}

/** Open times on a calendar for the picker; with `reschedule`, that booking's own time does not block. */
export async function getCalendarSlots(input: { calendarId: string; reschedule?: { kind: EventKindInput; id: string } }): Promise<ActionResult<SlotsPayload>> {
  const ctx = await context();
  if (!ctx) return denied;
  const cal = await visibleCalendar(ctx.userDb, input.calendarId);
  if (!cal || !canWorkCalendar(ctx.viewer, cal)) return denied;
  let current: string | null = null;
  let excludeId: string | undefined;
  if (input.reschedule) {
    const ref = await workableBooking(ctx, input.reschedule.kind, input.reschedule.id);
    if (!ref || ref.calendar?.id !== cal.id) return denied;
    current = ref.scheduledAt ? new Date(ref.scheduledAt).toISOString() : null;
    excludeId = ref.id;
  }
  try {
    const r = await getSlots(cal.id, undefined, undefined, { excludeId });
    if (!r) return denied;
    return {
      ok: true,
      slots: r.slots.map((s) => ({ start: new Date(s.startMs).toISOString(), end: new Date(s.endMs).toISOString() })),
      timeZone: r.calendar.timezone,
      durationMinutes: r.calendar.durationMinutes,
      current,
    };
  } catch {
    return failed('unavailable');
  }
}

/* ------------------------------------------------------------------ */
/* Who can be booked                                                   */
/* ------------------------------------------------------------------ */

export interface BookableParty {
  id: string;
  name: string;
  detail: string | null;
  phone: string | null;
}

const searchInput = z.object({ calendarId: uuid, query: z.string().trim().max(80) });

/**
 * Leads (homeowner calendars) or contractor prospects (sales calendar) the
 * user may book, matching a name / phone / email. RLS scopes the search:
 * staff see every lead, a contractor only leads assigned to it, a setter
 * only prospects assigned to them.
 */
export async function searchBookable(calendarId: string, query: string): Promise<ActionResult<{ results: BookableParty[] }>> {
  const ctx = await context();
  if (!ctx) return denied;
  const parsed = searchInput.safeParse({ calendarId, query });
  if (!parsed.success) return { ok: true, results: [] };
  const cal = await visibleCalendar(ctx.userDb, parsed.data.calendarId);
  if (!cal || !canWorkCalendar(ctx.viewer, cal)) return denied;
  // PostgREST or-filter: strip the characters that would change its meaning.
  const q = parsed.data.query.replace(/[,()*%\\]/g, ' ').trim();
  const digits = q.replace(/\D/g, '');

  if (cal.kind === 'sales') {
    let req = ctx.userDb.from('contractor_prospects').select('id, company_name, decision_maker_name, phone, city').order('updated_at', { ascending: false }).limit(12);
    if (q) req = req.or([`company_name.ilike.*${q}*`, `decision_maker_name.ilike.*${q}*`, ...(digits.length >= 3 ? [`phone_e164.ilike.*${digits}*`] : [])].join(','));
    const { data } = await req;
    return {
      ok: true,
      results: ((data ?? []) as any[]).map((p) => ({
        id: p.id, name: p.decision_maker_name ? `${p.decision_maker_name} · ${p.company_name}` : p.company_name, detail: p.city ?? null, phone: p.phone ?? null,
      })),
    };
  }

  let req = ctx.userDb.from('leads').select('id, first_name, last_name, phone, email, city, vertical_id').order('created_at', { ascending: false }).limit(12);
  if (cal.kind === 'contractor') {
    // Only leads assigned to this calendar's contractor can go on it (the RPC links the assignment).
    const { data: asg } = await ctx.userDb
      .from('lead_assignments')
      .select('lead_id')
      .eq('contractor_id', cal.contractorId)
      .order('assigned_at', { ascending: false })
      // The newest 300 keep the id list well inside a URL; older leads are rarely booked from here.
      .limit(300);
    const ids = [...new Set(((asg ?? []) as any[]).map((a) => a.lead_id as string))];
    if (!ids.length) return { ok: true, results: [] };
    req = req.in('id', ids);
  }
  if (q) {
    const words = q.split(/\s+/).filter(Boolean).slice(0, 2);
    const ors = [
      ...words.flatMap((w) => [`first_name.ilike.*${w}*`, `last_name.ilike.*${w}*`]),
      `email.ilike.*${q}*`,
      ...(digits.length >= 3 ? [`phone.ilike.*${digits.slice(-7)}*`] : []),
    ];
    req = req.or(ors.join(','));
  }
  const { data } = await req;
  const leads = (data ?? []) as any[];
  const verticalIds = [...new Set(leads.map((l) => l.vertical_id).filter(Boolean))];
  const { data: verticals } = verticalIds.length ? await ctx.userDb.from('verticals').select('id, name').in('id', verticalIds) : { data: [] };
  const vertical = new Map(((verticals ?? []) as any[]).map((v) => [v.id as string, v.name as string]));
  return {
    ok: true,
    results: leads.map((l) => ({
      id: l.id,
      name: [l.first_name, l.last_name].filter(Boolean).join(' ') || l.phone || l.email || 'Lead',
      detail: [vertical.get(l.vertical_id), l.city].filter(Boolean).join(' · ') || null,
      phone: l.phone ?? null,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Book / reschedule / cancel                                          */
/* ------------------------------------------------------------------ */

const bookInput = z.object({
  calendarId: uuid,
  partyId: uuid,
  startsAt: iso,
  notes: z.string().trim().max(2000).optional(),
  override: z.boolean().optional(),
});

/** Book a call on someone's behalf: a lead on a homeowner calendar, a prospect on the sales calendar. */
export async function bookCallOnBehalf(input: z.input<typeof bookInput>): Promise<ActionResult<{ id: string; startsAt: string }>> {
  const ctx = await context();
  if (!ctx) return denied;
  const parsed = bookInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the booking' };
  const { calendarId, partyId, startsAt, notes } = parsed.data;
  const cal = await visibleCalendar(ctx.userDb, calendarId);
  if (!cal || !canWorkCalendar(ctx.viewer, cal)) return denied;
  if (!cal.active) return { ok: false, error: 'This calendar is switched off. Turn it on in its settings first.' };
  const override = !!parsed.data.override && canOverrideSlots(ctx.viewer);

  if (cal.kind === 'sales') {
    // RLS: admins see every prospect, a setter only those assigned to them.
    const { data: p } = await ctx.userDb.from('contractor_prospects').select('id, company_name, decision_maker_name, phone, email').eq('id', partyId).maybeSingle();
    if (!p) return { ok: false, error: 'Prospect not found.' };
    const r = await bookSalesAppointment({
      calendarId: cal.id, startsAt, prospectId: p.id,
      // The person booking is credited, as in the calling workspace (setter pay, 0062).
      partnerId: ctx.profile.id, source: 'manual',
      contact: { name: p.decision_maker_name ?? undefined, phone: p.phone ?? undefined, email: p.email ?? undefined },
      actorId: ctx.profile.id, notes: notes || null, override,
    });
    if (!r.ok) return failed(r.error);
    if (override) await auditOverride(ctx.profile.id, { sales_appointment_id: r.salesAppointmentId, calendar_id: cal.id, scheduled_at: r.startsAt });
    notifyBookingSoon({ kind: 'sales_appointment', id: r.salesAppointmentId, change: 'booked', actorKind: 'user' });
    afterChange();
    revalidatePath('/app/calls/appointments');
    return { ok: true, id: r.salesAppointmentId, startsAt: r.startsAt };
  }

  // RLS: staff see every lead, a contractor only leads assigned to it.
  const { data: lead } = await ctx.userDb.from('leads').select('id').eq('id', partyId).maybeSingle();
  if (!lead) return { ok: false, error: 'Lead not found.' };
  const r = await bookAppointment({
    calendarId: cal.id, startsAt, leadId: lead.id, source: 'manual', actorId: ctx.profile.id, actorKind: 'user', notes: notes || null, override,
  });
  if (!r.ok) return failed(r.error);
  if (override) await auditOverride(ctx.profile.id, { appointment_id: r.appointmentId, calendar_id: cal.id, scheduled_at: r.startsAt });
  notifyBookingSoon({ kind: 'appointment', id: r.appointmentId, change: 'booked', actorKind: 'user' });
  afterChange(lead.id);
  return { ok: true, id: r.appointmentId, startsAt: r.startsAt };
}

const changeInput = z.object({ kind: z.enum(['appointment', 'visit', 'sales_appointment']), id: uuid });

export async function rescheduleCalendarEvent(input: { kind: EventKindInput; id: string; startsAt: string; override?: boolean }): Promise<ActionResult<{ startsAt: string }>> {
  const ctx = await context();
  if (!ctx) return denied;
  const parsed = changeInput.extend({ startsAt: iso, override: z.boolean().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Pick a valid time' };
  const ref = await workableBooking(ctx, parsed.data.kind, parsed.data.id);
  if (!ref) return denied;
  if (!ref.calendar) return failed('not_bookable');
  const override = !!parsed.data.override && canOverrideSlots(ctx.viewer);
  const opts = { actorId: ctx.profile.id, actorKind: 'user' as const, override };
  const r = ref.kind === 'sales_appointment'
    ? await rescheduleSalesAppointment(ref.id, parsed.data.startsAt, opts)
    : await rescheduleAppointment(ref.id, parsed.data.startsAt, opts);
  if (!r.ok) return failed(r.error);
  const startsAt = r.startsAt ?? new Date(parsed.data.startsAt).toISOString();
  if (!r.unchanged) {
    if (override) await auditOverride(ctx.profile.id, { [`${ref.kind}_id`]: ref.id, calendar_id: ref.calendar.id, scheduled_at: startsAt, reschedule: true });
    notifyBookingSoon({ kind: ref.kind, id: ref.id, change: 'rescheduled', previousStartsAt: r.previousStartsAt ?? ref.scheduledAt, actorKind: 'user' });
  }
  afterChange(ref.leadId);
  if (ref.kind === 'sales_appointment') revalidatePath('/app/calls/appointments');
  return { ok: true, startsAt };
}

export async function cancelCalendarEvent(input: { kind: EventKindInput; id: string; reason?: string }): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return denied;
  const parsed = changeInput.extend({ reason: z.string().trim().max(500).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Check the cancellation' };
  const ref = await workableBooking(ctx, parsed.data.kind, parsed.data.id);
  if (!ref) return denied;
  const reason = parsed.data.reason || null;
  const opts = { actorId: ctx.profile.id, actorKind: 'user' as const };
  const r = ref.kind === 'sales_appointment'
    ? await cancelSalesAppointment(ref.id, reason, opts)
    : await cancelAppointment(ref.id, reason, opts);
  if (!r.ok) return failed(r.error);
  // Calendar bookings tell the homeowner / prospect; an on-site visit's notices stay with its workflows.
  if (!r.already && ref.calendar) notifyBookingSoon({ kind: ref.kind, id: ref.id, change: 'cancelled', actorKind: 'user' });
  afterChange(ref.leadId);
  if (ref.kind === 'sales_appointment') revalidatePath('/app/calls/appointments');
  return { ok: true };
}

const STATUS_FOR: Record<'appointment' | 'sales_appointment', string[]> = {
  appointment: ['held', 'no_show', 'scheduled'],
  sales_appointment: ['completed', 'no_show', 'scheduled'],
};

/** Held / no-show (and back to scheduled to undo). Cancelling goes through cancelCalendarEvent. */
export async function setCalendarEventStatus(input: { kind: EventKindInput; id: string; status: string }): Promise<ActionResult> {
  const ctx = await context();
  if (!ctx) return denied;
  const parsed = changeInput.extend({ status: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Pick a status' };
  const ref = await workableBooking(ctx, parsed.data.kind, parsed.data.id);
  if (!ref) return denied;
  const status = parsed.data.status;
  if (!STATUS_FOR[ref.kind].includes(status)) return { ok: false, error: 'Pick a status' };
  if (ref.status === 'cancelled') return { ok: false, error: 'A cancelled call cannot be marked. Book a new one instead.' };

  // The user's own client: the existing RLS write rules decide (e.g. a setter edits only sales meetings they booked).
  const table = ref.kind === 'sales_appointment' ? 'prospect_sales_appointments' : 'appointments';
  const { data, error } = await ctx.userDb.from(table).update({ status }).eq('id', ref.id).select('id');
  if (error || !(data as any[] | null)?.length) {
    return { ok: false, error: ref.kind === 'sales_appointment' ? 'Only an admin or the setter who booked this meeting can change it.' : 'This appointment could not be updated.' };
  }

  if (ref.kind === 'appointment' && ref.leadId && status === 'held') {
    // A held call with the HomeQuote team is not the contractor appointment: the lead's stage stays where it is.
    const teamCall = ref.calendar?.kind === 'team';
    if (!teamCall) await ctx.userDb.from('leads').update({ status: 'appointment_completed' }).eq('id', ref.leadId);
    const contractorId = ref.calendar?.contractorId ?? ref.visitContractorId;
    await ctx.userDb.from('lead_activities').insert({
      lead_id: ref.leadId, actor_id: ctx.profile.id, type: 'appointment', body: teamCall ? 'Call with the HomeQuote team held' : 'Appointment completed',
      // Contractor-authored entries must name their own company (activities_insert RLS).
      metadata: { appointment_id: ref.id, ...(contractorId ? { contractor_id: contractorId } : {}) },
    });
  }
  afterChange(ref.leadId);
  if (ref.kind === 'sales_appointment') revalidatePath('/app/calls/appointments');
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Calendar settings                                                   */
/* ------------------------------------------------------------------ */

async function manageableCalendar(calendarId: string): Promise<{ ctx: Ctx; calendar: BookingCalendar } | { error: string }> {
  const ctx = await context();
  if (!ctx) return { error: denied.error };
  const calendar = await visibleCalendar(ctx.userDb, calendarId);
  if (!calendar) return { error: 'Calendar not found' };
  if (!canManageCalendar(ctx.viewer, calendar)) return { error: 'Only a HomeQuote admin or the company owner can change this calendar.' };
  return { ctx, calendar };
}

const field = (f: FormData, k: string) => {
  const v = f.get(k);
  return v === null ? null : String(v).trim();
};
const intField = (lo: number, hi: number, message: string) => z.coerce.number({ invalid_type_error: message }).int(message).min(lo, message).max(hi, message);

const settingsSchema = z
  .object({
    name: z.string().min(1, 'Give the calendar a name').max(120, 'Use 120 characters or fewer'),
    timezone: z.string().refine(isValidTimeZone, 'Pick a valid time zone'),
    duration_minutes: intField(10, 240, 'Call length must be 10–240 minutes'),
    slot_step_minutes: intField(5, 240, 'Start times must be every 5–240 minutes'),
    buffer_minutes: intField(0, 240, 'Buffer must be 0–240 minutes'),
    min_notice_minutes: intField(0, 43200, 'Minimum notice must be 0–720 hours'),
    horizon_days: intField(1, 120, 'Book ahead must be 1–120 days'),
    max_per_day: intField(1, 100, 'Max per day must be 1–100').nullable(),
    meeting_type: z.enum(['phone', 'video']),
    video_link: z.string().max(500).regex(/^https:\/\//, 'The video link must start with https://').nullable(),
    active: z.boolean(),
  })
  .refine((s) => s.meeting_type !== 'video' || !!s.video_link, { message: 'Add the video link callers will join', path: ['video_link'] });

export async function saveBookingCalendarSettings(calendarId: string, _prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const m = await manageableCalendar(calendarId);
  if ('error' in m) return { error: m.error };
  const notice = field(formData, 'min_notice_hours');
  const parsed = settingsSchema.safeParse({
    name: field(formData, 'name'),
    timezone: field(formData, 'timezone'),
    duration_minutes: field(formData, 'duration_minutes'),
    slot_step_minutes: field(formData, 'slot_step_minutes'),
    buffer_minutes: field(formData, 'buffer_minutes') || 0,
    min_notice_minutes: notice ? Math.round(Number(notice) * 60) : 0,
    horizon_days: field(formData, 'horizon_days'),
    max_per_day: field(formData, 'max_per_day') || null,
    meeting_type: field(formData, 'meeting_type'),
    video_link: field(formData, 'video_link') || null,
    active: formData.get('active') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the settings' };
  const { data, error } = await m.ctx.userDb.from('booking_calendars').update(parsed.data).eq('id', m.calendar.id).select('id');
  if (error) return { error: error.message };
  if (!(data as any[] | null)?.length) return { error: 'You can’t change this calendar.' };
  refreshCalendar();
  return { success: 'Settings saved' };
}

const ruleSchema = z
  .object({ weekday: z.number().int().min(0).max(6), startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(1440) })
  .refine((r) => r.endMinute > r.startMinute, 'End time must be after start time');

/** Replace the calendar's weekly hours (WeeklyEditor's `rules` JSON). */
export async function saveBookingCalendarRules(calendarId: string, _prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const m = await manageableCalendar(calendarId);
  if ('error' in m) return { error: m.error };
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get('rules') ?? '[]'));
  } catch {
    return { error: 'Could not read the hours' };
  }
  const parsed = z.array(ruleSchema).max(50).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the hours' };
  const rules = parsed.data;
  for (let d = 0; d < 7; d++) {
    const day = rules.filter((r) => r.weekday === d).sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < day.length; i++) if (day[i].startMinute < day[i - 1].endMinute) return { error: 'Hours on the same day overlap' };
  }
  const db = m.ctx.userDb;
  const { error: delError } = await db.from('booking_calendar_rules').delete().eq('calendar_id', m.calendar.id);
  if (delError) return { error: delError.message };
  if (rules.length) {
    const { error } = await db.from('booking_calendar_rules').insert(
      rules.map((r) => ({ calendar_id: m.calendar.id, weekday: r.weekday, start_minute: r.startMinute, end_minute: r.endMinute }))
    );
    if (error) return { error: error.message };
  }
  refreshCalendar();
  return { success: rules.length ? 'Hours saved' : 'Hours cleared: nothing can be booked until you add some' };
}

/** People who may host a calendar: team / sales take HomeQuote admins + setters; a contractor calendar its own company's users. */
async function eligibleHost(calendar: BookingCalendar, userId: string): Promise<boolean> {
  const { data: p } = await createAdminClient().from('profiles').select('id, role, contractor_id, is_active').eq('id', userId).maybeSingle();
  if (!p || p.is_active === false) return false;
  return calendar.kind === 'contractor' ? p.role === 'contractor' && p.contractor_id === calendar.contractorId : p.role === 'admin' || p.role === 'setter';
}

export async function addBookingCalendarMember(calendarId: string, _prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const m = await manageableCalendar(calendarId);
  if ('error' in m) return { error: m.error };
  const userId = field(formData, 'user_id') ?? '';
  if (!uuid.safeParse(userId).success || !(await eligibleHost(m.calendar, userId))) return { error: 'Pick a person to add' };
  const { error } = await m.ctx.userDb
    .from('booking_calendar_members')
    .upsert({ calendar_id: m.calendar.id, user_id: userId, notify: true }, { onConflict: 'calendar_id,user_id' });
  if (error) return { error: error.message };
  refreshCalendar();
  return { success: 'Host added' };
}

export async function updateBookingCalendarMember(formData: FormData): Promise<void> {
  const calendarId = field(formData, 'calendar_id') ?? '';
  const userId = field(formData, 'user_id') ?? '';
  const op = field(formData, 'op');
  const m = await manageableCalendar(calendarId);
  if ('error' in m || !uuid.safeParse(userId).success) return;
  const members = m.ctx.userDb.from('booking_calendar_members');
  if (op === 'remove') await members.delete().eq('calendar_id', m.calendar.id).eq('user_id', userId);
  else if (op === 'notify_on' || op === 'notify_off') await members.update({ notify: op === 'notify_on' }).eq('calendar_id', m.calendar.id).eq('user_id', userId);
  refreshCalendar();
}
