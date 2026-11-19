import { after, NextResponse } from 'next/server';
import { isProcessRouteToken, videoRecordingEnabled } from '@/lib/video/transcripts/config.server';
import { processPendingRecordings } from '@/lib/video/transcripts/process.server';

/**
 * Internal: finish video call recordings (§51): mark videos ready, or transcribe + summarize audio. Called by HomeQuote itself
 * (kickTranscriptProcessing, after a Stop / egress_ended / room_finished) with a Bearer token derived
 * from LIVEKIT_API_SECRET; also safe to call from a scheduler. Answers 202 at once and does the work
 * after the response, inside this function's own time budget.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!isProcessRouteToken(req.headers.get('authorization'))) return NextResponse.json({ ok: false }, { status: 401 });
  if (!videoRecordingEnabled()) return NextResponse.json({ ok: true, enabled: false });
  after(async () => {
    try {
      const r = await processPendingRecordings(3);
      console.info('[video-transcripts] processed', JSON.stringify(r));
    } catch (e) {
      console.error('[video-transcripts] process run', (e as Error).message);
    }
  });
  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}
