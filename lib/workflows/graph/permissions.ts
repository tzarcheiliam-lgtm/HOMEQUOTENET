import type { Profile } from '@/lib/types';

/**
 * Who may do what with visual workflows. This is the APPLICATION view of the rules;
 * the database enforces the same rules independently (workflow_can_manage() inside every
 * wfg_* function, plus row level security on every table), so a missing check here can
 * never expose another company's workflows.
 *
 *  - HQN admin            everything, every account, network (no contractor) workflows,
 *                         the contractor access switch, global settings
 *  - contractor owner     view + edit + publish + pause + cancel for THEIR OWN company,
 *                         only when an admin has switched the builder on for that company
 *  - contractor staff     view their company's workflows and runs; complete tasks; no edits
 *  - setter / caller      no Automations access
 */
export interface GraphCapabilities {
  view: boolean;
  edit: (contractorId: string | null) => boolean;
  createNetwork: boolean;
  manageAccess: boolean;
  /** Contractor the user is scoped to, or null for admins. */
  scopeContractorId: string | null;
}

export function graphCapabilities(profile: Profile, builderEnabledForOwnCompany: boolean): GraphCapabilities {
  const admin = profile.role === 'admin' && profile.is_active;
  const owner = profile.role === 'contractor' && profile.is_active && profile.contractor_role === 'owner' && !!profile.contractor_id && builderEnabledForOwnCompany;
  const contractorUser = profile.role === 'contractor' && profile.is_active && !!profile.contractor_id;
  return {
    view: admin || contractorUser,
    edit: (contractorId) => admin || (owner && contractorId !== null && contractorId === profile.contractor_id),
    createNetwork: admin,
    manageAccess: admin,
    scopeContractorId: admin ? null : profile.contractor_id,
  };
}
