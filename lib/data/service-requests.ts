import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { RequestStatus, ServiceSlug } from '@/lib/growth/catalog';
import { recommendService, type Recommendation } from '@/lib/growth/recommend';
import type { Profile } from '@/lib/types';

export interface ServiceRequest {
  id: string;
  contractor_id: string;
  requested_by: string | null;
  service: ServiceSlug;
  notes: string | null;
  status: RequestStatus;
  status_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrowthContext {
  /** The signed-in contractor's company; null when the login isn't linked to one. */
  company: { id: string; name: string; website: string | null } | null;
  requests: ServiceRequest[];
  recommendation: Recommendation | null;
}

/**
 * The contractor's company and their company's requests. Reads go through the
 * user's session, so RLS scopes them to the contractor's own company.
 */
export async function getGrowthContext(profile: Profile): Promise<GrowthContext> {
  if (!profile.contractor_id) return { company: null, requests: [], recommendation: null };
  const supabase = await createClient();
  const [companyRes, requestsRes] = await Promise.all([
    supabase.from('contractors').select('id, name, website').eq('id', profile.contractor_id).maybeSingle(),
    supabase
      .from('service_requests')
      .select('*')
      .eq('contractor_id', profile.contractor_id)
      .order('created_at', { ascending: false }),
  ]);
  if (companyRes.error) throw new Error('Could not load your company.');
  if (requestsRes.error) throw new Error('Could not load your service requests.');
  const company = companyRes.data as GrowthContext['company'];
  const requests = (requestsRes.data ?? []) as ServiceRequest[];
  return {
    company,
    requests,
    recommendation: company ? recommendService({ website: company.website, requests }) : null,
  };
}

export interface AdminServiceRequest extends ServiceRequest {
  contractor: { id: string; name: string; phone: string | null; email: string | null } | null;
  requester: { full_name: string | null; email: string | null; phone: string | null } | null;
}

/** Admin review list (RLS: admins read every company's requests). */
export async function listServiceRequests(opts: { status?: RequestStatus } = {}): Promise<AdminServiceRequest[]> {
  const supabase = await createClient();
  let query = supabase
    .from('service_requests')
    .select(
      `*, contractor:contractors(id, name, phone, email),
       requester:profiles!service_requests_requested_by_fkey(full_name, email, phone)`
    )
    .order('created_at', { ascending: false })
    .limit(500);
  if (opts.status) query = query.eq('status', opts.status);
  const { data, error } = await query;
  if (error) throw new Error('Could not load service requests.');
  return (data ?? []) as AdminServiceRequest[];
}

/** Counts per status for the admin filter tabs. */
export async function countServiceRequestsByStatus(): Promise<Record<RequestStatus, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('service_requests').select('status');
  if (error) throw new Error('Could not load service requests.');
  const counts: Record<RequestStatus, number> = { new: 0, contacted: 0, proposal_sent: 0, accepted: 0, closed: 0 };
  for (const row of data ?? []) counts[row.status as RequestStatus] += 1;
  return counts;
}
