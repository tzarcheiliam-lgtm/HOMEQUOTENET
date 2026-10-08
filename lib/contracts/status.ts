/** Contract statuses shown on the dashboard. Pure. Derived from the linked signing request - never stored twice. */
export const CONTRACT_STATUSES = ['draft', 'sent', 'viewed', 'partially_signed', 'completed', 'declined', 'expired', 'voided'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed', partially_signed: 'Partially signed', completed: 'Completed',
  declined: 'Declined', expired: 'Expired', voided: 'Voided',
};
export const CONTRACT_STATUS_TONE: Record<ContractStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'neutral', sent: 'info', viewed: 'info', partially_signed: 'warning', completed: 'success', declined: 'danger', expired: 'danger', voided: 'neutral',
};

export interface StatusInput {
  /** signing_versions.status, or null while the contract has no signing request */
  signingStatus: string | null;
  expiresAt: string | null;
  anyViewed: boolean;
  now?: Date;
}

export function deriveStatus(i: StatusInput): ContractStatus {
  const s = i.signingStatus;
  if (!s || s === 'draft') return 'draft';
  if ((s === 'awaiting_signature' || s === 'partially_signed') && i.expiresAt && new Date(i.expiresAt) <= (i.now ?? new Date())) return 'expired';
  if (s === 'awaiting_signature') return i.anyViewed ? 'viewed' : 'sent';
  if (s === 'partially_signed') return 'partially_signed';
  if (s === 'completed' || s === 'declined' || s === 'voided' || s === 'expired') return s;
  return 'sent';
}

/** Open = the signers can still act. */
export const isOpen = (s: ContractStatus) => s === 'sent' || s === 'viewed' || s === 'partially_signed';
