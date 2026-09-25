'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGmailMessage } from '@/lib/emails/gmail';
import { emailLogoUrl } from '@/lib/emails/template';
import { buildEmailTemplateSeedRows } from '@/lib/emails/template-library';
import {
  renderEmailTemplate,
  homequoteSystemValues,
  findUnknownVariables,
  EMAIL_VARIABLE_GROUPS,
  type EmailTemplateContext,
} from '@/lib/emails/variables';

export type EmailTemplateActionState = { ok: true; message: string } | { ok: false; error: string } | undefined;

const idSchema = z.string().uuid();

function str(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

// ---------------------------------------------------------------------------
// Library management (admin only)
// ---------------------------------------------------------------------------

/** Idempotent: inserts any template from the library whose key isn't already present. Never overwrites an edited template. */
export async function seedDefaultEmailTemplates(): Promise<EmailTemplateActionState> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase.from('email_templates').select('key');
  if (existingError) return { ok: false, error: existingError.message };
  const existingKeys = new Set((existing ?? []).map((r) => r.key as string));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homequotenet.com';
  const missing = buildEmailTemplateSeedRows(siteUrl).filter((row) => !existingKeys.has(row.key));
  if (!missing.length) return { ok: true, message: 'All default templates are already in your library.' };
  const { error } = await supabase.from('email_templates').insert(missing);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/app/email-templates');
  return { ok: true, message: `Added ${missing.length} default template${missing.length === 1 ? '' : 's'}.` };
}

const templateFieldsSchema = z.object({
  category: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  subject: z.string().trim().min(1).max(300),
  htmlBody: z.string().trim().min(1).max(50_000),
  textBody: z.string().trim().min(1).max(20_000),
  contractorVisible: z.boolean(),
});

export async function createEmailTemplate(_prev: EmailTemplateActionState, formData: FormData): Promise<EmailTemplateActionState> {
  const me = await requireRole(['admin']);
  const parsed = templateFieldsSchema.safeParse({
    category: str(formData, 'category'),
    name: str(formData, 'name'),
    description: str(formData, 'description') || undefined,
    subject: str(formData, 'subject'),
    htmlBody: str(formData, 'htmlBody'),
    textBody: str(formData, 'textBody'),
    contractorVisible: formData.get('contractorVisible') === 'on',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Check the template fields' };
  const key = `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}_${Date.now().toString(36)}`;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      key,
      category: parsed.data.category,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      subject: parsed.data.subject,
      html_body: parsed.data.htmlBody,
      text_body: parsed.data.textBody,
      contractor_visible: parsed.data.contractorVisible,
      is_system: false,
      created_by: me.id,
      updated_by: me.id,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? 'Could not create the template' };
  revalidatePath('/app/email-templates');
  return { ok: true, message: `Created "${parsed.data.name}"` };
}

export async function updateEmailTemplate(_prev: EmailTemplateActionState, formData: FormData): Promise<EmailTemplateActionState> {
  const me = await requireRole(['admin']);
  const id = idSchema.safeParse(str(formData, 'id'));
  if (!id.success) return { ok: false, error: 'Missing template id' };
  const parsed = templateFieldsSchema.safeParse({
    category: str(formData, 'category'),
    name: str(formData, 'name'),
    description: str(formData, 'description') || undefined,
    subject: str(formData, 'subject'),
    htmlBody: str(formData, 'htmlBody'),
    textBody: str(formData, 'textBody'),
    contractorVisible: formData.get('contractorVisible') === 'on',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Check the template fields' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('email_templates')
    .update({
      category: parsed.data.category,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      subject: parsed.data.subject,
      html_body: parsed.data.htmlBody,
      text_body: parsed.data.textBody,
      contractor_visible: parsed.data.contractorVisible,
      updated_by: me.id,
    })
    .eq('id', id.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/app/email-templates');
  revalidatePath(`/app/email-templates/${id.data}`);
  return { ok: true, message: 'Template saved' };
}

export async function duplicateEmailTemplate(templateId: string): Promise<EmailTemplateActionState> {
  const me = await requireRole(['admin']);
  const parsedId = idSchema.safeParse(templateId);
  if (!parsedId.success) return { ok: false, error: 'Missing template id' };
  const supabase = await createClient();
  const { data: source, error: loadError } = await supabase.from('email_templates').select('*').eq('id', parsedId.data).single();
  if (loadError || !source) return { ok: false, error: loadError?.message ?? 'Template not found' };
  const name = `${source.name} (copy)`;
  const key = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}_${Date.now().toString(36)}`;
  const { error } = await supabase.from('email_templates').insert({
    key,
    category: source.category,
    name,
    description: source.description,
    subject: source.subject,
    html_body: source.html_body,
    text_body: source.text_body,
    variables: source.variables,
    contractor_visible: source.contractor_visible,
    is_system: false,
    is_active: true,
    created_by: me.id,
    updated_by: me.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/app/email-templates');
  return { ok: true, message: `Duplicated as "${name}"` };
}

export async function setEmailTemplateActive(templateId: string, isActive: boolean): Promise<EmailTemplateActionState> {
  await requireRole(['admin']);
  const parsedId = idSchema.safeParse(templateId);
  if (!parsedId.success) return { ok: false, error: 'Missing template id' };
  const supabase = await createClient();
  const { error } = await supabase.from('email_templates').update({ is_active: isActive }).eq('id', parsedId.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/app/email-templates');
  return { ok: true, message: isActive ? 'Template activated' : 'Template deactivated' };
}

export async function deleteEmailTemplate(templateId: string): Promise<EmailTemplateActionState> {
  await requireRole(['admin']);
  const parsedId = idSchema.safeParse(templateId);
  if (!parsedId.success) return { ok: false, error: 'Missing template id' };
  const supabase = await createClient();
  // RLS also blocks deleting is_system rows; this check just gives a clearer error.
  const { data: row } = await supabase.from('email_templates').select('is_system, name').eq('id', parsedId.data).maybeSingle();
  if (row?.is_system) return { ok: false, error: 'System templates can be deactivated but not deleted. Duplicate it to make a custom copy.' };
  const { error } = await supabase.from('email_templates').delete().eq('id', parsedId.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/app/email-templates');
  return { ok: true, message: `Deleted "${row?.name ?? 'template'}"` };
}

// ---------------------------------------------------------------------------
// Manual send
// ---------------------------------------------------------------------------

async function buildLeadContext(leadId: string): Promise<{ context: EmailTemplateContext; email: string | null } | null> {
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from('leads')
    .select('id, first_name, last_name, email, phone, address, city, zip, project_description, budget_range, timeline, vertical:verticals(name)')
    .eq('id', leadId)
    .maybeSingle();
  if (!lead) return null;
  const vertical = lead.vertical as unknown as { name: string } | { name: string }[] | null;
  const serviceType = Array.isArray(vertical) ? vertical[0]?.name : vertical?.name;
  const { data: assignment } = await supabase
    .from('lead_assignments')
    .select('id, contractor:contractors(id, name, contact_name, email, phone)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  let appointment: Record<string, unknown> | null = null;
  if (assignment?.id) {
    const { data: appt } = await supabase
      .from('appointments')
      .select('scheduled_at, location')
      .eq('assignment_id', assignment.id)
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (appt?.scheduled_at) {
      const when = new Date(appt.scheduled_at);
      appointment = {
        date: when.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        time: when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        location: appt.location ?? '',
      };
    }
  }
  const contractor = assignment?.contractor as unknown as { name: string; contact_name: string; email: string; phone: string } | { name: string; contact_name: string; email: string; phone: string }[] | null;
  const contractorRow = Array.isArray(contractor) ? contractor[0] : contractor;
  return {
    context: {
      lead: { ...lead, service_type: serviceType ?? '', budget: lead.budget_range },
      appointment,
      contractor: contractorRow ?? null,
      homequote: homequoteSystemValues(),
    },
    email: lead.email,
  };
}

async function buildContractorContext(contractorId: string): Promise<{ context: EmailTemplateContext; email: string | null } | null> {
  const supabase = await createClient();
  const { data: contractor } = await supabase
    .from('contractors')
    .select('id, name, contact_name, email, phone')
    .eq('id', contractorId)
    .maybeSingle();
  if (!contractor) return null;
  return { context: { contractor, homequote: homequoteSystemValues() }, email: contractor.email };
}

/** Renders with sample data and sends to the requester's own email — the safe way to check a template before using it live. */
export async function sendTestEmailTemplate(templateId: string): Promise<EmailTemplateActionState> {
  const me = await requireRole(['admin', 'contractor']);
  if (!me.email) return { ok: false, error: 'Your account has no email on file' };
  const parsedId = idSchema.safeParse(templateId);
  if (!parsedId.success) return { ok: false, error: 'Missing template id' };
  const supabase = await createClient();
  const { data: template, error } = await supabase
    .from('email_templates')
    .select('id, key, subject, html_body, contractor_visible')
    .eq('id', parsedId.data)
    .maybeSingle();
  if (error || !template) return { ok: false, error: 'Template not found' };
  if (me.role === 'contractor' && !template.contractor_visible) return { ok: false, error: 'This template is not available to your account' };

  const sample: EmailTemplateContext = {
    lead: Object.fromEntries(EMAIL_VARIABLE_GROUPS.find((g) => g.group === 'Homeowner / Lead')!.fields.map((f) => [f.field.split('.')[1], f.example])),
    appointment: Object.fromEntries(EMAIL_VARIABLE_GROUPS.find((g) => g.group === 'Appointment')!.fields.map((f) => [f.field.split('.')[1], f.example])),
    contractor: Object.fromEntries(EMAIL_VARIABLE_GROUPS.find((g) => g.group === 'Contractor')!.fields.map((f) => [f.field.split('.')[1], f.example])),
    homequote: homequoteSystemValues(),
  };
  const subject = `[TEST] ${renderEmailTemplate(template.subject, sample)}`;
  const html = renderEmailTemplate(template.html_body, sample);

  const admin = createAdminClient();
  const { data: logRow } = await admin
    .from('email_template_sends')
    .insert({ template_id: template.id, template_key: template.key, recipient_type: 'custom', recipient_email: me.email, subject, html_message: html, status: 'pending', sent_by: me.id })
    .select('id')
    .single();
  try {
    const sent = await sendGmailMessage({ toEmail: me.email, subject, message: subject, html });
    if (logRow) await admin.from('email_template_sends').update({ status: 'sent', provider_message_id: sent.id, sent_at: new Date().toISOString() }).eq('id', logRow.id);
    return { ok: true, message: `Test email sent to ${me.email}` };
  } catch (err) {
    const message = (err as Error).message || 'Unknown Gmail error';
    if (logRow) await admin.from('email_template_sends').update({ status: 'failed', error_message: message }).eq('id', logRow.id);
    return { ok: false, error: message };
  }
}

const sendSchema = z.object({
  templateId: idSchema,
  recipientType: z.enum(['lead', 'contractor']),
  recipientId: idSchema,
  overrideEmail: z.string().trim().email().optional().or(z.literal('')),
});

/** Manual send: preview-then-send from the template library to a lead or contractor. Delivers through the existing Gmail connection — no separate sender. */
export async function sendEmailTemplate(_prev: EmailTemplateActionState, formData: FormData): Promise<EmailTemplateActionState> {
  const me = await requireRole(['admin', 'contractor']);
  const parsed = sendSchema.safeParse({
    templateId: str(formData, 'templateId'),
    recipientType: str(formData, 'recipientType'),
    recipientId: str(formData, 'recipientId'),
    overrideEmail: str(formData, 'overrideEmail'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Check the send form' };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: template, error: templateError } = await supabase
    .from('email_templates')
    .select('id, key, subject, html_body, is_active, contractor_visible')
    .eq('id', input.templateId)
    .maybeSingle();
  if (templateError || !template) return { ok: false, error: 'Template not found' };
  if (!template.is_active) return { ok: false, error: 'This template is deactivated' };
  if (me.role === 'contractor' && !template.contractor_visible) return { ok: false, error: 'This template is not available to your account' };

  const resolved =
    input.recipientType === 'lead' ? await buildLeadContext(input.recipientId) : await buildContractorContext(input.recipientId);
  if (!resolved) return { ok: false, error: 'Recipient not found' };
  const toEmail = (input.overrideEmail || resolved.email || '').toLowerCase();
  if (!toEmail) return { ok: false, error: 'Recipient has no email on file' };

  const subject = renderEmailTemplate(template.subject, resolved.context);
  const html = renderEmailTemplate(template.html_body, resolved.context);

  const admin = createAdminClient();
  const { data: logRow, error: logError } = await admin
    .from('email_template_sends')
    .insert({
      template_id: template.id,
      template_key: template.key,
      recipient_type: input.recipientType,
      recipient_id: input.recipientId,
      recipient_email: toEmail,
      subject,
      html_message: html,
      status: 'pending',
      sent_by: me.id,
    })
    .select('id')
    .single();
  if (logError || !logRow) return { ok: false, error: logError?.message ?? 'Could not log the send' };

  try {
    const sent = await sendGmailMessage({ toEmail, subject, message: subject, html });
    await admin
      .from('email_template_sends')
      .update({ status: 'sent', provider_message_id: sent.id, sent_at: new Date().toISOString() })
      .eq('id', logRow.id);
    revalidatePath('/app/email-templates');
    return { ok: true, message: `Sent to ${toEmail}` };
  } catch (error) {
    const message = (error as Error).message || 'Unknown Gmail error';
    await admin.from('email_template_sends').update({ status: 'failed', error_message: message }).eq('id', logRow.id);
    return { ok: false, error: message };
  }
}

export { findUnknownVariables, emailLogoUrl };

// Void-returning wrappers for ConfirmAction / quick-action buttons, which call
// a plain (formData) => Promise<void> server action.
export async function duplicateEmailTemplateAction(formData: FormData): Promise<void> {
  await duplicateEmailTemplate(String(formData.get('id') ?? ''));
}
export async function deleteEmailTemplateAction(formData: FormData): Promise<void> {
  await deleteEmailTemplate(String(formData.get('id') ?? ''));
}
export async function activateEmailTemplateAction(formData: FormData): Promise<void> {
  await setEmailTemplateActive(String(formData.get('id') ?? ''), true);
}
export async function deactivateEmailTemplateAction(formData: FormData): Promise<void> {
  await setEmailTemplateActive(String(formData.get('id') ?? ''), false);
}
export async function seedDefaultEmailTemplatesAction(): Promise<void> {
  await seedDefaultEmailTemplates();
}
