import 'server-only';

import { after } from 'next/server';
import type { createAdminClient } from '@/lib/supabase/admin';
import type { WorkflowError } from '@/lib/workflows';
import { runAiCallQueue } from '@/lib/ai-calling/run.server';
import type { CallJobFacts } from './call-outcomes';
import type { CallRequestResult } from './engine';
import { buildCallBrief, type GraphEvaluationContext } from './render';

type Db = ReturnType<typeof createAdminClient>;

const IN_FLIGHT = ['queued', 'dispatching', 'accepted', 'answered'];
/** A call the form-to-call feature already made for THIS lead event (created with the assignment). */
const AUTO_CALL_GRACE_MS = 2 * 60_000;
const ADOPT_WINDOW_MS = 24 * 3_600_000;

const err = (code: string, message: string, kind: 'temporary' | 'permanent'): WorkflowError => ({ code, message, kind, retryable: kind === 'temporary' });

export interface WorkflowCallInput {
  db: Db;
  run: { id: string; contractorId: string | null };
  stepRun: { id: string };
  nodeId: string;
  config: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  ctx: GraphEvaluationContext;
  eventOccurredAt: string;
  now: Date;
  contractorIdFromEvent: string | null;
}

/**
 * Starts a workflow call step: creates ONE pending ai_call_jobs row (or adopts the
 * call the automatic form-to-call feature already made) and returns. It never dials.
 * The existing queue worker does that, after re-checking every guard: global
 * switch, admin stop, contractor mode, consent wording, opt-out / do-not-call,
 * calling window and time zone, duplicate-call window.
 */
export async function requestWorkflowCall(input: WorkflowCallInput): Promise<CallRequestResult> {
  const { db, run, stepRun, nodeId, config, ctx, now } = input;
  const lead = ctx.lead;
  const leadId = typeof lead?.id === 'string' ? lead.id : null;
  const contractorId = run.contractorId ?? input.contractorIdFromEvent ?? (typeof ctx.assignment?.contractor_id === 'string' ? ctx.assignment.contractor_id : null);
  if (!leadId) return { ok: false, error: err('missing_lead', 'This step needs a lead', 'permanent') };
  if (!contractorId) return { ok: false, error: err('no_contractor', 'AI calls need a contractor', 'permanent') };

  // 1. Idempotent re-entry: the same step run always maps to the same job.
  const dedupeKey = `wf:${stepRun.id}`;
  const own = await db.from('ai_call_jobs').select('id').eq('dedupe_key', dedupeKey).maybeSingle();
  if (own.error) return { ok: false, error: err('call_lookup_failed', 'Could not look up the call', 'temporary') };
  if (own.data) return { ok: true, jobId: (own.data as { id: string }).id, adopted: false };

  // 2. Never double-call: reuse a call that is already in flight (or that the form-to-call
  //    feature created for this very lead event) instead of placing another.
  const since = new Date(now.getTime() - ADOPT_WINDOW_MS).toISOString();
  const existing = await db
    .from('ai_call_jobs')
    .select('id,status,trigger_source,created_at,workflow_run_id')
    .eq('lead_id', leadId)
    .eq('contractor_id', contractorId)
    .gte('created_at', since)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(10);
  if (existing.error) return { ok: false, error: err('call_lookup_failed', 'Could not look up existing calls', 'temporary') };
  const eventAt = Date.parse(input.eventOccurredAt);
  const adoptable = ((existing.data ?? []) as { id: string; status: string; trigger_source: string; created_at: string; workflow_run_id: string | null }[]).find((j) => {
    if (j.workflow_run_id === run.id) return false; // this run's own earlier call node: a deliberate second call
    if (IN_FLIGHT.includes(j.status)) return true;
    return j.trigger_source === 'auto_form' && !Number.isNaN(eventAt) && Date.parse(j.created_at) >= eventAt - AUTO_CALL_GRACE_MS;
  });
  if (adoptable) return { ok: true, jobId: adoptable.id, adopted: true };

  // 3. Place a new pending job.
  const brief = buildCallBrief(config as never, ctx, { phone: process.env.HOMEQUOTE_PHONE, siteUrl: process.env.NEXT_PUBLIC_SITE_URL });
  const settings = await db.from('ai_calling_settings').select('max_attempts').eq('id', true).maybeSingle();
  const cap = Number((settings.data as { max_attempts?: number } | null)?.max_attempts ?? 3);
  const fullName = [lead?.first_name, lead?.last_name].filter((x) => typeof x === 'string' && x).join(' ');
  const insert = await db
    .from('ai_call_jobs')
    .insert({
      trigger_source: 'workflow',
      dedupe_key: dedupeKey,
      contractor_id: contractorId,
      lead_id: leadId,
      contact_name: fullName || null,
      contact_phone: typeof lead?.phone_e164 === 'string' ? lead.phone_e164 : null,
      contact_state: typeof lead?.state === 'string' ? lead.state : null,
      contact_zip: typeof lead?.zip === 'string' ? lead.zip : null,
      purpose: brief.purpose,
      context: brief.context,
      consent_basis: typeof lead?.consent_source === 'string' ? lead.consent_source : null,
      consent_reference: leadId,
      consent_at: typeof lead?.consent_at === 'string' ? lead.consent_at : null,
      max_attempts: Math.max(1, Math.min(Number(config.maxAttempts ?? 1), cap)),
      retry_delay_minutes: Number(config.retryDelayMinutes ?? 60),
      window_start_hour: config.windowStartHour ?? null,
      window_end_hour: config.windowEndHour ?? null,
      run_at: now.toISOString(),
      workflow_run_id: run.id,
      workflow_step_key: nodeId,
    })
    .select('id')
    .single();
  if (insert.error) {
    if (insert.error.code === '23505') {
      const again = await db.from('ai_call_jobs').select('id').eq('dedupe_key', dedupeKey).maybeSingle();
      if (again.data) return { ok: true, jobId: (again.data as { id: string }).id, adopted: false };
    }
    return { ok: false, error: err('call_create_failed', 'Could not queue the call', 'temporary') };
  }
  // Best-effort nudge so the call goes out promptly; the 5-minute AI tick is the backstop.
  try { after(() => runAiCallQueue({ limit: 3 }).catch(() => undefined)); } catch { /* not in a request scope */ }
  return { ok: true, jobId: (insert.data as { id: string }).id, adopted: false };
}

export async function callJobFacts(db: Db, jobId: string): Promise<CallJobFacts | null> {
  const { data } = await db
    .from('ai_call_jobs')
    .select('status,dial_status,last_error,block_reason,attempts,max_attempts,analysis,conversation_ended_at,updated_at')
    .eq('id', jobId)
    .maybeSingle();
  return (data as CallJobFacts | null) ?? null;
}
