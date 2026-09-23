'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCallWorkspace } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildProspectEmailHtml,
  emailLogoUrl,
  MORE_INFO_TEMPLATE_KEY,
} from '@/lib/emails/template';
import { gmailOAuthConfig, sendGmailMessage } from '@/lib/emails/gmail';

export type SendEmailState =
  | { ok: true; message: string }
  | { ok: false; error: string; contactSaved: boolean }
  | undefined;

const schema = z.object({
  prospect_id: z.string().uuid('Choose a company'),
  recipient_name: z.string().trim().min(1, 'Enter the name of the person you spoke with').max(120),
  recipient_email: z.string().trim().email('Enter a valid recipient email').max(254),
  template_key: z.literal(MORE_INFO_TEMPLATE_KEY),
  subject: z
    .string()
    .trim()
    .min(1, 'Enter a subject')
    .max(200)
    .refine((value) => !/[\r\n]/.test(value), 'Subject must be one line'),
  message: z.string().trim().min(1, 'Enter a message').max(20_000),
  service_interests: z.string().trim().max(500),
});

const field = (fd: FormData, name: string) => {
  const value = fd.get(name);
  return typeof value === 'string' ? value : '';
};

export async function sendProspectEmail(
  _previous: SendEmailState,
  formData: FormData
): Promise<SendEmailState> {
  const me = await requireCallWorkspace();
  const parsed = schema.safeParse({
    prospect_id: field(formData, 'prospect_id'),
    recipient_name: field(formData, 'recipient_name'),
    recipient_email: field(formData, 'recipient_email'),
    template_key: field(formData, 'template_key'),
    subject: field(formData, 'subject'),
    message: field(formData, 'message'),
    service_interests: field(formData, 'service_interests'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Check the email fields', contactSaved: false };
  }
  const input = parsed.data;
  const serviceInterests = Array.from(
    new Set(
      input.service_interests
        .split(',')
        .map((service) => service.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    )
  ).slice(0, 5);
  const supabase = await createClient();
  const { data: prospect } = await supabase
    .from('contractor_prospects')
    .select('id, company_name, assigned_to, disposition')
    .eq('id', input.prospect_id)
    .maybeSingle();
  if (!prospect || (me.role !== 'admin' && prospect.assigned_to !== me.id)) {
    return { ok: false, error: 'Company not found or not assigned to you', contactSaved: false };
  }
  if (prospect.disposition === 'do_not_call') {
    return { ok: false, error: 'This contractor is marked do not call; no email was sent', contactSaved: false };
  }

  const { error: contactError } = await supabase
    .from('contractor_prospects')
    .update({
      decision_maker_name: input.recipient_name || null,
      decision_maker_email: input.recipient_email.toLowerCase(),
      email_service_interests: serviceInterests,
      updated_by: me.id,
    })
    .eq('id', prospect.id);
  if (contactError) {
    return { ok: false, error: `Contact could not be saved: ${contactError.message}`, contactSaved: false };
  }

  let senderEmail: string;
  try {
    senderEmail = gmailOAuthConfig().fromEmail;
  } catch (error) {
    return {
      ok: false,
      error: `Contact saved, but email was not sent: ${(error as Error).message}`,
      contactSaved: true,
    };
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const html = buildProspectEmailHtml(input.message, emailLogoUrl(siteUrl));
  const { data: activity, error: activityError } = await admin
    .from('prospect_email_logs')
    .insert({
      prospect_id: prospect.id,
      company_name: prospect.company_name,
      sender_user_id: me.id,
      sender_name: me.full_name || me.email,
      sender_email: senderEmail,
      recipient_name: input.recipient_name || null,
      recipient_email: input.recipient_email.toLowerCase(),
      template_key: input.template_key,
      subject: input.subject,
      message: input.message,
      html_message: html,
      status: 'pending',
    })
    .select('id')
    .single();
  if (activityError || !activity) {
    return {
      ok: false,
      error: `Contact saved, but email was not sent because its activity record could not be created: ${activityError?.message ?? 'Unknown error'}`,
      contactSaved: true,
    };
  }

  try {
    const sent = await sendGmailMessage({
      toEmail: input.recipient_email.toLowerCase(),
      subject: input.subject,
      message: input.message,
      html,
    });
    const sentAt = new Date().toISOString();
    const { error: finalizeError } = await admin
      .from('prospect_email_logs')
      .update({
        status: 'sent',
        provider_message_id: sent.id,
        sent_at: sentAt,
        error_message: null,
      })
      .eq('id', activity.id)
      .eq('status', 'pending');
    if (finalizeError) {
      return {
        ok: false,
        error: `Gmail sent the message, but the activity log could not be finalized: ${finalizeError.message}`,
        contactSaved: true,
      };
    }
    revalidatePath('/app/calls/emails');
    revalidatePath(`/app/calls/${prospect.id}`);
    return { ok: true, message: `Email sent to ${input.recipient_email}` };
  } catch (error) {
    const message = (error as Error).message || 'Unknown Gmail error';
    await admin
      .from('prospect_email_logs')
      .update({ status: 'failed', error_message: message, sent_at: null, provider_message_id: null })
      .eq('id', activity.id)
      .eq('status', 'pending');
    revalidatePath(`/app/calls/${prospect.id}`);
    return {
      ok: false,
      error: `Contact saved, but email was not sent: ${message}`,
      contactSaved: true,
    };
  }
}
