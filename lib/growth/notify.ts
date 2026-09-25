import 'server-only';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGmailMessage } from '@/lib/emails/gmail';
import { leadAlertRecipients } from '@/lib/leads/notify';
import { getService } from '@/lib/growth/catalog';
import { buildServiceRequestAlert, serviceRequestsUrl } from '@/lib/growth/request-email';

type Sender = typeof sendGmailMessage;

/**
 * Email the internal HQN team (LEAD_ALERT_EMAILS, the same people who get new
 * lead alerts) about one service request. Best effort: the request is already
 * saved and visible on /app/service-requests, so a failed email is logged, not
 * retried, and never shown to the contractor. Never emails the contractor.
 */
export async function sendServiceRequestAlert(
  requestId: string,
  opts: { send?: Sender; db?: ReturnType<typeof createAdminClient> } = {}
): Promise<{ sent: boolean; error?: string }> {
  try {
    const db = opts.db ?? createAdminClient();
    const { data, error } = await db
      .from('service_requests')
      .select(
        `service, notes, created_at, contractor:contractors(name),
         requester:profiles!service_requests_requested_by_fkey(full_name, email, phone)`
      )
      .eq('id', requestId)
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'Request not found');
    const row = data as unknown as {
      service: string;
      notes: string | null;
      created_at: string;
      contractor: { name: string } | null;
      requester: { full_name: string | null; email: string | null; phone: string | null } | null;
    };
    const built = buildServiceRequestAlert(
      {
        companyName: row.contractor?.name ?? 'Unknown company',
        serviceName: getService(row.service)?.name ?? row.service,
        requesterName: row.requester?.full_name ?? null,
        requesterEmail: row.requester?.email ?? null,
        requesterPhone: row.requester?.phone ?? null,
        notes: row.notes,
        submittedAt: row.created_at,
      },
      serviceRequestsUrl()
    );
    const send = opts.send ?? ((input) => sendGmailMessage(input));
    await send({ toEmail: leadAlertRecipients().join(', '), subject: built.subject, message: built.text, html: built.html, text: built.text });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.error('[service-request-email] Alert not sent; the request is saved and visible to admins', message);
    return { sent: false, error: message };
  }
}

/** Send after the response so the contractor's confirmation isn't delayed. */
export function sendServiceRequestAlertSoon(requestId: string): void {
  try {
    after(() => sendServiceRequestAlert(requestId).then(() => undefined));
  } catch {
    /* Not inside a request (tests/scripts): skip; the admin page still lists it. */
  }
}
