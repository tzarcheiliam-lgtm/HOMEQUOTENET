/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { gmailEnvironmentReady, sendGmailMessage } from '@/lib/emails/gmail';
import type { MailAttachment } from '@/lib/emails/gmail-message';
import {
  bookingIcs,
  bookingIcsAttachment,
  buildGuestBookingEmail,
  buildHostBookingEmail,
  type GuestMessageContext,
  type HomeownerNotice,
  type HostNotice,
} from '@/lib/emails/booking';
import { nextEligible, resolveZones } from '@/lib/ai-calling/timezone';
import { DEFAULT_ZONES } from '@/lib/sms/config';
import { loadSettings, queueWorkflowText } from '@/lib/sms/service';
import { safeTimeZone } from './format';
import { bookingSms } from './sms-copy';
import { hashManageToken, isManageTokenShape, managePath } from './tokens';
import type { BookingActorKind } from './types';

type Db = ReturnType<typeof createAdminClient>;

/**
 * Automatic booking notices for HomeQuote-native calendars (0068). Not tied to
 * any workflow being enabled.
 *
 *   guest (homeowner, or the contractor prospect on a sales call):
 *     email on book / reschedule / cancel / 24 h + 1 h reminders, with the
 *     self-service manage link, an "Add to calendar" link and an .ics invite;
 *     text through the Mac bridge (queueWorkflowText: texting switch, opt-outs,
 *     contractor switches, person-owned conversations, daily cap, texting
 *     hours). A text that could only go out after the call starts is not queued.
 *     Sales prospects have no text path (sms_conversations need a lead): email only.
 *   host (booking_calendar_members with notify; else the contractor's users):
 *     email on book / reschedule / cancel. Push comes from the existing
 *     notification_events path (DB triggers), Google sync from calendar_sync_jobs.
 *
 * At most once per change: the confirmation is claimed by stamping
 * appointments.confirmed_at / prospect_sales_appointments.booking_confirmed_at
 * (a reschedule clears it, so the new time is confirmed again), reminders by
 * claim_booking_reminders, a cancellation by a lead_activities marker. Texts
 * also carry a deterministic sms_messages.workflow_step_run_id per
 * (booking, purpose, reschedule_count), so a repeat never queues twice and a
 * reschedule / cancel can void texts still waiting for texting hours.
 * A failed send is not retried (a duplicate is worse than a miss).
 *
 * Manage links: the raw token is never stored, so the link is DERIVED, HMAC of
 * the booking id with BOOKING_LINK_SECRET (falls back to the service role key).
 * The stored manage_token_hash is set to match on the first notice, so every
 * message (confirmation, reminders) carries the same working link. Rotating
 * the secret invalidates old links.
 */

export type BookingKind = 'appointment' | 'sales_appointment';

export interface OutgoingEmail {
  toEmail: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;
  attachments?: MailAttachment[];
}
export type EmailSender = (m: OutgoingEmail) => Promise<void>;

export interface NotifyDeps {
  db?: Db;
  /** Injected in tests. undefined = Gmail automation sender when configured; null = no email. */
  sendEmail?: EmailSender | null;
  now?: () => Date;
  siteUrl?: string;
  /** Overrides the manage-link secret (tests). */
  linkSecret?: string | null;
}

/** What a notice did, channel by channel ('sent' / 'queued' / a skip reason). */
export interface NoticeResult {
  kind: BookingKind;
  id: string;
  notice: HomeownerNotice;
  email: string;
  sms: string;
  hostEmails: number;
}

const LIVE: Record<BookingKind, string[]> = {
  appointment: ['scheduled'],
  sales_appointment: ['scheduled', 'confirmed', 'rescheduled'],
};
const TABLE: Record<BookingKind, 'appointments' | 'prospect_sales_appointments'> = {
  appointment: 'appointments',
  sales_appointment: 'prospect_sales_appointments',
};
const CONFIRM_COL: Record<BookingKind, string> = { appointment: 'confirmed_at', sales_appointment: 'booking_confirmed_at' };
const SOURCE_LABELS: Record<string, string> = {
  funnel: 'Website funnel', estimator: 'Instant estimator', manual: 'Booked by the team', sales_funnel: 'Contractor sales funnel', ai: 'AI assistant', workflow: 'Workflow',
};
/** A text must be able to go out at least this long before the call, or it is not queued. */
const TEXT_LEAD_MS = 10 * 60_000;

const db0 = (deps: NotifyDeps) => deps.db ?? createAdminClient();
const nowOf = (deps: NotifyDeps) => (deps.now ? deps.now() : new Date());
function siteOf(deps: NotifyDeps): string {
  return (deps.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homequotenet.com').replace(/\/+$/, '');
}
function senderOf(deps: NotifyDeps): EmailSender | null {
  if (deps.sendEmail !== undefined) return deps.sendEmail;
  if (!gmailEnvironmentReady()) return null;
  return async (m) => {
    await sendGmailMessage({ toEmail: m.toEmail, subject: m.subject, message: m.text, html: m.html, text: m.text, fromName: m.fromName, attachments: m.attachments });
  };
}

// --- manage links --------------------------------------------------------------------------------

export function bookingLinkSecret(): string | null {
  return process.env.BOOKING_LINK_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

/** The booking's manage token (43-char base64url, same shape as newManageToken). Null without a secret. */
export function manageTokenFor(kind: BookingKind, id: string, secret: string | null = bookingLinkSecret()): string | null {
  if (!secret) return null;
  return createHmac('sha256', secret).update(`booking-manage:v1:${kind}:${id}`).digest('base64url');
}

/** "Add to calendar" link next to the manage page (the page's route serves it via icsForManageToken). */
export const bookingIcsPath = (token: string) => `${managePath(token)}/calendar.ics`;

/**
 * Make the stored hash match the derived token and return the token. Booking
 * code can call this right after book_appointment / book_sales_appointment so
 * the thank-you page shows the same link the emails carry.
 */
export async function ensureManageToken(db: Db, kind: BookingKind, id: string, currentHash?: string | null, secret: string | null = bookingLinkSecret()): Promise<string | null> {
  const token = manageTokenFor(kind, id, secret);
  if (!token) return null;
  const hash = hashManageToken(token);
  if (currentHash === hash) return token;
  const { error } = await db.from(TABLE[kind]).update({ manage_token_hash: hash }).eq('id', id);
  return error ? null : token;
}

/** Deterministic uuid for one booking text (unique sms_messages.workflow_step_run_id). */
export function bookingTextKey(kind: BookingKind, id: string, purpose: 'confirm' | 'r24' | 'r1' | 'cancel', version: number): string {
  const h = createHash('sha256').update(`booking-text:${kind}:${id}:${purpose}:v${version}`).digest('hex');
  const variant = ((parseInt(h[16], 16) & 3) | 8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// --- loading -------------------------------------------------------------------------------------

interface Booking {
  kind: BookingKind;
  id: string;
  status: string;
  live: boolean;
  startMs: number;
  endMs: number;
  calendarId: string | null;
  calendarKind: 'contractor' | 'team' | 'sales' | null;
  contractorId: string | null;
  calendarName: string;
  calendarTz: string;
  guestTz: string;
  meetingType: 'phone' | 'video';
  videoLink: string | null;
  hostName: string;
  guestName: string;
  firstName: string | null;
  phone: string | null;
  email: string | null;
  leadId: string | null;
  prospectId: string | null;
  consent: boolean;
  emailOptOut: boolean;
  project: string | null;
  notes: string | null;
  source: string | null;
  manageTokenHash: string | null;
  rescheduleCount: number;
  confirmedAt: string | null;
  cancelReason: string | null;
  createdBy: string | null;
}

const EMAIL_RE = /[^\s@·]+@[^\s@·]+\.[^\s@·]+/;
const ms = (v: unknown) => new Date(String(v)).getTime();

async function calendarOf(db: Db, id: string | null) {
  if (!id) return null;
  const { data } = await db.from('booking_calendars').select('id, kind, contractor_id, name, timezone, meeting_type, video_link').eq('id', id).maybeSingle();
  return data as any;
}

async function loadBooking(db: Db, kind: BookingKind, id: string): Promise<Booking | null> {
  if (kind === 'appointment') {
    const { data: ap } = await db
      .from('appointments')
      .select('id, lead_id, calendar_id, status, scheduled_at, ends_at, time_zone, invitee_time_zone, meeting_type, contact_name, contact_phone, contact_email, manage_token_hash, reschedule_count, confirmed_at, cancel_reason, created_by, source, notes')
      .eq('id', id)
      .maybeSingle();
    if (!ap || !ap.scheduled_at) return null;
    const cal = await calendarOf(db, ap.calendar_id);
    const { data: lead } = ap.lead_id
      ? await db.from('leads').select('first_name, last_name, phone, email, state, zip, consent_granted, project_description').eq('id', ap.lead_id).maybeSingle()
      : { data: null };
    const l = (lead ?? {}) as any;
    let hostName = 'HomeQuote';
    if (cal?.kind === 'contractor' && cal.contractor_id) {
      const { data: co } = await db.from('contractors').select('name').eq('id', cal.contractor_id).maybeSingle();
      hostName = (co as any)?.name?.trim() || cal.name || hostName;
    }
    const calendarTz = safeTimeZone(ap.time_zone ?? cal?.timezone);
    const startMs = ms(ap.scheduled_at);
    const guestName = (ap.contact_name ?? [l.first_name, l.last_name].filter(Boolean).join(' ')).trim();
    return {
      kind, id: ap.id, status: ap.status, live: LIVE.appointment.includes(ap.status), startMs,
      endMs: ap.ends_at ? ms(ap.ends_at) : startMs + 30 * 60_000,
      calendarId: ap.calendar_id ?? null, calendarKind: cal?.kind ?? null, contractorId: cal?.kind === 'contractor' ? cal.contractor_id : null,
      calendarName: cal?.name ?? 'HomeQuote', calendarTz, guestTz: safeTimeZone(ap.invitee_time_zone, calendarTz),
      meetingType: (ap.meeting_type ?? cal?.meeting_type) === 'video' ? 'video' : 'phone', videoLink: cal?.video_link ?? null,
      hostName, guestName, firstName: (l.first_name as string | undefined)?.trim() || guestName.split(' ')[0] || null,
      phone: ap.contact_phone ?? l.phone ?? null, email: ap.contact_email ?? l.email ?? null,
      leadId: ap.lead_id ?? null, prospectId: null, consent: l.consent_granted === true, emailOptOut: false,
      project: l.project_description ?? null, notes: ap.notes ?? null, source: ap.source ?? null,
      manageTokenHash: ap.manage_token_hash ?? null, rescheduleCount: ap.reschedule_count ?? 0, confirmedAt: ap.confirmed_at ?? null,
      cancelReason: ap.cancel_reason ?? null, createdBy: ap.created_by ?? null,
    };
  }
  const { data: sa } = await db
    .from('prospect_sales_appointments')
    .select('id, prospect_id, calendar_id, status, scheduled_at, ends_at, time_zone, appointment_type, decision_maker_name, contact_info, manage_token_hash, reschedule_count, booking_confirmed_at, cancel_reason, created_by, source, notes')
    .eq('id', id)
    .maybeSingle();
  if (!sa || !sa.scheduled_at) return null;
  const cal = await calendarOf(db, sa.calendar_id);
  const { data: p } = await db.from('contractor_prospects').select('company_name, phone, email, email_opt_out_at').eq('id', sa.prospect_id).maybeSingle();
  const prospect = (p ?? {}) as any;
  const calendarTz = safeTimeZone(cal?.timezone);
  const startMs = ms(sa.scheduled_at);
  const guestName = (sa.decision_maker_name ?? prospect.company_name ?? '').trim();
  return {
    kind, id: sa.id, status: sa.status, live: LIVE.sales_appointment.includes(sa.status), startMs,
    endMs: sa.ends_at ? ms(sa.ends_at) : startMs + 30 * 60_000,
    calendarId: sa.calendar_id ?? null, calendarKind: cal?.kind ?? null, contractorId: null,
    calendarName: cal?.name ?? 'HomeQuote sales', calendarTz, guestTz: safeTimeZone(sa.time_zone, calendarTz),
    meetingType: (sa.appointment_type ?? cal?.meeting_type) === 'video' ? 'video' : 'phone', videoLink: cal?.video_link ?? null,
    hostName: 'HomeQuote Network', guestName, firstName: (sa.decision_maker_name as string | null)?.trim().split(' ')[0] || null,
    phone: prospect.phone ?? null, email: prospect.email ?? (String(sa.contact_info ?? '').match(EMAIL_RE)?.[0] ?? null),
    leadId: null, prospectId: sa.prospect_id, consent: false, emailOptOut: !!prospect.email_opt_out_at,
    project: prospect.company_name ?? null, notes: sa.notes ?? null, source: sa.source ?? null,
    manageTokenHash: sa.manage_token_hash ?? null, rescheduleCount: sa.reschedule_count ?? 0, confirmedAt: sa.booking_confirmed_at ?? null,
    cancelReason: sa.cancel_reason ?? null, createdBy: sa.created_by ?? null,
  };
}

// --- channels ------------------------------------------------------------------------------------

function guestContext(b: Booking, token: string | null, site: string, previousStartMs?: number | null): GuestMessageContext {
  return {
    firstName: b.firstName, hostName: b.hostName, startMs: b.startMs, endMs: b.endMs, timeZone: b.guestTz,
    meetingType: b.meetingType, phone: b.phone, videoLink: b.videoLink,
    manageUrl: token ? `${site}${managePath(token)}` : null,
    icsUrl: token ? `${site}${bookingIcsPath(token)}` : null,
    previousStartMs: previousStartMs ?? null,
  };
}

function icsInput(b: Booking, site: string, token: string | null, cancelled = false) {
  return {
    kind: b.kind, id: b.id, startMs: b.startMs, endMs: b.endMs,
    title: `${b.meetingType === 'video' ? 'Video call' : 'Phone call'} with ${b.hostName}`,
    description: token ? `Reschedule or cancel: ${site}${managePath(token)}` : null,
    location: b.meetingType === 'video' ? b.videoLink : 'Phone call',
    url: token ? `${site}${managePath(token)}` : null,
    // A cancel must out-rank the last published version.
    sequence: b.rescheduleCount + (cancelled ? 1 : 0),
    cancelled,
  };
}

const TEXT_PURPOSE: Record<HomeownerNotice, 'confirm' | 'r24' | 'r1' | 'cancel'> = {
  confirmed: 'confirm', rescheduled: 'confirm', reminder_24h: 'r24', reminder_1h: 'r1', cancelled: 'cancel',
};
const TEXT_LABEL: Record<HomeownerNotice, string> = {
  confirmed: 'Booking confirmation text', rescheduled: 'Reschedule confirmation text', reminder_24h: '24-hour reminder text',
  reminder_1h: '1-hour reminder text', cancelled: 'Cancellation text',
};

async function sendGuestText(db: Db, b: Booking, notice: HomeownerNotice, ctx: GuestMessageContext, now: Date): Promise<string> {
  if (b.kind !== 'appointment' || !b.leadId) return 'not_supported';
  if (!b.consent) return 'no_consent';
  try {
    // Texting hours: the queue would hold the text until the window opens. Skip it if that is after the call.
    const settings = await loadSettings(db);
    const { data: lead } = await db.from('leads').select('state, zip').eq('id', b.leadId).maybeSingle();
    const zones = resolveZones({ state: (lead as any)?.state ?? null, zip: (lead as any)?.zip ?? null }) ?? DEFAULT_ZONES;
    const when = nextEligible(now, zones, { startHour: settings.window_start_hour, endHour: settings.window_end_hour }) ?? now;
    const latest = notice === 'cancelled' ? b.startMs : b.startMs - TEXT_LEAD_MS;
    if (when.getTime() > latest) return 'outside_texting_hours';
    const body = bookingSms(notice, ctx, { hasEmail: !!b.email && !b.emailOptOut });
    const r = await queueWorkflowText(db, {
      leadId: b.leadId, body, contractorId: b.contractorId, assistant: false, now, label: TEXT_LABEL[notice],
      stepRunId: bookingTextKey(b.kind, b.id, TEXT_PURPOSE[notice], b.rescheduleCount),
    });
    return r.ok ? (r.queued ? 'queued' : 'already_queued') : r.reason;
  } catch {
    return 'error';
  }
}

async function sendGuestEmail(b: Booking, notice: HomeownerNotice, ctx: GuestMessageContext, deps: NotifyDeps, token: string | null): Promise<string> {
  if (!b.email) return 'no_email';
  if (b.emailOptOut) return 'opted_out';
  const send = senderOf(deps);
  if (!send) return 'email_not_configured';
  const mail = buildGuestBookingEmail(notice, ctx);
  const attach = notice === 'confirmed' || notice === 'rescheduled' || notice === 'cancelled';
  try {
    await send({
      toEmail: b.email, subject: mail.subject, html: mail.html, text: mail.text,
      fromName: b.calendarKind === 'contractor' ? b.hostName : 'HomeQuote Network',
      attachments: attach ? [bookingIcsAttachment(icsInput(b, siteOf(deps), token, notice === 'cancelled'))] : undefined,
    });
    return 'sent';
  } catch {
    return 'failed';
  }
}

/** Hosts: the calendar's members with notify on; a contractor calendar without members falls back to the company's users. */
async function hostRecipients(db: Db, b: Booking, exclude: string | null): Promise<{ id: string; email: string; name: string | null }[]> {
  if (!b.calendarId) return [];
  const { data: members } = await db.from('booking_calendar_members').select('user_id, notify').eq('calendar_id', b.calendarId);
  let ids = ((members ?? []) as any[]).filter((m) => m.notify !== false).map((m) => m.user_id as string);
  if (!((members ?? []) as any[]).length && b.contractorId) {
    const { data: users } = await db.from('profiles').select('id').eq('contractor_id', b.contractorId).eq('role', 'contractor').eq('is_active', true);
    ids = ((users ?? []) as any[]).map((u) => u.id as string);
  }
  ids = ids.filter((x) => x !== exclude);
  if (!ids.length) return [];
  const { data: people } = await db.from('profiles').select('id, email, full_name, is_active').in('id', ids);
  return ((people ?? []) as any[])
    .filter((p) => p.is_active !== false && typeof p.email === 'string' && p.email.includes('@'))
    .map((p) => ({ id: p.id, email: p.email, name: p.full_name ?? null }));
}

async function sendHostEmails(db: Db, b: Booking, notice: HostNotice, deps: NotifyDeps, extra: { previousStartMs?: number | null; cancelledByGuest?: boolean; exclude?: string | null }): Promise<number> {
  const send = senderOf(deps);
  if (!send) return 0;
  const people = await hostRecipients(db, b, extra.exclude ?? null);
  const site = siteOf(deps);
  let sent = 0;
  for (const p of people) {
    const mail = buildHostBookingEmail(notice, {
      hostFirstName: p.name?.split(' ')[0] ?? null, calendarName: b.calendarName, guestName: b.guestName,
      guestPhone: b.phone, guestEmail: b.email, project: b.project, notes: b.notes, sourceLabel: b.source ? SOURCE_LABELS[b.source] ?? null : null,
      startMs: b.startMs, endMs: b.endMs, timeZone: b.calendarTz, previousStartMs: extra.previousStartMs ?? null,
      cancelReason: b.cancelReason, cancelledByGuest: extra.cancelledByGuest,
      appUrl: b.kind === 'appointment' ? (b.leadId ? `${site}/app/leads/${b.leadId}` : null) : `${site}/app/calls/${b.prospectId}`,
    });
    try {
      await send({ toEmail: p.email, subject: mail.subject, html: mail.html, text: mail.text, fromName: 'HomeQuote Network' });
      sent++;
    } catch { /* one host's failure never blocks the others */ }
  }
  return sent;
}

/** Texts from earlier versions of this booking that are still waiting (texting hours) are dropped. */
async function voidQueuedTexts(db: Db, b: Booking, upToVersion: number): Promise<void> {
  if (b.kind !== 'appointment') return;
  const keys: string[] = [];
  for (let v = Math.max(0, upToVersion - 20); v <= upToVersion; v++) {
    for (const p of ['confirm', 'r24', 'r1'] as const) keys.push(bookingTextKey(b.kind, b.id, p, v));
  }
  await db.from('sms_messages').update({ status: 'failed', error: 'Booking changed before this text was sent' }).in('workflow_step_run_id', keys).eq('status', 'queued');
}

// --- notices -------------------------------------------------------------------------------------

/**
 * Booking / reschedule confirmation. Claims the row (confirmed_at null -> now);
 * returns null when there is nothing to send (already confirmed, not live, no calendar).
 */
export async function sendBookingConfirmation(kind: BookingKind, id: string, deps: NotifyDeps = {}, opts: { previousStartsAt?: string | null } = {}): Promise<NoticeResult | null> {
  const db = db0(deps);
  const now = nowOf(deps);
  const col = CONFIRM_COL[kind];
  const { data: claimed, error } = await db.from(TABLE[kind]).update({ [col]: now.toISOString() })
    .eq('id', id).is(col, null).in('status', LIVE[kind]).not('calendar_id', 'is', null).select('id');
  if (error || !(claimed as any[] | null)?.length) return null;
  const b = await loadBooking(db, kind, id);
  if (!b || !b.calendarId) return null;
  const notice: HomeownerNotice = b.rescheduleCount > 0 ? 'rescheduled' : 'confirmed';
  if (notice === 'rescheduled') await voidQueuedTexts(db, b, b.rescheduleCount - 1);
  if (b.startMs <= now.getTime()) return { kind, id, notice, email: 'past', sms: 'past', hostEmails: 0 };
  const token = await ensureManageToken(db, kind, id, b.manageTokenHash, deps.linkSecret !== undefined ? deps.linkSecret : bookingLinkSecret());
  const previousStartMs = opts.previousStartsAt ? ms(opts.previousStartsAt) : null;
  const ctx = guestContext(b, token, siteOf(deps), previousStartMs);
  const email = await sendGuestEmail(b, notice, ctx, deps, token);
  const sms = await sendGuestText(db, b, notice, ctx, now);
  const hostEmails = await sendHostEmails(db, b, notice === 'confirmed' ? 'booked' : 'rescheduled', deps, {
    previousStartMs, exclude: notice === 'confirmed' ? b.createdBy : null,
  });
  return { kind, id, notice, email, sms, hostEmails };
}

/** 24 h / 1 h reminder (already claimed by claim_booking_reminders). Guest only. */
export async function sendBookingReminder(kind: BookingKind, id: string, reminder: '24h' | '1h', deps: NotifyDeps = {}): Promise<NoticeResult | null> {
  const db = db0(deps);
  const now = nowOf(deps);
  const b = await loadBooking(db, kind, id);
  const notice: HomeownerNotice = reminder === '24h' ? 'reminder_24h' : 'reminder_1h';
  if (!b || !b.live || !b.calendarId || b.startMs <= now.getTime()) return null;
  // A (re)confirmation that just went out already told them the time.
  const quietMs = reminder === '24h' ? 6 * 3_600_000 : 15 * 60_000;
  if (b.confirmedAt && now.getTime() - ms(b.confirmedAt) < quietMs) return { kind, id, notice, email: 'just_confirmed', sms: 'just_confirmed', hostEmails: 0 };
  const token = await ensureManageToken(db, kind, id, b.manageTokenHash, deps.linkSecret !== undefined ? deps.linkSecret : bookingLinkSecret());
  const ctx = guestContext(b, token, siteOf(deps));
  const email = await sendGuestEmail(b, notice, ctx, deps, token);
  const sms = await sendGuestText(db, b, notice, ctx, now);
  return { kind, id, notice, email, sms, hostEmails: 0 };
}

const CANCEL_MARKER = 'booking_cancel_notice';

/**
 * Cancellation notice to the guest and the hosts. Homeowner appointments are
 * de-duplicated by a lead_activities marker (so the tick backstop and the
 * request that cancelled never both send); sales calls rely on the caller
 * (cancel_sales_appointment answers `already` on a repeat).
 */
export async function sendBookingCancellation(kind: BookingKind, id: string, deps: NotifyDeps = {}, opts: { actorKind?: BookingActorKind | null } = {}): Promise<NoticeResult | null> {
  const db = db0(deps);
  const now = nowOf(deps);
  const b = await loadBooking(db, kind, id);
  if (!b || b.status !== 'cancelled' || !b.calendarId) return null;
  if (kind === 'appointment' && b.leadId) {
    const { data: marked } = await db.from('lead_activities').select('id').eq('lead_id', b.leadId).contains('metadata', { [CANCEL_MARKER]: id }).limit(1);
    if ((marked as any[] | null)?.length) return null;
    await db.from('lead_activities').insert({
      lead_id: b.leadId, type: 'system', body: 'Cancellation notice sent',
      metadata: { [CANCEL_MARKER]: id, appointment_id: id, ...(b.contractorId ? { contractor_id: b.contractorId } : {}) },
    });
  }
  await voidQueuedTexts(db, b, b.rescheduleCount);
  if (b.startMs <= now.getTime()) return { kind, id, notice: 'cancelled', email: 'past', sms: 'past', hostEmails: 0 };
  const ctx = guestContext(b, null, siteOf(deps));
  const email = await sendGuestEmail(b, 'cancelled', ctx, deps, null);
  const sms = await sendGuestText(db, b, 'cancelled', ctx, now);
  const hostEmails = await sendHostEmails(db, b, 'cancelled', deps, { cancelledByGuest: opts.actorKind === 'homeowner' });
  return { kind, id, notice: 'cancelled', email, sms, hostEmails };
}

export interface BookingChange {
  kind: BookingKind;
  id: string;
  change: 'booked' | 'rescheduled' | 'cancelled';
  previousStartsAt?: string | null;
  actorKind?: BookingActorKind | null;
}

/** Send the notices for one change now. Never throws. */
export async function notifyBookingChange(event: BookingChange, deps: NotifyDeps = {}): Promise<NoticeResult | null> {
  try {
    return event.change === 'cancelled'
      ? await sendBookingCancellation(event.kind, event.id, deps, { actorKind: event.actorKind })
      : await sendBookingConfirmation(event.kind, event.id, deps, { previousStartsAt: event.previousStartsAt });
  } catch (e) {
    console.error('[booking] notify failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Call after a successful book / reschedule / cancel (skip it when the RPC
 * answered `unchanged` or `already`). Runs after the response; the 5-minute
 * tick (runBookingNotifications) is the backstop.
 */
export function notifyBookingSoon(event: BookingChange, deps: NotifyDeps = {}): void {
  try {
    after(async () => {
      await notifyBookingChange(event, deps);
    });
  } catch {
    /* outside a request scope; the scheduled tick will pick it up */
  }
}

/** The .ics for a manage link (for the manage page's calendar.ics route). Null for unknown tokens. */
export async function icsForManageToken(token: string, deps: NotifyDeps = {}): Promise<string | null> {
  if (!isManageTokenShape(token)) return null;
  const db = db0(deps);
  const hash = hashManageToken(token);
  for (const kind of ['appointment', 'sales_appointment'] as const) {
    const { data } = await db.from(TABLE[kind]).select('id').eq('manage_token_hash', hash).maybeSingle();
    if (!data) continue;
    const b = await loadBooking(db, kind, (data as any).id);
    if (!b) return null;
    return bookingIcs(icsInput(b, siteOf(deps), token, b.status === 'cancelled'));
  }
  return null;
}
