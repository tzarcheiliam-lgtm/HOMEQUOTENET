import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clients } from '@/lib/video/transcripts/capture.server';
import type { RecordingConfig } from '@/lib/video/transcripts/config.server';
import { isVideoPath } from '@/lib/video/transcripts/consent';
import { deleteS3Object } from './s3';

/**
 * Recording retention (§51): every recording's files are deleted retentionDays after it was made
 * (default 90), and so is any transcript. The row stays (who, when, consent record) with
 * audio_deleted_at set, so the history still shows "a recording existed and was deleted".
 */

const FINISHED = ['done', 'failed', 'cancelled'];

export interface PurgeDeps {
  fetchImpl?: typeof fetch;
}

/** Delete one recording's files (and transcript) now. True when everything is gone. */
export async function purgeRecording(c: { cfg: RecordingConfig; db: SupabaseClient }, id: string, deps: PurgeDeps = {}): Promise<boolean> {
  const { data } = await c.db.from('video_recording_segments').select('storage_path').eq('recording_id', id);
  const paths = ((data as { storage_path: string }[] | null) ?? []).map((s) => s.storage_path);
  let ok = true;
  const video = paths.filter(isVideoPath);
  const audio = paths.filter((p) => !isVideoPath(p));
  for (const p of video) ok = (await deleteS3Object(c.cfg.s3, p, deps.fetchImpl)) && ok;
  if (audio.length) {
    // Transcript-mode audio lives in Supabase Storage (it is read back with the service role).
    const { error } = await c.db.storage.from(c.cfg.s3.bucket).remove(audio);
    ok = !error && ok;
  }
  if (!ok) return false;
  await c.db
    .from('video_recordings')
    .update({ audio_deleted_at: new Date().toISOString(), transcript_text: null, transcript_turns: null })
    .eq('id', id);
  return true;
}

/**
 * Run from the 5-minute tick: delete expired recordings, and nudge processing for recordings
 * whose "upload finished" webhook never came. Never throws.
 */
export async function runRecordingMaintenance(nowMs = Date.now(), deps: PurgeDeps & { kick?: () => void } = {}): Promise<{ enabled: boolean; purged: number; failed: number; pending: number }> {
  const c = clients();
  if (!c) return { enabled: false, purged: 0, failed: 0, pending: 0 };
  const cutoff = new Date(nowMs - c.cfg.retentionDays * 86_400_000).toISOString();
  const { data: expired } = await c.db
    .from('video_recordings')
    .select('id')
    .lt('created_at', cutoff)
    .is('audio_deleted_at', null)
    .in('state', FINISHED)
    .order('created_at')
    .limit(20);
  let purged = 0;
  let failed = 0;
  for (const r of (expired as { id: string }[] | null) ?? []) {
    if (await purgeRecording(c, r.id, deps)) purged += 1;
    else failed += 1;
  }
  const { count } = await c.db.from('video_recordings').select('id', { count: 'exact', head: true }).eq('state', 'stopped');
  const pending = count ?? 0;
  if (pending > 0) {
    if (deps.kick) deps.kick();
    else (await import('@/lib/video/transcripts.server')).kickTranscriptProcessing();
  }
  return { enabled: true, purged, failed, pending };
}
