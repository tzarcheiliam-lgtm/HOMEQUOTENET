import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeEmail, normalizePhone } from '@/lib/leads/normalize';
import { getConnector } from './connectors';
import { sendLeadEmailsSoon } from '@/lib/leads/notify';
import type { IntakeContext, IntakeResult, NormalizedLead } from './types';

function splitName(full: string | null | undefined): {
  first: string | null;
  last: string | null;
} {
  const s = (full ?? '').trim();
  if (!s) return { first: null, last: null };
  const parts = s.split(/\s+/);
  return { first: parts[0], last: parts.slice(1).join(' ') || null };
}

/**
 * The single intake pipeline every source flows through:
 *   normalize → duplicate detection → attribution → lead creation → log.
 * Runs with the service-role client (unauthenticated webhooks / system).
 */
export async function ingestLead(
  normalized: NormalizedLead,
  ctx: IntakeContext
): Promise<IntakeResult> {
  const admin = createAdminClient();

  // Normalized for matching (mirrors the DB columns); raw kept for display.
  const emailNorm = normalizeEmail(normalized.email);
  const phoneNorm = normalizePhone(normalized.phone);
  const email = normalized.email ?? null;
  const phone = normalized.phone ?? null;

  const eventBase = {
    integration_id: ctx.integrationId,
    provider: ctx.provider,
    platform: normalized.platform ?? ctx.platform ?? null,
    external_lead_id: normalized.external_lead_id ?? null,
    full_name: normalized.full_name ?? null,
    phone,
    email,
    campaign: normalized.campaign ?? null,
    campaign_id: normalized.campaign_id ?? null,
    ad_set: normalized.ad_set ?? null,
    ad_set_id: normalized.ad_set_id ?? null,
    ad: normalized.ad ?? null,
    ad_id: normalized.ad_id ?? null,
    form: normalized.form ?? null,
    form_id: normalized.form_id ?? null,
    normalized: normalized as unknown as Record<string, unknown>,
    raw_payload: (ctx.rawPayload ?? {}) as Record<string, unknown>,
  };

  // ---- 1. Duplicate detection (by normalized email or phone) ---------------
  let duplicateOf: string | null = null;
  if (emailNorm || phoneNorm) {
    const ors: string[] = [];
    if (emailNorm) ors.push(`email_normalized.eq.${emailNorm}`);
    if (phoneNorm) ors.push(`phone_e164.eq.${phoneNorm}`);
    const { data: existing } = await admin
      .from('leads')
      .select('id')
      .or(ors.join(','))
      .is('archived_at', null)
      .limit(1);
    if (existing && existing.length > 0) duplicateOf = existing[0].id;
  }

  if (duplicateOf) {
    // Preserve original attribution — do NOT overwrite the existing lead.
    await admin.from('lead_activities').insert({
      lead_id: duplicateOf,
      type: 'system',
      body: `Duplicate lead received via ${ctx.provider} (not created)`,
      metadata: { provider: ctx.provider, external_lead_id: normalized.external_lead_id },
    });
    const { data: ev } = await admin
      .from('lead_intake_events')
      .insert({ ...eventBase, status: 'duplicate', duplicate_of: duplicateOf })
      .select('id')
      .single();
    await touchIntegration(ctx.integrationId, { activity: true });
    // The intake row queued the internal new-lead alert (migration 0016).
    sendLeadEmailsSoon();
    return { status: 'duplicate', duplicateOf, intakeEventId: ev?.id };
  }

  // ---- 2. Attribution + lead creation --------------------------------------
  const { first, last } = splitName(normalized.full_name);
  const { data: lead, error } = await admin
    .from('leads')
    .insert({
      status: 'new',
      first_name: first,
      last_name: last,
      email,
      phone,
      address: normalized.address ?? null,
      city: normalized.city ?? null,
      state: normalized.state ?? null,
      zip: normalized.zip ?? null,
      source: normalized.source ?? ctx.provider,
      platform: normalized.platform ?? ctx.platform ?? null,
      campaign: normalized.campaign ?? null,
      campaign_id: normalized.campaign_id ?? null,
      ad_set: normalized.ad_set ?? null,
      ad_set_id: normalized.ad_set_id ?? null,
      ad_name: normalized.ad ?? null,
      ad_id: normalized.ad_id ?? null,
      form_name: normalized.form ?? null,
      form_id: normalized.form_id ?? null,
      external_lead_id: normalized.external_lead_id ?? null,
      integration_id: ctx.integrationId,
      // TCPA consent captured at intake (H4)
      consent_granted: normalized.consent_granted ?? false,
      consent_at: normalized.consent_granted ? new Date().toISOString() : null,
      consent_source: normalized.consent_source ?? ctx.provider,
      consent_disclosure: normalized.consent_disclosure ?? null,
    })
    .select('id')
    .single();

  if (error || !lead) {
    const { data: ev } = await admin
      .from('lead_intake_events')
      .insert({ ...eventBase, status: 'error', error: error?.message ?? 'Insert failed' })
      .select('id')
      .single();
    await touchIntegration(ctx.integrationId, { error: error?.message });
    return { status: 'error', error: error?.message, intakeEventId: ev?.id };
  }

  await admin.from('lead_activities').insert({
    lead_id: lead.id,
    type: 'system',
    body: `Lead captured via ${ctx.provider} intake`,
    metadata: { provider: ctx.provider, platform: eventBase.platform },
  });

  const { data: ev } = await admin
    .from('lead_intake_events')
    .insert({ ...eventBase, status: 'created', lead_id: lead.id })
    .select('id')
    .single();

  await touchIntegration(ctx.integrationId, { sync: true });
  sendLeadEmailsSoon();
  return { status: 'created', leadId: lead.id, intakeEventId: ev?.id };
}

async function touchIntegration(
  id: string | null,
  opts: { sync?: boolean; activity?: boolean; error?: string }
) {
  if (!id) return;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { last_activity_at: now };
  if (opts.sync) {
    update.last_sync_at = now;
    update.status = 'connected';
    update.health = 'healthy';
    update.last_error = null;
  }
  if (opts.error) {
    update.health = 'error';
    update.last_error = opts.error;
  }
  await admin.from('integrations').update(update).eq('id', id);
}

/**
 * Convenience used by the webhook and the simulator: run a raw provider payload
 * through its connector and then the pipeline. Returns one result per lead.
 */
export async function ingestPayload(
  provider: string,
  payload: unknown,
  integrationId: string | null
): Promise<IntakeResult[]> {
  const connector = getConnector(provider);
  if (!connector) {
    return [{ status: 'error', error: `No connector for provider "${provider}"` }];
  }
  const leads = connector.normalize(payload);
  const results: IntakeResult[] = [];
  for (const normalized of leads) {
    results.push(
      await ingestLead(normalized, {
        integrationId,
        provider,
        platform: normalized.platform,
        rawPayload: payload,
      })
    );
  }
  return results;
}
