export type JobStatus =
  | 'queued' | 'blocked' | 'dispatching' | 'accepted' | 'answered' | 'completed'
  | 'no_answer' | 'busy' | 'failed' | 'cancelled' | 'expired';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'Queued', blocked: 'Blocked', dispatching: 'Dispatching', accepted: 'Accepted by provider',
  answered: 'Answered', completed: 'Completed', no_answer: 'No answer', busy: 'Busy', failed: 'Failed',
  cancelled: 'Cancelled', expired: 'Expired',
};

export interface AiCallJob {
  id: string;
  trigger_source: 'auto_form' | 'manual' | 'workflow';
  dedupe_key: string;
  contractor_id: string | null;
  lead_id: string | null;
  prospect_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_state: string | null;
  contact_zip: string | null;
  purpose: string | null;
  context: string | null;
  consent_basis: string | null;
  consent_reference: string | null;
  consent_at: string | null;
  status: JobStatus;
  block_reason: string | null;
  run_at: string;
  attempts: number;
  max_attempts: number;
  key_seq: number;
  locked_by: string | null;
  locked_until: string | null;
  provider_session_id: string | null;
  last_error: string | null;
  dial_status: string | null;
  ended_reason: string | null;
  duration_seconds: number | null;
  conversation_started_at: string | null;
  conversation_ended_at: string | null;
  analysis: Record<string, unknown> | null;
  initiated_by: string | null;
  scheduled_for: string | null;
  /** Set when a workflow call node placed (or adopted) this call. */
  workflow_run_id?: string | null;
  workflow_step_key?: string | null;
  /** Per-job overrides from a workflow call node (bounded by the global settings). */
  retry_delay_minutes?: number | null;
  window_start_hour?: number | null;
  window_end_hour?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AiCallingSettings {
  enabled: boolean;
  window_start_hour: number;
  window_end_hour: number;
  max_attempts: number;
  retry_delay_minutes: number;
  max_job_age_hours: number;
}

export interface ContractorCallSettings {
  contractor_id: string;
  mode: 'off' | 'manual_only' | 'automatic' | 'workflow_only';
  agent_id: string | null;
  phone_number_id: string | null;
  contractor_name?: string | null;
}

export interface LeadFacts {
  id: string;
  first_name: string | null;
  state: string | null;
  zip: string | null;
  phone_e164: string | null;
  consent_granted: boolean;
  consent_at: string | null;
  consent_disclosure: string | null;
  archived_at: string | null;
  qualification_status?: string | null;
}

/** Everything the queue logic needs from storage. The Supabase implementation is store.server.ts. */
export interface JobStore {
  getSettings(): Promise<AiCallingSettings>;
  /** Claims due jobs (or exactly one when `onlyId`). Concurrency-safe in the real store. */
  claim(limit: number, worker: string, onlyId?: string): Promise<AiCallJob[]>;
  getContractorSettings(contractorId: string): Promise<ContractorCallSettings | null>;
  getLead(id: string): Promise<LeadFacts | null>;
  isOptedOut(phone: string): Promise<boolean>;
  /** The number is on a prospect do-not-call record. */
  isDoNotCall(phone: string): Promise<boolean>;
  hasRecentDuplicate(job: AiCallJob, sinceIso: string): Promise<boolean>;
  updateJob(id: string, patch: Partial<AiCallJob>): Promise<void>;
  /** Applies `patch` only if the job is still in `expected` status (compare-and-set). Returns whether it applied. */
  updateJobIf(id: string, expected: JobStatus, patch: Partial<AiCallJob>): Promise<boolean>;
  getJob(id: string): Promise<AiCallJob | null>;
  findJob(ref: { jobId?: string | null; sessionId?: string | null }): Promise<AiCallJob | null>;
  addOptOut(phone: string, source: string, reason: string): Promise<void>;
  cancelQueuedForPhone(phone: string, exceptId: string): Promise<void>;
  addLeadActivity(leadId: string, body: string, metadata: Record<string, unknown>): Promise<void>;
  touchLeadContact(leadId: string, at: string): Promise<void>;
  /** Writes an AI call result onto a cold-call prospect (call log + disposition). Never lifts a DNC. */
  recordProspectResult(job: AiCallJob, result: ProspectCallResult): Promise<void>;
}

export interface ProspectCallResult {
  outcome: 'no_answer' | 'follow_up_required' | 'do_not_call';
  notes: string;
}
