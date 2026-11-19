/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from PGlite untyped */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { attachmentDisposition, deleteS3Object, presignS3Url } from '@/lib/video/recordings/s3';
import { downloadName, formatDay, formatDuration, recordingNote, recordingPath } from '@/lib/video/recordings/shared';
import { CONSENT_COPY, consentCopy, consentVersion, expiresAt, isVideoPath, segmentPath } from '@/lib/video/transcripts/consent';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: (fn: () => unknown) => void fn() }));

/**
 * Video call recordings, VIDEO mode (§51): watchable MP4s kept for 90 days. The S3 link signer
 * (checked against AWS's published example), the mode switch, the consent wording, finishing a
 * recording (CRM note with a Watch link), deletion, and the pages' status rules.
 */

describe('S3 link signing (SigV4, query string)', () => {
  const aws = { endpoint: 'https://examplebucket.s3.amazonaws.com', region: 'us-east-1', accessKey: 'AKIAIOSFODNN7EXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', bucket: '' };
  it("matches AWS's documented presigned GET example exactly", () => {
    const url = presignS3Url(aws, { method: 'GET', key: 'test.txt', expiresSec: 86400, now: new Date('2013-05-24T00:00:00Z') });
    expect(url).toBe(
      'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
    );
  });
  it('signs path-style keys under the endpoint path and bucket (R2, Supabase)', () => {
    const r2 = presignS3Url({ ...aws, endpoint: 'https://acct.r2.cloudflarestorage.com', region: 'auto', bucket: 'video-recordings' }, { method: 'GET', key: 'calls/abc/01.mp4', expiresSec: 60 });
    expect(r2.startsWith('https://acct.r2.cloudflarestorage.com/video-recordings/calls/abc/01.mp4?')).toBe(true);
    expect(r2).toContain('%2Fauto%2Fs3%2Faws4_request');
    const sb = presignS3Url({ ...aws, endpoint: 'https://ref.storage.supabase.co/storage/v1/s3/', bucket: 'video-recordings' }, { method: 'DELETE', key: '/calls/abc/01.mp4', expiresSec: 60 });
    expect(sb.startsWith('https://ref.storage.supabase.co/storage/v1/s3/video-recordings/calls/abc/01.mp4?')).toBe(true);
  });
  it('signs extra params (download name), caps the lifetime at 7 days, and changes with the method', () => {
    const now = new Date('2026-11-19T12:00:00Z');
    const dl = presignS3Url(aws, { method: 'GET', key: 'a.mp4', expiresSec: 10 ** 9, now, query: { 'response-content-disposition': attachmentDisposition('Call – ABC.mp4') } });
    expect(dl).toContain('X-Amz-Expires=604800');
    expect(dl).toContain('response-content-disposition=attachment%3B%20filename%3D%22Call%20_%20ABC.mp4%22');
    expect(presignS3Url(aws, { method: 'GET', key: 'a.mp4', expiresSec: 60, now })).not.toBe(presignS3Url(aws, { method: 'DELETE', key: 'a.mp4', expiresSec: 60, now }));
  });
  it('deletes with a signed DELETE; a missing file counts as deleted; errors do not throw', async () => {
    const calls: [string, string | undefined][] = [];
    const ok = await deleteS3Object(aws, 'calls/x/01.mp4', (async (url: string, init?: RequestInit) => {
      calls.push([url, init?.method]);
      return new Response(null, { status: 204 });
    }) as typeof fetch);
    expect(ok).toBe(true);
    expect(calls[0][1]).toBe('DELETE');
    expect(calls[0][0]).toContain('/calls/x/01.mp4?');
    expect(await deleteS3Object(aws, 'k', (async () => new Response(null, { status: 404 })) as typeof fetch)).toBe(true);
    expect(await deleteS3Object(aws, 'k', (async () => new Response(null, { status: 403 })) as typeof fetch)).toBe(false);
    expect(await deleteS3Object(aws, 'k', (async () => { throw new Error('down'); }) as typeof fetch)).toBe(false);
  });
});

describe('video mode: wording, names, dates', () => {
  it('asks to record video (not transcribe) and says when it is deleted', () => {
    const v = consentCopy('video', 90);
    expect(v.requestButton).toBe('Record');
    expect(v.body('Liam')).toMatch(/^Liam would like to record this call \(video and audio\)/);
    expect(v.body('Liam')).toMatch(/everyone here agrees, and anyone can stop it/);
    expect(v.detail).toMatch(/deleted automatically after 90 days/);
    expect(v.detail).not.toMatch(/transcri/i);
    expect(consentCopy('transcript', 90)).toBe(CONSENT_COPY);
    expect(consentVersion('video')).not.toBe(consentVersion('transcript'));
  });
  it('names video files .mp4 and tells them apart', () => {
    expect(isVideoPath(segmentPath('r', 2, 'mp4'))).toBe(true);
    expect(isVideoPath(segmentPath('r', 2))).toBe(false);
  });
  it('formats durations, the delete date, and download names', () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(31 * 60 + 20)).toBe('31 min');
    expect(formatDuration(65 * 60)).toBe('1 h 05 min');
    const created = Date.parse('2026-11-19T18:00:00Z');
    expect(formatDay(expiresAt(created, 90), 'America/Los_Angeles')).toBe('Feb 17, 2027');
    expect(downloadName({ label: 'Mike / ABC Roofing', startedAtMs: created, part: 2, parts: 2 })).toBe('HomeQuote call - Mike ABC Roofing - 2026-11-19 (part 2).mp4');
    expect(downloadName({ label: null, startedAtMs: created, part: 1, parts: 1 })).toBe('HomeQuote call - 2026-11-19.mp4');
  });
  it('writes a short CRM note with the Watch link and the delete date', () => {
    const note = recordingNote({ when: 'Thu, Nov 19 · 10:00 AM PST', seconds: 1900, url: `https://homequotenet.com${recordingPath('abc')}`, deleteOn: 'Feb 17, 2027' });
    expect(note).toBe(
      "Video call recorded (Thu, Nov 19 · 10:00 AM PST) · 32 min · with everyone's consent\nWatch: https://homequotenet.com/app/recordings/abc\nDeleted automatically on Feb 17, 2027.",
    );
  });
});

describe('the switch', () => {
  const BASE = {
    LIVEKIT_URL: 'wss://hq.livekit.cloud',
    LIVEKIT_API_KEY: 'APIkey',
    LIVEKIT_API_SECRET: 'lk-secret',
    VIDEO_RECORDING_S3_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
    VIDEO_RECORDING_S3_REGION: 'auto',
    VIDEO_RECORDING_S3_ACCESS_KEY_ID: 'ak',
    VIDEO_RECORDING_S3_SECRET_ACCESS_KEY: 'sk',
  };
  const setEnv = (env: Record<string, string>) => Object.entries(env).forEach(([k, v]) => vi.stubEnv(k, v));
  afterEach(() => vi.unstubAllEnvs());

  it('video mode needs only LiveKit + storage (no AI keys); off without the switch or any key', async () => {
    const { recordingConfig } = await import('@/lib/video/transcripts/config.server');
    setEnv({ ...BASE, VIDEO_RECORDING_ENABLED: 'true', ANTHROPIC_API_KEY: '', FISH_API_KEY: '' });
    const cfg = recordingConfig()!;
    expect(cfg.mode).toBe('video');
    expect(cfg.retentionDays).toBe(90);
    expect(cfg.s3).toMatchObject({ endpoint: BASE.VIDEO_RECORDING_S3_ENDPOINT, region: 'auto', bucket: 'video-recordings' });
    for (const key of Object.keys(BASE)) {
      vi.unstubAllEnvs();
      setEnv({ ...BASE, VIDEO_RECORDING_ENABLED: 'true', [key]: '' });
      expect(recordingConfig(), `${key} missing`).toBeNull();
    }
    vi.unstubAllEnvs();
    setEnv(BASE);
    expect(recordingConfig()).toBeNull();
  });
  it('video wins over transcripts; retention days are configurable within reason', async () => {
    const { recordingConfig } = await import('@/lib/video/transcripts/config.server');
    setEnv({ ...BASE, VIDEO_RECORDING_ENABLED: 'true', VIDEO_TRANSCRIPTS_ENABLED: 'true', VIDEO_RECORDING_RETENTION_DAYS: '30' });
    expect(recordingConfig()).toMatchObject({ mode: 'video', retentionDays: 30 });
    vi.stubEnv('VIDEO_RECORDING_RETENTION_DAYS', '0');
    expect(recordingConfig()!.retentionDays).toBe(90);
    vi.stubEnv('VIDEO_RECORDING_RETENTION_DAYS', 'forever');
    expect(recordingConfig()!.retentionDays).toBe(90);
  });
  it('join passes let people set their own consent attribute in video mode too', async () => {
    const { mintJoinPass } = await import('@/lib/video/livekit.server');
    const claims = async () => {
      const pass = await mintJoinPass({ roomName: 'hq-link-x', role: 'guest', name: 'Mike' });
      return JSON.parse(Buffer.from(pass!.participantToken.split('.')[1], 'base64url').toString()).video;
    };
    setEnv(BASE);
    expect((await claims()).canUpdateOwnMetadata).toBeFalsy();
    vi.stubEnv('VIDEO_RECORDING_ENABLED', 'true');
    expect((await claims()).canUpdateOwnMetadata).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
// Finishing and deleting, on the real migrations
// ---------------------------------------------------------------------------------------------

let pg: PGlite;
const q = async <T = Record<string, any>>(sql: string, p?: unknown[]) => (await pg.query<T>(sql, p)).rows;
const prospect = randomUUID();
const cfg = {
  mode: 'video' as const,
  s3: { endpoint: 'https://acct.r2.cloudflarestorage.com', region: 'auto', accessKey: 'ak', secret: 'sk', bucket: 'video-recordings' },
  retentionDays: 90,
  fishApiKey: '',
  fishModel: undefined,
  summaryModel: undefined,
  keepAudio: false,
  livekit: { httpUrl: 'https://hq.livekit.cloud', apiKey: 'k', apiSecret: 's' },
};

async function stoppedRecording(segments: { status: string; seconds?: number; path?: string }[], opts: { prospectId?: string | null; createdAt?: string; state?: string } = {}) {
  const [rec] = await q(
    `insert into public.video_recordings(meeting_kind, meeting_id, room_name, prospect_id, state, consent_version, meeting_context, created_at)
     values ('sales_appointment', gen_random_uuid(), $1, $2, $3, 'v1-video', $4, $5) returning id`,
    [`hq-sales-${randomUUID()}`, opts.prospectId ?? null, opts.state ?? 'stopped', JSON.stringify({ mode: 'video', startMs: Date.parse('2026-11-19T18:00:00Z'), timeZone: 'America/Los_Angeles' }), opts.createdAt ?? new Date().toISOString()],
  );
  let seq = 0;
  for (const s of segments) {
    seq += 1;
    await q(`insert into public.video_recording_segments(recording_id, seq, egress_id, storage_path, status, duration_seconds) values ($1, $2, $3, $4, $5, $6)`, [
      rec.id,
      seq,
      `EG_${randomUUID()}`,
      s.path ?? `calls/${rec.id}/0${seq}.mp4`,
      s.status,
      s.seconds ?? null,
    ]);
  }
  return rec.id as string;
}

describe('finishing and deleting video recordings', () => {
  beforeAll(async () => {
    pg = await fullSchema({ supabaseGrants: true });
    await q(`insert into public.contractor_prospects(id, company_name, notes) values ($1, 'ABC Roofing', 'Called twice.')`, [prospect]);
  }, 120_000);
  afterAll(async () => {
    await pg?.close();
  });
  const clientsFor = () => ({ cfg, db: fakeSupabase(pg) as any, rooms: {} as any, egress: { listEgress: async () => [] } as any });

  it('marks the recording ready, adds up the parts, and puts a Watch link on the prospect (once)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://homequotenet.com');
    const { processRecording } = await import('@/lib/video/transcripts/process.server');
    const id = await stoppedRecording([{ status: 'complete', seconds: 600 }, { status: 'failed' }, { status: 'complete', seconds: 1300 }], { prospectId: prospect });
    expect(await processRecording(clientsFor(), id)).toBe('done');
    const [rec] = await q(`select state, audio_seconds, note_written_at, transcript_text from public.video_recordings where id=$1`, [id]);
    expect(rec.state).toBe('done');
    expect(Number(rec.audio_seconds)).toBe(1900);
    expect(rec.note_written_at).not.toBeNull();
    expect(rec.transcript_text).toBeNull();
    const [p] = await q(`select notes from public.contractor_prospects where id=$1`, [prospect]);
    expect(p.notes).toMatch(new RegExp(`^Video call recorded \\(.+\\) · 32 min · with everyone's consent\\nWatch: https://homequotenet.com/app/recordings/${id}\\nDeleted automatically on `));
    expect(p.notes).toMatch(/\n\nCalled twice\.$/);
    expect(await processRecording(clientsFor(), id)).toBe('skipped');
    vi.unstubAllEnvs();
  });

  it('fails clearly when no video file was saved, and does not retry', async () => {
    const { processRecording } = await import('@/lib/video/transcripts/process.server');
    const id = await stoppedRecording([{ status: 'failed' }]);
    expect(await processRecording(clientsFor(), id)).toBe('failed');
    const [rec] = await q(`select state, error, attempts from public.video_recordings where id=$1`, [id]);
    expect(rec.state).toBe('failed');
    expect(rec.error).toMatch(/No video was saved/);
    expect(rec.attempts).toBe(3);
  });

  it('deletes every file of a recording and keeps the row as a record', async () => {
    const { purgeRecording } = await import('@/lib/video/recordings/retention.server');
    const id = await stoppedRecording([{ status: 'complete', seconds: 60 }, { status: 'complete', seconds: 60 }], { state: 'done' });
    const deleted: string[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') deleted.push(new URL(url).pathname);
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    expect(await purgeRecording(clientsFor(), id, { fetchImpl })).toBe(true);
    expect(deleted).toEqual([`/video-recordings/calls/${id}/01.mp4`, `/video-recordings/calls/${id}/02.mp4`]);
    const [rec] = await q(`select state, audio_deleted_at from public.video_recordings where id=$1`, [id]);
    expect(rec.state).toBe('done');
    expect(rec.audio_deleted_at).not.toBeNull();
  });

  it('keeps the recording when storage refuses the delete (the next run tries again)', async () => {
    const { purgeRecording } = await import('@/lib/video/recordings/retention.server');
    const id = await stoppedRecording([{ status: 'complete', seconds: 60 }], { state: 'done' });
    expect(await purgeRecording(clientsFor(), id, { fetchImpl: (async () => new Response(null, { status: 500 })) as typeof fetch })).toBe(false);
    expect((await q(`select audio_deleted_at from public.video_recordings where id=$1`, [id]))[0].audio_deleted_at).toBeNull();
  });

  it('the pages show a status that matches the lifecycle', async () => {
    const { statusOf } = await import('@/lib/data/recordings');
    expect(statusOf({ state: 'done', audio_deleted_at: null })).toBe('ready');
    expect(statusOf({ state: 'done', audio_deleted_at: '2026-01-01' })).toBe('deleted');
    expect(statusOf({ state: 'stopped', audio_deleted_at: null })).toBe('processing');
    expect(statusOf({ state: 'processing', audio_deleted_at: null })).toBe('processing');
    expect(statusOf({ state: 'paused', audio_deleted_at: null })).toBe('recording');
    expect(statusOf({ state: 'failed', audio_deleted_at: null })).toBe('failed');
    expect(statusOf({ state: 'cancelled', audio_deleted_at: null })).toBe('none');
  });
});
