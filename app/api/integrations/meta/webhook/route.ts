import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  verifyMetaChallenge,
  verifyMetaSignature,
  normalizeMetaValue,
  fetchMetaLead,
  extractLeadgenValues,
  resolveMetaSecrets,
  resolveMetaPages,
  resolveMetaPageToken,
} from '@/lib/integrations/meta';
import { ingestLead, touchIntegration } from '@/lib/integrations/intake';

// Unauthenticated endpoint — Meta calls it directly. Auth is the verify token
// (GET handshake) and the X-Hub-Signature-256 HMAC (POST), plus the service-role
// client for DB writes.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function getMetaIntegration() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('integrations')
    .select('id, secret, config, is_enabled')
    .eq('provider', 'meta')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as
    | { id: string; secret: string | null; config: Record<string, unknown> | null; is_enabled: boolean }
    | null;
}

// Subscription verification handshake.
export async function GET(req: NextRequest) {
  const integration = await getMetaIntegration();
  const challenge = verifyMetaChallenge(
    req.nextUrl.searchParams,
    resolveMetaSecrets(integration).verifyToken
  );
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// Lead delivery.
//
// Contract with Meta: a 2xx means "stored, don't redeliver"; any 5xx means "try
// again". A lead whose answers could not be fetched is therefore answered with
// 500 — never acknowledged and dropped. Redelivery is safe because ingestLead is
// idempotent on the Meta lead ID.
export async function POST(req: NextRequest) {
  // Read the RAW body — required for an exact HMAC signature comparison.
  const rawBody = await req.text();

  const integration = await getMetaIntegration();
  if (!integration || !integration.is_enabled) {
    // Not 2xx: Meta would treat it as delivered and the lead would be lost for good.
    console.error('[meta-leadgen] delivery received but the Meta integration is missing or disabled');
    return NextResponse.json({ error: 'Meta integration not enabled' }, { status: 503 });
  }

  // C1: verify Meta's X-Hub-Signature-256 against the app secret. Reject 401.
  const { appSecret, accessToken } = resolveMetaSecrets(integration);
  const signature = req.headers.get('x-hub-signature-256');
  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    return NextResponse.json(
      { error: 'Invalid or missing signature' },
      { status: 401 }
    );
  }

  let body: Parameters<typeof extractLeadgenValues>[0];
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Pages this integration accepts (empty = no restriction). Each may belong to a contractor and have its own token.
  const pages = new Map(resolveMetaPages(integration.config).map((p) => [p.page_id, p]));
  const values = extractLeadgenValues(body);

  let created = 0;
  let duplicate = 0;
  let errored = 0;
  let skipped = 0;
  let fetchFailures = 0;
  let lastFailure: string | null = null;

  for (const v of values) {
    const pageId = v.page_id ? String(v.page_id) : null;
    // Only import leads from a configured Page. Unknown Pages are skipped (2xx, Meta must not redeliver) but logged.
    if (pages.size > 0 && pageId && !pages.has(pageId)) {
      skipped++;
      await createAdminClient()
        .from('lead_intake_events')
        .insert({
          integration_id: integration.id,
          provider: 'meta',
          platform: 'facebook',
          status: 'skipped',
          external_lead_id: v.leadgen_id ? String(v.leadgen_id) : null,
          form_id: v.form_id ? String(v.form_id) : null,
          page_id: pageId,
          error: 'Page is not configured on this integration — add it on the Meta Lead Ads page to import its leads.',
          raw_payload: v,
        });
      continue;
    }
    if (!v.leadgen_id) {
      skipped++;
      continue;
    }
    const page = pageId ? pages.get(pageId) ?? null : null;

    // Real deliveries carry only IDs — the answers must come from the Graph API, with that Page's own token.
    const fetched = await fetchMetaLead(String(v.leadgen_id), resolveMetaPageToken(pageId, accessToken));
    if (!fetched.ok) {
      fetchFailures++;
      lastFailure = fetched.reason;
      // IDs and a reason only — never the token, never lead data.
      console.error('[meta-leadgen] lead retrieval failed', {
        leadgen_id: v.leadgen_id,
        reason: fetched.reason,
        status: fetched.status,
      });
      // Dead-letter record so the failure is visible in the CRM, not only in server logs.
      await createAdminClient()
        .from('lead_intake_events')
        .insert({
          integration_id: integration.id,
          provider: 'meta',
          platform: 'facebook',
          status: 'error',
          external_lead_id: String(v.leadgen_id),
          form_id: v.form_id ? String(v.form_id) : null,
          page_id: v.page_id ? String(v.page_id) : null,
          error: `Graph lead retrieval failed: ${fetched.reason}`,
          raw_payload: v,
        });
      continue;
    }

    const value = { ...v, ...fetched.lead };
    const result = await ingestLead(normalizeMetaValue(value), {
      integrationId: integration.id,
      provider: 'meta',
      platform: 'facebook',
      rawPayload: value, // includes field_data, so a lead can be replayed from it
      contractorId: page?.contractor_id ?? null,
      senderName: page?.sender_name ?? null,
    });
    if (result.status === 'created') created++;
    else if (result.status === 'duplicate') duplicate++;
    else errored++;
  }

  if (fetchFailures > 0) {
    await touchIntegration(integration.id, {
      error:
        lastFailure === 'auth' || lastFailure === 'missing_token'
          ? 'Meta access token is missing, expired or lacks leads_retrieval — reconnect it.'
          : `Meta lead retrieval failed (${lastFailure}); Meta will redeliver.`,
    });
  }

  const summary = { received: values.length, created, duplicate, errored, skipped, fetchFailures };
  // 5xx for anything not safely stored so Meta redelivers; duplicates are harmless.
  return NextResponse.json(summary, { status: fetchFailures > 0 || errored > 0 ? 500 : 200 });
}
