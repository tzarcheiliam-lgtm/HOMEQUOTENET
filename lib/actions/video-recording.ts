'use server';

import { revalidatePath } from 'next/cache';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { cleanDisplayName, isUuid } from '@/lib/video/links';
import { purgeRecording } from '@/lib/video/recordings/retention.server';
import { meetingForHost, windowFor } from '@/lib/video/rooms.server';
import { kickTranscriptProcessing } from '@/lib/video/transcripts.server';
import { clients, requestCapture, stopCapture, syncCapture } from '@/lib/video/transcripts/capture.server';
import { meetingFromRoomName, roomStateFor, type RecordingMode, type RoomRecState } from '@/lib/video/transcripts/consent';

/**
 * Server actions behind components/video/recording-consent.tsx (§51). The browser only ever names the
 * ROOM; every decision re-reads LiveKit's participant list on the server, so nothing a browser sends
 * can start capture. Each participant's consent is their own LiveKit attribute (only their browser
 * can set it). All of this is off (enabled: false) until recording is configured.
 */

export type RecordingAvailability = { enabled: false } | { enabled: true; canRequest: boolean; mode: RecordingMode; retentionDays: number };
export type RecordingActionResult = { ok: true; id?: string; state?: RoomRecState; missing?: string[]; waitingForJoin?: boolean } | { ok: false; error: string };

const OFF: RecordingActionResult = { ok: false, error: 'Recording is not available.' };

/** Is recording available in this room, and may the current user ask for it (a signed-in host who can see the meeting)? */
export async function recordingAvailability(roomName: string): Promise<RecordingAvailability> {
  const ref = meetingFromRoomName(roomName);
  const c = clients();
  if (!ref || !c) return { enabled: false };
  const base = { enabled: true as const, mode: c.cfg.mode, retentionDays: c.cfg.retentionDays };
  const me = await getProfile().catch(() => null);
  if (!me?.is_active) return { ...base, canRequest: false };
  const m = await meetingForHost(ref.kind, ref.id);
  return { ...base, canRequest: !!m && m.videoRoom };
}

/** Host only: ask everyone in the call to agree to recording. Starts nothing by itself. */
export async function requestRecording(roomName: string): Promise<RecordingActionResult> {
  const ref = meetingFromRoomName(roomName);
  const c = clients();
  if (!ref || !c) return OFF;
  const me = await getProfile().catch(() => null);
  if (!me?.is_active) return { ok: false, error: 'Sign in to record this call.' };
  const m = await meetingForHost(ref.kind, ref.id);
  if (!m || !m.videoRoom) return { ok: false, error: 'You cannot record this call.' };
  if (windowFor(m, 'host').state !== 'open') return { ok: false, error: 'This call is not open.' };
  // The requester must actually be in the call (host identity is stable: host-<profile id>, lib/actions/video.ts).
  const inRoom = await c.rooms.getParticipant(roomName, `host-${me.id}`).then(() => true, () => false);
  if (!inRoom) return { ok: false, error: 'Join the call first.' };
  const rec = await requestCapture(c, m, { id: me.id, name: cleanDisplayName(me.full_name?.split(/\s+/)[0], 'HomeQuote') });
  return rec ? { ok: true, id: rec.id, state: roomStateFor(rec.state) } : { ok: false, error: 'Could not start the request. Try again.' };
}

/** Anyone in the call: re-check consent now (after agreeing, or when people come and go). */
export async function syncRecording(roomName: string): Promise<RecordingActionResult> {
  const c = clients();
  if (!meetingFromRoomName(roomName) || !c) return OFF;
  const r = await syncCapture(c, roomName);
  return { ok: true, state: r.state === 'none' ? 'off' : roomStateFor(r.state), missing: r.missing, waitingForJoin: r.waitingForJoin };
}

/** Anyone in the call: stop recording (or decline before it starts). Stopping is always allowed. */
export async function stopRecording(roomName: string, identity: string, reason: 'stopped' | 'declined'): Promise<RecordingActionResult> {
  const c = clients();
  if (!meetingFromRoomName(roomName) || !c || typeof identity !== 'string' || identity.length > 120) return OFF;
  // Only someone who is in the room right now (LiveKit says so) can stop it.
  const inRoom = await c.rooms.getParticipant(roomName, identity).then(() => true, () => false);
  if (!inRoom) return { ok: false, error: 'You are not in this call.' };
  const done = await stopCapture(c, roomName, reason === 'declined' ? 'declined' : 'stopped');
  if (done?.state === 'stopped') kickTranscriptProcessing();
  return { ok: true, state: 'off' };
}

/**
 * Delete a recording's files now, before the automatic deletion (§51). Admins and the person who
 * started it (the same people RLS lets read it); the row stays as a record that it existed.
 */
export async function deleteRecordingNow(formData: FormData): Promise<void> {
  const id = formData.get('id');
  const me = await getProfile().catch(() => null);
  const c = clients();
  if (!me?.is_active || !c || !isUuid(id)) return;
  const db = await createClient();
  const { data } = await db.from('video_recordings').select('id, state').eq('id', id).maybeSingle();
  const row = data as { id: string; state: string } | null;
  if (!row || !['done', 'failed'].includes(row.state)) return;
  await purgeRecording(c, row.id);
  revalidatePath('/app/recordings');
  revalidatePath(`/app/recordings/${row.id}`);
}
