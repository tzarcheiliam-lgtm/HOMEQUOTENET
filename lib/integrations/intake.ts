import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeEmail, normalizePhone } from '@/lib/leads/normalize';
import { getConnector } from './connectors';
import { sendLeadEmailsSoon } from '@/lib/leads/notify';
import { flushNotificationsSoon } from '@/lib/notifications/outbox';
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

type Candidate = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_normalized: string | null;
  phone_e164: string | null;
};

const nameKey = (v: string | null | undefined) => (v ?? '').trim().toLowerCase();

/** First names must agree; last names must agree when both are present. */
function namesCompatible(c: Candidate, first: string | null, last: string | null): boolean {
  if (!nameKey(first) || !nameKey(c.first_name)) return false;
  if (nameKey(first) !== nameKey(c.first_name)) return false;
  return !nameKey(last) || !nameKey(c.last_name) || nameKey(last) === nameKey(c.last_name);
}

/**
 * Conservative contact matching. A new inquiry is only treated as the same lead when
 * it matches on BOTH email and phone, or on one of them with a compatible name. A bare
 * shared phone/email with a different name (a spouse, a family line, a typo) creates a
 * new lead that is flagged for review instead of being merged or discarded.
 * Lookups use parameterised .eq() filters — contact values never enter a filter string.
 */
export async function findContactMatch(
  admin: ReturnType<typeof createAdminClient>,
  emailNorm: string | null,
  phoneNorm: string | null,
  first: string | null,
  last: string | null
): Promise<{ kind: 'match' | 'possible'; id: string } | null> {
  const select = 'id, first_name, last_name, email_normalized, phone_e164';
  const found = new Map<string, Candidate>();
  for (const [column, value] of [['email_normalized', emailNorm], ['phone_e164', phoneNorm]] as const) {
    if (!value) continue;
    const { data } = await admin.from('leads').select(select).eq(column, value).is('archived_at', null).limit(5);
    for (const row of (data ?? []) as Candidate[]) found.set(row.id, row);
  }
  let possible: string | null = null;
  for (const c of found.values()) {
    const both = !!emailNorm && !!phoneNorm && c.email_normalized === emailNorm && c.phone_e164 === phoneNorm;
    if (both || namesCompatible(c, first, last)) return { kind: 'match', id: c.id };
    possible ??= c.id;
  }
  return possible ? { kind: 'possible', id: possible } : null;
}

async function findByExternalId(
  admin: ReturnType<typeof createAdminClient>,
  integrationId: string | null,
  externalId: string | null | undefined
): Promise<string | null> {
  if (!integrationId || !externalId) return null;
  const { data } = await admin
    .from('leads')
    .select('id')
    .eq('integration_id', integrationId)
    .eq('external_lead_id', externalId)
    .limit(1);
  if (data?.[0]?.id) return data[0].id;
  // Delivery that matched an existing lead never created a row of its own, but was logged.
  const { data: ev } = await admin
    .from('lead_intake_events')
    .select('lead_id, duplicate_of')
    .eq('integration_id', integrationId)
    .eq('external_lead_id', externalId)
    .in('status', ['created', 'duplicate'])
    .limit(1);
  return ev?.[0]?.lead_id ?? ev?.[0]?.duplicate_of ?? null;
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
    page_id: normalized.page_id ?? null,
    normalized: normalized as unknown as Record<string, unknown>,
    raw_payload: (ctx.rawPayload ?? {}) as Record<string, unknown>,
  };

  const { first, last } = splitName(normalized.full_name);

  // ---- 0. Idempotency: the same Meta lead delivered again (webhook retry) --------
  const already = await findByExternalId(admin, ctx.integrationId, normalized.external_lead_id);
  if (already) return { status: 'duplicate', duplicateOf: already, redelivery: true };

  // ---- 1. Contact matching (conservative) ----------------------------------------
  let duplicateOf: string | null = null;
  let possibleDuplicateOf: string | null = null;
  if (emailNorm || phoneNorm) {
    const m = await findContactMatch(admin, emailNorm, phoneNorm, first, last);
    if (m?.kind === 'match') duplicateOf = m.id;
    else if (m) possibleDuplicateOf = m.id;
  }

  if (duplicateOf) {
    // Preserve original attribution — do NOT overwrite the existing lead.
    await admin.from('lead_activities').insert({
      lead_id: duplicateOf,
      type: 'system',
      body: `Duplicate lead received via ${ctx.provider} (not created)`,
      metadata: {
        provider: ctx.provider,
        external_lead_id: normalized.external_lead_id,
        form_id: normalized.form_id,
        timeline: normalized.timeline,
        budget_range: normalized.budget_range,
        project_description: normalized.project_description,
        answers: normalized.answers,
      },
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
      page_id: normalized.page_id ?? null,
      timeline: normalized.timeline ?? null,
      budget_range: normalized.budget_range ?? null,
      project_description: normalized.project_description ?? null,
      answers: normalized.answers ?? null,
      integration_id: ctx.integrationId,
      // TCPA consent captured at intake (H4)
      consent_granted: normalized.consent_granted ?? false,
      consent_at: normalized.consent_granted ? new Date().toISOString() : null,
      consent_source: normalized.consent_source ?? ctx.provider,
      consent_disclosure: normalized.consent_disclosure ?? null,
    })
    .select('id')
    .single();

  if (error?.code === '23505') {
    // A concurrent delivery of the same Meta lead won the race (uq_leads_meta_external).
    const existing = await findByExternalId(admin, ctx.integrationId, normalized.external_lead_id);
    if (existing) return { status: 'duplicate', duplicateOf: existing, redelivery: true };
  }

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
    body: possibleDuplicateOf
      ? `Lead captured via ${ctx.provider} intake. Shares an email or phone with an existing lead under a different name — review for a possible duplicate.`
      : `Lead captured via ${ctx.provider} intake`,
    metadata: { provider: ctx.provider, platform: eventBase.platform, possible_duplicate_of: possibleDuplicateOf },
  });

  const { data: ev } = await admin
    .from('lead_intake_events')
    .insert({ ...eventBase, status: 'created', lead_id: lead.id })
    .select('id')
    .single();

  await touchIntegration(ctx.integrationId, { sync: true });
  sendLeadEmailsSoon();
  flushNotificationsSoon();
  return {
    status: 'created',
    leadId: lead.id,
    intakeEventId: ev?.id,
    ...(possibleDuplicateOf ? { possibleDuplicateOf } : {}),
  };
}

export async function touchIntegration(
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
