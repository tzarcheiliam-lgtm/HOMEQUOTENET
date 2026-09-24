import 'server-only';
import { createHmac } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { funnelSchema } from './schema';
import { deliverToGhl, ghlConfigSchema, ghlToken, GhlError } from './ghl';

export function allowedWebhook(raw: unknown): string {
  if (typeof raw !== 'string') throw new Error('Webhook URL missing');
  const url = new URL(raw);
  const allowed = (process.env.FUNNEL_WEBHOOK_HOSTS ?? 'services.leadconnectorhq.com').split(',').map(h => h.trim());
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !allowed.includes(url.hostname)) throw new Error('Webhook host is not allowed');
  return url.toString();
}
/** At-least-once delivery; receivers must deduplicate X-HomeQuote-Event-Id. */
export async function deliverPendingFunnels() {
  const db = createAdminClient();
  const { data: jobs, error } = await db.rpc('claim_funnel_deliveries');
  if (error) throw new Error('Could not claim deliveries');
  let sent = 0; let failed = 0; let skipped = 0;
  await Promise.all((jobs ?? []).map(async (job: { id: string; integration_id: string; session_id: string; attempts: number }) => {
    try {
      const { data: integration } = await db.from('integrations').select('config,secret,is_enabled').eq('id', job.integration_id).single();
      if (!integration?.is_enabled) throw new Error('Integration disabled');
      const { data: session, error: sessionError } = await db.from('funnel_sessions').select('id,funnel_id,lead_id,answers,contact,attribution,qualified,contact_submitted_at,config_snapshot').eq('id', job.session_id).single();
      if (sessionError || !session?.contact) throw new Error('Submitted session missing');
      if (integration.config?.api === 'ghl-v2') {
        const parsed = ghlConfigSchema.safeParse(integration.config);
        if (!parsed.success) throw new GhlError(`configuration (${parsed.error.issues[0].path.join('.')} invalid)`);
        const ghl = parsed.data;
        const result = await deliverToGhl(ghl, ghlToken(ghl, integration.secret), {
          sessionId: session.id, leadId: session.lead_id, contact: session.contact, answers: session.answers,
          attribution: session.attribution, qualified: session.qualified, config: funnelSchema.parse(session.config_snapshot),
        });
        const { error: finishError } = await db.from('funnel_deliveries').update(result.status === 'sent'
          ? { status: 'sent', sent_at: new Date().toISOString(), last_error: null, external_contact_id: result.contactId, external_opportunity_id: result.opportunityId }
          : { status: 'skipped', last_error: 'Not sent: lead did not qualify (onlyQualified)' }).eq('id', job.id);
        if (finishError) throw finishError;
        if (result.status === 'sent') sent++; else skipped++;
        await db.from('integrations').update({ last_activity_at: new Date().toISOString(), health: 'healthy', last_error: null }).eq('id', job.integration_id);
        return;
      }
      if (!integration.secret) throw new Error('Integration secret missing');
      const url = allowedWebhook(integration.config.funnelWebhookUrl);
      const { data: funnel } = await db.from('funnels').select('slug,contractor_id').eq('id', session.funnel_id).single();
      const payload = JSON.stringify({ event: 'contact_submitted', eventId: job.id, sessionId: session.id, clientId: funnel?.contractor_id, funnel: funnel?.slug,
        leadId: session.lead_id, contact: session.contact, answers: session.answers, attribution: session.attribution, qualified: session.qualified, timestamp: session.contact_submitted_at });
      const res = await fetch(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', 'X-HomeQuote-Event-Id': job.id,
          'X-HomeQuote-Signature': createHmac('sha256', integration.secret).update(payload).digest('hex') }, body: payload });
      if (!res.ok) throw new Error(`CRM returned HTTP ${res.status}`);
      const { error: finishError } = await db.from('funnel_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('id', job.id);
      if (finishError) throw finishError;
      sent++;
    } catch (error) {
      failed++;
      // GhlError messages carry only the step and HTTP status. Other errors may
      // include provider responses/URLs, so they are replaced with a generic message.
      const message = error instanceof GhlError ? error.message : 'Delivery failed. Check integration settings and retry.';
      console.error(`[funnel-delivery] ${job.id} attempt ${job.attempts}: ${message}`);
      // The lead is already saved in HomeQuote; this job stays queued for retry.
      await db.from('funnel_deliveries').update({ status: 'failed', last_error: message,
        available_at: new Date(Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000).toISOString() }).eq('id', job.id);
      await db.from('integrations').update({ health: 'error', last_error: message }).eq('id', job.integration_id);
    }
  }));
  return { sent, failed, skipped };
}
