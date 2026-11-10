/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { gmailEnvironmentReady, sendGmailMessage } from '@/lib/emails/gmail';
import { leadAlertRecipients } from '@/lib/leads/notify';
import { loadLeadDesign, type LeadDesign } from '@/lib/leads/design.server';
import { sendPushNotification, type SendPushInput } from '@/lib/notifications/service';
import { localParts } from '@/lib/availability/time';
import { planNoShow } from '@/lib/sms/reminder-plan';
import { reminderConfig, type ReminderConfig } from '@/lib/sms/reminder-config';
import { queueRecoveryText, RECOVERY_SKIP_LABELS } from '@/lib/sms/recovery';
import { projectLabel } from '@/lib/sms/rules';
import { signBookingTicket, signRebookGrant } from '@/app/api/booking/_lib/grant';
import { getCalendar } from './calendars.server';
import { safeTimeZone } from './format';
import { callLengthPhrase, resolveHostContact } from './host-contact';
import { buildRecoveryEmail, callNames, heldPromptCopy, missedCallText, shortWhen, speedAlertCopy, type SpeedEvent } from './recovery-copy';
import type { BookingCalendar } from './types';
import { findUnbookedLeads, leadCalendar, unbookedBlocker } from './unbooked.server';

type Db = ReturnType<typeof createAdminClient>;

/**
 * Lead recovery, built on the systems that already exist (one claim table, one texting path, one push path,
 * one email path):
 *   1. speed-to-lead alert: push (admins + calendar hosts) + email (the lead-alert list + hosts) the moment a
 *      funnel / estimator lead comes in, and again when they book a call (sendSpeedToLeadAlert);
 *   2. no-show: the "sorry we missed you" EMAIL with a link to pick a new time (runRecovery; its TEXT is the
 *      existing no_show step of runTextReminders, reworded), and a push to the host when a calendar call is still
 *      "scheduled" 30 minutes after it ended ("did you reach them?"; the status is never changed automatically);
 *   3. missed call: the "Couldn't reach them" button (sendMissedCallRecovery: text + email, a lead activity,
 *      at most once per call every 6 hours);
 *   5. never booked: the follow-up EMAIL 2 hours after they gave their details (runRecovery; the TEXT is step 5 of
 *      runTextReminders, next to the other no-reply follow-ups).
 * Every send is claimed first in sms_reminders (migration 0068; unique per kind + ref + step + anchor), so a
 * repeat, a retry or the 5-minute tick never sends twice. Steps used here:
 *   no_reply / <lead id>         speed_submitted, unbooked (text), unbooked_email   anchor 1970-01-01 (once per lead)
 *   home_appointment / <appt id> speed_booked (anchor 1970), held_prompt, no_show_email (anchor = call time),
 *                                missed_call (anchor = the minute it was sent; at most one per 6 hours)
 * Switches: sms_settings.reminder_config.recovery (Texting → Reminders & follow-ups → Lead recovery).
 */

const ONCE = new Date(0);

/** sms_settings.reminder_config (null before migration 0068: nothing can be claimed then). */
async function loadReminderConfig(db: Db): Promise<ReminderConfig | null> {
  const { data, error } = await db.from('sms_settings').select('reminder_config').eq('id', true).maybeSingle();
  return error ? null : reminderConfig((data as any)?.reminder_config);
}
const MIN = 60_000;
const HOUR = 60 * MIN;
const MISSED_CALL_WINDOW_MS = 6 * HOUR;

export interface RecoveryEmail { toEmail: string; subject: string; html: string; text: string; fromName?: string }
export type RecoverySender = (m: RecoveryEmail) => Promise<void>;

export interface RecoveryDeps {
  db?: Db;
  now?: Date;
  /** undefined = the Gmail automation sender when configured; null = no email. */
  sendEmail?: RecoverySender | null;
  push?: (input: SendPushInput) => Promise<unknown>;
  siteUrl?: string;
  /** The owner's alert list (default leadAlertRecipients()). */
  alertEmails?: string[];
}

const dbOf = (d: RecoveryDeps) => d.db ?? createAdminClient();
const nowOf = (d: RecoveryDeps) => d.now ?? new Date();
const siteOf = (d: RecoveryDeps) => (d.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homequotenet.com').replace(/\/+$/, '');
function senderOf(d: RecoveryDeps): RecoverySender | null {
  if (d.sendEmail !== undefined) return d.sendEmail;
  if (!gmailEnvironmentReady()) return null;
  return async (m) => { await sendGmailMessage({ toEmail: m.toEmail, subject: m.subject, message: m.text, html: m.html, text: m.text, fromName: m.fromName }); };
}
const pushOf = (d: RecoveryDeps) => d.push ?? ((i: SendPushInput) => sendPushNotification(i));

type ClaimKind = 'no_reply' | 'home_appointment';
/** True when this call claimed the step (a unique violation = already claimed). */
async function claim(db: Db, kind: ClaimKind, ref: string, step: string, anchor: Date, status: 'queued' | 'skipped' | 'alerted', detail?: string): Promise<boolean> {
  const { data, error } = await db.from('sms_reminders').insert({ kind, ref_id: ref, step, anchor_at: anchor.toISOString(), status, detail: detail?.slice(0, 300) ?? null }).select('id').single();
  return !error && !!data;
}
async function note(db: Db, leadId: string, body: string, metadata: Record<string, unknown>, type: 'system' | 'contact_attempt' = 'system', actorId: string | null = null) {
  await db.from('lead_activities').insert({ lead_id: leadId, actor_id: actorId, type, body, metadata });
}

/* ------------------------------------------------------------------ */
/* Who                                                                 */
/* ------------------------------------------------------------------ */

/** Calendar hosts (members with notify) who may see this lead: staff, or the calendar's own company when it holds the lead. */
async function eligibleHosts(db: Db, calendar: BookingCalendar | null, leadId: string): Promise<{ id: string; email: string | null }[]> {
  if (!calendar) return [];
  const { data: members } = await db.from('booking_calendar_members').select('user_id, notify').eq('calendar_id', calendar.id);
  const ids = ((members ?? []) as any[]).filter((m) => m.notify !== false).map((m) => m.user_id as string);
  if (!ids.length) return [];
  const { data: people } = await db.from('profiles').select('id, email, role, contractor_id, is_active').in('id', ids);
  let holds: boolean | null = null;
  const out: { id: string; email: string | null }[] = [];
  for (const p of (people ?? []) as any[]) {
    if (p.is_active === false) continue;
    if (p.role === 'admin' || p.role === 'setter') { out.push({ id: p.id, email: p.email ?? null }); continue; }
    if (p.role !== 'contractor' || !calendar.contractorId || p.contractor_id !== calendar.contractorId) continue;
    if (holds === null) {
      const { data } = await db.from('lead_assignments').select('id').eq('lead_id', leadId).eq('contractor_id', calendar.contractorId).limit(1);
      holds = !!data?.length;
    }
    if (holds) out.push({ id: p.id, email: p.email ?? null });
  }
  return out;
}

async function activeAdmins(db: Db): Promise<string[]> {
  const { data } = await db.from('profiles').select('id').eq('role', 'admin').eq('is_active', true);
  return ((data ?? []) as any[]).map((p) => p.id as string);
}

/** Who calls ("Liam from Pool Masters"), its number and the call length phrase, from a calendar. */
function hostWords(calendar: BookingCalendar | null, fallback: string): { host: string; firstName: string | null; phone: string | null; callLength: string } {
  const h = calendar ? resolveHostContact(calendar) : null;
  return {
    host: h?.displayName ?? fallback,
    firstName: h?.firstName ?? null,
    phone: h?.phone ?? null,
    callLength: calendar ? callLengthPhrase(calendar.durationMinutes, calendar.meetingType === 'video').replace(/^A /, 'a ') : 'a quick call',
  };
}

async function contractorName(db: Db, contractorId: string | null): Promise<string | null> {
  if (!contractorId) return null;
  const { data } = await db.from('contractors').select('name').eq('id', contractorId).maybeSingle();
  return ((data as any)?.name as string | undefined)?.trim() || null;
}

/** The lead's funnel contractor (its latest submitted session), or null for a network funnel. */
async function funnelContractor(db: Db, leadId: string): Promise<string | null> {
  const { data } = await db.from('funnel_sessions').select('funnel_id, contact_submitted_at').eq('lead_id', leadId).not('contact_submitted_at', 'is', null)
    .order('contact_submitted_at', { ascending: false }).limit(1);
  const s = ((data ?? []) as any[])[0];
  if (!s) return null;
  const { data: f } = await db.from('funnels').select('contractor_id').eq('id', s.funnel_id).maybeSingle();
  return (f as any)?.contractor_id ?? null;
}

/* ------------------------------------------------------------------ */
/* 1. Speed-to-lead alert                                              */
/* ------------------------------------------------------------------ */

export interface SpeedAlertResult { status: 'sent' | 'off' | 'already' | 'not_set_up' | 'no_lead' | 'error'; pushed?: number; emailed?: number }

export async function sendSpeedToLeadAlert(input: { leadId: string; event: SpeedEvent; appointmentId?: string | null }, deps: RecoveryDeps = {}): Promise<SpeedAlertResult> {
  const db = dbOf(deps);
  try {
    const cfg = await loadReminderConfig(db);
    if (!cfg) return { status: 'not_set_up' };
    if (!cfg.recovery.speedAlert) return { status: 'off' };
    const { data: lead } = await db.from('leads')
      .select('id, first_name, last_name, city, phone, email, archived_at, vertical_id, sub_service_id').eq('id', input.leadId).maybeSingle();
    if (!lead) return { status: 'no_lead' };
    const l = lead as any;
    const nameOf = async (table: 'verticals' | 'sub_services', id: string | null) =>
      id ? (((await db.from(table).select('name').eq('id', id).maybeSingle()).data as any)?.name as string | undefined) ?? null : null;
    const service = (await nameOf('sub_services', l.sub_service_id)) ?? (await nameOf('verticals', l.vertical_id));

    // The booked call (for "booked Tue 10:15 AM"): the one named, else the lead's next live call.
    let appt: any = null;
    if (input.appointmentId) {
      appt = (await db.from('appointments').select('id, scheduled_at, calendar_id, status').eq('id', input.appointmentId).maybeSingle()).data;
    } else {
      const { data } = await db.from('appointments').select('id, scheduled_at, calendar_id, status').eq('lead_id', input.leadId).eq('status', 'scheduled')
        .not('calendar_id', 'is', null).order('scheduled_at', { ascending: true }).limit(1);
      appt = ((data ?? []) as any[])[0] ?? null;
    }
    const ok = input.event === 'booked'
      ? appt && (await claim(db, 'home_appointment', appt.id, 'speed_booked', ONCE, 'alerted'))
      : await claim(db, 'no_reply', input.leadId, 'speed_submitted', ONCE, 'alerted');
    if (!ok) return { status: 'already' };

    const calendar = appt?.calendar_id ? await getCalendar(appt.calendar_id, db) : await leadCalendar(db, await funnelContractor(db, input.leadId));
    const design: LeadDesign | null = await loadLeadDesign(db, input.leadId, siteOf(deps));
    const tz = safeTimeZone(calendar?.timezone);
    const host = calendar ? resolveHostContact(calendar)?.displayName ?? null : null;
    const copy = speedAlertCopy({
      event: input.event, firstName: l.first_name, lastName: l.last_name, city: l.city,
      noun: design?.noun ?? (service ? String(service).toLowerCase() : 'homeowner'), tier: design?.tier ?? null,
      recap: design?.recap ?? service ?? null, range: design?.range ?? null, examplePrices: design?.examplePrices,
      bookedAtMs: appt?.scheduled_at && appt.status === 'scheduled' ? Date.parse(appt.scheduled_at) : null, timeZone: tz, hostName: host,
      phone: l.phone ?? null, email: l.email ?? null, leadUrl: `${siteOf(deps)}/app/leads/${input.leadId}`,
      designUrl: design?.shareUrl ?? null, photoUrl: design?.photo?.url ?? null,
    });

    const hosts = await eligibleHosts(db, calendar, input.leadId);
    const userIds = [...new Set([...(await activeAdmins(db)), ...hosts.map((h) => h.id)])];
    let pushed = 0;
    if (userIds.length) {
      await pushOf(deps)({ userIds, type: input.event === 'booked' ? 'appointment_booked' : 'new_lead', title: copy.pushTitle, body: copy.pushBody, url: `/app/leads/${input.leadId}`, entityId: input.leadId, metadata: { speedAlert: input.event }, db });
      pushed = userIds.length;
    }
    let emailed = 0;
    const send = senderOf(deps);
    if (send) {
      let list: string[] = [];
      try { list = deps.alertEmails ?? leadAlertRecipients(); } catch { list = []; }
      const to = [...new Set([...list, ...hosts.map((h) => h.email).filter((e): e is string => !!e && e.includes('@'))].map((e) => e.toLowerCase()))];
      for (const toEmail of to) {
        try { await send({ toEmail, subject: copy.subject, html: copy.html, text: copy.text, fromName: 'HomeQuote Network' }); emailed++; } catch { /* one failure never blocks the others */ }
      }
    }
    return { status: 'sent', pushed, emailed };
  } catch (e) {
    console.error('[recovery] speed alert failed:', e instanceof Error ? e.message : e);
    return { status: 'error' };
  }
}

/** After the response (funnel / estimator submit, booking). Never throws. */
export function speedAlertSoon(input: { leadId: string; event: SpeedEvent; appointmentId?: string | null }): void {
  try {
    after(async () => { await sendSpeedToLeadAlert(input); });
  } catch { /* outside a request scope */ }
}

/* ------------------------------------------------------------------ */
/* Shared: one call / visit                                            */
/* ------------------------------------------------------------------ */

interface CallFacts {
  id: string;
  leadId: string;
  status: string;
  startMs: number;
  endMs: number;
  visit: boolean;
  calendar: BookingCalendar | null;
  contractorId: string | null;
  firstName: string | null;
  email: string | null;
  tz: string;
}

async function loadCall(db: Db, id: string): Promise<CallFacts | null> {
  const { data: a } = await db.from('appointments').select('id, lead_id, assignment_id, calendar_id, status, scheduled_at, ends_at, contact_name, contact_email, invitee_time_zone, time_zone').eq('id', id).maybeSingle();
  if (!a || !(a as any).scheduled_at) return null;
  const r = a as any;
  let leadId: string | null = r.lead_id ?? null;
  let contractorId: string | null = null;
  if (r.assignment_id) {
    const { data: asg } = await db.from('lead_assignments').select('lead_id, contractor_id').eq('id', r.assignment_id).maybeSingle();
    leadId = leadId ?? (asg as any)?.lead_id ?? null;
    contractorId = (asg as any)?.contractor_id ?? null;
  }
  if (!leadId) return null;
  const { data: lead } = await db.from('leads').select('first_name, email').eq('id', leadId).maybeSingle();
  const calendar = r.calendar_id ? await getCalendar(r.calendar_id, db) : await leadCalendar(db, contractorId);
  if (calendar?.kind === 'contractor') contractorId = calendar.contractorId;
  const startMs = Date.parse(r.scheduled_at);
  return {
    id: r.id, leadId, status: r.status, startMs, endMs: r.ends_at ? Date.parse(r.ends_at) : startMs + 60 * MIN, visit: !r.calendar_id, calendar, contractorId,
    firstName: ((lead as any)?.first_name as string | undefined)?.trim() || (r.contact_name ?? '').trim().split(/\s+/)[0] || null,
    email: r.contact_email ?? (lead as any)?.email ?? null,
    tz: safeTimeZone(r.invitee_time_zone ?? r.time_zone ?? calendar?.timezone),
  };
}

async function brandFor(db: Db, c: { calendar: BookingCalendar | null; contractorId: string | null }) {
  const co = await contractorName(db, c.contractorId);
  return { brand: co ?? (c.calendar?.kind === 'contractor' ? c.calendar.name : 'HomeQuote Network'), fromName: co ?? 'HomeQuote Network' };
}

/** The "pick a new time" page for a missed call / no-show (signed, 14 days), or null without a secret. */
export function rebookUrl(site: string, appointmentId: string, now = Date.now()): string | null {
  const grant = signRebookGrant(appointmentId, now);
  return grant ? `${site}/booking/pick/${encodeURIComponent(grant)}` : null;
}

/* ------------------------------------------------------------------ */
/* 3. Missed call ("Couldn't reach them")                              */
/* ------------------------------------------------------------------ */

export type MissedCallResult =
  | { ok: true; sms: string; email: string; nextAllowedAt: string }
  | { ok: false; error: string; nextAllowedAt?: string };

export async function sendMissedCallRecovery(input: { appointmentId: string; actorId: string | null }, deps: RecoveryDeps = {}): Promise<MissedCallResult> {
  const db = dbOf(deps);
  const now = nowOf(deps);
  const cfg = await loadReminderConfig(db);
  if (!cfg) return { ok: false, error: 'Run database migration 0068 first.' };
  if (!cfg.recovery.missedCall) return { ok: false, error: 'This is switched off under Texting → Reminders & follow-ups.' };
  const c = await loadCall(db, input.appointmentId);
  if (!c || c.visit) return { ok: false, error: 'Only a booked call can be followed up this way.' };
  if (c.status === 'cancelled') return { ok: false, error: 'This call was cancelled.' };
  if (c.startMs > now.getTime()) return { ok: false, error: 'The call hasn’t started yet.' };

  // At most once per call every 6 hours (anchor = the minute it was sent: a double click in the same minute claims once).
  const { data: recent } = await db.from('sms_reminders').select('anchor_at').eq('kind', 'home_appointment').eq('ref_id', c.id).eq('step', 'missed_call')
    .gt('anchor_at', new Date(now.getTime() - MISSED_CALL_WINDOW_MS).toISOString()).order('anchor_at', { ascending: false }).limit(1);
  const last = ((recent ?? []) as any[])[0];
  if (last) {
    const next = new Date(Date.parse(last.anchor_at) + MISSED_CALL_WINDOW_MS);
    return { ok: false, error: `Already sent at ${shortWhen(Date.parse(last.anchor_at), c.tz)}. You can send it again after ${shortWhen(next.getTime(), c.tz)}.`, nextAllowedAt: next.toISOString() };
  }
  const bucket = new Date(Math.floor(now.getTime() / MIN) * MIN);
  if (!(await claim(db, 'home_appointment', c.id, 'missed_call', bucket, 'queued', 'Couldn’t reach them'))) {
    return { ok: false, error: 'Already sent a moment ago.' };
  }

  const { brand, fromName } = await brandFor(db, c);
  const w = hostWords(c.calendar, brand);
  const design = await loadLeadDesign(db, c.leadId, siteOf(deps));
  const names = callNames({ visit: false, noun: design?.noun ?? null });
  const hasEmail = !!c.email;
  const text = await queueRecoveryText(db, {
    leadId: c.leadId, contractorId: c.contractorId, now, fromStaff: true, label: 'Missed-call text',
    reminder: { kind: 'home_appointment', ref: c.id, step: 'missed_call' },
    body: missedCallText({ firstName: c.firstName, host: w.host, call: names.short, hasEmail }),
  });
  if (text.ok) await db.from('sms_reminders').update({ message_id: text.messageId }).eq('kind', 'home_appointment').eq('ref_id', c.id).eq('step', 'missed_call').eq('anchor_at', bucket.toISOString());

  let email = hasEmail ? 'not_configured' : 'no_email';
  const send = senderOf(deps);
  if (hasEmail && send) {
    const mail = buildRecoveryEmail({
      kind: 'missed_call', firstName: c.firstName, host: w.host, brand, call: names.short, visit: false, callLength: w.callLength,
      design, project: null, pickUrl: rebookUrl(siteOf(deps), c.id, now.getTime()), hostPhone: w.phone,
    });
    try { await send({ toEmail: c.email!, subject: mail.subject, html: mail.html, text: mail.text, fromName }); email = 'sent'; } catch { email = 'failed'; }
  }
  const sms = text.ok ? 'queued' : text.reason;
  const said = [
    text.ok ? 'a text' : `no text (${RECOVERY_SKIP_LABELS[text.reason] ?? text.reason})`,
    email === 'sent' ? 'an email with a link to pick a new time' : email === 'no_email' ? 'no email (none on file)' : 'no email (email isn’t set up)',
  ].join(' and ');
  await note(db, c.leadId, `Couldn’t reach them for the call on ${shortWhen(c.startMs, c.tz)}. Sent ${said}.`,
    { appointment_id: c.id, missed_call: true, sms, email, ...(c.contractorId ? { contractor_id: c.contractorId } : {}) }, 'contact_attempt', input.actorId);
  return { ok: true, sms, email, nextAllowedAt: new Date(now.getTime() + MISSED_CALL_WINDOW_MS).toISOString() };
}

/* ------------------------------------------------------------------ */
/* 2 + 5. The scheduled part (from the 5-minute workflow tick)        */
/* ------------------------------------------------------------------ */

export interface RecoveryRunResult { heldPrompts: number; noShowEmails: number; unbookedEmails: number; skipped: number }

export async function runRecovery(deps: RecoveryDeps = {}): Promise<RecoveryRunResult> {
  const db = dbOf(deps);
  const now = nowOf(deps);
  const out: RecoveryRunResult = { heldPrompts: 0, noShowEmails: 0, unbookedEmails: 0, skipped: 0 };
  const cfg = await loadReminderConfig(db);
  if (!cfg) return out; // migration 0068 not applied: nothing can be claimed
  const site = siteOf(deps);
  const send = senderOf(deps);

  // Held prompt: a calendar call still "scheduled" 30 minutes after it ended. Asks the host; never changes the status.
  if (cfg.recovery.heldPrompt) {
    const { data } = await db.from('appointments').select('id, lead_id, calendar_id, scheduled_at, ends_at')
      .eq('status', 'scheduled').not('calendar_id', 'is', null)
      .lte('ends_at', new Date(now.getTime() - 30 * MIN).toISOString()).gte('ends_at', new Date(now.getTime() - 12 * HOUR).toISOString()).limit(200);
    for (const a of (data ?? []) as any[]) {
      if (!a.lead_id) continue;
      if (!(await claim(db, 'home_appointment', a.id, 'held_prompt', new Date(a.scheduled_at), 'alerted'))) continue;
      const calendar = await getCalendar(a.calendar_id, db);
      const hosts = await eligibleHosts(db, calendar, a.lead_id);
      const userIds = hosts.length ? hosts.map((h) => h.id) : await activeAdmins(db);
      if (!userIds.length) continue;
      const tz = safeTimeZone(calendar?.timezone);
      const copy = heldPromptCopy(Date.parse(a.scheduled_at), tz);
      const date = localParts(Date.parse(a.scheduled_at), tz).date;
      await pushOf(deps)({ userIds, type: 'workflow_alert', title: copy.title, body: copy.body, url: `/app/calendar?cal=${a.calendar_id}&view=day&date=${date}`, entityId: a.id, metadata: { heldPrompt: true }, db });
      out.heldPrompts++;
    }
  }

  // No-show email (the text is runTextReminders' no_show step): same timing as the text, 30 minutes after it was marked.
  if (cfg.recovery.noShow && send) {
    const { data } = await db.from('appointments').select('id, scheduled_at, updated_at')
      .eq('status', 'no_show').gte('scheduled_at', new Date(now.getTime() - 3 * 86_400_000).toISOString()).limit(200);
    for (const a of (data ?? []) as any[]) {
      const plan = planNoShow({ scheduledAt: new Date(a.scheduled_at), markedAt: new Date(a.updated_at) });
      if (now < plan.dueAt || now > plan.until) continue;
      const c = await loadCall(db, a.id);
      if (!c) continue;
      if (!c.email) { if (await claim(db, 'home_appointment', a.id, 'no_show_email', new Date(a.scheduled_at), 'skipped', 'No email on file.')) out.skipped++; continue; }
      if (!(await claim(db, 'home_appointment', a.id, 'no_show_email', new Date(a.scheduled_at), 'queued'))) continue;
      const { brand, fromName } = await brandFor(db, c);
      const w = hostWords(c.calendar, brand);
      const design = await loadLeadDesign(db, c.leadId, site);
      const mail = buildRecoveryEmail({
        kind: 'no_show', firstName: c.firstName, host: w.host, brand, call: callNames({ visit: c.visit, noun: design?.noun ?? null }).long, visit: c.visit,
        callLength: w.callLength, design, project: null, pickUrl: rebookUrl(site, c.id, now.getTime()), hostPhone: w.phone,
      });
      try {
        await send({ toEmail: c.email, subject: mail.subject, html: mail.html, text: mail.text, fromName });
        out.noShowEmails++;
        await note(db, c.leadId, 'Sent a “sorry we missed you” email with a link to pick a new time.', { appointment_id: c.id, recovery: 'no_show_email', ...(c.contractorId ? { contractor_id: c.contractorId } : {}) });
      } catch { /* claimed: never retried (a duplicate is worse than a miss) */ }
    }
  }

  // Never booked: one email 2 hours after they gave their details (the text is runTextReminders step 5).
  if (cfg.recovery.unbooked && send) {
    for (const u of await findUnbookedLeads(db, now)) {
      const { data: done } = await db.from('sms_reminders').select('id').eq('kind', 'no_reply').eq('ref_id', u.leadId).eq('step', 'unbooked_email').limit(1);
      if (done?.length) continue;
      const blocker = await unbookedBlocker(db, u);
      const { data: lead } = await db.from('leads').select('first_name, email').eq('id', u.leadId).maybeSingle();
      const email = ((lead as any)?.email as string | undefined)?.trim() || null;
      const why = blocker ?? (email ? null : 'No email on file.');
      if (why) { if (await claim(db, 'no_reply', u.leadId, 'unbooked_email', ONCE, 'skipped', why)) out.skipped++; continue; }
      const ticket = signBookingTicket(u.sessionId, u.source, now.getTime());
      if (!ticket) continue; // no secret: try again once one is set
      if (!(await claim(db, 'no_reply', u.leadId, 'unbooked_email', ONCE, 'queued'))) continue;
      const calendar = await leadCalendar(db, u.contractorId);
      const { brand, fromName } = await brandFor(db, { calendar, contractorId: u.contractorId });
      const w = hostWords(calendar, brand);
      const design = await loadLeadDesign(db, u.leadId, site);
      const mail = buildRecoveryEmail({
        kind: 'unbooked', firstName: (lead as any)?.first_name ?? null, host: w.host, brand, call: 'call', visit: false, callLength: w.callLength,
        design, project: projectLabel(u.industry), pickUrl: `${site}/booking/pick/${encodeURIComponent(ticket)}`, hostPhone: w.phone,
      });
      try {
        await send({ toEmail: email!, subject: mail.subject, html: mail.html, text: mail.text, fromName });
        out.unbookedEmails++;
        await note(db, u.leadId, 'Not booked 2 hours after their request: sent an email with their design and a link to pick a call time.', { recovery: 'unbooked_email', ...(u.contractorId ? { contractor_id: u.contractorId } : {}) });
      } catch { /* claimed: never retried */ }
    }
  }
  return out;
}
