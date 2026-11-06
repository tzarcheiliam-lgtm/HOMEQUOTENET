import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { assistantModel } from '@/lib/assistant/config';
import { classifyProviderError } from '@/lib/assistant/errors';
import { estimateCostMicros } from '@/lib/assistant/pricing';
import { videoWhen } from '@/lib/video/copy';
import { clients, refreshSegments, type Clients, type RecordingRow, type SegmentRow } from './capture.server';
import { fishSpeechToText } from './fish-stt';
import { SpeechToTextError, transcribeSegments, transcriptLines, type SpeechToText, type Transcript, type TranscriptTurn } from './stt';
import { SUMMARY_MAX_TOKENS, SUMMARY_SCHEMA, buildSummaryPrompt, parseCallSummary, summaryNote, type CallSummary } from './summary';

/**
 * After a call: transcribe the audio segments (Fish Audio), have Claude write the summary, write it to
 * the prospect's notes or the lead's timeline, and delete the audio. Runs in its own function
 * (POST /api/video/transcripts/process, maxDuration 300) so a long transcription never holds up the
 * LiveKit webhook. Each step is saved as it finishes, so a retry skips what is already done.
 */

const MAX_ATTEMPTS = 3;
const RETRY_AFTER_MS = 10 * 60_000;
/** Wait this long in one run for LiveKit to finish uploading the last file. */
const UPLOAD_WAIT_MS = 60_000;
/** An egress still "active" this long after it started is treated as lost. */
const LOST_EGRESS_MS = 6 * 3_600_000;

export interface ProcessDeps {
  stt?: SpeechToText;
  anthropic?: Pick<Anthropic, 'messages'>;
  sleep?: (ms: number) => Promise<void>;
}

export type ProcessOutcome = 'done' | 'waiting' | 'failed' | 'skipped';

export async function processPendingRecordings(limit = 3, deps: ProcessDeps = {}): Promise<Record<ProcessOutcome, number>> {
  const counts: Record<ProcessOutcome, number> = { done: 0, waiting: 0, failed: 0, skipped: 0 };
  const c = clients();
  if (!c) return counts;
  const retryBefore = new Date(Date.now() - RETRY_AFTER_MS).toISOString();
  const [stopped, retry] = await Promise.all([
    c.db.from('video_recordings').select('id').eq('state', 'stopped').order('updated_at').limit(limit),
    c.db.from('video_recordings').select('id').eq('state', 'failed').lt('attempts', MAX_ATTEMPTS).lt('updated_at', retryBefore).order('updated_at').limit(limit),
  ]);
  const ids = [...((stopped.data as { id: string }[] | null) ?? []), ...((retry.data as { id: string }[] | null) ?? [])].map((r) => r.id).slice(0, limit);
  for (const id of ids) counts[await processRecording(c, id, deps)] += 1;
  return counts;
}

async function load(c: Clients, id: string) {
  const { data } = await c.db.from('video_recordings').select('id, meeting_kind, meeting_id, room_name, state, requested_by, requested_by_name, prospect_id, lead_id, meeting_context, capture_started_at, transcript_turns, summary, note_written_at, audio_deleted_at, attempts').eq('id', id).maybeSingle();
  return data as (RecordingRow & { transcript_turns: TranscriptTurn[] | null; summary: CallSummary | null; note_written_at: string | null; audio_deleted_at: string | null; attempts: number }) | null;
}

async function waitForUploads(c: Clients, id: string, sleep: (ms: number) => Promise<void>): Promise<SegmentRow[] | null> {
  const deadline = Date.now() + UPLOAD_WAIT_MS;
  for (;;) {
    const segs = await refreshSegments(c, id);
    const open = segs.filter((s) => (s.status === 'starting' || s.status === 'active') && Date.now() - new Date(s.started_at).getTime() < LOST_EGRESS_MS);
    if (!open.length) return segs;
    if (Date.now() > deadline) return null;
    await sleep(5_000);
  }
}

export async function processRecording(c: Clients, id: string, deps: ProcessDeps = {}): Promise<ProcessOutcome> {
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const rec = await load(c, id);
  if (!rec || (rec.state !== 'stopped' && rec.state !== 'failed')) return 'skipped';
  const segs = await waitForUploads(c, id, sleep);
  if (!segs) return 'waiting'; // the egress_ended webhook (or the next run) picks it up

  const { data: claimed } = await c.db
    .from('video_recordings')
    .update({ state: 'processing', attempts: (rec.attempts ?? 0) + 1, error: null })
    .eq('id', id)
    .in('state', ['stopped', 'failed'])
    .select('id')
    .maybeSingle();
  if (!claimed) return 'skipped';

  const fail = async (message: string, retryable: boolean): Promise<ProcessOutcome> => {
    await c.db.from('video_recordings').update({ state: 'failed', error: message.slice(0, 500), ...(retryable ? {} : { attempts: MAX_ATTEMPTS }) }).eq('id', id);
    return 'failed';
  };

  const files = segs.filter((s) => s.status === 'complete');
  const t0 = files.length ? new Date(files[0].started_at).getTime() : 0;

  // 1. Transcript (skipped on a retry that already has one).
  let turns = rec.transcript_turns;
  if (!turns) {
    if (!files.length) return fail('No audio was saved for this recording.', false);
    const stt = deps.stt ?? fishSpeechToText({ apiKey: c.cfg.fishApiKey, model: c.cfg.fishModel });
    let t: Transcript;
    try {
      t = await transcribeSegments(
        stt,
        files.map((s) => ({ path: s.storage_path, offsetSec: (new Date(s.started_at).getTime() - t0) / 1000, durationSec: s.duration_seconds })),
        async (path) => {
          const { data, error } = await c.db.storage.from(c.cfg.s3.bucket).download(path);
          if (error || !data) throw new SpeechToTextError('Could not read the call audio from storage.', true);
          return data;
        },
        { language: 'en', speakers: 2 },
      );
    } catch (e) {
      const err = e instanceof SpeechToTextError ? e : new SpeechToTextError('Speech-to-text failed.', true);
      return fail(err.message, err.retryable);
    }
    turns = t.turns;
    await c.db.from('video_recordings').update({
      stt_provider: stt.id,
      transcript_turns: turns,
      transcript_text: transcriptLines(turns),
      transcript_language: t.language,
      audio_seconds: t.durationSec,
    }).eq('id', id);
  }

  // 2. Audio goes as soon as the transcript is safe (unless the owner chose to keep it).
  if (!c.cfg.keepAudio && !rec.audio_deleted_at && segs.length) {
    const { error } = await c.db.storage.from(c.cfg.s3.bucket).remove(segs.map((s) => s.storage_path));
    if (!error) await c.db.from('video_recordings').update({ audio_deleted_at: new Date().toISOString() }).eq('id', id);
  }

  if (!turns.length) {
    await c.db.from('video_recordings').update({ state: 'done', error: 'No speech was detected.' }).eq('id', id);
    return 'done';
  }

  // 3. Summary.
  const ctx = rec.meeting_context ?? {};
  const when = ctx.startMs ? videoWhen(ctx.startMs, ctx.timeZone || 'America/Los_Angeles') : null;
  let summary = rec.summary;
  if (!summary) {
    const model = c.cfg.summaryModel ?? assistantModel();
    const prompt = buildSummaryPrompt({ kind: rec.meeting_kind, hostName: rec.requested_by_name, guestName: ctx.guestName ?? null, subject: ctx.subject ?? null, when }, turns);
    const api = deps.anthropic ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 120_000 });
    let res: Anthropic.Message;
    try {
      res = await api.messages.create({
        model,
        max_tokens: SUMMARY_MAX_TOKENS,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SUMMARY_SCHEMA } },
      });
    } catch (e) {
      const k = classifyProviderError(e);
      return fail(`Summary failed: ${k.message}`, k.code === 'provider_busy' || k.code === 'provider_error');
    }
    if (res.stop_reason === 'refusal') return fail('The AI declined to summarize this call.', false);
    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    summary = parseCallSummary(text);
    if (!summary) return fail(res.stop_reason === 'max_tokens' ? 'The summary was cut off.' : 'The summary came back in an unexpected shape.', true);
    const u = res.usage;
    await c.db.from('video_recordings').update({
      summary,
      suggested_outcome: summary.suggestedOutcome,
      summary_model: model,
      summary_cost_micros: estimateCostMicros(model, { input_tokens: u.input_tokens, output_tokens: u.output_tokens, cache_read_tokens: u.cache_read_input_tokens ?? 0, cache_write_tokens: u.cache_creation_input_tokens ?? 0 }),
    }).eq('id', id);
  }

  // 4. CRM note (once).
  if (!rec.note_written_at) {
    const minutes = turns.length ? Math.max(1, Math.round((turns[turns.length - 1].end - turns[0].start) / 60)) : null;
    const note = summaryNote(summary, { kind: rec.meeting_kind, when, minutes });
    let written = false;
    if (rec.prospect_id) {
      const { data, error } = await c.db.rpc('video_prepend_prospect_note', { p_prospect_id: rec.prospect_id, p_note: note });
      written = !error && data === true;
    } else if (rec.lead_id) {
      const { error } = await c.db.from('lead_activities').insert({ lead_id: rec.lead_id, actor_id: rec.requested_by, type: 'note', body: note, metadata: { source: 'video_call', recording_id: id } });
      written = !error;
    } else {
      written = true; // a meeting link with no prospect: the summary stays on the recording only
    }
    if (!written) return fail('Could not write the summary to the CRM.', true);
    await c.db.from('video_recordings').update({ note_written_at: new Date().toISOString() }).eq('id', id);
  }

  await c.db.from('video_recordings').update({ state: 'done', error: null }).eq('id', id);
  return 'done';
}
