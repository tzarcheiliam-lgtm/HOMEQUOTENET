'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processLeadEmails } from '@/lib/leads/notify';

export type DistributionState =
  | { ok: true; message: string; warning?: string }
  | { ok: false; error: string }
  | undefined;

const uuid = z.string().uuid();

// --- Send a qualified lead ---------------------------------------------------

export async function sendLeadToRecipients(
  _prev: DistributionState,
  formData: FormData
): Promise<DistributionState> {
  const me = await requireRole(['admin']);
  const leadId = uuid.safeParse(formData.get('lead_id'));
  if (!leadId.success) return { ok: false, error: 'Missing lead' };
  const recipientIds = formData.getAll('recipient_ids').map(String).filter((id) => uuid.safeParse(id).success);
  if (recipientIds.length === 0) return { ok: false, error: 'Choose at least one recipient' };
  const resend = formData.get('resend') === 'on';

  const db = createAdminClient();
  const { data, error } = await db.rpc('distribute_lead', {
    p_lead: leadId.data,
    p_recipients: recipientIds,
    p_actor: me.id,
    p_resend: resend,
  });
  if (error) {
    const known = /Qualify the lead|Choose at least one|Lead not found/.exec(error.message)?.[0];
    return { ok: false, error: known ? error.message : 'The lead could not be sent. Try again.' };
  }
  const queued: string[] = data?.queued ?? [];
  const skipped: { name: string; reason: string }[] = data?.skipped ?? [];

  let sent = 0;
  let failures: string[] = [];
  if (queued.length) {
    const result = await processLeadEmails({ ids: queued });
    sent = result.sent;
    failures = result.results.filter((r) => r.status === 'failed').map((r) => r.error ?? 'Unknown error');
  }
  revalidatePath(`/app/leads/${leadId.data}`);
  revalidatePath('/app/leads');

  const already = skipped.filter((s) => s.reason === 'already_sent').map((s) => s.name);
  const inactive = skipped.filter((s) => s.reason === 'inactive').map((s) => s.name);
  const notes = [
    already.length ? `Already sent to ${already.join(', ')} — turn on “Send again” to resend.` : '',
    inactive.length ? `${inactive.join(', ')} ${inactive.length === 1 ? 'is' : 'are'} inactive and ${inactive.length === 1 ? 'was' : 'were'} skipped.` : '',
  ].filter(Boolean).join(' ');

  if (failures.length) {
    return {
      ok: false,
      error: `${sent} sent, ${failures.length} not sent: ${failures[0]}. The email is saved as failed and will retry; you can also retry it below.${notes ? ` ${notes}` : ''}`,
    };
  }
  if (sent === 0) return { ok: false, error: notes || 'Nothing was sent.' };
  return { ok: true, message: `Lead sent to ${sent} recipient${sent === 1 ? '' : 's'}.`, warning: notes || undefined };
}

// --- Retry a failed email (alert or send) ---------------------------------------

export async function retryLeadEmail(formData: FormData): Promise<void> {
  await requireRole(['admin']);
  const id = uuid.safeParse(formData.get('delivery_id'));
  const leadId = uuid.safeParse(formData.get('lead_id'));
  if (!id.success) return;
  await processLeadEmails({ ids: [id.data] });
  if (leadId.success) revalidatePath(`/app/leads/${leadId.data}`);
}

// --- Recipient management --------------------------------------------------------

export type RecipientFormState = { error?: string; success?: boolean } | undefined;

const recipientSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(120),
  company: z.string().trim().max(160).transform((v) => v || null),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  phone: z.string().trim().max(40).transform((v) => v || null),
  kind: z.enum(['team_member', 'contractor'], { errorMap: () => ({ message: 'Choose a type' }) }),
  contractor_id: z.string().trim().transform((v) => v || null).pipe(z.string().uuid().nullable()),
});

function recipientInput(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? '');
  return recipientSchema.safeParse({
    name: get('name'),
    company: get('company'),
    email: get('email'),
    phone: get('phone'),
    kind: get('kind'),
    contractor_id: get('contractor_id'),
  });
}

function friendlyDbError(message: string): string {
  return /lead_recipients_email_unique|duplicate key/.test(message)
    ? 'A recipient with this email already exists'
    : message;
}

export async function createRecipient(
  _prev: RecipientFormState,
  formData: FormData
): Promise<RecipientFormState> {
  const me = await requireRole(['admin']);
  const parsed = recipientInput(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from('lead_recipients').insert({ ...parsed.data, created_by: me.id });
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath('/app/lead-recipients');
  return { success: true };
}

export async function updateRecipient(
  _prev: RecipientFormState,
  formData: FormData
): Promise<RecipientFormState> {
  await requireRole(['admin']);
  const id = uuid.safeParse(formData.get('id'));
  if (!id.success) return { error: 'Missing recipient' };
  const parsed = recipientInput(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from('lead_recipients')
    .update({ ...parsed.data, is_active: formData.get('is_active') === 'on' })
    .eq('id', id.data);
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath('/app/lead-recipients');
  return { success: true };
}
