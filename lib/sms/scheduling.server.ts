/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/sms */
import 'server-only';
import { bookableSlots, unavailableReason } from '@/lib/availability/slots';
import { loadAvailabilityContext } from '@/lib/availability/data.server';
import { bookAppointment } from '@/lib/booking/book.server';
import { getContractorCalendar, getTeamCalendar } from '@/lib/booking/calendars.server';
import { resolveHostContact } from '@/lib/booking/host-contact';
import { notifyBookingSoon } from '@/lib/booking/notify.server';
import { getSlots } from '@/lib/booking/slots.server';
import { PICK_ANOTHER_TIME } from '@/lib/booking/types';
import { flushCalendarSyncSoon } from '@/lib/calendar/sync.server';
import { prettyPhone } from '@/lib/emails/booking';
import { flushNotificationsSoon } from '@/lib/notifications/outbox';
import { note, type Db } from './core';
import { OFFER_DAYS, pickOpenTimes, type OpenTime } from './scheduling';

/**
 * Loads real open times for the texting assistant and books the one a homeowner picks
 * (see scheduling.ts for the two kinds). Everything here is best effort: a lookup that
 * fails just means no times are offered and the assistant falls back to asking.
 */

/** How far ahead to look for times. */
const LOOKAHEAD_DAYS = 14;
/** Assignments that can still get a visit booked. */
const OPEN_ASSIGNMENT = ['assigned', 'accepted', 'contacted', 'qualified', 'no_answer'];
/** A lead with one of these already has something on the calendar: nothing more to book by text. */
const LIVE_APPOINTMENT = ['scheduled', 'rescheduled'];
/** Appointment statuses that hold a contractor's time. */
const HOLDS_TIME = ['scheduled', 'held', 'rescheduled'];

export interface VisitOption {
  kind: 'visit';
  contractorId: string;
  assignmentId: string;
  /** The company coming out, as the homeowner knows it. */
  who: string;
  timeZone: string;
  times: OpenTime[];
}

export interface CallOption {
  kind: 'call';
  calendarId: string;
  assignmentId: string | null;
  /** Who calls: "Liam from Pool Masters". */
  who: string;
  callerFirstName: string | null;
  fromPhone: string | null;
  minutes: number;
  timeZone: string;
  times: OpenTime[];
}

export interface BookingOptions {
  visit: VisitOption | null;
  call: CallOption | null;
  /** The lead already has a live appointment (then nothing is offered). */
  alreadyBooked: boolean;
}

export const NO_OPTIONS: BookingOptions = { visit: null, call: null, alreadyBooked: false };

interface Convo { id: string; lead_id: string; sender_name: string; contractor_id?: string | null }

async function openAssignment(db: Db, leadId: string, contractorId: string | null): Promise<{ id: string; contractor_id: string } | null> {
  let q = db.from('lead_assignments').select('id,contractor_id,status,assigned_at').eq('lead_id', leadId).in('status', OPEN_ASSIGNMENT);
  if (contractorId) q = q.eq('contractor_id', contractorId);
  const { data } = await q.order('assigned_at', { ascending: false }).limit(1);
  return ((data ?? [])[0] as { id: string; contractor_id: string } | undefined) ?? null;
}

export async function hasLiveAppointment(db: Db, leadId: string, now: Date): Promise<boolean> {
  const { data: assigns } = await db.from('lead_assignments').select('id').eq('lead_id', leadId);
  const ids = ((assigns ?? []) as { id: string }[]).map((a) => a.id);
  const upcoming = (q: any) => q.in('status', LIVE_APPOINTMENT).gte('scheduled_at', now.toISOString()).limit(1);
  const [byAssignment, byLead] = await Promise.all([
    ids.length ? upcoming(db.from('appointments').select('id').in('assignment_id', ids)) : Promise.resolve({ data: [] }),
    upcoming(db.from('appointments').select('id').eq('lead_id', leadId)),
  ]);
  // appointments.lead_id arrives with migration 0070; before it, only the assignment side counts.
  const viaLead = (byLead as any).error ? 0 : ((byLead as any).data?.length ?? 0);
  return ((byAssignment as any).data?.length ?? 0) + viaLead > 0;
}

/** The free in-home visit: the contractor's on-site availability (its own hours, or the default ones). */
async function visitOption(db: Db, c: Convo, now: Date): Promise<VisitOption | null> {
  const assignment = await openAssignment(db, c.lead_id, c.contractor_id ?? null);
  if (!assignment) return null;
  const from = now.getTime();
  const to = from + LOOKAHEAD_DAYS * 86_400_000;
  const ctx = await loadAvailabilityContext(assignment.contractor_id, from, to, { db: db as any });
  const slots = bookableSlots({ ...ctx, nowMs: from }, from, to, { stepMinutes: 60 });
  const tz = ctx.settings.timezone;
  const times = pickOpenTimes(slots, 'visit', tz, from);
  if (!times.length) return null;
  const { data: co } = await db.from('contractors').select('name,texting_sender_name').eq('id', assignment.contractor_id).maybeSingle();
  const who = ((co as any)?.texting_sender_name?.trim() || (co as any)?.name || c.sender_name).slice(0, 60);
  return { kind: 'visit', contractorId: assignment.contractor_id, assignmentId: assignment.id, who, timeZone: tz, times };
}

/** The quick call: the HomeQuote calendar this lead books into (the contractor's, else the team's). */
async function callOption(db: Db, c: Convo, now: Date): Promise<CallOption | null> {
  const cal = c.contractor_id ? await getContractorCalendar(c.contractor_id, { create: true, db: db as any }) : await getTeamCalendar(db as any);
  if (!cal || !cal.active) return null;
  const from = now.getTime();
  const res = await getSlots(cal.id, from, from + Math.min(cal.horizonDays, LOOKAHEAD_DAYS) * 86_400_000, { db: db as any, nowMs: from });
  if (!res) return null;
  const times = pickOpenTimes(res.slots, 'call', cal.timezone, from, { days: OFFER_DAYS });
  if (!times.length) return null;
  const host = resolveHostContact({ kind: cal.kind, name: cal.name, host: cal.host });
  const assignment = c.contractor_id ? await openAssignment(db, c.lead_id, c.contractor_id) : null;
  return {
    kind: 'call',
    calendarId: cal.id,
    assignmentId: assignment?.id ?? null,
    who: (host?.displayName ?? cal.name).slice(0, 60),
    callerFirstName: host?.firstName ?? null,
    fromPhone: prettyPhone(host?.phone),
    minutes: cal.durationMinutes,
    timeZone: cal.timezone,
    times,
  };
}

/**
 * The times to offer on this turn. The visit needs a contractor on the lead (a network lead with no contractor yet can
 * only be offered the call); either side failing to load just leaves it out.
 */
export async function loadBookingOptions(db: Db, c: Convo, now: Date): Promise<BookingOptions> {
  try {
    if (await hasLiveAppointment(db, c.lead_id, now)) return { ...NO_OPTIONS, alreadyBooked: true };
  } catch {
    return NO_OPTIONS;
  }
  const [visit, call] = await Promise.all([
    visitOption(db, c, now).catch(() => null),
    callOption(db, c, now).catch(() => null),
  ]);
  return { visit, call, alreadyBooked: false };
}

export type BookOutcome = { ok: true; appointmentId: string; startsAt: string } | { ok: false; reason: 'taken' | 'error' };

/** Any visit of this contractor overlapping the window (a direct check right before booking). */
async function contractorBusy(db: Db, contractorId: string, startMs: number, endMs: number): Promise<boolean> {
  const { data: assigns } = await db.from('lead_assignments').select('id').eq('contractor_id', contractorId);
  const ids = ((assigns ?? []) as { id: string }[]).map((a) => a.id);
  if (!ids.length) return false;
  const { data } = await db.from('appointments').select('id,scheduled_at').in('assignment_id', ids).in('status', HOLDS_TIME)
    .gt('scheduled_at', new Date(startMs - (endMs - startMs)).toISOString()).lt('scheduled_at', new Date(endMs).toISOString());
  return ((data ?? []) as { scheduled_at: string }[]).some((a) => {
    const s = Date.parse(a.scheduled_at);
    return s < endMs && startMs < s + (endMs - startMs);
  });
}

/** Books the visit picked by text: an on-site appointment on the lead's assignment, like a staff booking. */
export async function bookVisit(db: Db, opt: VisitOption, time: OpenTime, leadId: string, now: Date): Promise<BookOutcome> {
  try {
    // Re-check: someone may have taken the time since it was offered.
    const ctx = await loadAvailabilityContext(opt.contractorId, time.startMs - 86_400_000, time.endMs + 86_400_000, { db: db as any });
    if (unavailableReason({ ...ctx, nowMs: now.getTime() }, time.startMs) !== null) return { ok: false, reason: 'taken' };
    if (await contractorBusy(db, opt.contractorId, time.startMs, time.endMs)) return { ok: false, reason: 'taken' };
    const startsAt = new Date(time.startMs).toISOString();
    const { data, error } = await db.from('appointments').insert({
      assignment_id: opt.assignmentId,
      scheduled_at: startsAt,
      notes: 'Booked by the homeowner over text with the texting assistant.',
      booked_via: 'chat',
    }).select('id').single();
    if (error || !data) return { ok: false, reason: 'error' };
    await db.from('lead_assignments').update({ status: 'appointment_set' }).eq('id', opt.assignmentId);
    await db.from('leads').update({ status: 'appointment_set' }).eq('id', leadId).in('status', ['new', 'contact_attempted', 'qualified', 'assigned']);
    await db.from('lead_activities').insert({ lead_id: leadId, type: 'appointment', body: 'Appointment scheduled', metadata: { sms: true, booked_by_text: true } });
    try { flushNotificationsSoon(); flushCalendarSyncSoon(); } catch { /* best effort outside a request */ }
    return { ok: true, appointmentId: (data as { id: string }).id, startsAt };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Books the call picked by text on its HomeQuote calendar (atomic, re-checked under the calendar lock). */
export async function bookCall(db: Db, opt: CallOption, time: OpenTime, lead: { id: string; first_name: string | null; last_name?: string | null; phone: string | null; email?: string | null }): Promise<BookOutcome> {
  try {
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim();
    const r = await bookAppointment({
      calendarId: opt.calendarId,
      startsAt: time.startMs,
      leadId: lead.id,
      assignmentId: opt.assignmentId,
      source: 'ai',
      contact: { ...(name ? { name } : {}), ...(lead.phone ? { phone: lead.phone } : {}), ...(lead.email ? { email: lead.email } : {}) },
      actorKind: 'homeowner',
      notes: 'Booked by the homeowner over text with the texting assistant.',
      db: db as any,
    });
    if (!r.ok) return { ok: false, reason: PICK_ANOTHER_TIME.has(r.error) ? 'taken' : 'error' };
    // Emails, host alerts and calendar sync. Its confirmation TEXT is skipped: the conversation is with a person by then
    // and the assistant already sent the confirmation (see replyWithAgent).
    try { notifyBookingSoon({ kind: 'appointment', id: r.appointmentId, change: 'booked', actorKind: 'homeowner' }); } catch { /* outside a request */ }
    return { ok: true, appointmentId: r.appointmentId, startsAt: r.startsAt };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** A line on the lead's timeline for the team. */
export async function noteBooked(db: Db, leadId: string, kind: 'visit' | 'call', label: string, who: string) {
  await note(db, leadId, kind === 'visit'
    ? `Booked a free estimate visit by text: ${label} with ${who}.`
    : `Booked a call by text: ${label} with ${who}.`, { booked_by_text: true });
}
