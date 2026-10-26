'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { MAX_EXTRA_INSTRUCTIONS } from '@/lib/sms/agent';

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
});

/** The bot's extra instructions and the name it texts as for HomeQuote's own funnels. */
export async function saveSmsBot(_prev: SmsActionState, fd: FormData): Promise<SmsActionState> {
  const me = await requireRole(['admin']);
  const parsed = botSchema.safeParse({ bot_extra_instructions: String(fd.get('bot_extra_instructions') ?? ''), house_sender_name: String(fd.get('house_sender_name') ?? '') });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the values.' };
  const { error } = await createAdminClient().from('sms_settings').update({
    bot_extra_instructions: parsed.data.bot_extra_instructions.trim() || null,
    house_sender_name: parsed.data.house_sender_name || null,
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
