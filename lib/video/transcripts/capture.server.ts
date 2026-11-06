import 'server-only';
import {
  AudioCodec,
  EgressClient,
  EgressStatus,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptions,
  RoomServiceClient,
  S3Upload,
  type EgressInfo,
  type ParticipantInfo,
} from 'livekit-server-sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import type { VideoMeeting } from '@/lib/video/rooms.server';
import { transcriptsConfig, type TranscriptsConfig } from './config.server';
import {
  CONSENT_VERSION,
  LIVE_STATES,
  REC_ATTR,
  captureDecision,
  nextRecordingState,
  roomStateFor,
  segmentPath,
  shouldRotate,
  withRoomRec,
  type CallParticipant,
  type RecordingState,
} from './consent';

/**
 * Capture: LiveKit Egress (room-composite, AUDIO ONLY, Ogg/Opus at 32 kbps) uploaded to the private
 * Supabase Storage bucket through its S3 endpoint. One egress per uninterrupted stretch of consent;
 * a pause ends the file and a resume starts the next one (video_recording_segments).
 *
 * Every start is decided from LiveKit's own participant list at that moment (captureDecision), never
 * from what a browser says, and claimed with a conditional UPDATE so two racing callers cannot start
 * two recorders.
 */

export interface RecordingRow {
  id: string;
  meeting_kind: VideoMeeting['kind'];
  meeting_id: string;
  room_name: string;
  state: RecordingState;
  requested_by: string | null;
  requested_by_name: string | null;
  prospect_id: string | null;
  lead_id: string | null;
  meeting_context: { guestName?: string; subject?: string | null; startMs?: number; timeZone?: string; hostLabel?: string } | null;
  capture_started_at: string | null;
}

export interface SegmentRow {
  id: string;
  recording_id: string;
  seq: number;
  egress_id: string | null;
  storage_path: string;
  status: 'starting' | 'active' | 'complete' | 'failed';
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

const REC_COLS = 'id, meeting_kind, meeting_id, room_name, state, requested_by, requested_by_name, prospect_id, lead_id, meeting_context, capture_started_at';
const SEG_COLS = 'id, recording_id, seq, egress_id, storage_path, status, started_at, ended_at, duration_seconds';
/** Give up re-starting a recorder after this many failed starts in one session (bad keys, quota). */
const MAX_FAILED_SEGMENTS = 3;
/** Speech is fine at 32 kbps Opus: ~14 MB an hour, well under the speech-to-text upload limit. */
const AUDIO_BITRATE_KBPS = 32;

export interface Clients {
  cfg: TranscriptsConfig;
  db: SupabaseClient;
  rooms: RoomServiceClient;
  egress: EgressClient;
}

export function clients(): Clients | null {
  const cfg = transcriptsConfig();
  if (!cfg) return null;
  const { httpUrl, apiKey, apiSecret } = cfg.livekit;
  return { cfg, db: createAdminClient(), rooms: new RoomServiceClient(httpUrl, apiKey, apiSecret), egress: new EgressClient(httpUrl, apiKey, apiSecret) };
}

// --- reads ---------------------------------------------------------------------------------------

export async function liveRecording(db: SupabaseClient, roomName: string): Promise<RecordingRow | null> {
  const { data } = await db.from('video_recordings').select(REC_COLS).eq('room_name', roomName).in('state', LIVE_STATES as string[]).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return (data as RecordingRow | null) ?? null;
}

export async function segmentsOf(db: SupabaseClient, recordingId: string): Promise<SegmentRow[]> {
  const { data } = await db.from('video_recording_segments').select(SEG_COLS).eq('recording_id', recordingId).order('seq');
  return (data as SegmentRow[] | null) ?? [];
}

const EGRESS_KIND = 2; // livekit.ParticipantInfo.Kind.EGRESS
const DISCONNECTED = 3; // livekit.ParticipantInfo.State.DISCONNECTED

export function toCallParticipants(list: ParticipantInfo[]): CallParticipant[] {
  return list
    .filter((p) => p.state !== DISCONNECTED)
    .map((p) => ({
      identity: p.identity,
      name: p.name || 'Guest',
      consent: p.attributes?.[REC_ATTR] ?? null,
      isRecorder: p.kind === EGRESS_KIND || p.identity.startsWith('EG_'),
    }));
}

async function participantsOf(c: Clients, roomName: string): Promise<{ people: CallParticipant[]; raw: ParticipantInfo[] }> {
  const raw = await c.rooms.listParticipants(roomName);
  return { people: toCallParticipants(raw), raw };
}

// --- room metadata (what every browser sees) -----------------------------------------------------

export async function publishRoomState(c: Clients, roomName: string, rec: Pick<RecordingRow, 'id' | 'state' | 'requested_by_name'> | null): Promise<void> {
  try {
    const [room] = await c.rooms.listRooms([roomName]);
    if (!room) return; // nobody in the call: nothing to tell
    const next = withRoomRec(room.metadata, rec ? { id: rec.id, state: roomStateFor(rec.state), by: rec.requested_by_name || 'HomeQuote' } : null);
    if (next !== (room.metadata || '{}')) await c.rooms.updateRoomMetadata(roomName, next);
  } catch (e) {
    console.error('[video-transcripts] room metadata', (e as Error).message);
  }
}

// --- state changes -------------------------------------------------------------------------------

/** Conditional update: only applies from one of `from`. Returns the row if this caller won. */
async function claim(db: SupabaseClient, id: string, from: RecordingState[], patch: Record<string, unknown>): Promise<RecordingRow | null> {
  const { data } = await db.from('video_recordings').update(patch).eq('id', id).in('state', from).select(REC_COLS).maybeSingle();
  return (data as RecordingRow | null) ?? null;
}

const fromStatesFor = (event: Parameters<typeof nextRecordingState>[1], captured = false) =>
  (['asking', 'starting', 'recording', 'paused', 'stopped', 'cancelled', 'processing', 'done', 'failed'] as RecordingState[]).filter((s) => nextRecordingState(s, event, captured) !== null);

/** Start (or reuse) the session for a room. The requester's own consent is set by their browser. */
export async function requestCapture(c: Clients, m: VideoMeeting, requester: { id: string; name: string }): Promise<RecordingRow | null> {
  const existing = await liveRecording(c.db, m.roomName);
  if (existing) {
    await publishRoomState(c, m.roomName, existing);
    return existing;
  }
  const { data, error } = await c.db
    .from('video_recordings')
    .insert({
      meeting_kind: m.kind,
      meeting_id: m.id,
      room_name: m.roomName,
      prospect_id: m.prospectId,
      lead_id: m.leadId,
      requested_by: requester.id,
      requested_by_name: requester.name.slice(0, 80),
      meeting_context: { guestName: m.guestName, subject: m.subject, startMs: m.startMs, timeZone: m.hostTimeZone, hostLabel: m.hostLabel },
      consent_version: CONSENT_VERSION,
      state: 'asking',
    })
    .select(REC_COLS)
    .single();
  // 23505: someone else's request won the unique "one live session per room" index; use theirs.
  const row = (data as RecordingRow | null) ?? (error?.code === '23505' ? await liveRecording(c.db, m.roomName) : null);
  if (row) await publishRoomState(c, m.roomName, row);
  return row;
}

export type SyncResult = { state: RecordingState | 'none'; missing: string[]; waitingForJoin: boolean };

/**
 * Bring capture in line with the room: start when everyone agreed, pause the moment anyone has not,
 * rotate a long file. Idempotent; safe to call from any browser, the webhook, or a join.
 */
export async function syncCapture(c: Clients, roomName: string, nowMs = Date.now()): Promise<SyncResult> {
  const rec = await liveRecording(c.db, roomName);
  if (!rec) return { state: 'none', missing: [], waitingForJoin: false };
  let people: CallParticipant[];
  try {
    people = (await participantsOf(c, roomName)).people;
  } catch {
    // The room is gone (everyone left): LiveKit returns not-found.
    people = [];
  }
  const d = captureDecision({ state: rec.state, recordingId: rec.id, participants: people });

  if (d.action === 'stop') {
    if (d.reason === 'empty_room') {
      const r = await stopCapture(c, roomName, 'empty_room');
      return { state: r?.state ?? rec.state, missing: [], waitingForJoin: false };
    }
    const paused = await pauseCapture(c, rec, 'missing_consent');
    return { state: paused?.state ?? rec.state, missing: d.missing, waitingForJoin: false };
  }

  if (d.action === 'start') {
    const won = await claim(c.db, rec.id, fromStatesFor('start_claimed'), { state: 'starting', error: null });
    if (!won) return { state: rec.state, missing: [], waitingForJoin: false };
    // The audit record: exactly who LiveKit says agreed to this session, at this moment.
    await c.db.from('video_recording_consents').upsert(
      people.filter((p) => !p.isRecorder).map((p) => ({
        recording_id: rec.id,
        participant_identity: p.identity.slice(0, 120),
        participant_name: p.name.slice(0, 120),
        participant_role: p.identity.startsWith('host-') ? 'host' : 'guest',
        consent_version: CONSENT_VERSION,
      })),
      { onConflict: 'recording_id,participant_identity', ignoreDuplicates: true },
    );
    const started = await startSegment(c, won);
    const after = await claim(c.db, rec.id, ['starting'], started.ok
      ? { state: 'recording', capture_started_at: won.capture_started_at ?? new Date(nowMs).toISOString() }
      : { state: started.giveUp ? 'cancelled' : 'paused', error: started.error, stop_reason: started.giveUp ? 'recorder_failed' : null });
    if (started.ok && !after) await stopEgress(c, started.egressId); // stopped while starting: do not leave it running
    await publishRoomState(c, roomName, after ?? (await liveRecording(c.db, roomName)));
    return { state: after?.state ?? rec.state, missing: [], waitingForJoin: false };
  }

  if (rec.state === 'recording') await rotateIfLong(c, rec, nowMs);
  return { state: rec.state, missing: d.missing, waitingForJoin: d.waitingForJoin };
}

/** Stop capture but keep the session (someone joined or is missing consent). */
export async function pauseCapture(c: Clients, rec: RecordingRow, reason: string): Promise<RecordingRow | null> {
  const paused = await claim(c.db, rec.id, fromStatesFor('pause'), { state: 'paused', stop_reason: reason.slice(0, 80) });
  if (paused) {
    await stopActiveSegments(c, rec.id);
    await publishRoomState(c, rec.room_name, paused);
  }
  return paused;
}

/** End the session: Stop pressed, someone declined, everyone left, or the room finished. */
export async function stopCapture(c: Clients, roomName: string, reason: string): Promise<RecordingRow | null> {
  const rec = await liveRecording(c.db, roomName);
  if (!rec) return null;
  const segs = await segmentsOf(c.db, rec.id);
  const captured = segs.some((s) => s.status !== 'failed');
  const next = nextRecordingState(rec.state, 'stop', captured);
  if (!next) return null;
  const done = await claim(c.db, rec.id, fromStatesFor('stop', captured), { state: next, stop_reason: reason.slice(0, 80), capture_ended_at: new Date().toISOString() });
  if (done) {
    await stopActiveSegments(c, rec.id);
    await publishRoomState(c, roomName, null);
  }
  return done;
}

// --- egress --------------------------------------------------------------------------------------

type StartResult = { ok: true; egressId: string } | { ok: false; error: string; giveUp: boolean };

async function startSegment(c: Clients, rec: RecordingRow): Promise<StartResult> {
  const segs = await segmentsOf(c.db, rec.id);
  const failed = segs.filter((s) => s.status === 'failed').length;
  if (failed >= MAX_FAILED_SEGMENTS) return { ok: false, error: 'The recorder failed to start several times. Check the LiveKit Egress and storage settings.', giveUp: true };
  const seq = (segs.at(-1)?.seq ?? 0) + 1;
  const path = segmentPath(rec.id, seq);
  const { endpoint, region, accessKey, secret, bucket } = c.cfg.s3;
  const file = new EncodedFileOutput({
    fileType: EncodedFileType.OGG,
    filepath: path,
    disableManifest: true,
    output: { case: 's3', value: new S3Upload({ endpoint, region, accessKey, secret, bucket, forcePathStyle: true }) },
  });
  let info: EgressInfo;
  try {
    info = await c.egress.startRoomCompositeEgress(rec.room_name, { file }, {
      audioOnly: true,
      encodingOptions: new EncodingOptions({ audioCodec: AudioCodec.OPUS, audioBitrate: AUDIO_BITRATE_KBPS, audioFrequency: 48000 }),
    });
  } catch (e) {
    console.error('[video-transcripts] egress start', (e as Error).message);
    await c.db.from('video_recording_segments').insert({ recording_id: rec.id, seq, storage_path: path, status: 'failed', error: 'The recorder could not start.' });
    return { ok: false, error: 'The recorder could not start. Try again in a moment.', giveUp: failed + 1 >= MAX_FAILED_SEGMENTS };
  }
  const { error } = await c.db.from('video_recording_segments').insert({ recording_id: rec.id, seq, egress_id: info.egressId, storage_path: path, status: 'active' });
  if (error) {
    await stopEgress(c, info.egressId);
    return { ok: false, error: 'Could not save the recording segment.', giveUp: false };
  }
  return { ok: true, egressId: info.egressId };
}

async function stopEgress(c: Clients, egressId: string | null): Promise<void> {
  if (!egressId) return;
  // Already-ended egress returns an error: that is the outcome we want anyway.
  await c.egress.stopEgress(egressId).catch(() => undefined);
}

async function stopActiveSegments(c: Clients, recordingId: string): Promise<void> {
  const segs = await segmentsOf(c.db, recordingId);
  await Promise.all(segs.filter((s) => s.status === 'starting' || s.status === 'active').map((s) => stopEgress(c, s.egress_id)));
}

/** End a file that is getting close to the speech-to-text length limit and start the next one. */
async function rotateIfLong(c: Clients, rec: RecordingRow, nowMs: number): Promise<void> {
  const active = (await segmentsOf(c.db, rec.id)).filter((s) => s.status === 'active');
  const current = active.at(-1);
  if (!current || !shouldRotate(new Date(current.started_at).getTime(), nowMs)) return;
  const started = await startSegment(c, rec); // new file first so no speech falls in a gap
  if (started.ok) await stopEgress(c, current.egress_id);
}

const toNumber = (v: bigint | number | undefined) => (v === undefined ? 0 : Number(v));

/** Apply LiveKit's view of one egress (webhook or a poll). Returns the recording id it belongs to. */
export async function applyEgressInfo(c: Pick<Clients, 'db'>, info: EgressInfo): Promise<string | null> {
  if (!info.egressId) return null;
  const { data } = await c.db.from('video_recording_segments').select(SEG_COLS).eq('egress_id', info.egressId).maybeSingle();
  const seg = data as SegmentRow | null;
  if (!seg) return null; // not one of ours (another recorder in the project)
  if (seg.status === 'complete' || seg.status === 'failed') return seg.recording_id;
  const f = info.fileResults?.[0];
  const ended = info.status === EgressStatus.EGRESS_COMPLETE || info.status === EgressStatus.EGRESS_FAILED || info.status === EgressStatus.EGRESS_ABORTED || info.status === EgressStatus.EGRESS_LIMIT_REACHED;
  if (!ended) {
    if (info.status === EgressStatus.EGRESS_ACTIVE && seg.status === 'starting') await c.db.from('video_recording_segments').update({ status: 'active' }).eq('id', seg.id);
    return seg.recording_id;
  }
  const size = toNumber(f?.size);
  const ok = size > 0 && info.status !== EgressStatus.EGRESS_ABORTED;
  await c.db
    .from('video_recording_segments')
    .update({
      status: ok ? 'complete' : 'failed',
      ended_at: new Date(toNumber(info.endedAt) / 1e6 || Date.now()).toISOString(),
      // FileInfo.duration is nanoseconds.
      duration_seconds: f ? Math.round(toNumber(f.duration) / 1e7) / 100 : null,
      size_bytes: size || null,
      error: ok ? null : (info.error || 'The recorder ended without a file.').slice(0, 500),
    })
    .eq('id', seg.id);
  return seg.recording_id;
}

/** Re-read every unfinished segment of a recording from LiveKit (when no webhook has arrived). */
export async function refreshSegments(c: Clients, recordingId: string): Promise<SegmentRow[]> {
  const open = (await segmentsOf(c.db, recordingId)).filter((s) => (s.status === 'starting' || s.status === 'active') && s.egress_id);
  for (const s of open) {
    try {
      const [info] = await c.egress.listEgress({ egressId: s.egress_id! });
      if (info) await applyEgressInfo(c, info);
    } catch (e) {
      console.error('[video-transcripts] egress status', (e as Error).message);
    }
  }
  return segmentsOf(c.db, recordingId);
}
