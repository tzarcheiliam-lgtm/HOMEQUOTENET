import type { Profile } from '@/lib/types';

export function isHqnAdministrator(profile: Profile): boolean {
  return profile.role === 'admin' && profile.is_active;
}

export function isContractorOwner(profile: Profile): boolean {
  return profile.role === 'contractor' && profile.contractor_role === 'owner';
}

export function isContractorStaff(profile: Profile): boolean {
  return profile.role === 'contractor' && profile.contractor_role === 'staff';
}

export function canManageCompanyTeam(profile: Profile): boolean {
  return isHqnAdministrator(profile) || isContractorOwner(profile);
}

export function canManageRecipients(profile: Profile): boolean {
  return isHqnAdministrator(profile);
}

export function canManageDistribution(profile: Profile): boolean {
  return isHqnAdministrator(profile);
}

export function canPermanentlyDeleteLeads(profile: Profile): boolean {
  return isHqnAdministrator(profile);
}

export function canViewInternalNotes(profile: Profile): boolean {
  return profile.role === 'admin' || profile.role === 'setter';
}

export function canExportCompanyData(profile: Profile): boolean {
  return isHqnAdministrator(profile) ||
    (profile.role === 'contractor' && profile.can_export_company_data);
}

export function belongsToCompany(profile: Profile, contractorId: string): boolean {
  return isHqnAdministrator(profile) ||
    (profile.role === 'contractor' && profile.contractor_id === contractorId);
}
