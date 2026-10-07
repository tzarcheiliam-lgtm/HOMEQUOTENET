import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { configStatus } from '@/lib/ai-calling/config-status';
import type { AiCallJob, AiCallingSettings, ContractorCallSettings } from '@/lib/ai-calling/types';

export const AI_CALLS_PAGE_SIZE = 25;

export interface JobFilters { contractor?: string; status?: string; trigger?: string; from?: string; to?: string; page?: number }
export type JobRow = AiCallJob & { contractor: { name: string } | null };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;
const STATUSES = ['queued', 'blocked', 'dispatching', 'accepted', 'answered', 'completed', 'no_answer', 'busy', 'failed', 'cancelled', 'expired'];

export async function listAiCallJobs(f: JobFilters): Promise<{ rows: JobRow[]; total: number }> {
  const db = await createClient();
  const page = Math.max(1, f.page ?? 1);
  let q = db.from('ai_call_jobs').select('*, contractor:contractors(name)', { count: 'exact' }).order('created_at', { ascending: false })
    .range((page - 1) * AI_CALLS_PAGE_SIZE, page * AI_CALLS_PAGE_SIZE - 1);
  if (f.contractor && UUID.test(f.contractor)) q = q.eq('contractor_id', f.contractor);
  if (f.status && STATUSES.includes(f.status)) q = q.eq('status', f.status);
  if (f.trigger === 'auto_form' || f.trigger === 'manual' || f.trigger === 'workflow') q = q.eq('trigger_source', f.trigger);
  if (f.from && ISO_DAY.test(f.from)) q = q.gte('created_at', `${f.from}T00:00:00Z`);
  if (f.to && ISO_DAY.test(f.to)) q = q.lt('created_at', new Date(new Date(`${f.to}T00:00:00Z`).getTime() + 86_400_000).toISOString());
  const { data, count, error } = await q;
  if (error) throw new Error('Could not load AI calls');
  return { rows: (data ?? []) as unknown as JobRow[], total: count ?? 0 };
}

export interface ContractorCallingRow {
  id: string; name: string; status: string;
  settings: ContractorCallSettings | null;
  config: ReturnType<typeof configStatus>;
}

export async function getCallingOverview() {
  const db = await createClient();
  const [settings, contractors, cs, queued, blocked, active, last24] = await Promise.all([
    db.from('ai_calling_settings').select('*').eq('id', true).single(),
    db.from('contractors').select('id,name,status').order('name'),
    db.from('ai_calling_contractor_settings').select('*'),
    db.from('ai_call_jobs').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
    db.from('ai_call_jobs').select('id', { count: 'exact', head: true }).eq('status', 'blocked'),
    db.from('ai_call_jobs').select('id', { count: 'exact', head: true }).in('status', ['accepted', 'answered']),
    db.from('ai_call_jobs').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86_400_000).toISOString()),
  ]);
  if (settings.error || !settings.data) throw new Error('AI calling settings are unavailable. Has migration 0038 been applied?');
  const byContractor = new Map(((cs.data ?? []) as ContractorCallSettings[]).map((s) => [s.contractor_id, s]));
  const rows: ContractorCallingRow[] = ((contractors.data ?? []) as { id: string; name: string; status: string }[]).map((c) => {
    const s = byContractor.get(c.id) ?? null;
    return { id: c.id, name: c.name, status: c.status, settings: s, config: configStatus(s) };
  });
  return {
    settings: settings.data as AiCallingSettings & { stopped_at: string | null },
    contractors: rows,
    counts: { queued: queued.count ?? 0, blocked: blocked.count ?? 0, active: active.count ?? 0, last24h: last24.count ?? 0 },
  };
}

export async function getAiCallJob(id: string) {
  if (!UUID.test(id)) return null;
  const db = await createClient();
  const { data } = await db.from('ai_call_jobs').select('*, contractor:contractors(name)').eq('id', id).maybeSingle();
  if (!data) return null;
  const job = data as unknown as JobRow;
  // Provider events (admin-only table, service role): names and times only, never raw payloads.
  let events: { event: string; received_at: string }[] = [];
  if (job.provider_session_id) {
    const { data: ev } = await createAdminClient().from('ai_call_events').select('event,received_at').eq('session_id', job.provider_session_id).order('received_at');
    events = (ev ?? []) as typeof events;
  }
  return { job, events };
}

/** Recently assigned leads with their contractor, for the manual-call picker. Phone numbers are masked; the server re-reads the real number. */
export async function listAssignedLeads() {
  const db = await createClient();
  const { data } = await db.from('lead_assignments').select('contractor_id, lead:leads(id,first_name,last_name,phone_e164)').order('created_at', { ascending: false }).limit(300);
  type R = { contractor_id: string; lead: { id: string; first_name: string | null; last_name: string | null; phone_e164: string | null } | null };
  return ((data ?? []) as unknown as R[]).filter((r) => r.lead && r.lead.phone_e164).map((r) => ({
    contractor_id: r.contractor_id, id: r.lead!.id,
    name: [r.lead!.first_name, r.lead!.last_name].filter(Boolean).join(' ') || 'Unnamed lead', last4: r.lead!.phone_e164!.slice(-4),
  }));
}
