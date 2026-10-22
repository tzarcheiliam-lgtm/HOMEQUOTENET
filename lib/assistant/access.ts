import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';
import { ASSISTANT_ROLES } from './config';

export type AssistantProfile = Profile;

export function canUseAssistant(profile: Pick<Profile, 'role' | 'is_active' | 'deleted_at' | 'account_status'>): boolean {
  return (
    profile.is_active &&
    !profile.deleted_at &&
    profile.account_status === 'active' &&
    (ASSISTANT_ROLES as readonly string[]).includes(profile.role)
  );
}

/** Contractor logins are always scoped to their own company; a contractor with no company sees nothing. */
export function tenantOf(profile: Pick<Profile, 'role' | 'contractor_id'>): string | null {
  return profile.role === 'contractor' ? profile.contractor_id : null;
}

export const isStaff = (profile: Pick<Profile, 'role'>) => profile.role === 'admin' || profile.role === 'setter';

export function hasDataAccess(profile: Pick<Profile, 'role' | 'contractor_id'>): boolean {
  return isStaff(profile) || (profile.role === 'contractor' && !!profile.contractor_id);
}

export const LEAD_SAFE_COLUMNS =
  'id, first_name, last_name, email, phone, address, city, state, zip, status, project_description, budget_range, timeline, urgency, source, notes, created_at, last_contact_date, qualification_status';

/**
 * Loads ONE lead the signed-in user may see, or null. Contractors are additionally pinned to their own
 * company through an inner join on lead_assignments (defense in depth on top of RLS). The lead id comes from
 * the model, so it is treated as untrusted input: a miss is indistinguishable from "does not exist".
 */
export async function loadAccessibleLead(db: SupabaseClient, profile: Profile, leadId: string, columns = LEAD_SAFE_COLUMNS) {
  if (!hasDataAccess(profile)) return null;
  const tenant = tenantOf(profile);
  let q = db.from('leads').select(tenant ? `${columns}, lead_assignments!inner(contractor_id)` : columns).eq('id', leadId);
  if (tenant) q = q.eq('lead_assignments.contractor_id', tenant);
  const { data } = await q.maybeSingle();
  if (!data) return null;
  const { lead_assignments: _drop, ...lead } = data as unknown as Record<string, unknown>;
  void _drop;
  return lead as Record<string, unknown> & { id: string };
}
