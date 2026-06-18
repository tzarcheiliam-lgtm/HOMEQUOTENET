import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type {
  Lead,
  LeadActivity,
  LeadAssignment,
  LeadAttachment,
  LeadStatus,
} from '@/lib/types';

export interface LeadFilters {
  q?: string;
  status?: LeadStatus;
  vertical_id?: string;
  sub_service_id?: string;
  source?: string;
  contractor_id?: string;
  city?: string;
  zip?: string;
  date_from?: string;
  date_to?: string;
  archived?: 'active' | 'archived' | 'all';
  assigned?: 'assigned' | 'unassigned';
}

export interface LeadListRow extends Lead {
  vertical_name: string | null;
  sub_service_name: string | null;
  assignment_count: number;
  contractor_names: string[];
}

function escapeForOr(value: string): string {
  // Strip characters that would break a PostgREST or() filter.
  return value.replace(/[(),%*]/g, ' ').trim();
}

/** List leads with related labels and assignment summary. RLS scopes rows by role. */
export async function listLeads(
  filters: LeadFilters = {}
): Promise<LeadListRow[]> {
  const supabase = await createClient();

  // Contractor filter: resolve to lead ids first (avoids fragile embedded filters).
  let leadIdsForContractor: string[] | null = null;
  if (filters.contractor_id) {
    const { data: a } = await supabase
      .from('lead_assignments')
      .select('lead_id')
      .eq('contractor_id', filters.contractor_id);
    leadIdsForContractor = (a ?? []).map((r: any) => r.lead_id);
    if (leadIdsForContractor.length === 0) return [];
  }

  let query = supabase
    .from('leads')
    .select(
      `*,
       vertical:verticals(name),
       sub_service:sub_services(name),
       lead_assignments(contractor:contractors(id, name))`
    )
    .order('created_at', { ascending: false });

  const archived = filters.archived ?? 'active';
  if (archived === 'active') query = query.is('archived_at', null);
  if (archived === 'archived') query = query.not('archived_at', 'is', null);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.vertical_id) query = query.eq('vertical_id', filters.vertical_id);
  if (filters.sub_service_id)
    query = query.eq('sub_service_id', filters.sub_service_id);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters.zip) query = query.ilike('zip', `%${filters.zip}%`);
  if (filters.date_from) query = query.gte('created_at', filters.date_from);
  if (filters.date_to) query = query.lte('created_at', filters.date_to);
  if (leadIdsForContractor) query = query.in('id', leadIdsForContractor);

  // Assigned / unassigned filter (used by the setter "unassigned" view).
  if (filters.assigned) {
    const { data: assignedRows } = await supabase
      .from('lead_assignments')
      .select('lead_id');
    const assignedIds = Array.from(
      new Set((assignedRows ?? []).map((r: any) => r.lead_id))
    );
    if (filters.assigned === 'assigned') {
      if (assignedIds.length === 0) return [];
      query = query.in('id', assignedIds);
    } else {
      if (assignedIds.length > 0) {
        query = query.not('id', 'in', `(${assignedIds.join(',')})`);
      }
    }
  }

  if (filters.q) {
    const q = escapeForOr(filters.q);
    if (q) {
      query = query.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,address.ilike.%${q}%`
      );
    }
  }

  const { data } = await query;

  return (data ?? []).map((row: any) => {
    const assignments = row.lead_assignments ?? [];
    return {
      ...(row as Lead),
      vertical_name: row.vertical?.name ?? null,
      sub_service_name: row.sub_service?.name ?? null,
      assignment_count: assignments.length,
      contractor_names: assignments
        .map((a: any) => a.contractor?.name)
        .filter(Boolean),
    };
  });
}

export interface AssignmentDetail extends LeadAssignment {
  contractor: { id: string; name: string } | null;
  appointments: any[];
  estimates: any[];
  sales: any[];
}

export interface ActivityWithActor extends LeadActivity {
  actor: { full_name: string | null; email: string | null } | null;
}

export interface LeadDetail {
  lead: Lead & {
    vertical: { name: string } | null;
    sub_service: { name: string } | null;
  };
  assignments: AssignmentDetail[];
  activities: ActivityWithActor[];
  attachments: LeadAttachment[];
}

export async function getLead(id: string): Promise<LeadDetail | null> {
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from('leads')
    .select('*, vertical:verticals(name), sub_service:sub_services(name)')
    .eq('id', id)
    .single();

  if (!lead) return null;

  const [{ data: assignments }, { data: activities }, { data: attachments }] =
    await Promise.all([
      supabase
        .from('lead_assignments')
        .select(
          `*,
           contractor:contractors(id, name),
           appointments(*),
           estimates(*),
           sales(*)`
        )
        .eq('lead_id', id)
        .order('assigned_at', { ascending: false }),
      supabase
        .from('lead_activities')
        .select('*, actor:profiles(full_name, email)')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('lead_attachments')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
    ]);

  return {
    lead: lead as LeadDetail['lead'],
    assignments: (assignments ?? []) as AssignmentDetail[],
    activities: (activities ?? []) as ActivityWithActor[],
    attachments: (attachments ?? []) as LeadAttachment[],
  };
}
