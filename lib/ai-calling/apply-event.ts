import type { AiCallJob, JobStatus, JobStore } from './types';

/**
 * Applies a verified Fish webhook payload to the matching job. Idempotent and
 * order-tolerant: Fish delivers at least once and a status never moves
 * backwards (a late `answered` cannot undo `completed`).
 *
 * Fish events: https://docs.fish.audio/agents/monitor/webhooks
 *   phone_call.dial_finished  dial_status: answered | busy | no_answer | failed
 *   call.ended                session end (duration, ended_reason)
 *   call.analyzed             post-call analysis (summary, data, criteria_results)
 * There is no documented "ringing" event, so ringing is not distinguishable.
 */
const RANK: Partial<Record<JobStatus, number>> = { queued: 0, dispatching: 1, accepted: 2, answered: 3, completed: 4 };
const DIAL_FAIL: Record<string, JobStatus> = { busy: 'busy', no_answer: 'no_answer', failed: 'failed' };

interface Payload {
  event?: string;
  dial_status?: string;
  session?: {
    id?: string; metadata?: Record<string, unknown> | null; duration_seconds?: number | null;
    end_reason?: string | null; conversation_started_at?: string | null; conversation_ended_at?: string | null;
  };
  ended_reason?: string | null;
  analysis?: { status?: string; summary?: string | null; data?: { name?: string; value?: unknown }[]; criteria_results?: unknown[]; finished_at?: string; error?: string };
}

export interface ApplyDeps { store: JobStore; now?: () => Date; settings: { retry_delay_minutes: number } }
export type ApplyResult = { matched: false } | { matched: true; jobId: string; status: JobStatus; redial?: boolean };

const truthy = (v: unknown) => v === true || (typeof v === 'string' && /^(true|yes|1)$/i.test(v.trim()));
const rankOf = (s: JobStatus) => RANK[s] ?? -1;

export async function applyFishEvent(payload: Payload, deps: ApplyDeps): Promise<ApplyResult> {
  const { store } = deps;
  const now = deps.now?.() ?? new Date();
  const metaJob = payload.session?.metadata && typeof payload.session.metadata.job_id === 'string' ? payload.session.metadata.job_id : null;
  const job = await store.findJob({ jobId: metaJob, sessionId: payload.session?.id ?? null });
  if (!job) return { matched: false };

  // Never trust a mismatching session id: the metadata job must own this provider session.
  if (job.provider_session_id && payload.session?.id && job.provider_session_id !== payload.session.id) return { matched: false };

  const patch: Partial<AiCallJob> = {};
  if (!job.provider_session_id && payload.session?.id) patch.provider_session_id = payload.session.id;
  let status: JobStatus = job.status;
  let redial = false;

  if (payload.event === 'phone_call.dial_finished') {
    const dial = payload.dial_status ?? '';
    patch.dial_status = dial;
    if (dial === 'answered') {
      if (rankOf(status) < rankOf('answered')) status = 'answered';
    } else if (DIAL_FAIL[dial] && (status === 'accepted' || status === 'dispatching')) {
      // Only from an in-flight call: a re-delivered event for a job already redialed/finished changes nothing.
      status = DIAL_FAIL[dial];
      patch.last_error = `dial_${dial}`;
      // Bounded redial: a NEW call (new idempotency key), only while attempts remain; the
      // dispatcher re-checks consent, opt-out and the calling window before it dials.
      if (job.attempts < job.max_attempts) {
        status = 'queued'; redial = true;
        patch.run_at = new Date(now.getTime() + (job.retry_delay_minutes ?? deps.settings.retry_delay_minutes) * 60_000).toISOString();
        patch.key_seq = job.key_seq + 1;
        patch.last_error = `redial_after_${dial}`;
      }
    }
  } else if (payload.event === 'call.ended') {
    const s = payload.session ?? {};
    patch.ended_reason = payload.ended_reason ?? s.end_reason ?? null;
    patch.duration_seconds = s.duration_seconds ?? null;
    patch.conversation_started_at = s.conversation_started_at ?? null;
    patch.conversation_ended_at = s.conversation_ended_at ?? null;
    if (rankOf(status) >= 0 && rankOf(status) < rankOf('completed')) status = 'completed';
  } else if (payload.event === 'call.analyzed' && payload.analysis) {
    const a = payload.analysis;
    patch.analysis = { status: a.status ?? null, summary: a.summary ?? null, data: a.data ?? [], criteria_results: a.criteria_results ?? [], finished_at: a.finished_at ?? null, error: a.error ?? null };
  }

  if (status !== job.status) patch.status = status;
  if (redial) { patch.locked_by = null; patch.locked_until = null; }
  if (Object.keys(patch).length) await store.updateJob(job.id, patch);

  await sideEffects(store, job, payload, status, now);
  return { matched: true, jobId: job.id, status, redial: redial || undefined };
}

async function sideEffects(store: JobStore, job: AiCallJob, p: Payload, status: JobStatus, now: Date) {
  const lead = job.lead_id;
  // contractor_id in the metadata scopes the activity to that contractor (and staff) via RLS.
  const eventKey = `${p.session?.id ?? job.id}:${p.event}`;
  const note = (body: string, kind = 'note') => lead ? store.addLeadActivity(lead, body, { source: 'ai_call', job_id: job.id, event_key: `${eventKey}:${kind}`, ...(job.contractor_id ? { contractor_id: job.contractor_id } : {}) }) : Promise.resolve();

  if (p.event === 'phone_call.dial_finished') {
    const d = p.dial_status ?? 'unknown';
    await note(`AI call: ${d === 'answered' ? 'answered' : d.replace('_', ' ')}`);
    if (job.prospect_id && (d === 'no_answer' || d === 'busy')) {
      await store.recordProspectResult(job, { outcome: 'no_answer', notes: `AI agent call: ${d.replace('_', ' ')}` });
    }
  } else if (p.event === 'call.ended') {
    const secs = p.session?.duration_seconds;
    await note(`AI call completed${typeof secs === 'number' ? ` (${secs}s)` : ''}`);
    if (lead && status === 'completed') await store.touchLeadContact(lead, now.toISOString());
  } else if (p.event === 'call.analyzed' && p.analysis) {
    const a = p.analysis;
    const flagged = (a.data ?? []).some((d) => (d.name === 'do_not_call' || d.name === 'opt_out') && truthy(d.value));
    if (a.summary) await note(`AI call summary: ${a.summary}`, 'summary');
    if (job.prospect_id && a.status === 'completed' && !flagged) {
      await store.recordProspectResult(job, { outcome: 'follow_up_required', notes: `AI agent call summary (review needed): ${a.summary ?? 'no summary'}` });
    }
    if (flagged && job.contact_phone) {
      // The contact asked not to be called: block this number and cancel anything still queued for it.
      await store.addOptOut(job.contact_phone, 'call_analysis', 'Requested no further calls during an AI call');
      await store.cancelQueuedForPhone(job.contact_phone, job.id);
      if (job.prospect_id) await store.recordProspectResult(job, { outcome: 'do_not_call', notes: 'Asked not to be called again during an AI agent call' });
      await note('Contact asked not to be called again; number added to the AI call opt-out list', 'opt_out');
    }
  }
}
