'use server';

import { z } from 'zod';
import { requireCallWorkspace } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendProspectEmailCore, type SendEmailState as CoreSendState } from '@/lib/emails/prospect-send.server';
import { MEETING_CONFIRMED_KEY } from '@/lib/emails/call-followups';
import { meetingInvite } from '@/lib/emails/meeting-invite';

// A 'use server' file may only export async functions and types declared here.
export type SendEmailState = CoreSendState;

const schema = z.object({
  // Empty when emailing someone who isn't a contractor prospect (e.g. a homeowner).
  prospect_id: z.union([z.literal(''), z.string().uuid('Choose a valid company')]),
  recipient_name: z.string().trim().min(1, 'Enter the recipient name').max(120),
  recipient_email: z.string().trim().email('Enter a valid recipient email').max(254),
  // A dynamic draft key (e.g. more_info_after_call) or any email_templates.key --
  // it lands in prospect_email_logs.template_key as a label; the subject/body
  // sent is whatever the sender reviewed in the subject/message fields below.
  template_key: z.string().trim().min(1).max(100).regex(/^[a-z][a-z0-9_]*$/),
  subject: z
    .string()
    .trim()
    .min(1, 'Enter a subject')
    .max(200)
    .refine((value) => !/[\r\n]/.test(value), 'Subject must be one line'),
  message: z.string().trim().min(1, 'Enter a message').max(20_000),
  service_interests: z.string().trim().max(500),
  allow_repeat: z.boolean(),
});

const field = (fd: FormData, name: string) => {
  const value = fd.get(name);
  return typeof value === 'string' ? value : '';
};

function parse(formData: FormData) {
  return schema.safeParse({
    prospect_id: field(formData, 'prospect_id'),
    recipient_name: field(formData, 'recipient_name'),
    recipient_email: field(formData, 'recipient_email'),
    template_key: field(formData, 'template_key'),
    subject: field(formData, 'subject'),
    message: field(formData, 'message'),
    service_interests: field(formData, 'service_interests'),
    allow_repeat: field(formData, 'allow_repeat') === '1',
  });
}

function services(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((service) => service.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    )
  ).slice(0, 5);
}

/** The full composer on /app/calls/emails. */
export async function sendProspectEmail(_previous: SendEmailState, formData: FormData): Promise<SendEmailState> {
  const me = await requireCallWorkspace();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Check the email fields', contactSaved: false };
  }
  const input = parsed.data;
  return sendProspectEmailCore(me, {
    prospectId: input.prospect_id || null,
    recipientName: input.recipient_name,
    recipientEmail: input.recipient_email,
    templateKey: input.template_key,
    subject: input.subject,
    message: input.message,
    serviceInterests: services(input.service_interests),
    allowRepeat: input.allow_repeat,
  });
}

/**
 * The quick sheet in the call workspace: always for one prospect. A "meeting
 * confirmed" email carries a calendar invite for the prospect's next booked
 * sales meeting with this sender.
 */
export async function sendQuickEmail(_previous: SendEmailState, formData: FormData): Promise<SendEmailState> {
  const me = await requireCallWorkspace();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Check the email fields', contactSaved: false };
  }
  const input = parsed.data;
  if (!input.prospect_id) return { ok: false, error: 'Choose a company', contactSaved: false };

  let attachments;
  if (input.template_key === MEETING_CONFIRMED_KEY) {
    const { data } = await createAdminClient()
      .from('prospect_sales_appointments')
      .select('id, scheduled_at, time_zone, appointment_type, contact_info')
      .eq('prospect_id', input.prospect_id)
      .in('status', ['scheduled', 'confirmed', 'rescheduled'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1);
    const m = (data ?? [])[0] as { id: string; scheduled_at: string; appointment_type: string | null; contact_info: string | null } | undefined;
    if (m) {
      attachments = [
        meetingInvite({
          id: m.id,
          scheduledAt: m.scheduled_at,
          appointmentType: m.appointment_type,
          contactInfo: m.contact_info,
          organizer: me.full_name || 'HomeQuote Network',
        }),
      ];
    }
  }

  return sendProspectEmailCore(me, {
    prospectId: input.prospect_id,
    recipientName: input.recipient_name,
    recipientEmail: input.recipient_email,
    templateKey: input.template_key,
    subject: input.subject,
    message: input.message,
    serviceInterests: services(input.service_interests),
    attachments,
    allowRepeat: input.allow_repeat,
  });
}
