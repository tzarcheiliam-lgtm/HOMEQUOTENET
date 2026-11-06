/**
 * Speech-to-text behind one small interface, so the provider (Fish Audio today,
 * see fish-stt.ts) can be swapped without touching the pipeline. Pure helpers
 * for joining segments and printing a transcript live here too.
 */

export interface TranscriptTurn {
  /** Provider's speaker label, normalised to "Speaker 1", "Speaker 2"... */
  speaker: string;
  /** Seconds from the start of the whole recording. */
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  text: string;
  durationSec: number;
  turns: TranscriptTurn[];
  language: string | null;
}

export interface TranscribeOptions {
  /** ISO 639-1 hint ('en'); providers auto-detect without it. */
  language?: string;
  /** Expected number of speakers, when known (helps diarization). */
  speakers?: number;
  signal?: AbortSignal;
}

export interface SpeechToText {
  /** Stored with the transcript ('fish:transcribe-1-pro'). */
  readonly id: string;
  /** Longest single file the provider accepts, in seconds. */
  readonly maxSeconds: number;
  transcribe(audio: Blob, opts?: TranscribeOptions): Promise<Transcript>;
}

/** A provider failure that is worth retrying later (network, 429, 5xx) vs one that is not (bad audio, too long). */
export class SpeechToTextError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = 'SpeechToTextError';
  }
}

/** "speaker:0" / "SPEAKER_1" / "1" -> "Speaker 1" / "Speaker 2" / "Speaker 2". */
export function speakerLabel(raw: unknown): string {
  const m = /(\d+)\s*$/.exec(String(raw ?? ''));
  return m ? `Speaker ${Number(m[1]) + 1}` : 'Speaker';
}

/**
 * One transcript from several audio segments (a pause in consent ends a
 * segment). Each part is shifted by when its segment started, relative to the
 * first, so times read as one call.
 */
export function joinTranscripts(parts: { offsetSec: number; transcript: Transcript }[]): Transcript {
  const sorted = [...parts].sort((a, b) => a.offsetSec - b.offsetSec);
  const turns: TranscriptTurn[] = [];
  let durationSec = 0;
  let language: string | null = null;
  for (const { offsetSec, transcript } of sorted) {
    const off = Math.max(0, offsetSec);
    for (const t of transcript.turns) turns.push({ ...t, start: round2(t.start + off), end: round2(t.end + off) });
    if (!transcript.turns.length && transcript.text.trim()) turns.push({ speaker: 'Speaker', start: round2(off), end: round2(off + transcript.durationSec), text: transcript.text.trim() });
    durationSec = Math.max(durationSec, off + transcript.durationSec);
    language ??= transcript.language;
  }
  return { text: turns.map((t) => t.text).join(' ').trim(), durationSec: round2(durationSec), turns, language };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** 75.4 -> "01:15"; 3700 -> "1:01:40". */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Plain-text transcript, one turn per line: "[01:15] Speaker 1: ...". Consecutive turns by one speaker merge. */
export function transcriptLines(turns: TranscriptTurn[]): string {
  const merged: TranscriptTurn[] = [];
  for (const t of turns) {
    const text = t.text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const last = merged[merged.length - 1];
    if (last && last.speaker === t.speaker && t.start - last.end < 2) {
      last.text = `${last.text} ${text}`;
      last.end = t.end;
    } else merged.push({ ...t, text });
  }
  return merged.map((t) => `[${clock(t.start)}] ${t.speaker}: ${t.text}`).join('\n');
}

/**
 * Transcribe every audio segment in order and join them. `load` fetches one
 * segment's audio; a segment longer than the provider allows is refused up
 * front instead of being sent.
 */
export async function transcribeSegments(
  stt: SpeechToText,
  segments: { path: string; offsetSec: number; durationSec?: number | null }[],
  load: (path: string) => Promise<Blob>,
  opts: TranscribeOptions = {},
): Promise<Transcript> {
  const parts: { offsetSec: number; transcript: Transcript }[] = [];
  for (const seg of segments) {
    if (seg.durationSec && seg.durationSec > stt.maxSeconds) throw new SpeechToTextError(`A recording segment is ${Math.round(seg.durationSec / 60)} minutes long; the limit is ${Math.round(stt.maxSeconds / 60)}.`, false);
    const audio = await load(seg.path);
    parts.push({ offsetSec: seg.offsetSec, transcript: await stt.transcribe(audio, opts) });
  }
  return joinTranscripts(parts);
}
