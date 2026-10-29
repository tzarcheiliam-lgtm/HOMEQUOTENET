import 'server-only';
/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/sms */
import { resolveZones } from '@/lib/ai-calling/timezone';
import { isValidTimeZone } from '@/lib/availability/time';
import { note, queue, type Db, type QueueTarget } from './core';
import { describeWhen } from './reminder-plan';
import { isConfirmReply, isRescheduleReply, reminderConfig } from './reminder-config';
import { alertTeam } from './reminders';

/**
 * Replies to reminder texts (lib/sms/reminders.ts).
 * - Contractor (prospect) conversations never go to the texting assistant: YES confirms the sales meeting, R (or "can't
 *   make it") alerts the team to find a new time, anything else is passed to the team as an alert.
 * - Homeowner conversations: only when our latest text (in the last 48 hours) was an appointment reminder. YES is noted
 *   as confirmed, R hands the conversation to a person. Anything else returns null and the normal texting flow runs.
 */
export type ReminderReplyResult = { handled: true; reason: string; replied?: boolean };
type Convo = QueueTarget & { sender_name: string; status: string };

const LA = 'America/Los_Angeles';
const DAY = 86_400_000;

async function lastReminder(db: Db, conversationId: string, kind: string, since: Date) {
  const { data } = await db.from('sms_messages').select('reminder_kind,reminder_ref,reminder_step,created_at')
    .eq('conversation_id', conversationId).eq('direction', 'out').not('reminder_kind', 'is', null)
    .gte('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data && (data as any).reminder_kind === kind ? (data as { reminder_ref: string; reminder_step: string }) : null;
}

async function markReply(db: Db, kind: 'sales_meeting' | 'home_appointment', ref: string, anchor: string, status: 'confirmed' | 'reschedule', body: string) {
  // Unique per meeting time: a second YES is a no-op.
  await db.from('sms_reminders').insert({ kind, ref_id: ref, step: status, anchor_at: anchor, status, detail: body.slice(0, 300) });
}

export async function handleProspectReply(db: Db, c: Convo, body: string, now: Date): Promise<ReminderReplyResult> {
  const prospectId = c.prospect_id!;
  const cfg = reminderConfig((await db.from('sms_settings').select('reminder_config').eq('id', true).maybeSingle()).data?.reminder_config);
  const { data: p } = await db.from('contractor_prospects').select('id,company_name').eq('id', prospectId).maybeSingle();
  const company = (p as any)?.company_name ?? 'A contractor';

  // The meeting this is about: the one our latest reminder was for, else their next open meeting.
  const recent = await lastReminder(db, c.id, 'sales_meeting', new Date(now.getTime() - 14 * DAY));
  let q = db.from('prospect_sales_appointments').select('id,partner_id,scheduled_at,time_zone,status').eq('prospect_id', prospectId);
  q = recent ? q.eq('id', recent.reminder_ref) : q.in('status', ['scheduled', 'confirmed', 'rescheduled']).gte('scheduled_at', new Date(now.getTime() - 2 * 3_600_000).toISOString()).order('scheduled_at', { ascending: true });
  const { data: m } = await q.limit(1).maybeSingle();
  const meeting = m as { id: string; partner_id: string | null; scheduled_at: string; time_zone: string | null; status: string } | null;
  const tz = meeting?.time_zone && isValidTimeZone(meeting.time_zone) ? meeting.time_zone : LA;
  const w = meeting ? describeWhen(new Date(meeting.scheduled_at), now, tz) : null;
  const open = !!meeting && ['scheduled', 'confirmed', 'rescheduled'].includes(meeting.status);
  const url = '/app/calls/appointments';

  if (open && isConfirmReply(body)) {
    await db.from('prospect_sales_appointments').update({ status: 'confirmed', confirmed_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', meeting!.id);
    await markReply(db, 'sales_meeting', meeting!.id, meeting!.scheduled_at, 'confirmed', body);
    await queue(db, c, `You're all set, talk to you ${w!.when}. - ${cfg.contractor.host}, ${cfg.contractor.brand}`, { ai: false });
    return { handled: true, reason: 'reminder_confirmed', replied: true };
  }
  if (meeting && isRescheduleReply(body)) {
    await markReply(db, 'sales_meeting', meeting.id, meeting.scheduled_at, 'reschedule', body);
    await alertTeam(db, [meeting.partner_id], { title: 'Wants to reschedule', body: `${company} needs a new time for ${w!.when}: “${body.slice(0, 120)}”`, url });
    await queue(db, c, "No problem. We'll reach out shortly to find a new time that works.", { ai: false });
    return { handled: true, reason: 'reminder_reschedule', replied: true };
  }
  await alertTeam(db, [meeting?.partner_id], { title: `Text from ${company}`.slice(0, 80), body: body.slice(0, 200), url });
  return { handled: true, reason: 'prospect_reply' };
}

export async function handleLeadReminderReply(db: Db, c: Convo, body: string, now: Date): Promise<ReminderReplyResult | null> {
  if (!c.lead_id) return null;
  const confirm = isConfirmReply(body);
  const reschedule = !confirm && isRescheduleReply(body);
  if (!confirm && !reschedule) return null;
  const recent = await lastReminder(db, c.id, 'home_appointment', new Date(now.getTime() - 2 * DAY));
  if (!recent) return null;
  const { data: a } = await db.from('appointments').select('id,scheduled_at,status').eq('id', recent.reminder_ref).maybeSingle();
  const appt = a as { id: string; scheduled_at: string | null; status: string } | null;
  if (!appt?.scheduled_at || !['scheduled', 'rescheduled'].includes(appt.status)) return null;
  const { data: lead } = await db.from('leads').select('first_name,last_name,state,zip').eq('id', c.lead_id).maybeSingle();
  const tz = resolveZones({ state: (lead as any)?.state, zip: (lead as any)?.zip })?.[0] ?? LA;
  const w = describeWhen(new Date(appt.scheduled_at), now, tz);

  if (confirm) {
    await markReply(db, 'home_appointment', appt.id, appt.scheduled_at, 'confirmed', body);
    await note(db, c.lead_id, `Confirmed the visit ${w.day} at ${w.time} by text.`, { reminder: true });
    await queue(db, c, `You're all set, see you ${w.when}. - ${c.sender_name}`, { ai: false });
    return { handled: true, reason: 'reminder_confirmed', replied: true };
  }
  await markReply(db, 'home_appointment', appt.id, appt.scheduled_at, 'reschedule', body);
  await db.from('sms_conversations').update({ status: 'handoff', updated_at: now.toISOString() }).eq('id', c.id);
  await note(db, c.lead_id, `Wants to reschedule the visit ${w.day} at ${w.time}: “${body.slice(0, 200)}”`, { needs_attention: true, reminder: true });
  const name = [(lead as any)?.first_name, (lead as any)?.last_name].filter(Boolean).join(' ') || 'A homeowner';
  await alertTeam(db, [], { title: 'Wants to reschedule', body: `${name} needs a new time for ${w.when}.`, url: `/app/leads/${c.lead_id}` });
  await queue(db, c, "No problem. Someone will reach out shortly to find a new time.", { ai: false });
  return { handled: true, reason: 'reminder_reschedule', replied: true };
}
