import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Small texting primitives shared by the texting assistant (service.ts) and reminders (reminders.ts):
 * settings, the daily count, the one-conversation-per-number rule, queueing a text for the Mac bridge, lead notes.
 */
export type Db = SupabaseClient;
export interface SmsSettings {
  enabled: boolean; contractor_funnels_enabled: boolean; window_start_hour: number; window_end_hour: number; daily_cap: number; stopped_at: string | null;
  bot_extra_instructions?: string | null; house_sender_name?: string | null;
  opening_template?: string | null; first_text_delay_minutes?: number; max_ai_turns?: number; max_ai_replies_per_day?: number;
}
export const DEFAULT_SETTINGS: SmsSettings = { enabled: false, contractor_funnels_enabled: false, window_start_hour: 8, window_end_hour: 21, daily_cap: 200, stopped_at: null };

export async function loadSettings(db: Db): Promise<SmsSettings> {
  const core = 'enabled,contractor_funnels_enabled,window_start_hour,window_end_hour,daily_cap,stopped_at';
  // Newer columns arrive with migrations 0057 and 0059; until they are applied, fall back so texting keeps working.
  for (const cols of [`${core},bot_extra_instructions,house_sender_name,opening_template,first_text_delay_minutes,max_ai_turns,max_ai_replies_per_day`, `${core},bot_extra_instructions,house_sender_name,opening_template,first_text_delay_minutes,max_ai_turns`, `${core},bot_extra_instructions,house_sender_name`, core]) {
    const { data, error } = await db.from('sms_settings').select(cols).eq('id', true).maybeSingle();
    if (!error) return { ...DEFAULT_SETTINGS, ...(data as Partial<SmsSettings> | null) };
  }
  return { ...DEFAULT_SETTINGS };
}

export const isLive = (s: SmsSettings) => s.enabled && !s.stopped_at;

export async function sentToday(db: Db): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await db.from('sms_messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').gte('created_at', since);
  return count ?? 0;
}

/** One conversation per phone number: a number already texted in the last 14 days is not started again from a second lead. */
export async function phoneInUse(db: Db, phone: string, now: Date): Promise<boolean> {
  const since = new Date(now.getTime() - 14 * 24 * 3600_000).toISOString();
  const { data } = await db.from('sms_conversations').select('id').eq('phone_e164', phone).gte('created_at', since).limit(1);
  return !!data?.length;
}

export interface QueueTarget { id: string; lead_id: string | null; prospect_id?: string | null }
export interface QueueOpts { ai: boolean; sendAfter?: Date; workflowStepRunId?: string; reminder?: { kind: 'sales_meeting' | 'home_appointment' | 'no_reply'; ref: string; step: string } }
/** Puts one text in line for the Mac bridge (texting hours and caps are the caller's job). */
export async function queue(db: Db, c: QueueTarget, body: string, opts: QueueOpts) {
  const { data } = await db.from('sms_messages').insert({
    conversation_id: c.id, lead_id: c.lead_id ?? null, ...(c.prospect_id ? { prospect_id: c.prospect_id } : {}),
    direction: 'out', body, status: 'queued', ai: opts.ai, send_after: (opts.sendAfter ?? new Date()).toISOString(),
    ...(opts.workflowStepRunId ? { workflow_step_run_id: opts.workflowStepRunId } : {}),
    ...(opts.reminder ? { reminder_kind: opts.reminder.kind, reminder_ref: opts.reminder.ref, reminder_step: opts.reminder.step } : {}),
  }).select('id').single();
  await db.from('sms_conversations').update({ last_outbound_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', c.id);
  return data?.id as string | undefined;
}
/** A system note on the lead's timeline (no-op for a contractor conversation). */
export async function note(db: Db, leadId: string | null, body: string, metadata: Record<string, unknown> = {}) {
  if (!leadId) return;
  await db.from('lead_activities').insert({ lead_id: leadId, type: 'system', body, metadata: { sms: true, ...metadata } });
}
