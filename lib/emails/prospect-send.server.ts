import 'server-only';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/types';
import { dayBoundsInZone } from '@/lib/calls/metrics';
import {
  buildProspectEmailHtml,
  buildProspectEmailText,
  emailLogoUrl,
  mailingAddress,
  type EmailSigner,
} from '@/lib/emails/template';
import { resolveGmailSender, sendGmailMessage } from '@/lib/emails/gmail';
import type { MailAttachment } from '@/lib/emails/gmail-message';

/**
 * The one way a prospect email is sent, shared by the full composer
 * (/app/calls/emails) and the quick sheet in the call workspace, so checks,
 * logging and delivery can never drift apart.
 *
 * Refuses: do-not-call and email opt-outs; a prospect not assigned to the
 * sender (unless admin); the same template to the same prospect within 7 days
 * (unless the sender confirms); more than DAILY_SEND_CAP sends a day. Every
 * prospect send is logged in prospect_email_logs — pending first, then sent
 * only once Gmail returns a message id, or failed with the provider error.
 */

export const DAILY_SEND_CAP = 100;
export const REPEAT_WINDOW_DAYS = 7;

export type SendEmailState =
  | { ok: true; message: string }
  | { ok: false; error: string; contactSaved: boolean; repeat?: boolean }
  | undefined;

export interface ProspectSendInput {
  prospectId: string | null;
  recipientName: string;
  recipientEmail: string;
  templateKey: string;
  subject: string;
  message: string;
  serviceInterests: string[];
  attachments?: MailAttachment[];
  /** The sender confirmed sending a template this prospect already got this week. */
  allowRepeat?: boolean;
}

export function signerFor(me: Pick<Profile, 'full_name' | 'email' | 'phone'>): EmailSigner {
  return { name: me.full_name?.trim() || 'Liam', phone: me.phone ?? null };
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

function when(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'earlier today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export async function sendProspectEmailCore(me: Profile, input: ProspectSendInput): Promise<SendEmailState> {
  const admin = createAdminClient();

  // Daily cap per sender: catches a runaway loop or a mistake, well under Gmail's own limits.
  const { start } = dayBoundsInZone(new Date());
  const { count: sentToday } = await admin
    .from('prospect_email_logs')
    .select('id', { count: 'exact', head: true })
    .eq('sender_user_id', me.id)
    .eq('status', 'sent')
    .gte('sent_at', start.toISOString());
  if ((sentToday ?? 0) >= DAILY_SEND_CAP) {
    return { ok: false, error: `You've sent ${DAILY_SEND_CAP} emails today — the daily limit. Pick it up tomorrow.`, contactSaved: false };
  }

  const signer = signerFor(me);
  const address = mailingAddress();
  const html = buildProspectEmailHtml(input.message, emailLogoUrl(siteUrl()), signer, address);
  const text = buildProspectEmailText(input.message, signer, address);
  const fromName = `${signer.name} · HomeQuote Network`;
  const toEmail = input.recipientEmail.toLowerCase();

  if (!input.prospectId) {
    // Homeowner / non-prospect send: no per-company log row (prospect_id is required there);
    // the sender's Gmail keeps its own Sent copy.
    try {
      await sendGmailMessage({ toEmail, subject: input.subject, message: input.message, html, text, fromName, attachments: input.attachments, senderUserId: me.id });
      revalidatePath('/app/calls/emails');
      return { ok: true, message: `Email sent to ${input.recipientEmail}` };
    } catch (error) {
      return { ok: false, error: `Email was not sent: ${(error as Error).message || 'Unknown Gmail error'}`, contactSaved: false };
    }
  }

  const supabase = await createClient();
  const { data: row } = await supabase.from('contractor_prospects').select('*').eq('id', input.prospectId).maybeSingle();
  const prospect = row as {
    id: string;
    company_name: string;
    assigned_to: string | null;
    disposition: string;
    email_opt_out_at?: string | null;
  } | null;
  if (!prospect || (me.role !== 'admin' && prospect.assigned_to !== me.id)) {
    return { ok: false, error: 'Company not found or not assigned to you', contactSaved: false };
  }
  if (prospect.disposition === 'do_not_call') {
    return { ok: false, error: 'This contractor is marked do not call; no email was sent', contactSaved: false };
  }
  if (prospect.email_opt_out_at) {
    return { ok: false, error: 'This contractor asked not to be emailed; no email was sent', contactSaved: false };
  }

  if (!input.allowRepeat) {
    const since = new Date(Date.now() - REPEAT_WINDOW_DAYS * 86_400_000).toISOString();
    const { data: recent } = await admin
      .from('prospect_email_logs')
      .select('sent_at, sender_name')
      .eq('prospect_id', prospect.id)
      .eq('template_key', input.templateKey)
      .eq('status', 'sent')
      .gte('sent_at', since)
      .order('sent_at', { ascending: false })
      .limit(1);
    const last = (recent ?? [])[0] as { sent_at: string; sender_name: string | null } | undefined;
    if (last) {
      return {
        ok: false,
        repeat: true,
        contactSaved: false,
        error: `${prospect.company_name} already got this email ${when(last.sent_at)}${last.sender_name ? ` (from ${last.sender_name})` : ''}. Send it again anyway?`,
      };
    }
  }

  const { error: contactError } = await supabase
    .from('contractor_prospects')
    .update({
      decision_maker_name: input.recipientName || null,
      decision_maker_email: toEmail,
      email_service_interests: input.serviceInterests,
      updated_by: me.id,
    })
    .eq('id', prospect.id);
  if (contactError) {
    return { ok: false, error: `Contact could not be saved: ${contactError.message}`, contactSaved: false };
  }

  let senderEmail: string;
  try {
    const sender = await resolveGmailSender(me.id);
    if (!sender) throw new Error('No Gmail account is connected. Connect yours on the Emails page.');
    senderEmail = sender.email;
  } catch (error) {
    return { ok: false, error: `Contact saved, but email was not sent: ${(error as Error).message}`, contactSaved: true };
  }

  const { data: activity, error: activityError } = await admin
    .from('prospect_email_logs')
    .insert({
      prospect_id: prospect.id,
      company_name: prospect.company_name,
      sender_user_id: me.id,
      sender_name: me.full_name || me.email,
      sender_email: senderEmail,
      recipient_name: input.recipientName || null,
      recipient_email: toEmail,
      template_key: input.templateKey,
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
      toEmail,
      subject: input.subject,
      message: input.message,
      html,
      text,
      fromName,
      attachments: input.attachments,
      senderUserId: me.id,
    });
    const { error: finalizeError } = await admin
      .from('prospect_email_logs')
      .update({ status: 'sent', provider_message_id: sent.id, sent_at: new Date().toISOString(), error_message: null })
      .eq('id', activity.id)
      .eq('status', 'pending');
    if (finalizeError) {
      return { ok: false, error: `Gmail sent the message, but the activity log could not be finalized: ${finalizeError.message}`, contactSaved: true };
    }
    revalidatePath('/app/calls/emails');
    revalidatePath(`/app/calls/${prospect.id}`);
    return { ok: true, message: `Email sent to ${input.recipientEmail}` };
  } catch (error) {
    const message = (error as Error).message || 'Unknown Gmail error';
    await admin
      .from('prospect_email_logs')
      .update({ status: 'failed', error_message: message, sent_at: null, provider_message_id: null })
      .eq('id', activity.id)
      .eq('status', 'pending');
    revalidatePath(`/app/calls/${prospect.id}`);
    return { ok: false, error: `Contact saved, but email was not sent: ${message}`, contactSaved: true };
  }
}
