import 'server-only';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGmailMessage } from '@/lib/emails/gmail';
import { leadAlertRecipients } from '@/lib/leads/notify';
import { REQUEST_SOURCE_LABELS, getService, type RequestSource } from '@/lib/growth/catalog';
import { buildServiceRequestAlert, contractorAccountUrl, serviceRequestsUrl } from '@/lib/growth/request-email';

type Sender = (input: { toEmail: string; subject: string; message: string; html: string; text?: string }) => Promise<unknown>;
type Db = ReturnType<typeof createAdminClient>;

/** A 'sending' claim older than this is treated as a crashed attempt. */
const CLAIM_LEASE_MS = 5 * 60 * 1000;

/**
 * Who hears about upsell requests. Server-only:
 * UPSELL_REQUEST_NOTIFICATION_EMAIL (comma separated) when set, otherwise the
 * existing HQN team alert list (LEAD_ALERT_EMAILS, which defaults to Liam and Nadav).
 */
export function upsellRequestRecipients(env: NodeJS.ProcessEnv = process.env): string[] {
  return leadAlertRecipients(
    env.UPSELL_REQUEST_NOTIFICATION_EMAIL?.trim() || env.LEAD_ALERT_EMAILS?.trim() || undefined
  );
}

export type AlertResult = { sent: true; already?: boolean } | { sent: false; error: string };

/**
 * Email the HQN team about one request and record the outcome on the request
 * (notification_status / attempts / error / notified_at). The request itself is
 * never touched otherwise, so an email failure can't lose it; admins see the
 * failure on /app/service-requests and can retry. Never emails the contractor.
 */
export async function sendServiceRequestAlert(
  requestId: string,
  opts: { send?: Sender; db?: Db; siteUrl?: string; now?: () => Date } = {}
): Promise<AlertResult> {
  const now = opts.now ?? (() => new Date());
  let db: Db;
  try {
    db = opts.db ?? createAdminClient();
  } catch (error) {
    return fail(error);
  }
  try {
    const { data, error } = await db
      .from('service_requests')
      .select(
        `id, contractor_id, service, notes, source, created_at, notification_status, notification_attempts,
         notification_claimed_at, contractor:contractors(name),
         requester:profiles!service_requests_requested_by_fkey(full_name, email)`
      )
      .eq('id', requestId)
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'Request not found');
    const row = data as unknown as {
      id: string;
      contractor_id: string;
      service: string;
      notes: string | null;
      source: RequestSource | null;
      created_at: string;
      notification_status: 'pending' | 'sending' | 'sent' | 'failed';
      notification_attempts: number;
      notification_claimed_at: string | null;
      contractor: { name: string } | null;
      requester: { full_name: string | null; email: string | null } | null;
    };

    if (row.notification_status === 'sent') return { sent: true, already: true };
    const leaseActive =
      row.notification_status === 'sending' &&
      row.notification_claimed_at &&
      now().getTime() - new Date(row.notification_claimed_at).getTime() < CLAIM_LEASE_MS;
    if (leaseActive) return { sent: false, error: 'Another send is already in progress' };

    // Claim it: only one sender wins, so a retry can't double-send.
    const { data: claimed, error: claimError } = await db
      .from('service_requests')
      .update({
        notification_status: 'sending',
        notification_attempts: row.notification_attempts + 1,
        notification_claimed_at: now().toISOString(),
      })
      .eq('id', row.id)
      .eq('notification_status', row.notification_status)
      .eq('notification_attempts', row.notification_attempts)
      .select('id');
    if (claimError) throw new Error(claimError.message);
    if (!claimed?.length) return { sent: false, error: 'Another send is already in progress' };

    try {
      const built = buildServiceRequestAlert(
        {
          contractorName: row.contractor?.name ?? 'Unknown contractor',
          contractorId: row.contractor_id,
          serviceName: getService(row.service)?.name ?? row.service,
          requesterName: row.requester?.full_name ?? null,
          requesterEmail: row.requester?.email ?? null,
          notes: row.notes,
          submittedAt: row.created_at,
          sourceLabel: row.source ? REQUEST_SOURCE_LABELS[row.source] ?? null : null,
        },
        { contractorUrl: contractorAccountUrl(row.contractor_id, opts.siteUrl), reviewUrl: serviceRequestsUrl(opts.siteUrl) }
      );
      const send = opts.send ?? ((input) => sendGmailMessage(input));
      await send({
        toEmail: upsellRequestRecipients().join(', '),
        subject: built.subject,
        message: built.text,
        html: built.html,
        text: built.text,
      });
    } catch (sendError) {
      const message = cleanError(sendError);
      await db
        .from('service_requests')
        .update({ notification_status: 'failed', notification_error: message, notification_claimed_at: null })
        .eq('id', row.id);
      return fail(sendError);
    }

    // Gmail accepted it. A failed bookkeeping write is logged, never re-sent from here.
    const { error: finishError } = await db
      .from('service_requests')
      .update({ notification_status: 'sent', notified_at: now().toISOString(), notification_error: null, notification_claimed_at: null })
      .eq('id', row.id);
    if (finishError) console.error('[upsell-email] Sent, but the status could not be saved', finishError.message);
    return { sent: true };
  } catch (error) {
    return fail(error);
  }
}

function cleanError(error: unknown): string {
  return (error instanceof Error ? error.message : 'Unknown error').replace(/\s+/g, ' ').slice(0, 500);
}

function fail(error: unknown): AlertResult {
  const message = cleanError(error);
  console.error('[upsell-email] Alert not sent; the request is saved and visible to admins', message);
  return { sent: false, error: message };
}

/** Send after the response so the contractor's confirmation isn't delayed. */
export function sendServiceRequestAlertSoon(requestId: string): void {
  try {
    after(() => sendServiceRequestAlert(requestId).then(() => undefined));
  } catch {
    /* Not inside a request: it stays 'pending' and admins can send it from the review page. */
  }
}
