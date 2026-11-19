import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { livekitConfig } from '@/lib/video/livekit.server';
import type { RecordingMode } from './consent';

/**
 * Video call recording (§51) ships OFF. Two modes; at most one is on:
 *
 * VIDEO mode (watchable recordings, kept RETENTION days then deleted):
 *   VIDEO_RECORDING_ENABLED=true            the switch
 *   LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET   (already set for video rooms, §48)
 *   VIDEO_RECORDING_S3_ENDPOINT             any S3-compatible store. Cloudflare R2: https://<account id>.r2.cloudflarestorage.com
 *                                           (Supabase Storage also works: https://<ref>.storage.supabase.co/storage/v1/s3,
 *                                            but the free plan caps files at 50 MB, about 5 minutes of video)
 *   VIDEO_RECORDING_S3_REGION               R2: auto
 *   VIDEO_RECORDING_S3_ACCESS_KEY_ID        an access key that can read, write and delete in the bucket
 *   VIDEO_RECORDING_S3_SECRET_ACCESS_KEY
 *   VIDEO_RECORDING_BUCKET                  default 'video-recordings'
 *   VIDEO_RECORDING_RETENTION_DAYS          default 90
 *
 * TRANSCRIPT mode (audio only -> Fish Audio transcript -> Claude summary in the CRM; audio deleted):
 *   VIDEO_TRANSCRIPTS_ENABLED=true + the LiveKit and S3 settings above (Supabase Storage S3 endpoint),
 *   ANTHROPIC_API_KEY, FISH_API_KEY. Optional VIDEO_RECORDING_KEEP_AUDIO, VIDEO_SUMMARY_MODEL, FISH_ASR_MODEL.
 *
 * VIDEO_RECORDING_ENABLED wins if both switches are set. The S3 keys are handed to LiveKit Egress
 * (inside the egress request, over TLS) so it can upload; HomeQuote signs short-lived links with them.
 */
export interface RecordingConfig {
  mode: RecordingMode;
  s3: { endpoint: string; region: string; accessKey: string; secret: string; bucket: string };
  retentionDays: number;
  fishApiKey: string;
  fishModel: string | undefined;
  summaryModel: string | undefined;
  keepAudio: boolean;
  livekit: { httpUrl: string; apiKey: string; apiSecret: string };
}

const env = (name: string) => process.env[name]?.trim() || undefined;
const on = (name: string) => env(name)?.toLowerCase() === 'true';

export const DEFAULT_RETENTION_DAYS = 90;

/** Which mode the switches ask for (before checking keys). Also used by the join pass. */
export function requestedRecordingMode(): RecordingMode | null {
  if (on('VIDEO_RECORDING_ENABLED')) return 'video';
  if (on('VIDEO_TRANSCRIPTS_ENABLED')) return 'transcript';
  return null;
}

export function recordingConfig(): RecordingConfig | null {
  const mode = requestedRecordingMode();
  if (!mode) return null;
  const lk = livekitConfig();
  const endpoint = env('VIDEO_RECORDING_S3_ENDPOINT');
  const region = env('VIDEO_RECORDING_S3_REGION');
  const accessKey = env('VIDEO_RECORDING_S3_ACCESS_KEY_ID');
  const secret = env('VIDEO_RECORDING_S3_SECRET_ACCESS_KEY');
  if (!lk || !endpoint || !region || !accessKey || !secret || !/^https:\/\//i.test(endpoint)) return null;
  const fishApiKey = env('FISH_API_KEY') ?? '';
  if (mode === 'transcript' && (!env('ANTHROPIC_API_KEY') || !fishApiKey)) return null;
  const days = Number.parseInt(env('VIDEO_RECORDING_RETENTION_DAYS') ?? '', 10);
  return {
    mode,
    s3: { endpoint, region, accessKey, secret, bucket: env('VIDEO_RECORDING_BUCKET') ?? 'video-recordings' },
    retentionDays: Number.isFinite(days) && days >= 1 && days <= 3650 ? days : DEFAULT_RETENTION_DAYS,
    fishApiKey,
    fishModel: env('FISH_ASR_MODEL'),
    summaryModel: env('VIDEO_SUMMARY_MODEL'),
    keepAudio: env('VIDEO_RECORDING_KEEP_AUDIO')?.toLowerCase() === 'true',
    // The server APIs (Twirp) speak https on the same host as the wss URL.
    livekit: { httpUrl: lk.url.replace(/^ws(s?):\/\//i, 'http$1://'), apiKey: lk.apiKey, apiSecret: lk.apiSecret },
  };
}
export function videoRecordingEnabled(): boolean {
  return recordingConfig() !== null;
}
/**
 * Bearer token for the internal processing route, derived from the LiveKit secret so no
 * new env var is needed. Rotating LIVEKIT_API_SECRET rotates it.
 */
export function processRouteToken(): string | null {
  const lk = livekitConfig();
  return lk ? createHmac('sha256', lk.apiSecret).update('hq-video-transcripts:process:v1').digest('base64url') : null;
}

export function isProcessRouteToken(header: string | null): boolean {
  const want = processRouteToken();
  const got = /^Bearer\s+(.+)$/i.exec(header ?? '')?.[1]?.trim();
  if (!want || !got) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}
