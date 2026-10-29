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
import { describeWhen, planFollowUps, planMeetingReminders, planNoShow, type PlannedStep } from './reminder-plan';
import { firstName, meetingHow, reminderConfig, renderReminder, type ReminderConfig } from './reminder-config';
import { projectLabel, SENDER_HOUSE } from './rules';

/**
 * Reminder texts and follow-ups through the Mac bridge (no-show prevention). Runs every 5 minutes from the workflow
 * tick, and right after a meeting is booked. Three jobs:
 *   1. contractor sales meetings (prospect_sales_appointments): booked / 4 days / day before (YES to confirm) /
 *      8:00 morning-of / 2 hours before, a "sorry we missed you" after a no-show, and an alert to call them when a
 *      meeting isn't confirmed by the morning;
 *   2. homeowner appointments (appointments): the same steps;
 *   3. homeowner conversations that went quiet: follow-ups on the configured days, then the request is closed.
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
    const { data: appts } = await db.from('appointments').select('id,assignment_id,scheduled_at,status,created_at,updated_at')
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', new Date(now.getTime() - 3 * 86_400_000).toISOString()).lte('scheduled_at', new Date(now.getTime() + 31 * 86_400_000).toISOString())
      .in('status', [...OPEN_HOME, 'no_show']).limit(500);
    const list = (appts ?? []) as any[];
    const logged = await loggedFor('home_appointment', list.map((a) => a.id));
    const aIds = [...new Set(list.map((a) => a.assignment_id))];
    const { data: assigns } = aIds.length ? await db.from('lead_assignments').select('id,lead_id,contractor_id').in('id', aIds) : { data: [] };
    const assignById = new Map((assigns ?? []).map((a: any) => [a.id, a]));
    const leadIds = [...new Set((assigns ?? []).map((a: any) => a.lead_id))];
    const coIds = [...new Set((assigns ?? []).map((a: any) => a.contractor_id))];
    const [{ data: leads }, { data: cos }] = await Promise.all([
      leadIds.length ? db.from('leads').select('id,first_name,phone,state,zip,archived_at').in('id', leadIds) : Promise.resolve({ data: [] }),
      coIds.length ? db.from('contractors').select('*').in('id', coIds) : Promise.resolve({ data: [] }),
    ]);
    const leadById = new Map((leads ?? []).map((l: any) => [l.id, l]));
    const coById = new Map((cos ?? []).map((c: any) => [c.id, c]));
    for (const a of list) {
      const as = assignById.get(a.assignment_id) as any; const lead = as ? (leadById.get(as.lead_id) as any) : null;
      if (!as || !lead) continue;
      const scheduledAt = new Date(a.scheduled_at);
      const zones = resolveZones({ state: lead.state, zip: lead.zip }) ?? DEFAULT_ZONES;
      const tz = resolveZones({ state: lead.state, zip: lead.zip })?.[0] ?? LA;
      const steps = a.status === 'no_show' ? [planNoShow({ scheduledAt, markedAt: new Date(a.updated_at) })] : planMeetingReminders({ scheduledAt, bookedAt: new Date(a.created_at), timeZone: tz });
      const confirmedKey = `${a.id}|confirmed|${scheduledAt.getTime()}`;
      const step = await pickDue('home_appointment', a.id, scheduledAt, logged.has(confirmedKey) ? steps.filter((s) => s.step !== 'day_before') : steps, logged);
      if (!step) continue;
      const skip = (why: string) => claim('home_appointment', a.id, step.step, scheduledAt, 'skipped', why);
      if (lead.archived_at) { await skip('The lead is archived.'); continue; }
      const phone = normalizeUsPhone(lead.phone);
      if (!phone) { await skip('The lead has no valid US phone number.'); continue; }
      if (await optedOut(phone)) { await skip('This number opted out of texts.'); continue; }
      const sendAfter = nextEligible(now, zones, window) ?? now;
      if (sendAfter > step.until) { await skip('Outside texting hours until it was too late to be useful.'); continue; }
      if (await dailyCapReached()) continue;
      const co = coById.get(as.contractor_id) as any;
      const host = (co?.texting_sender_name?.trim() || co?.name || houseName).slice(0, 80);
      let { data: convo } = await db.from('sms_conversations').select('id,lead_id,status').eq('lead_id', lead.id).maybeSingle();
      if (convo && (convo as any).status === 'opted_out') { await skip('This number opted out of texts.'); continue; }
      if (!convo) {
        if (await phoneInUse(db, phone, now)) { await skip('This number is already in a text conversation with another lead.'); continue; }
        // A person handles replies to a conversation that starts with a reminder (YES / reschedule are handled automatically).
        const { data: created } = await db.from('sms_conversations').insert({ lead_id: lead.id, contractor_id: null, sender_name: host, phone_e164: phone, status: 'handoff' }).select('id,lead_id,status').single();
        convo = created;
      }
      if (!convo) continue;
      const w = describeWhen(scheduledAt, sendAfter, tz);
      const body = renderReminder(cfg.homeowner.templates[step.step], { first_name: lead.first_name, host, brand: host, how: 'free estimate visit', ...w });
      const rid = await claim('home_appointment', a.id, step.step, scheduledAt, 'queued');
      if (!rid) continue;
      const msgId = await queue(db, convo as any, body, { ai: false, sendAfter, reminder: { kind: 'home_appointment', ref: a.id, step: step.step } });
      await db.from('sms_reminders').update({ message_id: msgId ?? null }).eq('id', rid);
      await note(db, lead.id, `Reminder text queued (${step.step.replace(/_/g, ' ')}) for the visit ${w.day} at ${w.time}.`, { reminder: true });
    }
  }

  // ---------------------------------------------------------------- 3. homeowner follow-ups when they go quiet
  if (cfg.followups.enabled) {
    const { data: convs } = await db.from('sms_conversations').select('id,lead_id,status,workflow_owned,sender_name,phone_e164,last_inbound_at,created_at')
      .eq('status', 'active').eq('workflow_owned', false).not('lead_id', 'is', null)
      .gte('created_at', new Date(now.getTime() - 30 * 86_400_000).toISOString()).limit(500);
    const list = (convs ?? []) as any[];
    const ids = list.map((c) => c.id);
    const logged = await loggedFor('no_reply', ids);
    const { data: msgs } = ids.length ? await db.from('sms_messages').select('conversation_id,direction,status,created_at,sent_at').in('conversation_id', ids).eq('direction', 'out').limit(10000) : { data: [] };
    const outBy = new Map<string, any[]>();
    for (const m of (msgs ?? []) as any[]) outBy.set(m.conversation_id, [...(outBy.get(m.conversation_id) ?? []), m]);
    for (const c of list) {
      const outs = outBy.get(c.id) ?? [];
      if (outs.some((m) => m.status === 'queued' || m.status === 'sending')) continue; // something is already on its way
      const sent = outs.filter((m) => m.status === 'sent').map((m) => new Date(m.sent_at ?? m.created_at)).sort((x, y) => +x - +y);
      if (!sent.length) continue;
      const plan = planFollowUps({ openedAt: sent[0], lastInboundAt: c.last_inbound_at ? new Date(c.last_inbound_at) : null, lastOutboundAt: sent.at(-1)!, days: cfg.followups.days });
      const step = await pickDue('no_reply', c.id, plan.anchor, plan.steps, logged);
      if (!step) continue;
      const skip = (why: string) => claim('no_reply', c.id, step.step, plan.anchor, 'skipped', why);
      if (await optedOut(c.phone_e164)) { await skip('This number opted out of texts.'); continue; }
      const { data: lead } = await db.from('leads').select('id,first_name,state,zip,source,answers').eq('id', c.lead_id).maybeSingle();
      if (!lead) continue;
      const zones = resolveZones({ state: (lead as any).state, zip: (lead as any).zip }) ?? DEFAULT_ZONES;
      const sendAfter = nextEligible(now, zones, window) ?? now;
      if (sendAfter > step.until) { await skip('Outside texting hours until it was too late to be useful.'); continue; }
      if (await dailyCapReached()) continue;
      const { data: session } = await db.from('funnel_sessions').select('config_snapshot').eq('lead_id', c.lead_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const project = projectLabel(((session as any)?.config_snapshot ?? {}).industry);
      const body = renderReminder(cfg.followups.templates[step.step], { first_name: (lead as any).first_name, project, sender: c.sender_name });
      const rid = await claim('no_reply', c.id, step.step, plan.anchor, 'queued');
      if (!rid) continue;
      const msgId = await queue(db, c, body, { ai: false, sendAfter, reminder: { kind: 'no_reply', ref: c.id, step: step.step } });
      await db.from('sms_reminders').update({ message_id: msgId ?? null }).eq('id', rid);
      if (step.step === 'final') {
        await db.from('sms_conversations').update({ status: 'closed', updated_at: now.toISOString() }).eq('id', c.id);
        await note(db, c.lead_id, 'No reply after the follow-up texts, so the text conversation was closed. If they reply, it opens again.', { followup: true });
      } else {
        await note(db, c.lead_id, `Follow-up text queued (${step.step === 'first' ? 'first' : step.step === 'second' ? 'second' : 'check-in'}).`, { followup: true });
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
