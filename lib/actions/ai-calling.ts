'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { decideForJob } from '@/lib/ai-calling/dispatch';
import { createSupabaseJobStore } from '@/lib/ai-calling/store.server';
import { dispatchJobNow } from '@/lib/ai-calling/run.server';
import { BLOCK_LABELS, type BlockReason } from '@/lib/ai-calling/eligibility';
import { normalizeUsPhone } from '@/lib/ai-calling/phone';
import { FISH_ID } from '@/lib/ai-calling/config-status';
import { STATE_ZONES } from '@/lib/ai-calling/timezone';
import { aiCallingEnabled } from '@/lib/ai-calling/config';
import type { AiCallJob } from '@/lib/ai-calling/types';

/**
 * Admin-only server actions for AI calling. Every action re-checks the role on the SERVER
 * (the UI hiding a button is never the control), writes with the service role, and leaves an
 * audit_logs entry. Secrets never pass through here: only Fish identifiers and call details.
 */
export type AiActionState = { ok: boolean; message?: string; error?: string } | undefined;

const PATHS = ['/app/ai-calls'];
const refresh = (extra?: string) => { for (const p of PATHS) revalidatePath(p); if (extra) revalidatePath(extra); };
async function audit(actor: string, action: string, metadata: Record<string, unknown>) {
  await createAdminClient().from('audit_logs').insert({ actor_id: actor, action, metadata });
}
const str = (fd: FormData, k: string) => { const v = fd.get(k); const s = v === null ? '' : String(v).trim(); return s === '' ? null : s; };

/* ---- Global switch / emergency stop ---------------------------------------------------- */

export async function setCallingEnabled(fd: FormData): Promise<void> {
  const me = await requireRole(['admin']);
  const enable = fd.get('enabled') === 'true';
  const now = new Date().toISOString();
  const { error } = await createAdminClient().from('ai_calling_settings').update(
    enable ? { enabled: true, stopped_at: null, stopped_by: null, updated_at: now, updated_by: me.id }
           : { enabled: false, stopped_at: now, stopped_by: me.id, updated_at: now, updated_by: me.id }).eq('id', true);
  if (error) throw new Error('Could not update the calling switch');
  await audit(me.id, enable ? 'ai_calling.enable' : 'ai_calling.emergency_stop', { env_enabled: aiCallingEnabled() });
  refresh();
}

const settingsSchema = z.object({
  window_start_hour: z.coerce.number().int().min(0).max(23),
  window_end_hour: z.coerce.number().int().min(1).max(24),
  max_attempts: z.coerce.number().int().min(1).max(6),
  retry_delay_minutes: z.coerce.number().int().min(5).max(1440),
  max_job_age_hours: z.coerce.number().int().min(1).max(720),
}).refine((v) => v.window_start_hour < v.window_end_hour, { message: 'The window must open before it closes' });

export async function saveCallingSettings(_p: AiActionState, fd: FormData): Promise<AiActionState> {
  const me = await requireRole(['admin']);
  const parsed = settingsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };
  const { error } = await createAdminClient().from('ai_calling_settings').update({ ...parsed.data, updated_at: new Date().toISOString(), updated_by: me.id }).eq('id', true);
  if (error) return { ok: false, error: 'Could not save settings' };
  await audit(me.id, 'ai_calling.settings', parsed.data);
  refresh();
  return { ok: true, message: 'Settings saved' };
}

/* ---- Per-contractor mode + Fish identifiers -------------------------------------------- */

const contractorSchema = z.object({
  contractor_id: z.string().uuid(),
  mode: z.enum(['off', 'manual_only', 'automatic', 'workflow_only']),
  agent_id: z.string().trim().optional().nullable(),
  phone_number_id: z.string().trim().optional().nullable(),
});

export async function saveContractorCalling(_p: AiActionState, fd: FormData): Promise<AiActionState> {
  const me = await requireRole(['admin']);
  const parsed = contractorSchema.safeParse({ contractor_id: str(fd, 'contractor_id'), mode: str(fd, 'mode'), agent_id: str(fd, 'agent_id'), phone_number_id: str(fd, 'phone_number_id') });
  if (!parsed.success) return { ok: false, error: 'Check the values' };
  const d = parsed.data;
  const agent = d.agent_id || null, phone = d.phone_number_id || null;
  if ((agent && !FISH_ID.test(agent)) || (phone && !FISH_ID.test(phone))) return { ok: false, error: 'Fish ids may only contain letters, numbers, dashes and underscores' };
  // Never enable a broken configuration: calling needs both identifiers.
  if (d.mode !== 'off' && (!agent || !phone)) return { ok: false, error: 'Add both the Fish agent id and the Fish phone number id before turning calling on for this contractor' };
  const { error } = await createAdminClient().from('ai_calling_contractor_settings').upsert(
    { contractor_id: d.contractor_id, mode: d.mode, agent_id: agent, phone_number_id: phone, updated_by: me.id, updated_at: new Date().toISOString() }, { onConflict: 'contractor_id' });
  if (error) return { ok: false, error: 'Could not save this contractor' };
  await audit(me.id, 'ai_calling.contractor', { contractor_id: d.contractor_id, mode: d.mode, agent_id: agent, phone_number_id: phone });
  refresh();
  return { ok: true, message: d.mode === 'automatic' ? 'Saved. New form leads for this contractor will be called automatically.' : d.mode === 'workflow_only' ? 'Saved. Only published automations will place calls for this contractor.' : 'Saved' };
}

/* ---- Cancel / retry ------------------------------------------------------------------------ */

export async function cancelJob(fd: FormData): Promise<void> {
  const me = await requireRole(['admin']);
  const id = z.string().uuid().parse(fd.get('id'));
  // Only waiting jobs: a call already handed to the provider cannot be recalled from here.
  const { data } = await createAdminClient().from('ai_call_jobs').update({ status: 'cancelled', block_reason: 'cancelled_by_admin', locked_by: null, locked_until: null, updated_at: new Date().toISOString() })
    .eq('id', id).in('status', ['queued', 'blocked']).select('id');
  if (data?.length) await audit(me.id, 'ai_call.cancel', { job_id: id });
  refresh(`/app/ai-calls/${id}`);
}

const RETRYABLE: readonly string[] = ['failed', 'no_answer', 'busy', 'blocked', 'expired'];

export async function retryJob(fd: FormData): Promise<void> {
  const me = await requireRole(['admin']);
  const id = z.string().uuid().parse(fd.get('id'));
  const db = createAdminClient();
  const { data: job } = await db.from('ai_call_jobs').select('*').eq('id', id).maybeSingle();
  const j = job as AiCallJob | null;
  if (!j || !RETRYABLE.includes(j.status)) return;
  const now = new Date().toISOString();
  const { data: updated } = await db.from('ai_call_jobs').update({
    status: 'queued', run_at: now, block_reason: null, last_error: null, locked_by: null, locked_until: null,
    // A new call (new idempotency key) only if the provider was already asked to dial.
    key_seq: j.attempts > 0 ? j.key_seq + 1 : j.key_seq,
    max_attempts: Math.max(j.max_attempts, j.attempts + 1),
    // An admin retry is explicit approval to release an expired job.
    ...(j.status === 'expired' ? { created_at: now } : {}),
    updated_at: now,
  }).eq('id', id).eq('status', j.status).select('id');
  if (!updated?.length) return;
  await audit(me.id, 'ai_call.retry', { job_id: id, from: j.status });
  try { await dispatchJobNow(id); } catch { /* the scheduled tick will pick it up */ }
  refresh(`/app/ai-calls/${id}`);
}

/* ---- Opt-outs ------------------------------------------------------------------------------ */

export async function addOptOut(_p: AiActionState, fd: FormData): Promise<AiActionState> {
  const me = await requireRole(['admin']);
  const phone = normalizeUsPhone(str(fd, 'phone'));
  if (!phone) return { ok: false, error: 'Enter a valid US or Canada phone number' };
  const db = createAdminClient();
  const { error } = await db.from('ai_call_opt_outs').upsert({ phone_e164: phone, source: 'admin', reason: str(fd, 'reason')?.slice(0, 300) ?? null, created_by: me.id }, { onConflict: 'phone_e164', ignoreDuplicates: true });
  if (error) return { ok: false, error: 'Could not save the opt-out' };
  await db.from('ai_call_jobs').update({ status: 'cancelled', block_reason: 'opted_out', updated_at: new Date().toISOString() }).eq('contact_phone', phone).eq('status', 'queued');
  await audit(me.id, 'ai_calling.opt_out', { phone_last4: phone.slice(-4) });
  refresh();
  return { ok: true, message: 'Number added to the AI call opt-out list; queued calls to it were cancelled' };
}

/* ---- Manual calls -------------------------------------------------------------------------- */

export type ManualCallState = undefined | {
  ok: boolean; error?: string; jobId?: string;
  /** Final job status after the provider was asked (immediate calls). */
  status?: string; placed?: boolean; sessionId?: string | null; detail?: string;
};

const manualSchema = z.object({
  token: z.string().uuid(),
  contractor_id: z.string().uuid(),
  contact_mode: z.enum(['lead', 'new']),
  lead_id: z.string().uuid().optional().nullable(),
  contact_name: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  state: z.string().trim().length(2).optional().nullable(),
  zip: z.string().trim().regex(/^\d{5}$/, 'ZIP must be 5 digits').optional().nullable(),
  consent_basis: z.enum(['written', 'verbal', 'prior_relationship', 'other']).optional().nullable(),
  consent_reference: z.string().trim().min(3).max(300).optional().nullable(),
  consent_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  timing: z.enum(['now', 'scheduled']),
  scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),
  purpose: z.string({ required_error: 'Add a short call purpose', invalid_type_error: 'Add a short call purpose' }).trim().min(3, 'Add a short call purpose').max(200),
  context: z.string().trim().max(1000).optional().nullable(),
});

export async function createManualCall(_p: ManualCallState, fd: FormData): Promise<ManualCallState> {
  const me = await requireRole(['admin']);
  const raw = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]));
  const parsed = manualSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0].message };
  const d = parsed.data;
  const db = createAdminClient();
  const store = createSupabaseJobStore(db);

  const cs = await store.getContractorSettings(d.contractor_id);
  if (!cs || cs.mode === 'off') return { ok: false, error: 'AI calling is off for this contractor. Turn on manual or automatic mode first.' };
  if (!cs.agent_id || !cs.phone_number_id) return { ok: false, error: 'This contractor has no Fish agent / phone number configured yet.' };

  let fields: Partial<AiCallJob> & { contact_phone: string };
  if (d.contact_mode === 'lead') {
    if (!d.lead_id) return { ok: false, error: 'Choose a lead' };
    const lead = await store.getLead(d.lead_id);
    if (!lead) return { ok: false, error: 'Lead not found' };
    // Contractor isolation: a lead can only be called on behalf of a contractor it is assigned to.
    const { data: asg } = await db.from('lead_assignments').select('id').eq('lead_id', d.lead_id).eq('contractor_id', d.contractor_id).maybeSingle();
    if (!asg) return { ok: false, error: 'That lead is not assigned to this contractor' };
    const { data: l2 } = await db.from('leads').select('first_name,last_name').eq('id', d.lead_id).maybeSingle();
    const phone = lead.phone_e164;
    if (!phone) return { ok: false, error: 'That lead has no valid phone number' };
    fields = { lead_id: d.lead_id, contact_phone: phone, contact_name: [l2?.first_name, l2?.last_name].filter(Boolean).join(' ') || null,
      contact_state: lead.state, contact_zip: lead.zip, consent_basis: 'lead_record', consent_reference: d.lead_id, consent_at: lead.consent_at };
  } else {
    const phone = normalizeUsPhone(d.phone);
    if (!phone) return { ok: false, error: 'Enter a valid US or Canada phone number' };
    if (!d.contact_name) return { ok: false, error: 'Enter the contact’s name' };
    if (!d.consent_basis || !d.consent_reference || !d.consent_date) return { ok: false, error: 'Record how and when this person agreed to be called (basis, reference and date are required)' };
    const state = d.state?.toUpperCase() ?? null;
    if (!state || !STATE_ZONES[state]) return { ok: false, error: 'Enter the contact’s 2-letter state (needed for calling hours)' };
    fields = { contact_phone: phone, contact_name: d.contact_name, contact_state: state, contact_zip: d.zip ?? null,
      consent_basis: d.consent_basis, consent_reference: d.consent_reference, consent_at: new Date(`${d.consent_date}T12:00:00Z`).toISOString() };
  }

  const settings = await store.getSettings();
  let runAt = new Date();
  if (d.timing === 'scheduled') {
    if (!d.scheduled_at) return { ok: false, error: 'Pick a date and time' };
    runAt = new Date(d.scheduled_at);
    if (runAt.getTime() < Date.now() + 60_000 || runAt.getTime() > Date.now() + 30 * 86_400_000) return { ok: false, error: 'Schedule a time between 1 minute and 30 days from now' };
  }

  // The form's token makes a double-click / resubmit return the same call instead of a second one.
  const dedupe = `manual:${d.token}`;
  const ins = await db.from('ai_call_jobs').insert({
    trigger_source: 'manual', dedupe_key: dedupe, contractor_id: d.contractor_id, ...fields,
    purpose: d.purpose, context: d.context ?? null, run_at: runAt.toISOString(), scheduled_for: d.timing === 'scheduled' ? runAt.toISOString() : null,
    initiated_by: me.id, max_attempts: settings.max_attempts, status: 'queued',
  }).select('*').single();
  let job = ins.data as AiCallJob | null;
  if (ins.error) {
    if (ins.error.code !== '23505') return { ok: false, error: 'Could not create the call' };
    const { data: existing } = await db.from('ai_call_jobs').select('*').eq('dedupe_key', dedupe).maybeSingle();
    job = existing as AiCallJob | null;
    if (!job) return { ok: false, error: 'Could not create the call' };
    return { ok: true, jobId: job.id, status: job.status, placed: ['accepted', 'answered', 'completed'].includes(job.status), sessionId: job.provider_session_id, detail: 'This request was already submitted.' };
  }
  await audit(me.id, 'ai_call.manual', { job_id: job!.id, contractor_id: d.contractor_id, lead_id: fields.lead_id ?? null, purpose: d.purpose, consent_reference: fields.consent_reference, scheduled_for: job!.scheduled_for });

  if (d.timing === 'now') {
    const result = await dispatchJobNow(job!.id);
    const after = await store.getJob(job!.id);
    refresh(`/app/ai-calls/${job!.id}`);
    if (result.skipped) {
      return { ok: false, jobId: job!.id, status: after?.status, error: result.skipped === 'env_disabled'
        ? 'Not dialed: AI calling is switched off for this deployment (AI_CALLING_GLOBAL_ENABLED). The call is saved as queued.'
        : 'Not dialed: calling is stopped. Enable calling in AI Agent Calls first. The call is saved as queued.' };
    }
    const placed = !!after && ['accepted', 'answered', 'completed'].includes(after.status);
    const reason = after?.block_reason ? BLOCK_LABELS[after.block_reason as BlockReason] ?? after.block_reason : null;
    return { ok: placed, jobId: job!.id, status: after?.status, placed, sessionId: after?.provider_session_id ?? null,
      error: placed ? undefined : after?.status === 'queued' ? `Not dialed yet: ${after.block_reason === null && after.last_error ? `provider said ${after.last_error}; it will retry` : 'outside the calling window; it will be dialed when the window opens'}.`
        : `Not dialed: ${reason ?? after?.last_error ?? after?.status ?? 'unknown'}.` };
  }

  // Scheduled: preflight the hard blockers now so the admin hears about them immediately.
  const { decision } = await decideForJob(store, job!, settings, runAt);
  refresh(`/app/ai-calls/${job!.id}`);
  if (decision.action === 'block') {
    await store.updateJob(job!.id, { status: 'blocked', block_reason: decision.reason });
    return { ok: false, jobId: job!.id, status: 'blocked', error: `Not scheduled: ${BLOCK_LABELS[decision.reason]}.` };
  }
  return { ok: true, jobId: job!.id, status: 'queued', placed: false, detail: `Scheduled for ${runAt.toISOString()}. It will be dialed only if calling is enabled and every check still passes at that time.` };
}
