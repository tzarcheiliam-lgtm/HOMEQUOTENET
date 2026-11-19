import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/video/links';
import { attachmentDisposition, presignS3Url } from '@/lib/video/recordings/s3';
import { downloadName } from '@/lib/video/recordings/shared';
import { DEFAULT_RETENTION_DAYS, recordingConfig } from '@/lib/video/transcripts/config.server';
import { expiresAt, isVideoPath, type RecordingState } from '@/lib/video/transcripts/consent';

/**
 * Reading video call recordings (§51) for the pages. Everything goes through the signed-in user's
 * own client, so RLS decides: admins see every recording, a rep sees the ones they started.
 * Playback links are signed only after that read succeeds and last a few hours.
 */

type Db = Awaited<ReturnType<typeof createClient>>;

export type RecordingStatus = 'ready' | 'processing' | 'recording' | 'deleted' | 'failed' | 'none';

export interface RecordingListItem {
  id: string;
  meetingKind: 'appointment' | 'sales_appointment' | 'link';
  meetingId: string;
  guestName: string | null;
  subject: string | null;
  hostName: string | null;
  startedAtMs: number;
  timeZone: string;
  seconds: number | null;
  status: RecordingStatus;
  deleteOnMs: number;
  error: string | null;
}

interface Row {
  id: string;
  meeting_kind: RecordingListItem['meetingKind'];
  meeting_id: string;
  requested_by_name: string | null;
  meeting_context: { guestName?: string; subject?: string | null; startMs?: number; timeZone?: string; mode?: string } | null;
  state: RecordingState;
  capture_started_at: string | null;
  audio_seconds: number | string | null;
  audio_deleted_at: string | null;
  created_at: string;
  error: string | null;
}

const COLS = 'id, meeting_kind, meeting_id, requested_by_name, meeting_context, state, capture_started_at, audio_seconds, audio_deleted_at, created_at, error';

export function statusOf(r: Pick<Row, 'state' | 'audio_deleted_at'>): RecordingStatus {
  if (r.audio_deleted_at) return 'deleted';
  if (r.state === 'done') return 'ready';
  if (r.state === 'stopped' || r.state === 'processing') return 'processing';
  if (r.state === 'recording' || r.state === 'paused' || r.state === 'starting' || r.state === 'asking') return 'recording';
  if (r.state === 'failed') return 'failed';
  return 'none'; // cancelled: nothing was captured
}

function retentionDays(): number {
  return recordingConfig()?.retentionDays ?? DEFAULT_RETENTION_DAYS;
}

function toItem(r: Row, days: number): RecordingListItem {
  const ctx = r.meeting_context ?? {};
  const created = Date.parse(r.created_at);
  return {
    id: r.id,
    meetingKind: r.meeting_kind,
    meetingId: r.meeting_id,
    guestName: ctx.guestName || null,
    subject: ctx.subject || null,
    hostName: r.requested_by_name,
    startedAtMs: r.capture_started_at ? Date.parse(r.capture_started_at) : created,
    timeZone: ctx.timeZone || 'America/Los_Angeles',
    seconds: r.audio_seconds == null ? null : Number(r.audio_seconds),
    status: statusOf(r),
    deleteOnMs: expiresAt(created, days),
    error: r.error,
  };
}

/** Recordings the user may see, newest first. Empty before migration 0077 or with none. */
export async function listRecordings(limit = 100): Promise<RecordingListItem[]> {
  const db = await createClient();
  const { data, error } = await db.from('video_recordings').select(COLS).neq('state', 'cancelled').order('created_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  const days = retentionDays();
  return (data as Row[]).map((r) => toItem(r, days));
}

export interface RecordingPart {
  seq: number;
  seconds: number | null;
  playUrl: string;
  downloadUrl: string;
}

export interface RecordingDetail extends RecordingListItem {
  parts: RecordingPart[];
  consents: { name: string; role: string | null; at: string }[];
  /** Files exist but the storage keys are not configured here, so they cannot be played. */
  storageMissing: boolean;
}

/** Playback links last this long: long enough to watch (and seek through) a long call in one sitting. */
const PLAY_LINK_SEC = 6 * 3600;

export async function getRecording(id: string, nowMs = Date.now()): Promise<RecordingDetail | null> {
  if (!isUuid(id)) return null;
  const db: Db = await createClient();
  const { data, error } = await db.from('video_recordings').select(COLS).eq('id', id).maybeSingle();
  if (error || !data) return null;
  const cfg = recordingConfig();
  const item = toItem(data as Row, cfg?.retentionDays ?? DEFAULT_RETENTION_DAYS);
  const [{ data: segs }, { data: consents }] = await Promise.all([
    db.from('video_recording_segments').select('seq, storage_path, status, duration_seconds').eq('recording_id', id).order('seq'),
    db.from('video_recording_consents').select('participant_name, participant_role, observed_at').eq('recording_id', id).order('observed_at'),
  ]);
  const files = ((segs as { seq: number; storage_path: string; status: string; duration_seconds: number | string | null }[] | null) ?? []).filter(
    (s) => s.status === 'complete' && isVideoPath(s.storage_path),
  );
  const playable = item.status === 'ready' && !!cfg;
  const label = [item.guestName, item.subject].filter(Boolean).join(' - ') || null;
  const now = new Date(nowMs);
  const parts: RecordingPart[] = playable
    ? files.map((f, i) => ({
        seq: f.seq,
        seconds: f.duration_seconds == null ? null : Number(f.duration_seconds),
        playUrl: presignS3Url(cfg.s3, { method: 'GET', key: f.storage_path, expiresSec: PLAY_LINK_SEC, now }),
        downloadUrl: presignS3Url(cfg.s3, {
          method: 'GET',
          key: f.storage_path,
          expiresSec: PLAY_LINK_SEC,
          now,
          query: { 'response-content-disposition': attachmentDisposition(downloadName({ label, startedAtMs: item.startedAtMs, part: i + 1, parts: files.length })) },
        }),
      }))
    : [];
  return {
    ...item,
    parts,
    consents: ((consents as { participant_name: string | null; participant_role: string | null; observed_at: string }[] | null) ?? []).map((c) => ({
      name: c.participant_name || 'Guest',
      role: c.participant_role,
      at: c.observed_at,
    })),
    storageMissing: item.status === 'ready' && !cfg && files.length > 0,
  };
}

/** For list pages: the newest recording of each meeting (that the user may see). */
export async function recordingsFor(db: { from: Db['from'] }, kind: RecordingListItem['meetingKind'], refIds: string[]): Promise<Map<string, { id: string; status: RecordingStatus }>> {
  const out = new Map<string, { id: string; status: RecordingStatus }>();
  if (!refIds.length) return out;
  const { data, error } = await db
    .from('video_recordings')
    .select('id, meeting_id, state, audio_deleted_at, created_at')
    .eq('meeting_kind', kind)
    .in('meeting_id', refIds)
    .neq('state', 'cancelled')
    .order('created_at', { ascending: false });
  if (error || !data) return out;
  for (const r of data as (Pick<Row, 'id' | 'meeting_id' | 'state' | 'audio_deleted_at'>)[]) {
    if (out.has(r.meeting_id)) continue;
    const status = statusOf(r);
    if (status === 'ready' || status === 'processing') out.set(r.meeting_id, { id: r.id, status });
  }
  return out;
}
