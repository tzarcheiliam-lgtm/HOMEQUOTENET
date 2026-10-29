import 'server-only';
/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/sms */
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeUsPhone } from '@/lib/ai-calling/phone';
import { nextEligible, resolveZones } from '@/lib/ai-calling/timezone';
import { isValidTimeZone } from '@/lib/availability/time';
import { sendPushNotification } from '@/lib/notifications/service';
import { DEFAULT_ZONES } from './config';
import { isLive, loadSettings, note, phoneInUse, queue, sentToday, type Db } from './core';
import { describeWhen, planFollowUps, planKeepGoing, planMeetingReminders, planNoShow, type PlannedStep } from './reminder-plan';
import { firstName, meetingHow, reminderConfig, renderReminder, type ReminderConfig } from './reminder-config';
import { finalizeOutbound, metaProject, projectLabel, SENDER_HOUSE } from './rules';
import { resolveHostContact } from '@/lib/booking/host-contact';
import { mapHostFields } from '@/lib/booking/types';
import { callMinutes, prettyPhone } from '@/lib/emails/booking';
import { AWAIT_BOOKING_STEP, keepGoingText, planRebook, rebookText, threeSpread } from './scheduling';
import { hasLiveAppointment, loadBookingOptions } from './scheduling.server';

/**
 * Reminder texts and follow-ups through the Mac bridge (no-show prevention). Runs every 5 minutes from the workflow
 * tick, and right after a meeting is booked. Three jobs:
 *   1. contractor sales meetings (prospect_sales_appointments): booked / 4 days / day before (YES to confirm) /
 *      8:00 morning-of / 2 hours before, a "sorry we missed you" after a no-show, and an alert to call them when a
 *      meeting isn't confirmed by the morning;
 *   2. homeowner appointments (appointments): the same steps, for on-site visits AND for calls booked on a HomeQuote
 *      calendar (0070: calendar_id set, maybe no assignment yet). For those calls this is the ONLY source of reminder
 *      texts; lib/booking sends the instant booking / reschedule / cancellation text and every email (incl. the
 *      24 h / 1 h reminder emails with the manage link), so the "booked" step is left out and the text names who calls
 *      and from which number;
 *   3. homeowner conversations that went quiet: follow-ups on the configured days, then either the request is closed
 *      or (keepGoing, the default) a text every few days until they reply, book or text STOP;
 *   4. homeowner conversations handed to a person to book a time and still not booked a day later: the assistant
 *      re-offers three real open times (then once more on day 3) and takes the conversation back so it can book.
 * Every step is claimed in sms_reminders before its text is queued (unique per meeting time), so nothing is sent
 * twice and a rescheduled meeting gets its reminders again. All texting rules apply: texting on, opt-outs,
 * do-not-call, the daily limit and texting hours.
 */
export interface ReminderRunResult { queued: number; skipped: number; alerted: number }
type Kind = 'sales_meeting' | 'home_appointment' | 'no_reply';
export interface ReminderDeps { now?: Date; alert?: (userIds: string[], a: { title: string; body: string; url: string }) => Promise<void> }

const LA = 'America/Los_Angeles';
const OPEN_SALES = ['scheduled', 'confirmed', 'rescheduled'];
const OPEN_HOME = ['scheduled', 'rescheduled'];
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const HOME_BASE = 'id,assignment_id,scheduled_at,status,created_at,updated_at';
const HOME_NATIVE = 'lead_id,calendar_id,ends_at,time_zone,invitee_time_zone,meeting_type';
const CALENDAR_COLS = 'id,kind,contractor_id,name,host_display_name,host_first_name,host_org,host_phone,host_email,host_photo_path,host_note';

/** {how} in homeowner reminders: an on-site "free estimate visit", or the call booked on a HomeQuote calendar. */
export function homeownerHow(a: { calendar_id?: string | null; meeting_type?: string | null; scheduled_at?: string | null; ends_at?: string | null }): string {
  if (!a.calendar_id) return 'free estimate visit';
  if (a.meeting_type === 'video') return 'video call';
  const mins = a.scheduled_at && a.ends_at ? callMinutes(Date.parse(a.scheduled_at), Date.parse(a.ends_at)) : null;
  return mins ? `${mins <= 15 ? 'quick ' : ''}${mins}-minute call` : 'call';
}

/** Push to the admins (and the person who booked the meeting). Best effort. */
export async function alertTeam(db: Db, extraUserIds: (string | null | undefined)[], a: { title: string; body: string; url: string }) {
  const { data } = await db.from('profiles').select('id').eq('role', 'admin').eq('is_active', true);
  const ids = [...new Set([...(data ?? []).map((p: any) => p.id as string), ...extraUserIds.filter((x): x is string => !!x)])];
  if (ids.length) await sendPushNotification({ userIds: ids, type: 'workflow_alert', title: a.title, body: a.body, url: a.url, db }).catch(() => undefined);
}

export async function loadReminderConfig(db: Db): Promise<ReminderConfig | null> {
  const { data, error } = await db.from('sms_settings').select('reminder_config').eq('id', true).maybeSingle();
  if (error) return null; // migration 0068 not applied yet
  return reminderConfig((data as any)?.reminder_config);
}

export async function runTextReminders(db: Db, deps: ReminderDeps = {}): Promise<ReminderRunResult> {
  const now = deps.now ?? new Date();
  const out: ReminderRunResult = { queued: 0, skipped: 0, alerted: 0 };
  const settings = await loadSettings(db);
  if (!isLive(settings)) return out;
  const cfg = await loadReminderConfig(db);
  if (!cfg) return out;
  const alert = deps.alert ?? ((ids, a) => alertTeam(db, ids, a));
  const window = { startHour: settings.window_start_hour, endHour: settings.window_end_hour };
  const houseName = settings.house_sender_name?.trim().slice(0, 40) || SENDER_HOUSE;

  const claim = async (kind: Kind, ref: string, step: string, anchor: Date, status: 'queued' | 'skipped' | 'alerted', detail?: string) => {
    const { data, error } = await db.from('sms_reminders').insert({ kind, ref_id: ref, step, anchor_at: anchor.toISOString(), status, detail: detail?.slice(0, 300) ?? null }).select('id').single();
    if (!error && data) out[status === 'queued' ? 'queued' : status === 'skipped' ? 'skipped' : 'alerted'] += 1;
    return !error && data ? (data as { id: string }).id : null;
  };
  const loggedFor = async (kind: Kind, ids: string[]) => {
    const set = new Set<string>();
    if (!ids.length) return set;
    const { data } = await db.from('sms_reminders').select('ref_id,step,anchor_at').eq('kind', kind).in('ref_id', ids);
    for (const r of (data ?? []) as any[]) set.add(`${r.ref_id}|${r.step}|${new Date(r.anchor_at).getTime()}`);
    return set;
  };
  /** The single step to send now (the latest one that is due and still useful); older due ones are marked skipped. */
  const pickDue = async <S extends string>(kind: Kind, ref: string, anchor: Date, steps: PlannedStep<S>[], logged: Set<string>) => {
    const key = (s: string) => `${ref}|${s}|${anchor.getTime()}`;
    const due = steps.filter((p) => p.dueAt <= now && now <= p.until && !logged.has(key(p.step)));
    for (const p of due.slice(0, -1)) { await claim(kind, ref, p.step, anchor, 'skipped', 'A later reminder was due at the same time.'); logged.add(key(p.step)); }
    return due.at(-1) ?? null;
  };
  const dailyCapReached = async () => (await sentToday(db)) >= settings.daily_cap;
  const optedOut = async (phone: string) => !!(await db.from('sms_opt_outs').select('phone_e164').eq('phone_e164', phone).maybeSingle()).data;

  // ---------------------------------------------------------------- 1. contractor sales meetings
  if (cfg.contractor.enabled) {
    const { data: meetings } = await db.from('prospect_sales_appointments')
      .select('id,prospect_id,partner_id,scheduled_at,time_zone,appointment_type,contact_info,decision_maker_name,status,confirmed_at,created_at,updated_at')
      .gte('scheduled_at', new Date(now.getTime() - 3 * 86_400_000).toISOString()).lte('scheduled_at', new Date(now.getTime() + 31 * 86_400_000).toISOString())
      .in('status', [...OPEN_SALES, 'no_show']).limit(500);
    const list = (meetings ?? []) as any[];
    const logged = await loggedFor('sales_meeting', list.map((m) => m.id));
    const pIds = [...new Set(list.map((m) => m.prospect_id))];
    const { data: prospects } = pIds.length ? await db.from('contractor_prospects').select('id,company_name,phone,disposition,archived_at,decision_maker_name').in('id', pIds) : { data: [] };
    const byId = new Map((prospects ?? []).map((p: any) => [p.id, p]));
    for (const m of list) {
      const scheduledAt = new Date(m.scheduled_at);
      const tz = m.time_zone && isValidTimeZone(m.time_zone) ? m.time_zone : LA;
      const confirmed = m.status === 'confirmed' || !!m.confirmed_at;
      const p = byId.get(m.prospect_id) as any;
      if (!p) continue;
      const host = cfg.contractor.host;

      // Not confirmed by the morning of the meeting: tell the team to call them (once).
      const dayBeforeKey = `${m.id}|day_before|${scheduledAt.getTime()}`;
      const alertKey = `${m.id}|unconfirmed_alert|${scheduledAt.getTime()}`;
      const morning = planMeetingReminders({ scheduledAt, bookedAt: new Date(0), timeZone: tz }).find((s) => s.step === 'morning_of')?.dueAt
        ?? new Date(scheduledAt.getTime() - 3 * 3_600_000);
      if (cfg.unconfirmedAlert && OPEN_SALES.includes(m.status) && !confirmed && logged.has(dayBeforeKey) && !logged.has(alertKey) && now >= morning && now < scheduledAt) {
        if (await claim('sales_meeting', m.id, 'unconfirmed_alert', scheduledAt, 'alerted')) {
          const w = describeWhen(scheduledAt, now, tz);
          await alert([m.partner_id], { title: 'Meeting not confirmed', body: `${p.company_name} hasn't confirmed ${w.when}. Give them a call.`.slice(0, 200), url: '/app/calls/appointments' });
          logged.add(alertKey);
        }
      }

      let steps: PlannedStep[] = m.status === 'no_show' ? [planNoShow({ scheduledAt, markedAt: new Date(m.updated_at) })] : planMeetingReminders({ scheduledAt, bookedAt: new Date(m.created_at), timeZone: tz });
      if (confirmed) steps = steps.filter((s) => s.step !== 'day_before');
      const step = await pickDue('sales_meeting', m.id, scheduledAt, steps, logged);
      if (!step) continue;
      const skip = (why: string) => claim('sales_meeting', m.id, step.step, scheduledAt, 'skipped', why);
      if (p.archived_at || p.disposition === 'do_not_call') { await skip('The contractor is on the do-not-call list or archived.'); continue; }
      const contactPhone = typeof m.contact_info === 'string' ? m.contact_info.match(PHONE_RE)?.[0] : null;
      const phone = normalizeUsPhone(contactPhone ?? null) ?? normalizeUsPhone(p.phone);
      if (!phone) { await skip('No valid US phone number for this contractor.'); continue; }
      if (await optedOut(phone)) { await skip('This number opted out of texts.'); continue; }
      const sendAfter = nextEligible(now, [tz], window) ?? now;
      if (sendAfter > step.until) { await skip('Outside texting hours until it was too late to be useful.'); continue; }
      if (await dailyCapReached()) continue; // try again on a later tick

      let { data: convo } = await db.from('sms_conversations').select('id,lead_id,prospect_id,status').eq('prospect_id', m.prospect_id).maybeSingle();
      if (convo && (convo as any).status === 'opted_out') { await skip('This number opted out of texts.'); continue; }
      if (!convo) {
        const { data: created } = await db.from('sms_conversations').insert({ prospect_id: m.prospect_id, lead_id: null, sender_name: cfg.contractor.brand, phone_e164: phone, status: 'active' }).select('id,lead_id,prospect_id,status').single();
        convo = created;
      }
      if (!convo) continue;
      const w = describeWhen(scheduledAt, sendAfter, tz);
      const body = renderReminder(cfg.contractor.templates[step.step], {
        first_name: firstName(m.decision_maker_name ?? p.decision_maker_name), host, brand: cfg.contractor.brand, business: p.company_name, how: meetingHow(m.appointment_type), ...w,
      });
      const rid = await claim('sales_meeting', m.id, step.step, scheduledAt, 'queued');
      if (!rid) continue;
      const msgId = await queue(db, convo as any, body, { ai: false, sendAfter, reminder: { kind: 'sales_meeting', ref: m.id, step: step.step } });
      await db.from('sms_reminders').update({ message_id: msgId ?? null }).eq('id', rid);
    }
  }

  // ---------------------------------------------------------------- 2. homeowner appointments
  if (cfg.homeowner.enabled) {
    const window31 = (sel: string) => db.from('appointments').select(sel)
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', new Date(now.getTime() - 3 * 86_400_000).toISOString()).lte('scheduled_at', new Date(now.getTime() + 31 * 86_400_000).toISOString())
      .in('status', [...OPEN_HOME, 'no_show']).limit(500);
    // Calls booked on a HomeQuote calendar (migration 0070) carry lead_id / calendar_id; before 0070 only the base columns exist.
    const withCalendar = await window31(`${HOME_BASE},${HOME_NATIVE}`);
    const appts = withCalendar.error ? (await window31(HOME_BASE)).data : withCalendar.data;
    const list = (appts ?? []) as any[];
    const logged = await loggedFor('home_appointment', list.map((a) => a.id));
    const aIds = [...new Set(list.map((a) => a.assignment_id).filter(Boolean))];
    const { data: assigns } = aIds.length ? await db.from('lead_assignments').select('id,lead_id,contractor_id').in('id', aIds) : { data: [] };
    const assignById = new Map((assigns ?? []).map((a: any) => [a.id, a]));
    const calIds = [...new Set(list.map((a) => a.calendar_id).filter(Boolean))];
    const { data: cals } = calIds.length ? await db.from('booking_calendars').select(CALENDAR_COLS).in('id', calIds) : { data: [] };
    const calById = new Map((cals ?? []).map((c: any) => [c.id, c]));
    const leadIds = [...new Set([...(assigns ?? []).map((a: any) => a.lead_id), ...list.map((a) => a.lead_id)].filter(Boolean))];
    const coIds = [...new Set([...(assigns ?? []).map((a: any) => a.contractor_id), ...(cals ?? []).map((c: any) => (c.kind === 'contractor' ? c.contractor_id : null))].filter(Boolean))];
    const [{ data: leads }, { data: cos }] = await Promise.all([
      leadIds.length ? db.from('leads').select('id,first_name,phone,state,zip,archived_at,consent_granted').in('id', leadIds) : Promise.resolve({ data: [] }),
      coIds.length ? db.from('contractors').select('*').in('id', coIds) : Promise.resolve({ data: [] }),
    ]);
    const leadById = new Map((leads ?? []).map((l: any) => [l.id, l]));
    const coById = new Map((cos ?? []).map((c: any) => [c.id, c]));
    // Texting with us counts as agreeing to texts about their own booking: Meta Instant Form leads (most leads) never
    // carry the form's consent flag, yet they are already in a two-way text conversation with us.
    const consentIds = leadIds.filter((id) => (leadById.get(id) as any)?.consent_granted !== true);
    const { data: replied } = consentIds.length
      ? await db.from('sms_messages').select('lead_id').eq('direction', 'in').in('lead_id', consentIds).limit(5000)
      : { data: [] };
    const textedBack = new Set(((replied ?? []) as any[]).map((m) => m.lead_id));
    for (const a of list) {
      const as = a.assignment_id ? (assignById.get(a.assignment_id) as any) : null;
      const leadId = as?.lead_id ?? a.lead_id ?? null;
      const lead = leadId ? (leadById.get(leadId) as any) : null;
      if (!lead) continue;
      // A call booked on a HomeQuote calendar: lib/booking sends its booking / reschedule / cancellation texts and
      // every email; these reminders are its only reminder texts.
      const cal = a.calendar_id ? ((calById.get(a.calendar_id) as any) ?? null) : null;
      const native = !!a.calendar_id;
      const scheduledAt = new Date(a.scheduled_at);
      const zones = resolveZones({ state: lead.state, zip: lead.zip }) ?? DEFAULT_ZONES;
      const ownTz = [a.invitee_time_zone, a.time_zone].find((z) => typeof z === 'string' && isValidTimeZone(z));
      const tz = (native && ownTz) || resolveZones({ state: lead.state, zip: lead.zip })?.[0] || LA;
      let steps = a.status === 'no_show' ? [planNoShow({ scheduledAt, markedAt: new Date(a.updated_at) })] : planMeetingReminders({ scheduledAt, bookedAt: new Date(a.created_at), timeZone: tz });
      if (native) steps = steps.filter((s) => s.step !== 'booked'); // the booking confirmation text already went out
      const confirmedKey = `${a.id}|confirmed|${scheduledAt.getTime()}`;
      const step = await pickDue('home_appointment', a.id, scheduledAt, logged.has(confirmedKey) ? steps.filter((s) => s.step !== 'day_before') : steps, logged);
      if (!step) continue;
      const skip = (why: string) => claim('home_appointment', a.id, step.step, scheduledAt, 'skipped', why);
      if (lead.archived_at) { await skip('The lead is archived.'); continue; }
      if (native && lead.consent_granted !== true && !textedBack.has(lead.id)) { await skip('The homeowner did not agree to texts.'); continue; }
      const phone = normalizeUsPhone(lead.phone);
      if (!phone) { await skip('The lead has no valid US phone number.'); continue; }
      if (await optedOut(phone)) { await skip('This number opted out of texts.'); continue; }
      const sendAfter = nextEligible(now, zones, window) ?? now;
      if (sendAfter > step.until) { await skip('Outside texting hours until it was too late to be useful.'); continue; }
      if (await dailyCapReached()) continue;
      const coId = as?.contractor_id ?? (cal?.kind === 'contractor' ? cal.contractor_id : null);
      const co = coId ? (coById.get(coId) as any) : null;
      const sender = (co?.texting_sender_name?.trim() || co?.name || houseName).slice(0, 80);
      const hostContact = cal?.kind ? resolveHostContact({ kind: cal.kind, name: cal.name ?? '', host: mapHostFields(cal) }) : null;
      const host = (hostContact?.displayName ?? sender).slice(0, 80);
      let { data: convo } = await db.from('sms_conversations').select('id,lead_id,status').eq('lead_id', lead.id).maybeSingle();
      if (convo && (convo as any).status === 'opted_out') { await skip('This number opted out of texts.'); continue; }
      if (!convo) {
        if (await phoneInUse(db, phone, now)) { await skip('This number is already in a text conversation with another lead.'); continue; }
        // A person handles replies to a conversation that starts with a reminder (YES / reschedule are handled automatically).
        const { data: created } = await db.from('sms_conversations').insert({ lead_id: lead.id, contractor_id: null, sender_name: sender, phone_e164: phone, status: 'handoff' }).select('id,lead_id,status').single();
        convo = created;
      }
      if (!convo) continue;
      const w = describeWhen(scheduledAt, sendAfter, tz);
      let body = renderReminder(cfg.homeowner.templates[step.step], { first_name: lead.first_name, host, brand: host, how: homeownerHow(a), ...w });
      // Who calls, and from which number, so they pick up (links are stripped from texts; the email has the manage link).
      const from = native && a.meeting_type !== 'video' && step.step !== 'no_show' && hostContact?.phone ? prettyPhone(hostContact.phone) : null;
      if (from) body = finalizeOutbound(`${body} ${hostContact!.firstName ?? hostContact!.displayName} will call you from ${from}.`);
      const rid = await claim('home_appointment', a.id, step.step, scheduledAt, 'queued');
      if (!rid) continue;
      const msgId = await queue(db, convo as any, body, { ai: false, sendAfter, reminder: { kind: 'home_appointment', ref: a.id, step: step.step } });
      await db.from('sms_reminders').update({ message_id: msgId ?? null }).eq('id', rid);
      await note(db, lead.id, `Reminder text queued (${step.step.replace(/_/g, ' ')}) for the ${native ? 'call' : 'visit'} ${w.day} at ${w.time}.`, { reminder: true });
    }
  }

  // ---------------------------------------------------------------- 4. re-offer times when a booking handoff went cold
  // (runs before the follow-ups, which leave these conversations to this step)
  const rebooking = new Set<string>();
  if (cfg.followups.enabled) {
    const { data: marks } = await db.from('sms_reminders').select('ref_id,anchor_at').eq('kind', 'no_reply').eq('step', AWAIT_BOOKING_STEP)
      .gte('anchor_at', new Date(now.getTime() - 10 * 86_400_000).toISOString()).limit(500);
    const latest = new Map<string, Date>();
    for (const m of (marks ?? []) as any[]) {
      const t = new Date(m.anchor_at);
      if (!latest.has(m.ref_id) || t > latest.get(m.ref_id)!) latest.set(m.ref_id, t);
    }
    for (const id of latest.keys()) rebooking.add(id);
    const ids = [...latest.keys()];
    const logged = await loggedFor('no_reply', ids);
    const { data: convs } = ids.length ? await db.from('sms_conversations').select('id,lead_id,contractor_id,status,workflow_owned,sender_name,phone_e164,mode,ai_turns').in('id', ids) : { data: [] };
    for (const c of (convs ?? []) as any[]) {
      const anchor = latest.get(c.id)!;
      if (c.status !== 'handoff' || c.workflow_owned || !c.lead_id) continue; // someone (or the assistant) picked it back up
      const step = await pickDue('no_reply', c.id, anchor, planRebook(anchor), logged);
      if (!step) continue;
      const skip = (why: string) => claim('no_reply', c.id, step.step, anchor, 'skipped', why);
      const { data: lead } = await db.from('leads').select('id,first_name,state,zip,status,archived_at').eq('id', c.lead_id).maybeSingle();
      if (!lead || (lead as any).archived_at) { await skip('The lead is archived.'); continue; }
      if (!['new', 'contact_attempted', 'qualified', 'assigned'].includes((lead as any).status)) { await skip('The lead has moved on (booked, lost or closed).'); continue; }
      // A person is on it: they texted, or logged a call, since the handoff.
      const since = anchor.toISOString();
      const { data: personText } = await db.from('sms_messages').select('id').eq('conversation_id', c.id).eq('direction', 'out').eq('ai', false)
        .is('reminder_kind', null).is('workflow_step_run_id', null).gt('created_at', since).limit(1);
      if (personText?.length) { await skip('Someone from the team texted them after the handoff.'); continue; }
      const { data: touched } = await db.from('lead_activities').select('id').eq('lead_id', c.lead_id).in('type', ['contact_attempt', 'appointment']).gt('created_at', since).limit(1);
      if (touched?.length) { await skip('Someone from the team followed up after the handoff.'); continue; }
      if (await optedOut(c.phone_e164)) { await skip('This number opted out of texts.'); continue; }
      const options = await loadBookingOptions(db, { id: c.id, lead_id: c.lead_id, sender_name: c.sender_name, contractor_id: c.contractor_id }, now).catch(() => null);
      if (!options || options.alreadyBooked) { await skip(options?.alreadyBooked ? 'They are already booked.' : 'Open times could not be loaded.'); continue; }
      const pool = c.mode === 'call' ? (options.call ?? options.visit) : (options.visit ?? options.call);
      if (!pool) { await skip('No open times to offer.'); continue; }
      const zones = resolveZones({ state: (lead as any).state, zip: (lead as any).zip }) ?? DEFAULT_ZONES;
      const sendAfter = nextEligible(now, zones, window) ?? now;
      if (sendAfter > step.until) { await skip('Outside texting hours until it was too late to be useful.'); continue; }
      if (await dailyCapReached()) continue;
      const times = threeSpread(pool.times, pool.timeZone);
      const body = finalizeOutbound(rebookText(step.step, { kind: pool.kind, times, firstName: (lead as any).first_name, sender: c.sender_name, callWho: pool.kind === 'call' ? options.call?.callerFirstName : null }));
      const rid = await claim('no_reply', c.id, step.step, anchor, 'queued');
      if (!rid) continue;
      const msgId = await queue(db, c, body, { ai: true, sendAfter, reminder: { kind: 'no_reply', ref: c.id, step: step.step } });
      await db.from('sms_reminders').update({ message_id: msgId ?? null }).eq('id', rid);
      // The assistant takes the conversation back so it can book the time they reply with.
      await db.from('sms_conversations').update({ status: 'active', mode: pool.kind === 'call' ? 'call' : 'text', updated_at: now.toISOString() }).eq('id', c.id);
      await note(db, c.lead_id, `Still not booked ${step.step === 'rebook_1' ? 'a day' : 'three days'} after the handoff, so the texting assistant re-offered times: ${times.map((t) => t.label).join(', ')}.`, { followup: true });
    }
  }

  // ---------------------------------------------------------------- 3. homeowner follow-ups when they go quiet
  if (cfg.followups.enabled) {
    const lookback = (cfg.followups.keepGoing ? 400 : 30) * 86_400_000;
    const { data: convs } = await db.from('sms_conversations').select('id,lead_id,contractor_id,status,workflow_owned,sender_name,phone_e164,last_inbound_at,created_at,mode')
      .eq('status', 'active').eq('workflow_owned', false).not('lead_id', 'is', null)
      .gte('created_at', new Date(now.getTime() - lookback).toISOString()).order('created_at', { ascending: false }).limit(1000);
    const list = (convs ?? []) as any[];
    const ids = list.map((c) => c.id);
    const logged = await loggedFor('no_reply', ids);
    const { data: msgs } = ids.length ? await db.from('sms_messages').select('conversation_id,direction,status,created_at,sent_at').in('conversation_id', ids).eq('direction', 'out').limit(10000) : { data: [] };
    const outBy = new Map<string, any[]>();
    for (const m of (msgs ?? []) as any[]) outBy.set(m.conversation_id, [...(outBy.get(m.conversation_id) ?? []), m]);
    for (const c of list) {
      if (rebooking.has(c.id)) continue; // re-offering times (step 4) owns this conversation's follow-ups
      const outs = outBy.get(c.id) ?? [];
      if (outs.some((m) => m.status === 'queued' || m.status === 'sending')) continue; // something is already on its way
      const sent = outs.filter((m) => m.status === 'sent').map((m) => new Date(m.sent_at ?? m.created_at)).sort((x, y) => +x - +y);
      if (!sent.length) continue;
      const plan = planFollowUps({ openedAt: sent[0], lastInboundAt: c.last_inbound_at ? new Date(c.last_inbound_at) : null, lastOutboundAt: sent.at(-1)!, days: cfg.followups.days });
      let steps: PlannedStep<string>[] = plan.steps;
      if (cfg.followups.keepGoing) {
        // Never close the request: after the follow-ups, keep texting every few days until they reply or text STOP.
        const neverReplied = !c.last_inbound_at;
        steps = steps.filter((s) => s.step !== 'final');
        const startDays = neverReplied ? (cfg.followups.days.at(-1) ?? 7) : 3 + cfg.followups.everyDays;
        if (neverReplied || plan.steps.length) steps = [...steps, ...planKeepGoing({ anchor: plan.anchor, startDays, everyDays: cfg.followups.everyDays, now })];
      }
      const step = await pickDue('no_reply', c.id, plan.anchor, steps, logged);
      if (!step) continue;
      const skip = (why: string) => claim('no_reply', c.id, step.step, plan.anchor, 'skipped', why);
      if (await optedOut(c.phone_e164)) { await skip('This number opted out of texts.'); continue; }
      const { data: lead } = await db.from('leads').select('id,first_name,state,zip,source,answers,status,archived_at').eq('id', c.lead_id).maybeSingle();
      if (!lead) continue;
      if ((lead as any).archived_at) { await skip('The lead is archived.'); continue; }
      if (!['new', 'contact_attempted', 'qualified', 'assigned'].includes((lead as any).status)) { await skip('The lead has moved on (booked, lost or closed).'); continue; }
      if (await hasLiveAppointment(db, c.lead_id, now).catch(() => false)) { await skip('They are already booked.'); continue; }
      const zones = resolveZones({ state: (lead as any).state, zip: (lead as any).zip }) ?? DEFAULT_ZONES;
      const sendAfter = nextEligible(now, zones, window) ?? now;
      if (sendAfter > step.until) { await skip('Outside texting hours until it was too late to be useful.'); continue; }
      if (await dailyCapReached()) continue;
      const { data: session } = await db.from('funnel_sessions').select('config_snapshot').eq('lead_id', c.lead_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const project = session ? projectLabel(((session as any)?.config_snapshot ?? {}).industry) : metaProject(((lead as any).answers ?? {}) as Record<string, string>);
      const keep = step.step.startsWith('keep_') ? Number(step.step.slice(5)) : 0;
      let body: string;
      if (keep) {
        const options = await loadBookingOptions(db, { id: c.id, lead_id: c.lead_id, sender_name: c.sender_name, contractor_id: c.contractor_id }, now).catch(() => null);
        const pool = c.mode === 'call' ? (options?.call ?? options?.visit) : (options?.visit ?? options?.call);
        body = finalizeOutbound(keepGoingText(keep, { firstName: (lead as any).first_name, project, sender: c.sender_name, times: pool ? threeSpread(pool.times, pool.timeZone) : [] }));
      } else {
        body = renderReminder(cfg.followups.templates[step.step as keyof typeof cfg.followups.templates], { first_name: (lead as any).first_name, project, sender: c.sender_name });
      }
      const rid = await claim('no_reply', c.id, step.step, plan.anchor, 'queued');
      if (!rid) continue;
      const msgId = await queue(db, c, body, { ai: false, sendAfter, reminder: { kind: 'no_reply', ref: c.id, step: step.step } });
      await db.from('sms_reminders').update({ message_id: msgId ?? null }).eq('id', rid);
      if (step.step === 'final') {
        await db.from('sms_conversations').update({ status: 'closed', updated_at: now.toISOString() }).eq('id', c.id);
        await note(db, c.lead_id, 'No reply after the follow-up texts, so the text conversation was closed. If they reply, it opens again.', { followup: true });
      } else {
        await note(db, c.lead_id, `Follow-up text queued (${keep ? `keep-going #${keep}` : step.step === 'first' ? 'first' : step.step === 'second' ? 'second' : 'check-in'}).`, { followup: true });
      }
    }
  }
  return out;
}

/** Run the reminders right after a meeting is booked or changed, so the "you're booked" text goes out in seconds. */
export function runTextRemindersSoon(): void {
  try {
    after(async () => {
      try { await runTextReminders(createAdminClient()); } catch (e) { console.error('[sms] reminders failed:', e instanceof Error ? e.message : e); }
    });
  } catch { /* outside a request scope; the 5-minute tick picks it up */ }
}
