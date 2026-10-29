'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { MAX_EXTRA_INSTRUCTIONS } from '@/lib/sms/agent';
import { openingTemplateProblem } from '@/lib/sms/rules';
import { reminderTemplateProblem } from '@/lib/sms/reminder-config';
import { FOLLOW_UP_STEPS, MEETING_STEPS } from '@/lib/sms/reminder-plan';

export type SmsActionState = { ok: boolean; message?: string; error?: string } | undefined;
const refresh = (leadId?: string) => { revalidatePath('/app/texting'); if (leadId) revalidatePath(`/app/leads/${leadId}`); };

/** Master switch and emergency stop. Turning it off also cancels everything still waiting to send. */
export async function setSmsEnabled(fd: FormData): Promise<void> {
  const me = await requireRole(['admin']);
  const enable = fd.get('enabled') === 'true';
  const db = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await db.from('sms_settings').update(
    enable ? { enabled: true, stopped_at: null, updated_by: me.id, updated_at: now } : { enabled: false, stopped_at: now, updated_by: me.id, updated_at: now }).eq('id', true);
  if (error) throw new Error('Could not update the texting switch');
  if (!enable) await db.from('sms_messages').update({ status: 'failed', error: 'Cancelled: texting was stopped' }).eq('status', 'queued');
  refresh();
}

const settingsSchema = z.object({
  window_start_hour: z.coerce.number().int().min(0).max(23),
  window_end_hour: z.coerce.number().int().min(1).max(24),
  daily_cap: z.coerce.number().int().min(1).max(5000),
  first_text_delay_minutes: z.coerce.number().int().min(0, 'The delay can’t be negative.').max(1440, 'Keep the delay under 24 hours (1440 minutes).'),
  max_ai_replies_per_day: z.coerce.number().int().min(1, 'Allow at least 1 assistant reply a day.').max(5000, 'Keep it at 5000 or fewer.'),
  max_ai_turns: z.coerce.number().int().min(2, 'Allow at least 2 assistant replies.').max(40, 'Keep it at 40 replies or fewer.'),
}).refine((v) => v.window_end_hour > v.window_start_hour, { message: 'The window must close after it opens.' });

export async function saveSmsSettings(_prev: SmsActionState, fd: FormData): Promise<SmsActionState> {
  const me = await requireRole(['admin']);
  const parsed = settingsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the values.' };
  const { error } = await createAdminClient().from('sms_settings').update({
    ...parsed.data, contractor_funnels_enabled: fd.get('contractor_funnels_enabled') === 'on', updated_by: me.id, updated_at: new Date().toISOString(),
  }).eq('id', true);
  if (error) return { ok: false, error: 'Could not save.' };
  refresh();
  return { ok: true, message: 'Saved.' };
}

/** A person takes over a conversation (or hands it back to the assistant). Cancels unsent AI replies on takeover. */
export async function setConversationOwner(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = z.string().uuid().parse(fd.get('conversationId'));
  const toPerson = fd.get('owner') === 'person';
  const db = createAdminClient();
  const { data: c } = await db.from('sms_conversations').select('lead_id,status').eq('id', id).maybeSingle();
  if (!c || c.status === 'opted_out') return;
  await db.from('sms_conversations').update({ status: toPerson ? 'paused' : 'active', updated_at: new Date().toISOString() }).eq('id', id);
  if (toPerson) await db.from('sms_messages').update({ status: 'failed', error: 'Cancelled: a person took over' }).eq('conversation_id', id).eq('status', 'queued').eq('ai', true);
  refresh(c.lead_id as string);
}

const botSchema = z.object({
  bot_extra_instructions: z.string().max(MAX_EXTRA_INSTRUCTIONS, `Keep the instructions under ${MAX_EXTRA_INSTRUCTIONS} characters.`),
  house_sender_name: z.string().trim().max(40, 'The name is too long.'),
  opening_template: z.string().max(1000),
}).superRefine((v, ctx) => {
  const problem = openingTemplateProblem(v.opening_template);
  if (problem) ctx.addIssue({ code: 'custom', message: problem, path: ['opening_template'] });
});

/** The bot's extra instructions and the name it texts as for HomeQuote's own funnels. */
export async function saveSmsBot(_prev: SmsActionState, fd: FormData): Promise<SmsActionState> {
  const me = await requireRole(['admin']);
  const parsed = botSchema.safeParse({ bot_extra_instructions: String(fd.get('bot_extra_instructions') ?? ''), house_sender_name: String(fd.get('house_sender_name') ?? ''), opening_template: String(fd.get('opening_template') ?? '') });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the values.' };
  const { error } = await createAdminClient().from('sms_settings').update({
    bot_extra_instructions: parsed.data.bot_extra_instructions.trim() || null,
    house_sender_name: parsed.data.house_sender_name || null,
    opening_template: parsed.data.opening_template.trim() || null,
    updated_by: me.id, updated_at: new Date().toISOString(),
  }).eq('id', true);
  if (error) return { ok: false, error: 'Could not save.' };
  refresh();
  return { ok: true, message: 'Saved. New replies use it right away.' };
}

/** Per-contractor texting switch (also needs the contractor-funnel switch on Texting). */
export async function setContractorTexting(fd: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = z.string().uuid().parse(fd.get('contractorId'));
  const { error } = await createAdminClient().from('contractors').update({ texting_enabled: fd.get('enabled') === 'true' }).eq('id', id);
  if (error) throw new Error('Could not update texting for this contractor');
  revalidatePath(`/app/contractors/${id}`);
}

const contractorWordingSchema = z.object({
  contractorId: z.string().uuid(),
  texting_sender_name: z.string().trim().max(60, 'The name is too long.'),
  texting_opening_template: z.string().max(1000),
  texting_extra_instructions: z.string().max(MAX_EXTRA_INSTRUCTIONS, `Keep the instructions under ${MAX_EXTRA_INSTRUCTIONS} characters.`),
}).superRefine((v, ctx) => {
  const problem = openingTemplateProblem(v.texting_opening_template);
  if (problem) ctx.addIssue({ code: 'custom', message: problem, path: ['texting_opening_template'] });
});

/** What texts say for one contractor: the name they come from, the first message, and extra instructions. Blank = use the general ones. */
export async function saveContractorTextingWording(_prev: SmsActionState, fd: FormData): Promise<SmsActionState> {
  await requireRole(['admin']);
  const parsed = contractorWordingSchema.safeParse({
    contractorId: String(fd.get('contractorId') ?? ''),
    texting_sender_name: String(fd.get('texting_sender_name') ?? ''),
    texting_opening_template: String(fd.get('texting_opening_template') ?? ''),
    texting_extra_instructions: String(fd.get('texting_extra_instructions') ?? ''),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the values.' };
  const { contractorId, ...v } = parsed.data;
  const { error } = await createAdminClient().from('contractors').update({
    texting_sender_name: v.texting_sender_name || null,
    texting_opening_template: v.texting_opening_template.trim() || null,
    texting_extra_instructions: v.texting_extra_instructions.trim() || null,
  }).eq('id', contractorId);
  if (error) return { ok: false, error: 'Could not save. Has the latest database update been applied?' };
  revalidatePath(`/app/contractors/${contractorId}`);
  return { ok: true, message: 'Saved. New texts use it right away.' };
}

/**
 * Reminder texts and follow-ups (sms_settings.reminder_config). Sent as one JSON field from the Texting page.
 * Blank wording means "use the built-in default", so only changed texts are stored.
 */
export async function saveReminderSettings(_prev: SmsActionState, fd: FormData): Promise<SmsActionState> {
  const me = await requireRole(['admin']);
  let raw: Record<string, unknown>;
  try { raw = JSON.parse(String(fd.get('config') ?? '{}')); } catch { return { ok: false, error: 'Could not read the settings.' }; }
  const r = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
  const cleanTemplates = (t: unknown, keys: readonly string[]) => {
    const out: Record<string, string> = {};
    for (const k of keys) {
      const v = typeof r(t)[k] === 'string' ? (r(t)[k] as string).trim() : '';
      if (!v) continue;
      const problem = reminderTemplateProblem(v);
      if (problem) throw new Error(problem);
      out[k] = v;
    }
    return out;
  };
  let stored: Record<string, unknown>;
  try {
    const c = r(raw.contractor), h = r(raw.homeowner), f = r(raw.followups);
    const days = Array.isArray(f.days) ? f.days.map(Number) : [];
    if (days.some((d) => !Number.isInteger(d) || d < 1 || d > 30)) throw new Error('Follow-up days must be whole days from 1 to 30.');
    if (new Set(days).size !== days.length || days.length < 1 || days.length > 3) throw new Error('Pick one to three different follow-up days.');
    const everyDays = Number(f.everyDays ?? 3);
    if (f.keepGoing !== false && (!Number.isInteger(everyDays) || everyDays < 2 || everyDays > 30)) throw new Error('Keep texting every 2 to 30 days.');
    stored = {
      contractor: { enabled: c.enabled !== false, host: String(c.host ?? '').trim().slice(0, 40), brand: String(c.brand ?? '').trim().slice(0, 40), templates: cleanTemplates(c.templates, MEETING_STEPS) },
      homeowner: { enabled: h.enabled !== false, templates: cleanTemplates(h.templates, MEETING_STEPS) },
      followups: { enabled: f.enabled !== false, days: [...days].sort((a, b) => a - b), keepGoing: f.keepGoing !== false, everyDays: Number.isInteger(everyDays) ? everyDays : 3, templates: cleanTemplates(f.templates, FOLLOW_UP_STEPS) },
      unconfirmedAlert: raw.unconfirmedAlert !== false,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Check the settings.' };
  }
  const { error } = await createAdminClient().from('sms_settings').update({ reminder_config: stored, updated_by: me.id, updated_at: new Date().toISOString() }).eq('id', true);
  if (error) return { ok: false, error: /reminder_config/.test(error.message) ? 'Run database migration 0068 first.' : 'Could not save.' };
  refresh();
  return { ok: true, message: 'Saved.' };
}
