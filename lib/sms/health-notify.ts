import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendGmailMessage } from '@/lib/emails/gmail';
import { leadAlertRecipients } from '@/lib/leads/notify';
import { sendPushNotification } from '@/lib/notifications/service';
import type { Alert } from './health';

/** Push (HomeQuote app) to every active admin and email the lead-alert recipients. Each channel is best effort. */
export async function notifyAdmins(alert: Alert): Promise<void> {
  const db = createAdminClient();
  const { data } = await db.from('profiles').select('id').eq('role', 'admin').eq('is_active', true);
  const ids = (data ?? []).map((p: { id: string }) => p.id);
  await sendPushNotification({ userIds: ids, type: 'workflow_alert', title: alert.title, body: alert.body, url: alert.url, db }).catch(() => undefined);
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
  const text = `${alert.body}\n\n${site}${alert.url}`;
  const html = `<p>${alert.body.replace(/</g, '&lt;')}</p><p><a href="${site}${alert.url}">${(alert.linkLabel ?? 'Open Texting').replace(/</g, '&lt;')}</a></p>`;
  await Promise.all(leadAlertRecipients().map((toEmail) =>
    sendGmailMessage({ toEmail, subject: alert.title, message: text, html, text }).catch(() => undefined)));
}
