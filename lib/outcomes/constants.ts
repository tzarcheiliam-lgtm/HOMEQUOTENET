import type { BillingStatus, EstimateStatus, SaleStatus } from '@/lib/types';

export const ESTIMATE_STATUSES: { value: EstimateStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

export const SALE_STATUSES: { value: SaleStatus; label: string }[] = [
  { value: 'won', label: 'Won' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
];

// The Phase 4 billing states (the enum also still contains invoiced/void from 0001).
export const BILLING_STATUSES: {
  value: BillingStatus;
  label: string;
  variant: 'success' | 'warning' | 'muted' | 'secondary';
}[] = [
  { value: 'pending', label: 'Pending', variant: 'warning' },
  { value: 'paid', label: 'Paid', variant: 'success' },
  { value: 'overdue', label: 'Overdue', variant: 'warning' },
  { value: 'waived', label: 'Waived', variant: 'muted' },
];

export function billingStatusVariant(status: BillingStatus) {
  return BILLING_STATUSES.find((s) => s.value === status)?.variant ?? 'muted';
}
