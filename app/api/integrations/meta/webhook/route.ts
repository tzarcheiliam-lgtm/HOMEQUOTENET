import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  verifyMetaChallenge,
  verifyMetaSignature,
  normalizeMetaValue,
  fetchMetaLead,
} from '@/lib/integrations/meta';
import { ingestLead } from '@/lib/integrations/intake';

// Unauthenticated endpoint — Meta calls it directly. Auth is the verify token
// (GET handshake) plus the service-role client for DB writes.
export const dynamic = 'force-dynamic';

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
    | { id: string; secret: string | null; config: any; is_enabled: boolean }
    | null;
}

// Subscription verification handshake.
export async function GET(req: NextRequest) {
  const integration = await getMetaIntegration();
  const challenge = verifyMetaChallenge(
    req.nextUrl.searchParams,
    integration?.secret
  );
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// Lead delivery.
export async function POST(req: NextRequest) {
  // Read the RAW body — required for an exact HMAC signature comparison.
  const rawBody = await req.text();

  const integration = await getMetaIntegration();
  if (!integration || !integration.is_enabled) {
    // Acknowledge so Meta doesn't retry; nothing to do.
    return NextResponse.json({ received: 0, skipped: 'disabled' });
  }

  // C1: verify Meta's X-Hub-Signature-256 against the app secret. Reject 401.
  const appSecret = integration.config?.app_secret as string | undefined;
  const signature = req.headers.get('x-hub-signature-256');
  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    return NextResponse.json(
      { error: 'Invalid or missing signature' },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const token = integration.config?.page_access_token as string | undefined;

  // Extract leadgen values from the webhook envelope.
  const values: any[] = [];
  for (const entry of body?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.value) values.push(change.value);
    }
  }
  if (values.length === 0 && body?.value) values.push(body.value);

  let created = 0;
  let duplicate = 0;
  let errored = 0;

  for (const v of values) {
    let value = v;
    // Real deliveries carry only IDs — fetch field data via Graph if we can.
    if (!v.field_data && v.leadgen_id && token) {
      const fetched = await fetchMetaLead(v.leadgen_id, token);
      if (fetched) value = { ...v, ...fetched };
    }
    const result = await ingestLead(normalizeMetaValue(value), {
      integrationId: integration.id,
      provider: 'meta',
      platform: value.platform ?? 'facebook',
      rawPayload: v,
    });
    if (result.status === 'created') created++;
    else if (result.status === 'duplicate') duplicate++;
    else errored++;
  }

  return NextResponse.json({ received: values.length, created, duplicate, errored });
}
