import type { AiCallJob, AiCallingSettings, ContractorCallSettings, JobStore, LeadFacts, ProspectCallResult } from '@/lib/ai-calling/types';

/** In-memory JobStore mirroring the SQL semantics (claim = queued & due, or an expired lease). */
export function makeFakeStore(clock: { now: Date }) {
  const state = {
    settings: { enabled: true, window_start_hour: 8, window_end_hour: 21, max_attempts: 3, retry_delay_minutes: 60, max_job_age_hours: 48 } as AiCallingSettings,
    contractors: new Map<string, ContractorCallSettings>(),
    leads: new Map<string, LeadFacts>(),
    jobs: new Map<string, AiCallJob>(),
    optOuts: new Set<string>(),
    dnc: new Set<string>(),
    activities: [] as { leadId: string; body: string; metadata: Record<string, unknown> }[],
    touched: [] as string[],
    prospectResults: [] as { jobId: string; result: ProspectCallResult }[],
  };
  const store: JobStore = {
    async getSettings() { return { ...state.settings }; },
    async claim(limit, worker, onlyId) {
      const due = [...state.jobs.values()]
        .filter((j) => (!onlyId || j.id === onlyId) && ((j.status === 'queued' && new Date(j.run_at) <= clock.now) || (j.status === 'dispatching' && j.locked_until && new Date(j.locked_until) < clock.now)))
        .sort((a, b) => a.run_at.localeCompare(b.run_at)).slice(0, limit);
      for (const j of due) { j.status = 'dispatching'; j.locked_by = worker; j.locked_until = new Date(clock.now.getTime() + 300_000).toISOString(); }
      return due.map((j) => ({ ...j }));
    },
    async getContractorSettings(id) { return state.contractors.get(id) ?? null; },
    async getLead(id) { return state.leads.get(id) ?? null; },
    async isOptedOut(p) { return state.optOuts.has(p); },
    async isDoNotCall(p) { return state.dnc.has(p); },
    async hasRecentDuplicate(job, sinceIso) {
      return [...state.jobs.values()].some((r) => r.id !== job.id && r.contact_phone === job.contact_phone && r.contractor_id === job.contractor_id
        && r.created_at >= sinceIso && ['dispatching', 'accepted', 'answered', 'completed', 'no_answer', 'busy'].includes(r.status)
        && (r.status !== 'dispatching' || r.created_at < job.created_at || (r.created_at === job.created_at && r.id < job.id)));
    },
    async updateJob(id, patch) { Object.assign(state.jobs.get(id)!, patch); },
    async updateJobIf(id, expected, patch) { const j = state.jobs.get(id)!; if (j.status !== expected) return false; Object.assign(j, patch); return true; },
    async getJob(id) { return state.jobs.get(id) ? { ...state.jobs.get(id)! } : null; },
    async findJob({ jobId, sessionId }) {
      const byId = jobId ? state.jobs.get(jobId) : undefined;
      const hit = byId ?? [...state.jobs.values()].find((j) => sessionId && j.provider_session_id === sessionId);
      return hit ? { ...hit } : null;
    },
    async addOptOut(p) { state.optOuts.add(p); },
    async cancelQueuedForPhone(p, except) {
      for (const j of state.jobs.values()) if (j.contact_phone === p && j.status === 'queued' && j.id !== except) { j.status = 'cancelled'; j.block_reason = 'opted_out'; }
    },
    async addLeadActivity(leadId, body, metadata) { state.activities.push({ leadId, body, metadata }); },
    async touchLeadContact(leadId) { state.touched.push(leadId); },
    async recordProspectResult(job, result) { state.prospectResults.push({ jobId: job.id, result }); },
  };
  let seq = 0;
  const addJob = (over: Partial<AiCallJob> = {}): AiCallJob => {
    const id = over.id ?? `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
    const job: AiCallJob = {
      id, trigger_source: 'auto_form', dedupe_key: `lead:${id}`, contractor_id: 'c1', lead_id: 'l1', prospect_id: null,
      contact_name: 'Ada Lovelace', contact_phone: '+13105550123', contact_state: 'CA', contact_zip: '90210', purpose: 'New form lead follow-up',
      context: null, consent_basis: 'funnel:pool-masters-la', consent_reference: 'l1', consent_at: clock.now.toISOString(), status: 'queued', block_reason: null,
      run_at: clock.now.toISOString(), attempts: 0, max_attempts: 3, key_seq: 0, locked_by: null, locked_until: null, provider_session_id: null,
      last_error: null, dial_status: null, ended_reason: null, duration_seconds: null, conversation_started_at: null, conversation_ended_at: null,
      analysis: null, initiated_by: null, scheduled_for: null, created_at: clock.now.toISOString(), updated_at: clock.now.toISOString(), ...over,
    };
    state.jobs.set(id, job);
    return job;
  };
  const CONSENT = 'I agree that HomeQuote Network and Pool Masters LA may call, text, or email me about my project, including using automated technology.';
  const seedPoolMasters = () => {
    state.contractors.set('c1', { contractor_id: 'c1', mode: 'automatic', agent_id: 'agent_1', phone_number_id: 'pn_1', contractor_name: 'Pool Masters LA' });
    state.leads.set('l1', { id: 'l1', first_name: 'Ada', state: null, zip: '90210', phone_e164: '+13105550123', consent_granted: true, consent_at: clock.now.toISOString(), consent_disclosure: CONSENT, archived_at: null, qualification_status: 'needs_qualification' });
  };
  return { store, state, addJob, seedPoolMasters, CONSENT };
}
