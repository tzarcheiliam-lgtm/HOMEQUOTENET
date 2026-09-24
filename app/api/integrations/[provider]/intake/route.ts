import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ingestPayload } from '@/lib/integrations/intake';
import { getConnector } from '@/lib/integrations/connectors';
import { checkIntakeAuth } from '@/lib/integrations/auth';

// Generic intake endpoint for non-Meta sources (Website Forms, Zapier, Public
// API). Demonstrates how every future connector reuses the same pipeline:
//   POST /api/integrations/{provider}/intake  with a JSON lead body.
//
// If the integration has a `secret` set, callers must send it as
// `Authorization: Bearer <secret>` (recommended for public endpoints).
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!getConnector(provider)) {
    return NextResponse.json(
      { error: `Unknown provider "${provider}"` },
      { status: 404 }
    );
  }

  const admin = createAdminClient();
  const { data: integration } = await admin
    .from('integrations')
    .select('id, secret, is_enabled')
    .eq('provider', provider)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!integration || !integration.is_enabled) {
    return NextResponse.json(
      { error: 'Integration is disabled' },
      { status: 403 }
    );
  }

  // C3: a configured API key is REQUIRED for generic providers.
  const auth = checkIntakeAuth(
    integration.secret,
    req.headers.get('authorization')
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const results = await ingestPayload(provider, body, integration.id);
  return NextResponse.json({ results });
}
