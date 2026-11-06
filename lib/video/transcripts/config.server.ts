import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { livekitConfig } from '@/lib/video/livekit.server';

/**
 * Video call transcripts (Phase 3, §51) ship DORMANT. They are on only when ALL of these are set:
 *   VIDEO_TRANSCRIPTS_ENABLED=true          the switch
 *   LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET   (already set for video rooms, §48)
 *   ANTHROPIC_API_KEY                        Claude writes the summary (already set)
 *   FISH_API_KEY                             Fish Audio speech-to-text (already set for AI calling, §18)
 *   VIDEO_RECORDING_S3_ENDPOINT              Supabase Storage S3 endpoint: https://<project-ref>.storage.supabase.co/storage/v1/s3
 *   VIDEO_RECORDING_S3_REGION                the project's region (Storage settings, e.g. us-west-1)
 *   VIDEO_RECORDING_S3_ACCESS_KEY_ID         Storage S3 access key (Storage -> S3 Connection -> New access key)
 *   VIDEO_RECORDING_S3_SECRET_ACCESS_KEY
 * Optional:
 *   VIDEO_RECORDING_BUCKET                   default 'video-recordings' (created by 0077)
 *   VIDEO_RECORDING_KEEP_AUDIO=true          keep the audio after transcription (default: delete it)
 *   VIDEO_SUMMARY_MODEL                      default: the assistant's model (ANTHROPIC_MODEL, else lib/assistant/config DEFAULT_MODEL)
 *   FISH_ASR_MODEL                           default 'transcribe-1-pro'
 * The S3 keys are handed to LiveKit Egress (inside the egress request, over TLS) so it can upload
 * the audio; HomeQuote itself reads and deletes the files with the Supabase service role.
 */
export interface TranscriptsConfig {
  s3: { endpoint: string; region: string; accessKey: string; secret: string; bucket: string };
  fishApiKey: string;
  fishModel: string | undefined;
  summaryModel: string | undefined;
  keepAudio: boolean;
  livekit: { httpUrl: string; apiKey: string; apiSecret: string };
}

const env = (name: string) => process.env[name]?.trim() || undefined;

export function transcriptsConfig(): TranscriptsConfig | null {
  if (env('VIDEO_TRANSCRIPTS_ENABLED')?.toLowerCase() !== 'true') return null;
  const lk = livekitConfig();
  const endpoint = env('VIDEO_RECORDING_S3_ENDPOINT');
  const region = env('VIDEO_RECORDING_S3_REGION');
  const accessKey = env('VIDEO_RECORDING_S3_ACCESS_KEY_ID');
  const secret = env('VIDEO_RECORDING_S3_SECRET_ACCESS_KEY');
  const fishApiKey = env('FISH_API_KEY');
  if (!lk || !env('ANTHROPIC_API_KEY') || !fishApiKey || !endpoint || !region || !accessKey || !secret || !/^https:\/\//i.test(endpoint)) return null;
  return {
    s3: { endpoint, region, accessKey, secret, bucket: env('VIDEO_RECORDING_BUCKET') ?? 'video-recordings' },
    fishApiKey,
    fishModel: env('FISH_ASR_MODEL'),
    summaryModel: env('VIDEO_SUMMARY_MODEL'),
    keepAudio: env('VIDEO_RECORDING_KEEP_AUDIO')?.toLowerCase() === 'true',
    // The server APIs (Twirp) speak https on the same host as the wss URL.
    livekit: { httpUrl: lk.url.replace(/^ws(s?):\/\//i, 'http$1://'), apiKey: lk.apiKey, apiSecret: lk.apiSecret },
  };
}

export function videoTranscriptsEnabled(): boolean {
  return transcriptsConfig() !== null;
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
