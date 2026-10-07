import { aiCallingEnabled } from './config';
import { evaluateEligibility } from './eligibility';
import type { AiCallJob, AiCallingSettings, JobStore } from './types';

/**
 * Queue orchestration: claim due jobs, re-check every rule, then ask Fish to
 * place the call. A job is only 'accepted' after Fish returned a session id;
 * a database row alone never means a call was placed.
 */
export interface CreateCallInput {
  agentId: string; phoneNumberId: string; toNumber: string; idempotencyKey: string;
  dynamicVariables?: Record<string, string | number | boolean>;
  metadata?: Record<string, unknown>;
}
export type CreateCall = (i: CreateCallInput) => Promise<{ sessionId: string; status: 'queued' }>;

export interface DispatchDeps {
  store: JobStore;
  createCall: CreateCall;
  now?: () => Date;
  /** Env master switch; injected for tests. */
  envEnabled?: () => boolean;
  worker?: string;
}

export type DispatchOutcome =
  | { job: string; result: 'accepted'; sessionId: string }
  | { job: string; result: 'blocked'; reason: string }
  | { job: string; result: 'deferred'; until: string }
  | { job: string; result: 'retry' | 'failed'; error: string }
  | { job: string; result: 'released' };

const DUP_WINDOW_MS = { auto_form: 24 * 3_600_000, manual: 30 * 60_000 };
/** HTTP statuses that will not succeed on retry (bad request, auth, billing, not found, validation). */
const PERMANENT_HTTP = new Set([400, 401, 402, 403, 404, 422]);

/** Admin-entered text is data for the agent, never instructions: one line, capped, no control characters. */
export function sanitizeContext(s: string | null | undefined, max = 500): string {
  return (s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function idempotencyKeyFor(job: Pick<AiCallJob, 'id' | 'key_seq'>): string {
  return `aicall-${job.id}-${job.key_seq}`;
}

export interface BatchResult { skipped?: string; claimed: number; outcomes: DispatchOutcome[] }

/** Worker entry point: one scheduler tick. */
export async function processAiCallQueue(deps: DispatchDeps, opts: { limit?: number; onlyId?: string } = {}): Promise<BatchResult> {
  const { store } = deps;
  const env = (deps.envEnabled ?? (() => aiCallingEnabled()))();
  if (!env) return { skipped: 'env_disabled', claimed: 0, outcomes: [] };
  const settings = await store.getSettings();
  if (!settings.enabled) return { skipped: 'admin_stopped', claimed: 0, outcomes: [] };

  const jobs = await store.claim(opts.limit ?? 10, deps.worker ?? `worker-${Math.random().toString(36).slice(2, 8)}`, opts.onlyId);
  const outcomes: DispatchOutcome[] = [];
  for (const job of jobs) {
    // Re-read the stop switch before EVERY call so an emergency stop takes effect mid-batch.
    const live = await store.getSettings();
    if (!live.enabled || !(deps.envEnabled ?? (() => aiCallingEnabled()))()) {
      await store.updateJob(job.id, { status: 'queued', locked_by: null, locked_until: null });
      outcomes.push({ job: job.id, result: 'released' });
      continue;
    }
    try {
      outcomes.push(await dispatchOne(deps, job, live));
    } catch (e) {
      // Never leave a job stuck in 'dispatching' without a reason.
      const msg = e instanceof Error ? e.message.slice(0, 200) : 'unknown_error';
      await store.updateJob(job.id, { status: 'queued', locked_by: null, locked_until: null, last_error: `worker_error: ${msg}`, run_at: new Date((deps.now?.() ?? new Date()).getTime() + 2 * 60_000).toISOString() });
      outcomes.push({ job: job.id, result: 'retry', error: msg });
    }
  }
  return { claimed: jobs.length, outcomes };
}


/** Gathers every fact for a job and applies the eligibility rules. Shared by the worker and the manual-call preflight. */
export async function decideForJob(store: JobStore, job: AiCallJob, settings: AiCallingSettings, now: Date) {
  const lead = job.lead_id ? await store.getLead(job.lead_id) : null;
  const cs = job.contractor_id ? await store.getContractorSettings(job.contractor_id) : null;
  const phone = lead?.phone_e164 ?? job.contact_phone;
  const consent = lead
    // A lead's consent is ONLY what the lead itself recorded (its own wording); a job-level basis never substitutes for it.
    ? { granted: lead.consent_granted, at: lead.consent_at, disclosure: lead.consent_disclosure, basis: null, reference: null }
    : { granted: !!job.consent_at, at: job.consent_at, disclosure: null, basis: job.consent_basis, reference: job.consent_reference };
  const decision = evaluateEligibility({
    trigger: job.trigger_source,
    now,
    // A call scheduled for later is judged from when it was meant to run, so it does not expire while it waits.
    createdAt: new Date(job.scheduled_for && new Date(job.scheduled_for) > new Date(job.created_at) ? job.scheduled_for : job.created_at),
    maxJobAgeHours: settings.max_job_age_hours,
    leadArchived: !!lead?.archived_at,
    qualificationStatus: lead?.qualification_status ?? null,
    contractorMode: cs?.mode ?? null,
    agentId: cs?.agent_id ?? null,
    phoneNumberId: cs?.phone_number_id ?? null,
    phone,
    consent,
    optedOut: phone ? await store.isOptedOut(phone) : false,
    doNotCall: phone ? await store.isDoNotCall(phone) : false,
    recentDuplicate: await store.hasRecentDuplicate(job, new Date(now.getTime() - DUP_WINDOW_MS[job.trigger_source]).toISOString()),
    state: lead?.state ?? job.contact_state,
    zip: lead?.zip ?? job.contact_zip,
    window: { startHour: settings.window_start_hour, endHour: settings.window_end_hour },
  });
  return { decision, lead, cs, phone };
}

async function dispatchOne(deps: DispatchDeps, job: AiCallJob, settings: AiCallingSettings): Promise<DispatchOutcome> {
  const { store } = deps;
  const now = deps.now?.() ?? new Date();
  const release = { locked_by: null, locked_until: null } as const;

  const { decision, lead, cs, phone } = await decideForJob(store, job, settings, now);

  if (decision.action === 'block') {
    await store.updateJob(job.id, { status: decision.reason === 'expired' ? 'expired' : 'blocked', block_reason: decision.reason, ...release });
    return { job: job.id, result: 'blocked', reason: decision.reason };
  }
  if (decision.action === 'defer') {
    await store.updateJob(job.id, { status: 'queued', run_at: decision.until.toISOString(), block_reason: null, last_error: null, ...release });
    return { job: job.id, result: 'deferred', until: decision.until.toISOString() };
  }

  if (job.attempts >= job.max_attempts) {
    await store.updateJob(job.id, { status: 'failed', last_error: 'retries_exhausted', ...release });
    return { job: job.id, result: 'failed', error: 'retries_exhausted' };
  }
  const attempts = job.attempts + 1;
  // Count the attempt BEFORE calling so a crash mid-request cannot grant free retries.
  await store.updateJob(job.id, { attempts });

  const first = (job.contact_name ?? lead?.first_name ?? '').trim().split(/\s+/)[0] ?? '';
  try {
    const res = await deps.createCall({
      agentId: cs!.agent_id!, phoneNumberId: cs!.phone_number_id!, toNumber: phone!,
      idempotencyKey: idempotencyKeyFor(job),
      dynamicVariables: {
        contact_first_name: sanitizeContext(first, 60),
        company_name: sanitizeContext(cs!.contractor_name, 120),
        call_purpose: sanitizeContext(job.purpose, 200),
        call_context: sanitizeContext(job.context, 500),
      },
      metadata: { job_id: job.id, lead_id: job.lead_id, contractor_id: job.contractor_id, trigger_source: job.trigger_source },
    });
    // Compare-and-set: if Fish's webhook already advanced the job (answered/completed), only record the session id.
    const advanced = await store.updateJobIf(job.id, 'dispatching', { status: 'accepted', provider_session_id: res.sessionId, last_error: null, block_reason: null, ...release });
    if (!advanced) await store.updateJob(job.id, { provider_session_id: res.sessionId, last_error: null, ...release });
    return { job: job.id, result: 'accepted', sessionId: res.sessionId };
  } catch (e) {
    const status = (e as { status?: number }).status ?? 0;
    const code = status ? `fish_http_${status}` : 'fish_unreachable';
    if (PERMANENT_HTTP.has(status) || attempts >= job.max_attempts) {
      await store.updateJob(job.id, { status: 'failed', last_error: attempts >= job.max_attempts && !PERMANENT_HTTP.has(status) ? `retries_exhausted:${code}` : code, ...release });
      return { job: job.id, result: 'failed', error: code };
    }
    // Retryable (429/5xx/timeout/409): same idempotency key, so a call Fish already placed is not repeated.
    const delayMs = Math.min(2 * attempts, 30) * 60_000;
    await store.updateJob(job.id, { status: 'queued', run_at: new Date(now.getTime() + delayMs).toISOString(), last_error: code, ...release });
    return { job: job.id, result: 'retry', error: code };
  }
}
