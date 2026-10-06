import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FISH_SIGNATURE_HEADER, verifyFishSignature } from '@/lib/ai-calling/signature';
import { dedupeKey } from '@/lib/ai-calling/events';

// Fish Audio -> HomeQuote post-call webhooks (call.ended, call.analyzed,
// phone_call.dial_finished). Every request must carry a valid
// X-Fish-Webhook-Signature for FISH_WEBHOOK_SECRET; unsigned requests are
// rejected before any parsing or database access.
// Docs: https://docs.fish.audio/agents/monitor/webhooks
export const dynamic = 'force-dynamic';

interface FishPayload {
  event?: unknown;
  session?: { id?: unknown; agent_id?: unknown };
  analysis?: { finished_at?: unknown };
}

export async function POST(req: NextRequest) {
  const secret = process.env.FISH_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[ai-calling-webhook] FISH_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  // The MAC covers the exact raw bytes, so read as text and never re-serialize.
  const raw = await req.text();
  if (!verifyFishSignature(raw, req.headers.get(FISH_SIGNATURE_HEADER), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: FishPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const key = dedupeKey(payload);
  // Unknown events: acknowledge so Fish doesn't retry something we don't use.
  if (!key) return NextResponse.json({ received: true, ignored: true });

  const { error } = await createAdminClient().from('ai_call_events').insert({
    dedupe_key: key,
    event: payload.event as string,
    session_id: (payload.session as { id: string }).id,
    agent_id: typeof payload.session?.agent_id === 'string' ? payload.session.agent_id : null,
    payload,
  });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ received: true, duplicate: true });
    // A non-2xx makes Fish retry (3 attempts total).
    console.error('[ai-calling-webhook] insert failed', error.code);
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
