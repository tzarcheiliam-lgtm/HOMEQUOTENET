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

/**
 * Documents & Signing: HQN administrators and contractor users (owners AND staff) of the owning company.
 * Setters/callers never see it. Tenant scoping (which company's documents) is enforced separately in
 * lib/signing/access.ts and by RLS.
 */
export function canManageSigning(profile: Profile): boolean {
  return isHqnAdministrator(profile) ||
    (profile.role === 'contractor' && profile.is_active && !!profile.contractor_id);
}

/**
 * Meta Ads reporting: HQN administrators, and contractor OWNERS (not staff) for the campaigns an admin mapped to their
 * company. Which rows a contractor can see is enforced by RLS (meta_campaign_visible), not here.
 */
export function canViewMetaAds(profile: Profile): boolean {
  return isHqnAdministrator(profile) ||
    (isContractorOwner(profile) && profile.is_active && !!profile.contractor_id);
}

/**
 * Contracts & Templates (template library, wizard, sending, voiding): HQN administrators only.
 * Contractor users never manage contracts; they may only READ agreements that were sent to their own company
 * (canViewOwnContracts + RLS + server checks).
 */
export function canManageContracts(profile: Profile): boolean {
  return isHqnAdministrator(profile);
}

export function canViewOwnContracts(profile: Profile): boolean {
  return profile.role === 'contractor' && profile.is_active && !!profile.contractor_id;
}
