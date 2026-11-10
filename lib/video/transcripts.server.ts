import 'server-only';
import { after } from 'next/server';
import type { WebhookEvent } from 'livekit-server-sdk';
import { siteUrl } from '@/lib/calendar/config';
import { meetingFromRoomName } from './transcripts/consent';
import { applyEgressInfo, clients, liveRecording, pauseCapture, stopCapture, syncCapture } from './transcripts/capture.server';
import { processRouteToken, videoTranscriptsEnabled } from './transcripts/config.server';

/**
 * Phase 3 (§51) entry points for the rest of the app. Everything is a no-op while transcripts are off
 * (VIDEO_TRANSCRIPTS_ENABLED + keys, see transcripts/config.server.ts), so callers need no guard.
 */

export { videoTranscriptsEnabled };

const isRecorderIdentity = (identity: string | undefined, kind: number | undefined) => kind === 2 || !!identity?.startsWith('EG_');

/**
 * Call from the LiveKit webhook (POST /api/video/webhook, Phase 2) for EVERY verified event, after
 * the webhook has recorded it. Never throws: errors are logged, so the webhook can still answer 200.
 * - participant_joined / participant_left: re-check consent (a newcomer pauses capture until they agree)
 * - egress_started / egress_updated / egress_ended: track the audio files; ended -> start processing
 * - room_finished: end the session and start processing
 */
export async function onVideoRoomEvent(event: WebhookEvent): Promise<void> {
  if (!videoTranscriptsEnabled()) return;
  const c = clients();
  if (!c) return;
  try {
    const roomName = event.room?.name || event.egressInfo?.roomName || '';
    switch (event.event) {
      case 'participant_joined':
      case 'participant_left':
      case 'participant_connection_aborted': {
        if (!meetingFromRoomName(roomName) || isRecorderIdentity(event.participant?.identity, event.participant?.kind)) return;
        await syncCapture(c, roomName);
        return;
      }
      case 'egress_started':
      case 'egress_updated':
      case 'egress_ended': {
        if (!event.egressInfo) return;
        const recordingId = await applyEgressInfo(c, event.egressInfo);
        if (recordingId && event.event === 'egress_ended') kickTranscriptProcessing();
        return;
      }
      case 'room_finished': {
        if (!meetingFromRoomName(roomName)) return;
        if (await stopCapture(c, roomName, 'room_finished')) kickTranscriptProcessing();
        return;
      }
      default:
        return;
    }
  } catch (e) {
    console.error('[video-transcripts] webhook event', event.event, (e as Error).message);
  }
}

/**
 * Called by the join actions BEFORE a join pass is minted: a newcomer has not agreed yet, so capture
 * pauses first and only resumes once they do. This is what keeps their voice out of the recording
 * even for the second or two before their browser shows the consent question. Never throws.
 */
export async function pauseCaptureBeforeJoin(roomName: string): Promise<void> {
  if (!videoTranscriptsEnabled()) return;
  const c = clients();
  if (!c) return;
  try {
    const rec = await liveRecording(c.db, roomName);
    if (rec && (rec.state === 'recording' || rec.state === 'starting')) await pauseCapture(c, rec, 'participant_joining');
  } catch (e) {
    console.error('[video-transcripts] pause before join', (e as Error).message);
  }
}

/** Ask the processing route to run (in its own function), after the current response. Never throws. */
export function kickTranscriptProcessing(): void {
  const token = processRouteToken();
  if (!token) return;
  const run = async () => {
    await fetch(`${siteUrl()}/api/video/transcripts/process`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) }).catch(() => undefined);
  };
  try {
    after(run);
  } catch {
    void run(); // outside a request scope (tests, scripts)
  }
}
