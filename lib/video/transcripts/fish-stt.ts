import { SpeechToTextError, speakerLabel, type SpeechToText, type TranscribeOptions, type Transcript, type TranscriptTurn } from './stt';

/**
 * Fish Audio speech-to-text (the same FISH_API_KEY as AI calling, §18).
 * Contract (docs.fish.audio, "Speech to text", checked 2026-11-06):
 *   POST https://api.fish.audio/v1/asr   Authorization: Bearer <key>   header `model: transcribe-1-pro`
 *   multipart: audio (file; Ogg Opus / MP3 / M4A / WAV...), language, ignore_timestamps=false, diarize=true, num_speakers
 *   200 -> { text, duration, segments[{text,start,end}], speaker_turns[{speaker:"speaker:N", text, start, end}], language_code }
 * Limits: 60 minutes per request on transcribe-1-pro; synchronous (minutes for a long file).
 * Price: $0.36 per audio hour, billed per second (Fish pricing page / launch notes, 2026-11).
 * No env reads here: the caller passes the key, so this file is testable.
 */

export const FISH_ASR_URL = 'https://api.fish.audio/v1/asr';
export const FISH_ASR_MODEL = 'transcribe-1-pro';

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Fish's JSON reply as a Transcript. Speaker turns when present, else word segments, else the plain text. */
export function parseFishAsr(json: unknown): Transcript {
  const r = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  // The text may carry inline "<|speaker:N|>" markers; the turns carry the clean text.
  const text = str(r.text).replace(/<\|[^|>]*\|>/g, ' ').replace(/\s+/g, ' ').trim();
  const durationSec = num(r.duration);
  const language = str(r.language_code) || null;
  const rawTurns = Array.isArray(r.speaker_turns) ? r.speaker_turns : [];
  let turns: TranscriptTurn[] = rawTurns
    .map((t) => (t && typeof t === 'object' ? (t as Record<string, unknown>) : {}))
    .map((t) => ({ speaker: speakerLabel(t.speaker), start: num(t.start), end: num(t.end, num(t.start)), text: str(t.text).replace(/<\|[^|>]*\|>/g, ' ').replace(/\s+/g, ' ').trim() }))
    .filter((t) => t.text);
  if (!turns.length && text) turns = [{ speaker: 'Speaker', start: 0, end: durationSec, text }];
  return { text: text || turns.map((t) => t.text).join(' '), durationSec, turns, language };
}

export function fishSpeechToText(cfg: { apiKey: string; model?: string; fetchImpl?: typeof fetch; timeoutMs?: number }): SpeechToText {
  const model = cfg.model || FISH_ASR_MODEL;
  const doFetch = cfg.fetchImpl ?? fetch;
  return {
    id: `fish:${model}`,
    maxSeconds: 60 * 60,
    async transcribe(audio: Blob, opts: TranscribeOptions = {}): Promise<Transcript> {
      const form = new FormData();
      form.append('audio', audio, 'call.ogg');
      form.append('ignore_timestamps', 'false');
      form.append('diarize', 'true');
      if (opts.language) form.append('language', opts.language);
      if (opts.speakers && opts.speakers > 0) form.append('num_speakers', String(Math.min(opts.speakers, 10)));
      const signal = opts.signal ?? AbortSignal.timeout(cfg.timeoutMs ?? 280_000);
      let res: Response;
      try {
        res = await doFetch(FISH_ASR_URL, { method: 'POST', headers: { Authorization: `Bearer ${cfg.apiKey}`, model }, body: form, signal });
      } catch {
        throw new SpeechToTextError('Could not reach the speech-to-text service.', true);
      }
      if (!res.ok) {
        // Never surface the provider's body (it may echo request data); the status is enough.
        const retryable = res.status === 429 || res.status >= 500;
        const why = res.status === 401 || res.status === 403 ? 'the Fish Audio API key was refused'
          : res.status === 402 ? 'the Fish Audio account is out of credit'
          : res.status === 413 ? 'the audio file is too large'
          : res.status === 400 ? 'the audio was rejected (format or length)'
          : `HTTP ${res.status}`;
        throw new SpeechToTextError(`Speech-to-text failed: ${why}.`, retryable);
      }
      return parseFishAsr(await res.json().catch(() => ({})));
    },
  };
}
