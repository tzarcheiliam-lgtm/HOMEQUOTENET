import 'server-only';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGmailMessage } from '@/lib/emails/gmail';
import { funnelSchema, type FunnelConfig } from '@/lib/funnels/schema';
import { LEAD_SOURCE_LABELS } from '@/lib/leads/constants';
import {
  buildNewLeadAlert,
  buildQualifiedLeadEmail,
  type LeadEmailAnswer,
  type LeadEmailData,
} from '@/lib/leads/lead-emails';

/**
 * Sends queued lead emails (lead_email_deliveries): the internal new-lead
 * alert (queued by the database for every intake) and qualified-lead sends
 * (queued by distribute_lead). Runs server-side only, through the existing
 * HomeQuote Gmail connection. Delivery is at-least-once with retries.
 */

export type LeadEmailSender = (input: {
  toEmail: string;
  subject: string;
  message: string;
  html: string;
  text: string;
}) => Promise<{ id: string }>;

type Db = ReturnType<typeof createAdminClient>;

interface DeliveryRow {
  id: string;
  lead_id: string;
  kind: 'new_lead_alert' | 'qualified_lead';
  intake_event_id: string | null;
  is_repeat: boolean;
  recipient_name: string | null;
  recipient_email: string | null;
  attempts: number;
}

const EMAIL = /^[^@\s,;<>"]+@[^@\s,;<>"]+\.[^@\s,;<>"]+$/;

/** Confirmed recipients of every raw new lead (Liam, Nadav). Server-only. */
export const DEFAULT_LEAD_ALERT_EMAILS = 'tzarcheiliam@gmail.com,nsolachnek@gmail.com';

/**
 * Who gets every raw new lead: LEAD_ALERT_EMAILS (server env, comma separated)
 * when set, otherwise the confirmed defaults. Never exposed to the browser.
 */
export function leadAlertRecipients(raw = process.env.LEAD_ALERT_EMAILS?.trim() || DEFAULT_LEAD_ALERT_EMAILS): string[] {
  const list = Array.from(
    new Set(
      (raw ?? '')
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    )
  );
  if (list.length === 0) throw new Error('LEAD_ALERT_EMAILS is not configured');
  const bad = list.find((e) => !EMAIL.test(e));
  if (bad) throw new Error('LEAD_ALERT_EMAILS contains an invalid address');
  return list;
}

export function leadUrl(leadId: string, siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'): string {
  return new URL(`/app/leads/${leadId}`, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString();
}

interface SessionRow {
  id: string;
  answers: Record<string, string> | null;
  qualified: boolean | null;
  config_snapshot: unknown;
  contact_submitted_at: string;
  funnel: { slug: string } | null;
}

// Question ids the email shows as named rows; other answers are listed below.
const NAMED = new Set(['service', 'zip', 'homeowner', 'timeline', 'budget']);

function answerLabel(config: FunnelConfig | null, id: string, value: string): string {
  const q = config?.questions.find((item) => item.id === id);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}

function questionLabel(config: FunnelConfig | null, id: string): string {
  return config?.questions.find((q) => q.id === id)?.headline ?? id.replace(/_/g, ' ');
}

/** Gathers everything both email types show, from the lead and its funnel session. */
export async function loadLeadEmailData(
  db: Db,
  leadId: string,
  opts: { sessionId?: string | null; isRepeat?: boolean } = {}
): Promise<LeadEmailData> {
  const { data: lead, error } = await db
    .from('leads')
    .select('*, vertical:verticals(name), sub_service:sub_services(name)')
    .eq('id', leadId)
    .single();
  if (error || !lead) throw new Error('Lead not found');

  const { data: sessions } = await db
    .from('funnel_sessions')
    .select('id, answers, qualified, config_snapshot, contact_submitted_at, funnel:funnels(slug)')
    .eq('lead_id', leadId)
    .not('contact_submitted_at', 'is', null)
    .order('contact_submitted_at', { ascending: false });
  const all = (sessions ?? []) as unknown as SessionRow[];
  const session = (opts.sessionId && all.find((s) => s.id === opts.sessionId)) || all[0] || null;
  let config: FunnelConfig | null = null;
  if (session) {
    const parsed = funnelSchema.safeParse(session.config_snapshot);
    config = parsed.success ? parsed.data : null;
  }
  const answers: Record<string, string> = session?.answers ?? {};
  const answer = (id: string) => (answers[id] ? answerLabel(config, id, answers[id]) : null);

  // Appointment: a website booking first, else a scheduled appointment on an assignment.
  let appointment: LeadEmailData['appointment'] = null;
  if (all.length) {
    const { data: booking } = await db
      .from('funnel_bookings')
      .select('scheduled_at, verified')
      .in('session_id', all.map((s) => s.id))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (booking) appointment = { scheduledAt: booking.scheduled_at, verified: booking.verified };
  }
  if (!appointment) {
    const { data: appts } = await db
      .from('appointments')
      .select('scheduled_at, assignment:lead_assignments!inner(lead_id)')
      .eq('assignment.lead_id', leadId)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(1);
    const first = (appts ?? [])[0] as { scheduled_at: string | null } | undefined;
    if (first) appointment = { scheduledAt: first.scheduled_at, verified: true };
  }

  let qualifiedBy: string | null = null;
  if (lead.qualified_by) {
    const { data: p } = await db.from('profiles').select('full_name, email').eq('id', lead.qualified_by).maybeSingle();
    qualifiedBy = p?.full_name || p?.email || null;
  }

  const funnelSlug: string | null = session?.funnel?.slug ?? null;
  const sourceBase = funnelSlug
    ? `Website form: ${config?.clientName ?? funnelSlug} (/estimate/${funnelSlug})`
    : lead.source
      ? LEAD_SOURCE_LABELS[lead.source] ?? lead.source
      : null;
  const source = [sourceBase, lead.utm_campaign || lead.campaign, lead.ad_name || lead.form_name]
    .filter(Boolean)
    .join(' · ') || null;

  const extras: LeadEmailAnswer[] = Object.entries(answers)
    .filter(([id]) => !NAMED.has(id))
    .map(([id, value]) => ({ label: questionLabel(config, id), value: answerLabel(config, id, value) }));

  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Name not provided';
  return {
    leadId,
    name,
    phone: lead.phone,
    email: lead.email,
    service: answer('service') ?? lead.sub_service?.name ?? lead.vertical?.name ?? null,
    city: lead.city,
    zip: answers.zip ?? lead.zip,
    homeowner: answer('homeowner'),
    timeline: answer('timeline') ?? lead.timeline,
    budget: answer('budget') ?? lead.budget_range,
    industry: lead.vertical?.name ?? config?.industry ?? null,
    source,
    submittedAt: session?.contact_submitted_at ?? lead.created_at,
    isRepeat: !!opts.isRepeat,
    autoCheck: session ? session.qualified : null,
    answers: extras,
    qualificationNotes: lead.qualification_notes ?? null,
    qualifiedBy,
    appointment,
  };
}

/**
 * Send queued lead emails right after the current response (funnel submit,
 * intake webhook). Outside a request (scripts) it's a no-op: the scheduled
 * POST /api/funnels/deliver run sends anything still queued.
 */
export function sendLeadEmailsSoon(): void {
  try {
    after(async () => {
      try {
        await processLeadEmails();
      } catch (error) {
        console.error('[lead-email] Background send failed; queued emails will retry', error instanceof Error ? error.message : 'unknown');
      }
    });
  } catch {
    /* Not inside a request: the scheduled run delivers it. */
  }
}

function cleanError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown email error';
  return message.replace(/\s+/g, ' ').slice(0, 300);
}

export interface ProcessResult {
  sent: number;
  failed: number;
  results: { id: string; status: 'sent' | 'failed'; error?: string }[];
}

export async function processLeadEmails(
  opts: { ids?: string[]; send?: LeadEmailSender; db?: Db; siteUrl?: string } = {}
): Promise<ProcessResult> {
  const db = opts.db ?? createAdminClient();
  const send: LeadEmailSender = opts.send ?? ((input) => sendGmailMessage(input));
  const { data: jobs, error } = await db.rpc('claim_lead_email_deliveries', {
    p_ids: opts.ids && opts.ids.length ? opts.ids : null,
  });
  if (error) throw new Error('Could not claim lead emails');

  const out: ProcessResult = { sent: 0, failed: 0, results: [] };
  for (const job of (jobs ?? []) as DeliveryRow[]) {
    try {
      let sessionId: string | null = null;
      if (job.intake_event_id) {
        const { data: ev } = await db
          .from('lead_intake_events')
          .select('provider, external_lead_id')
          .eq('id', job.intake_event_id)
          .maybeSingle();
        if (ev?.provider === 'website') sessionId = ev.external_lead_id;
      }
      const data = await loadLeadEmailData(db, job.lead_id, { sessionId, isRepeat: job.is_repeat });
      let to: string;
      let built;
      if (job.kind === 'new_lead_alert') {
        to = leadAlertRecipients().join(', ');
        built = buildNewLeadAlert(data, leadUrl(job.lead_id, opts.siteUrl));
      } else {
        if (!job.recipient_email || !EMAIL.test(job.recipient_email)) throw new Error('Recipient email is invalid');
        to = job.recipient_email;
        built = buildQualifiedLeadEmail(data, job.recipient_name);
      }
      const delivered = await send({ toEmail: to, subject: built.subject, message: built.text, html: built.html, text: built.text });
      // Gmail accepted it: never fall into the retry path from here, or the
      // email would go out twice. A failed bookkeeping write (rare) is logged
      // with the Gmail id; the row stays 'sending' until its lease expires.
      const { error: finishError } = await db
        .from('lead_email_deliveries')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: delivered.id,
          subject: built.subject,
          recipient_email: to,
          last_error: null,
        })
        .eq('id', job.id);
      if (finishError) console.error(`[lead-email] ${job.id} sent (Gmail ${delivered.id}) but not recorded: ${finishError.message}`);
      out.sent++;
      out.results.push({ id: job.id, status: 'sent' });
    } catch (err) {
      const message = cleanError(err);
      console.error(`[lead-email] ${job.kind} ${job.id} attempt ${job.attempts}: ${message}`);
      await db
        .from('lead_email_deliveries')
        .update({
          status: 'failed',
          last_error: message,
          available_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** job.attempts) * 1000).toISOString(),
        })
        .eq('id', job.id);
      out.failed++;
      out.results.push({ id: job.id, status: 'failed', error: message });
    }
  }
  return out;
}
