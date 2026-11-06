import { NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { livekitConfig } from '@/lib/video/livekit.server';
import { handleVideoEvent } from '@/lib/video/events.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * LiveKit Cloud webhook (§52): room started / finished, participant joined /
 * left. Set in LiveKit Cloud → Settings → Webhooks, pointing at
 * https://<site>/api/video/webhook, signed with this project's API key. The
 * signature (a JWT over the body's sha256, in Authorization) is verified with
 * LIVEKIT_API_KEY / LIVEKIT_API_SECRET; anything unsigned is refused.
 */
export async function POST(request: Request) {
  const cfg = livekitConfig();
  if (!cfg) return NextResponse.json({ error: 'Video calls are not configured' }, { status: 503 });
  const body = await request.text();
  const auth = request.headers.get('authorization') ?? request.headers.get('authorize') ?? '';
  let ev;
  try {
    ev = await new WebhookReceiver(cfg.apiKey, cfg.apiSecret).receive(body, auth);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  try {
    const result = await handleVideoEvent({
      id: ev.id,
      event: ev.event,
      createdAt: ev.createdAt,
      room: ev.room ? { sid: ev.room.sid, name: ev.room.name, creationTime: ev.room.creationTime } : null,
      participant: ev.participant ? { sid: ev.participant.sid, identity: ev.participant.identity, name: ev.participant.name, kind: ev.participant.kind } : null,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[video] webhook failed:', e instanceof Error ? e.message : e);
    // 5xx so LiveKit retries; handling is idempotent.
    return NextResponse.json({ error: 'Could not record the event' }, { status: 500 });
  }
}
