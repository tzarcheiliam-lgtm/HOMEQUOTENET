import 'server-only';

import { after } from 'next/server';
import type { createAdminClient } from '@/lib/supabase/admin';
import type { WorkflowError } from '@/lib/workflows';
import { runAiCallQueue } from '@/lib/ai-calling/run.server';
import type { BookingEvidence, CallJobFacts } from './call-outcomes';
import type { CallRequestResult } from './engine';
import { buildCallBrief, type GraphEvaluationContext } from './render';

type Db = ReturnType<typeof createAdminClient>;

/**
 * When may a workflow REUSE an existing call instead of placing its own?  (rule documented in
 * docs/visual-workflow-builder.md, "Reusing the automatic call")
 *
 * Only the call the automatic form-to-call feature (`auto_form`) created for THIS enrollment:
 *   - same lead, same contractor, same phone number as the lead has now,
 *   - the workflow's trigger is the event that creates that call (a lead being assigned), and
 *   - the job was created within a few minutes of the triggering event (either side),
 *     so a call from an earlier day, an earlier assignment or an earlier enrollment is never reused.
 * A manual call, another workflow's call, or any older call is NOT reused and never completes this
 * run; the queue's own guards (24 h duplicate window, opt-out, calling window) still decide whether
 * the workflow's own call may be placed, so the homeowner is not double-called.
 */
const AUTO_CALL_WINDOW_MS = 5 * 60_000;
const ADOPT_TRIGGERS = new Set(['lead.assigned', 'lead.created']);

const err = (code: string, message: string, kind: 'temporary' | 'permanent'): WorkflowError => ({ code, message, kind, retryable: kind === 'temporary' });

export interface WorkflowCallInput {
  db: Db;
  run: { id: string; contractorId: string | null };
  stepRun: { id: string };
  nodeId: string;
  config: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  ctx: GraphEvaluationContext;
  eventType: string;
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

  // 2. Reuse ONLY the automatic call made for this very enrollment (see ADOPT rule above).
  const phone = typeof lead?.phone_e164 === 'string' ? lead.phone_e164 : null;
  const eventAt = Date.parse(input.eventOccurredAt);
  if (ADOPT_TRIGGERS.has(input.eventType) && phone && !Number.isNaN(eventAt)) {
    const existing = await db
      .from('ai_call_jobs')
      .select('id,status,trigger_source,created_at,contact_phone,workflow_run_id')
      .eq('lead_id', leadId)
      .eq('contractor_id', contractorId)
      .eq('trigger_source', 'auto_form')
      .eq('contact_phone', phone)
      .gte('created_at', new Date(eventAt - AUTO_CALL_WINDOW_MS).toISOString())
      .lte('created_at', new Date(eventAt + AUTO_CALL_WINDOW_MS).toISOString())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1);
    if (existing.error) return { ok: false, error: err('call_lookup_failed', 'Could not look up existing calls', 'temporary') };
    const hit = ((existing.data ?? []) as { id: string }[])[0];
    if (hit) return { ok: true, jobId: hit.id, adopted: true };
  }

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

/**
 * The call's facts for the run that is waiting on it. `association` is 'mismatch' when the job is not
 * for the run's own lead + contractor, in which case the run must never take its result.
 */
export async function callJobFacts(db: Db, jobId: string, expected?: { leadId: string | null; contractorId: string | null }): Promise<CallJobFacts | null> {
  const { data } = await db
    .from('ai_call_jobs')
    .select('status,dial_status,last_error,block_reason,attempts,max_attempts,analysis,conversation_ended_at,updated_at,lead_id,contractor_id')
    .eq('id', jobId)
    .maybeSingle();
  if (!data) return null;
  const { lead_id, contractor_id, ...facts } = data as CallJobFacts & { lead_id: string | null; contractor_id: string | null };
  const mismatch = !!expected && ((expected.leadId && lead_id !== expected.leadId) || (expected.contractorId && contractor_id !== expected.contractorId));
  return { ...facts, association: mismatch ? 'mismatch' : 'ok' };
}

/**
 * A booked claim is confirmed only by an appointment for the SAME lead and contractor as the call
 * (appointments hang off lead_assignments), created after the call began, and not cancelled/no-show.
 */
export async function callBookingEvidence(db: Db, jobId: string): Promise<BookingEvidence | null> {
  const { data: job } = await db.from('ai_call_jobs').select('lead_id,contractor_id,created_at,conversation_started_at').eq('id', jobId).maybeSingle();
  const j = job as { lead_id: string | null; contractor_id: string | null; created_at: string; conversation_started_at: string | null } | null;
  if (!j?.lead_id || !j.contractor_id) return null;
  const { data: assignments } = await db.from('lead_assignments').select('id').eq('lead_id', j.lead_id).eq('contractor_id', j.contractor_id);
  const ids = ((assignments ?? []) as { id: string }[]).map((a) => a.id);
  if (!ids.length) return { confirmed: false };
  const since = j.conversation_started_at ?? j.created_at;
  const { data: appts } = await db
    .from('appointments')
    .select('id,status,created_at')
    .in('assignment_id', ids)
    .in('status', ['scheduled', 'held', 'rescheduled'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1);
  const hit = ((appts ?? []) as { id: string }[])[0];
  return hit ? { confirmed: true, appointmentId: hit.id } : { confirmed: false };
}
