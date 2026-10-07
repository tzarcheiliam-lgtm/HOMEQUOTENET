import { inWindow, nextEligible, resolveZones, type CallWindow } from './timezone';

/**
 * Decides whether an AI call may be placed NOW. Pure: every fact is passed in,
 * so the same rules gate automatic jobs, manual calls and retries.
 */
export type BlockReason =
  | 'expired' | 'lead_archived' | 'contractor_off' | 'contractor_not_automatic' | 'not_configured'
  | 'lead_not_qualified' | 'contractor_not_workflow' | 'no_calling_window' | 'invalid_number' | 'opted_out' | 'do_not_call' | 'no_consent' | 'duplicate_recent_call' | 'unknown_timezone';

export type Decision =
  | { action: 'dispatch' }
  | { action: 'defer'; until: Date; reason: 'outside_calling_window' }
  | { action: 'block'; reason: BlockReason };

export interface EligibilityInput {
  trigger: 'auto_form' | 'manual' | 'workflow';
  now: Date;
  createdAt: Date;
  maxJobAgeHours: number;
  leadArchived?: boolean;
  /** leads.qualification_status; a lead a person (or the service-area gate) rejected is never called. */
  qualificationStatus?: string | null;
  contractorMode: 'off' | 'manual_only' | 'automatic' | 'workflow_only' | null;
  agentId: string | null;
  phoneNumberId: string | null;
  /** Destination, expected E.164. */
  phone: string | null;
  consent: {
    granted: boolean;
    at: string | Date | null;
    /** The wording the person agreed to. Required for automatic calls (must mention calling). */
    disclosure: string | null;
    /** Manual calls to a new contact record a basis + reference instead of a disclosure. */
    basis?: string | null;
    reference?: string | null;
  };
  optedOut: boolean;
  doNotCall: boolean;
  recentDuplicate: boolean;
  state?: string | null;
  zip?: string | null;
  window: CallWindow;
}

/** North American numbers only: +1 NXX NXX XXXX (area code and exchange cannot start with 0 or 1). */
export const NANP_E164 = /^\+1[2-9]\d{2}[2-9]\d{6}$/;
export const validPhone = (p: string | null | undefined): p is string => !!p && NANP_E164.test(p);

/** Wording that actually covers being called (e.g. "may call, text, or email me"). */
const CALL_CONSENT_WORDING = /\bcall/i;

export function hasCallConsent(i: EligibilityInput): boolean {
  const c = i.consent;
  if (!c.granted || !c.at) return false;
  // Automatic contact (form-to-call and workflow calls) needs wording that covers being called.
  if (i.trigger === 'auto_form' || i.trigger === 'workflow') return !!c.disclosure && CALL_CONSENT_WORDING.test(c.disclosure);
  // Manual: either the lead's own recorded consent, or a recorded basis + reference.
  if (c.disclosure && CALL_CONSENT_WORDING.test(c.disclosure)) return true;
  return !!(c.basis?.trim() && c.reference?.trim());
}

export function evaluateEligibility(i: EligibilityInput): Decision {
  const ageMs = i.now.getTime() - i.createdAt.getTime();
  if (ageMs > i.maxJobAgeHours * 3_600_000) return { action: 'block', reason: 'expired' };
  if (i.leadArchived) return { action: 'block', reason: 'lead_archived' };
  if (i.qualificationStatus === 'not_qualified' || i.qualificationStatus === 'out_of_service_area') return { action: 'block', reason: 'lead_not_qualified' };
  if (i.contractorMode === null || i.contractorMode === 'off') return { action: 'block', reason: 'contractor_off' };
  if (i.trigger === 'auto_form' && i.contractorMode !== 'automatic') return { action: 'block', reason: 'contractor_not_automatic' };
  // A workflow call needs the contractor to have opted in to automation (workflow_only or automatic); manual_only never.
  if (i.trigger === 'workflow' && i.contractorMode !== 'automatic' && i.contractorMode !== 'workflow_only') return { action: 'block', reason: 'contractor_not_workflow' };
  if (!i.agentId?.trim() || !i.phoneNumberId?.trim()) return { action: 'block', reason: 'not_configured' };
  if (!validPhone(i.phone)) return { action: 'block', reason: 'invalid_number' };
  if (i.optedOut) return { action: 'block', reason: 'opted_out' };
  if (i.doNotCall) return { action: 'block', reason: 'do_not_call' };
  if (!hasCallConsent(i)) return { action: 'block', reason: 'no_consent' };
  if (i.recentDuplicate) return { action: 'block', reason: 'duplicate_recent_call' };
  const zones = resolveZones({ state: i.state, zip: i.zip });
  if (!zones) return { action: 'block', reason: 'unknown_timezone' };
  if (inWindow(i.now, zones, i.window)) return { action: 'dispatch' };
  const until = nextEligible(i.now, zones, i.window);
  // No window within 4 days means a misconfigured window; never dial.
  return until ? { action: 'defer', until, reason: 'outside_calling_window' } : { action: 'block', reason: 'unknown_timezone' };
}

/** Human labels for the admin UI. */
export const BLOCK_LABELS: Record<BlockReason, string> = {
  expired: 'Expired (too old to call)',
  lead_archived: 'Lead archived',
  lead_not_qualified: 'Lead not qualified / outside service area',
  contractor_off: 'Contractor AI calling is off',
  contractor_not_automatic: 'Contractor not in automatic mode',
  contractor_not_workflow: 'Contractor AI calling does not allow workflow calls',
  no_calling_window: 'The workflow call window does not overlap the allowed calling hours',
  not_configured: 'Agent or phone number not configured',
  invalid_number: 'Invalid phone number',
  opted_out: 'Opted out',
  do_not_call: 'On a do-not-call list',
  no_consent: 'No recorded call consent',
  duplicate_recent_call: 'Already called recently',
  unknown_timezone: 'Timezone unknown, needs review',
};
