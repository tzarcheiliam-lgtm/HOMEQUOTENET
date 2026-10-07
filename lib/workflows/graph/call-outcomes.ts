/**
 * AI-call results for the visual workflow engine.
 *
 * Two DIFFERENT things are tracked and must never be conflated:
 *   - execution status  what happened to the call itself (ai_call_jobs.status:
 *                       queued, accepted, answered, completed, no_answer, failed...)
 *   - outcome           what the conversation produced (booked, callback requested,
 *                       needs a human, opted out...), read ONLY from the post-call
 *                       analysis the Fish agent returned.
 * "completed" never implies "qualified": a finished call with no explicit signal in
 * its analysis resolves to `needs_human_review`.
 */

export const CALL_OUTCOMES = [
  'booked',
  'qualified_awaiting_scheduling',
  'callback_requested',
  'needs_human_review',
  'no_answer',
  'wrong_number',
  'opted_out',
  'failed',
  'timed_out',
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  booked: 'Booked an appointment',
  qualified_awaiting_scheduling: 'Qualified, needs scheduling',
  callback_requested: 'Asked for a callback',
  needs_human_review: 'Needs human review',
  no_answer: 'No answer',
  wrong_number: 'Wrong number',
  opted_out: 'Opted out',
  failed: 'Call failed',
  timed_out: 'No result in time',
};

/** Analysis `data` field names the Fish agent should be configured to return. */
export const CALL_ANALYSIS_FIELDS = [
  { name: 'call_outcome', type: 'text', note: 'One of: booked, qualified_awaiting_scheduling, callback_requested, needs_human_review, wrong_number' },
  { name: 'appointment_booked', type: 'boolean', note: 'The homeowner agreed to a specific appointment time' },
  { name: 'qualified', type: 'boolean', note: 'The homeowner is a real, in-area prospect for this service' },
  { name: 'callback_requested', type: 'boolean', note: 'The homeowner asked to be called back' },
  { name: 'callback_time', type: 'text', note: 'ISO date-time the homeowner asked to be called back (optional)' },
  { name: 'wrong_number', type: 'boolean', note: 'The person reached is not the homeowner / number is wrong' },
  { name: 'do_not_call', type: 'boolean', note: 'The person asked not to be contacted again (also: opt_out)' },
] as const;

/** The slice of ai_call_jobs the resolver needs (kept structural so tests need no database). */
export interface CallJobFacts {
  status: string;
  dial_status?: string | null;
  last_error?: string | null;
  block_reason?: string | null;
  attempts?: number | null;
  max_attempts?: number | null;
  analysis?: { status?: string | null; summary?: string | null; data?: { name?: string; value?: unknown }[]; error?: string | null } | null;
  conversation_ended_at?: string | null;
  updated_at?: string | null;
}

export interface CallResult {
  executionStatus: string;
  outcome: CallOutcome;
  /** Machine reason, safe to store (no transcript text). */
  reason: string;
  callbackAt: string | null;
  attempts: number;
}

export type CallResolution = { state: 'pending'; reason: string; recheckAt?: Date } | { state: 'final'; result: CallResult };

const truthy = (v: unknown) => v === true || (typeof v === 'string' && /^(true|yes|1)$/i.test(v.trim()));
const IN_FLIGHT = new Set(['queued', 'dispatching', 'accepted', 'answered']);

function field(data: { name?: string; value?: unknown }[], ...names: string[]) {
  const wanted = names.map((n) => n.toLowerCase());
  return data.find((d) => typeof d.name === 'string' && wanted.includes(d.name.toLowerCase()))?.value;
}

/** Pure: has this call produced a result the workflow can branch on yet? */
export function resolveCallOutcome(
  job: CallJobFacts,
  opts: { now: Date; analysisGraceMinutes: number }
): CallResolution {
  const attempts = Number(job.attempts ?? 0);
  const base = { executionStatus: job.status, attempts, callbackAt: null as string | null };
  const final = (outcome: CallOutcome, reason: string, extra: Partial<CallResult> = {}): CallResolution => ({
    state: 'final',
    result: { ...base, outcome, reason, ...extra },
  });

  if (IN_FLIGHT.has(job.status)) return { state: 'pending', reason: `call_${job.status}` };

  switch (job.status) {
    case 'no_answer':
    case 'busy':
      return final('no_answer', `dial_${job.status}`);
    case 'blocked': {
      const why = job.block_reason ?? 'blocked';
      // Opt-out / do-not-call blocks are an opt-out for the workflow too.
      if (why === 'opted_out' || why === 'do_not_call') return final('opted_out', why);
      return final('failed', `blocked:${why}`);
    }
    case 'failed':
    case 'cancelled':
    case 'expired':
      return final('failed', job.last_error ?? job.status);
    case 'completed':
      break;
    default:
      return final('failed', `unknown_status:${job.status}`);
  }

  // completed: the conversation ended. The qualification result lives in the analysis.
  const analysis = job.analysis;
  if (!analysis) {
    const endedAt = Date.parse(job.conversation_ended_at ?? job.updated_at ?? '');
    const waitedMs = Number.isNaN(endedAt) ? 0 : opts.now.getTime() - endedAt;
    if (waitedMs >= opts.analysisGraceMinutes * 60_000) return final('needs_human_review', 'analysis_unavailable');
    const deadline = Number.isNaN(endedAt) ? opts.now.getTime() + opts.analysisGraceMinutes * 60_000 : endedAt + opts.analysisGraceMinutes * 60_000;
    return { state: 'pending', reason: 'awaiting_analysis', recheckAt: new Date(deadline) };
  }
  if (analysis.status && analysis.status !== 'completed') return final('needs_human_review', 'analysis_failed');

  const data = Array.isArray(analysis.data) ? analysis.data : [];
  const callbackRaw = field(data, 'callback_time', 'callback_at');
  const callbackMs = typeof callbackRaw === 'string' ? Date.parse(callbackRaw) : NaN;
  const callbackAt = Number.isNaN(callbackMs) ? null : new Date(callbackMs).toISOString();

  if (truthy(field(data, 'do_not_call', 'opt_out'))) return final('opted_out', 'asked_not_to_be_contacted');
  if (truthy(field(data, 'wrong_number'))) return final('wrong_number', 'wrong_number');

  const explicit = field(data, 'call_outcome');
  if (typeof explicit === 'string') {
    const key = explicit.trim().toLowerCase() as CallOutcome;
    if (['booked', 'qualified_awaiting_scheduling', 'callback_requested', 'needs_human_review', 'wrong_number'].includes(key)) {
      return final(key, 'analysis_call_outcome', { callbackAt: key === 'callback_requested' ? callbackAt : null });
    }
  }
  if (truthy(field(data, 'appointment_booked', 'booked'))) return final('booked', 'analysis_appointment_booked');
  if (truthy(field(data, 'callback_requested'))) return final('callback_requested', 'analysis_callback_requested', { callbackAt });
  if (truthy(field(data, 'qualified'))) return final('qualified_awaiting_scheduling', 'analysis_qualified');
  return final('needs_human_review', 'no_explicit_outcome');
}

/** A call node gave up waiting (no webhook within its timeout). */
export function timedOutCallResult(job: CallJobFacts | null, reason = 'result_timeout'): CallResult {
  return {
    executionStatus: job?.status ?? 'unknown',
    outcome: 'timed_out',
    reason,
    callbackAt: null,
    attempts: Number(job?.attempts ?? 0),
  };
}
