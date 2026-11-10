import 'server-only';
/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/sms */
import { normalizeUsPhone } from '@/lib/ai-calling/phone';
import { nextEligible, resolveZones } from '@/lib/ai-calling/timezone';
import { DEFAULT_ZONES } from './config';
import { isLive, loadSettings, note, phoneInUse, queue, sentToday, type Db } from './core';
import { finalizeOutbound, SENDER_HOUSE } from './rules';
import { loadContractorTexting } from './service';

/**
 * One lead-recovery text through the Mac bridge (no-show, missed call, never booked), with every texting rule:
 * texting switched on, a valid US phone, no opt-out, consent (the form's consent flag, or they have texted us),
 * the contractor's own texting switch for a contractor sender, the daily cap and texting hours in the lead's zone
 * (the text waits for the window; `until` skips it when that is too late). Links are stripped (finalizeOutbound).
 * The text is filed as a reminder (sms_messages.reminder_*), so an R / YES reply is handled by
 * lib/sms/reminder-replies.ts and the no-reply follow-ups never count it as the assistant's opener.
 * A conversation this starts belongs to a person (status 'handoff'), like the reminder texts.
 * `fromStaff`: a person pressed the button, so a conversation already handed to a person is fine.
 */
export type RecoveryTextResult = { ok: true; queued: true; sendAfter: string; messageId: string | null } | { ok: false; reason: string };

export const RECOVERY_SKIP_LABELS: Record<string, string> = {
  texting_off: 'texting is off',
  no_lead: 'the lead was not found',
  bad_phone: 'no valid US mobile number',
  opted_out: 'they opted out of texts',
  no_consent: 'they did not agree to texts',
  contractor_texting_off: 'texting is off for this contractor',
  person_took_over: 'a person is handling their texts',
  phone_in_use: 'the number is in another lead’s conversation',
  daily_cap: 'the daily text limit was reached',
  too_late: 'texting hours open too late',
  empty: 'nothing to send',
  error: 'something went wrong',
};

export async function queueRecoveryText(db: Db, input: {
  leadId: string;
  body: string;
  contractorId: string | null;
  reminder: { kind: 'home_appointment' | 'no_reply'; ref: string; step: string };
  now?: Date;
  until?: Date | null;
  fromStaff?: boolean;
  label: string;
}): Promise<RecoveryTextResult> {
  const now = input.now ?? new Date();
  try {
    const settings = await loadSettings(db);
    if (!isLive(settings)) return { ok: false, reason: 'texting_off' };
    const { data: lead } = await db.from('leads').select('id,phone,state,zip,consent_granted').eq('id', input.leadId).maybeSingle();
    if (!lead) return { ok: false, reason: 'no_lead' };
    const phone = normalizeUsPhone((lead as any).phone);
    if (!phone) return { ok: false, reason: 'bad_phone' };
    if ((await db.from('sms_opt_outs').select('phone_e164').eq('phone_e164', phone).maybeSingle()).data) return { ok: false, reason: 'opted_out' };
    if ((lead as any).consent_granted !== true) {
      const { data: replied } = await db.from('sms_messages').select('id').eq('lead_id', input.leadId).eq('direction', 'in').limit(1);
      if (!replied?.length) return { ok: false, reason: 'no_consent' };
    }
    const house = settings.house_sender_name?.trim().slice(0, 40) || SENDER_HOUSE;
    let sender = house;
    if (input.contractorId) {
      const co = await loadContractorTexting(db, input.contractorId);
      if (!settings.contractor_funnels_enabled || !co.enabled) return { ok: false, reason: 'contractor_texting_off' };
      const { data: row } = await db.from('contractors').select('name').eq('id', input.contractorId).maybeSingle();
      sender = (co.senderName?.trim() || (row as any)?.name || house).slice(0, 80);
    }
    const body = finalizeOutbound(input.body);
    if (!body) return { ok: false, reason: 'empty' };
    if ((await sentToday(db)) >= settings.daily_cap) return { ok: false, reason: 'daily_cap' };
    const zones = resolveZones({ state: (lead as any).state ?? null, zip: (lead as any).zip ?? null }) ?? DEFAULT_ZONES;
    const sendAfter = nextEligible(now, zones, { startHour: settings.window_start_hour, endHour: settings.window_end_hour }) ?? now;
    if (input.until && sendAfter > input.until) return { ok: false, reason: 'too_late' };

    let { data: convo } = await db.from('sms_conversations').select('id,lead_id,status').eq('lead_id', input.leadId).maybeSingle();
    if (convo && (convo as any).status === 'opted_out') return { ok: false, reason: 'opted_out' };
    if (convo && (convo as any).status === 'handoff' && !input.fromStaff) {
      // A person has the conversation: only step in if nobody from the team has texted them by hand.
      const { data: person } = await db.from('sms_messages').select('id').eq('conversation_id', (convo as any).id).eq('direction', 'out').eq('ai', false)
        .is('reminder_kind', null).is('workflow_step_run_id', null).limit(1);
      if (person?.length) return { ok: false, reason: 'person_took_over' };
    }
    if (!convo) {
      if (await phoneInUse(db, phone, now)) return { ok: false, reason: 'phone_in_use' };
      const { data: created } = await db.from('sms_conversations')
        .insert({ lead_id: input.leadId, contractor_id: input.contractorId, sender_name: sender, phone_e164: phone, status: 'handoff' })
        .select('id,lead_id,status').single();
      convo = created;
    }
    if (!convo) return { ok: false, reason: 'phone_in_use' };
    const messageId = await queue(db, convo as any, body, { ai: false, sendAfter, reminder: input.reminder });
    await note(db, input.leadId, `${input.label} queued${sendAfter > now ? ` for ${sendAfter.toISOString()} (outside texting hours)` : ''}.`, { recovery: input.reminder.step });
    return { ok: true, queued: true, sendAfter: sendAfter.toISOString(), messageId: messageId ?? null };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
