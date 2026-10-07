import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { prospectPatchFor } from '@/lib/calls/rules';
import type { AiCallJob, AiCallingSettings, ContractorCallSettings, JobStore, LeadFacts, ProspectCallResult } from './types';

/** Service-role implementation of JobStore. Only used from trusted server code. */
const DUP_STATUSES = ['dispatching', 'accepted', 'answered', 'completed', 'no_answer', 'busy'];

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

export function createSupabaseJobStore(db: SupabaseClient = createAdminClient()): JobStore {
  return {
    async getSettings() {
      return must(await db.from('ai_calling_settings').select('*').eq('id', true).single(), 'settings') as AiCallingSettings;
    },
    async claim(limit, worker, onlyId) {
      const res = await db.rpc('claim_ai_call_jobs', { p_limit: limit, p_worker: worker, p_only: onlyId ?? null });
      return (must(res, 'claim') ?? []) as AiCallJob[];
    },
    async getContractorSettings(id) {
      const cs = must(await db.from('ai_calling_contractor_settings').select('*').eq('contractor_id', id).maybeSingle(), 'contractor settings') as ContractorCallSettings | null;
      if (!cs) return null;
      const c = must(await db.from('contractors').select('name').eq('id', id).maybeSingle(), 'contractor') as { name: string } | null;
      return { ...cs, contractor_name: c?.name ?? null };
    },
    async getLead(id) {
      return must(await db.from('leads').select('id,first_name,state,zip,phone_e164,consent_granted,consent_at,consent_disclosure,archived_at,qualification_status').eq('id', id).maybeSingle(), 'lead') as LeadFacts | null;
    },
    async isOptedOut(phone) {
      return !!must(await db.from('ai_call_opt_outs').select('phone_e164').eq('phone_e164', phone).maybeSingle(), 'opt-out');
    },
    async isDoNotCall(phone) {
      const rows = must(await db.from('contractor_prospects').select('id').eq('phone_e164', phone).or('disposition.eq.do_not_call,do_not_call_at.not.is.null').limit(1), 'dnc') as unknown[];
      return (rows ?? []).length > 0;
    },
    async hasRecentDuplicate(job, sinceIso) {
      if (!job.contact_phone || !job.contractor_id) return false;
      let query = db.from('ai_call_jobs').select('id,status,created_at').eq('contact_phone', job.contact_phone)
        .eq('contractor_id', job.contractor_id).neq('id', job.id).gte('created_at', sinceIso).in('status', DUP_STATUSES);
      // A workflow's own earlier attempts are spaced by the workflow itself (wait steps), so they do not count.
      if (job.workflow_run_id) query = query.or(`workflow_run_id.is.null,workflow_run_id.neq.${job.workflow_run_id}`);
      const rows = (must(await query, 'duplicates') ?? []) as { id: string; status: string; created_at: string }[];
      // Two jobs claimed together must not block each other: only an EARLIER in-flight job counts.
      return rows.some((r) => r.status !== 'dispatching' || r.created_at < job.created_at || (r.created_at === job.created_at && r.id < job.id));
    },
    async updateJob(id, patch) {
      const { error } = await db.from('ai_call_jobs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new Error(`update job: ${error.message}`);
    },
    async updateJobIf(id, expected, patch) {
      const { data, error } = await db.from('ai_call_jobs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).eq('status', expected).select('id');
      if (error) throw new Error(`update job: ${error.message}`);
      return (data ?? []).length > 0;
    },
    async getJob(id) {
      return must(await db.from('ai_call_jobs').select('*').eq('id', id).maybeSingle(), 'job') as AiCallJob | null;
    },
    async findJob({ jobId, sessionId }) {
      if (jobId && /^[0-9a-f-]{36}$/i.test(jobId)) {
        const byId = must(await db.from('ai_call_jobs').select('*').eq('id', jobId).maybeSingle(), 'job') as AiCallJob | null;
        if (byId) return byId;
      }
      if (sessionId) return must(await db.from('ai_call_jobs').select('*').eq('provider_session_id', sessionId).maybeSingle(), 'job by session') as AiCallJob | null;
      return null;
    },
    async addOptOut(phone, source, reason) {
      const { error } = await db.from('ai_call_opt_outs').upsert({ phone_e164: phone, source, reason }, { onConflict: 'phone_e164', ignoreDuplicates: true });
      if (error) throw new Error(`opt-out: ${error.message}`);
    },
    async cancelQueuedForPhone(phone, exceptId) {
      const { error } = await db.from('ai_call_jobs').update({ status: 'cancelled', block_reason: 'opted_out', updated_at: new Date().toISOString() })
        .eq('contact_phone', phone).eq('status', 'queued').neq('id', exceptId);
      if (error) throw new Error(`cancel queued: ${error.message}`);
    },
    async addLeadActivity(leadId, body, metadata) {
      // Fish delivers at least once and a failed apply is retried: a note carrying an event_key is written once.
      if (typeof metadata.event_key === 'string') {
        const { data: seen } = await db.from('lead_activities').select('id').eq('lead_id', leadId).contains('metadata', { event_key: metadata.event_key }).limit(1);
        if ((seen ?? []).length) return;
      }
      const { error } = await db.from('lead_activities').insert({ lead_id: leadId, actor_id: null, type: 'contact_attempt', body, metadata });
      if (error) throw new Error(`lead activity: ${error.message}`);
    },
    async touchLeadContact(leadId, at) {
      const { error } = await db.from('leads').update({ last_contact_date: at }).eq('id', leadId);
      if (error) throw new Error(`lead contact date: ${error.message}`);
    },
    async recordProspectResult(job: AiCallJob, r: ProspectCallResult) {
      if (!job.prospect_id) return;
      const p = must(await db.from('contractor_prospects').select('disposition').eq('id', job.prospect_id).maybeSingle(), 'prospect') as { disposition: string } | null;
      if (!p) return;
      // A do-not-call prospect is never touched by automation (only a person can lift it).
      if (p.disposition === 'do_not_call' && r.outcome !== 'do_not_call') return;
      const ins = await db.from('prospect_call_attempts').insert({
        prospect_id: job.prospect_id, caller_id: null, caller_name: 'AI agent', outcome: r.outcome, notes: r.notes,
        attempt_number: 0, previous_disposition: p.disposition, new_disposition: r.outcome,
      });
      if (ins.error) throw new Error(`prospect call log: ${ins.error.message}`);
      const patch = prospectPatchFor(r.outcome, { outcome: r.outcome, notes: r.notes });
      const up = await db.from('contractor_prospects').update({ ...patch, last_contacted_at: new Date().toISOString() }).eq('id', job.prospect_id);
      if (up.error) throw new Error(`prospect update: ${up.error.message}`);
    },
  };
}
