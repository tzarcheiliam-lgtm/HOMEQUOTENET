import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/auth';
import { isContractorOwner } from '@/lib/permissions';
import type { Profile } from '@/lib/types';

export interface AuthorizedAssignment {
  id: string;
  lead_id: string;
  contractor_id: string;
  pricing_agreement_id: string | null;
  assigned_user_id: string | null;
}

function isInternalOperator(profile: Profile): boolean {
  return profile.role === 'admin' || profile.role === 'setter';
}

export async function requireLeadAccess(leadId: string): Promise<Profile> {
  const profile = await requireProfile();
  if (isInternalOperator(profile)) return profile;
  if (profile.role !== 'contractor' || !profile.contractor_id) {
    throw new Error('Lead not found or access denied');
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from('lead_assignments')
    .select('id')
    .eq('lead_id', leadId)
    .eq('contractor_id', profile.contractor_id)
    .maybeSingle();
  if (!data) throw new Error('Lead not found or access denied');
  return profile;
}

export async function requireAssignmentAccess(
  assignmentId: string
): Promise<{ profile: Profile; assignment: AuthorizedAssignment }> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from('lead_assignments')
    .select('id, lead_id, contractor_id, pricing_agreement_id, assigned_user_id')
    .eq('id', assignmentId)
    .maybeSingle();
  const assignment = data as AuthorizedAssignment | null;
  if (!assignment) throw new Error('Assignment not found or access denied');
  if (!isInternalOperator(profile) &&
      (profile.role !== 'contractor' || profile.contractor_id !== assignment.contractor_id)) {
    throw new Error('Assignment not found or access denied');
  }
  return { profile, assignment };
}

export async function requireCompanyAssignmentManager(
  assignmentId: string
): Promise<{ profile: Profile; assignment: AuthorizedAssignment }> {
  const result = await requireAssignmentAccess(assignmentId);
  if (result.profile.role !== 'admin' && !isContractorOwner(result.profile)) {
    throw new Error('Only an HQN administrator or contractor owner can assign company users');
  }
  return result;
}

export async function leadIdForChildRecord(
  table: 'appointments' | 'estimates' | 'sales',
  id: string
): Promise<{ profile: Profile; assignment: AuthorizedAssignment }> {
  const supabase = await createClient();
  const { data } = await supabase.from(table).select('assignment_id').eq('id', id).maybeSingle();
  const assignmentId = (data as { assignment_id?: string } | null)?.assignment_id;
  if (!assignmentId) throw new Error('Record not found or access denied');
  return requireAssignmentAccess(assignmentId);
}
