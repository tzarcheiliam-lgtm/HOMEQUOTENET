import type {
  BillingEventType,
  CommissionType,
  PricingAgreement,
} from '@/lib/types';

export interface CommissionResult {
  amount: number;
  type: CommissionType;
  billingEventType: BillingEventType;
}

/**
 * Computes HomeQuote's commission (what the contractor owes) for a sale, based
 * on the assignment's pricing agreement.
 *
 *  - per_lead         -> flat per-lead fee
 *  - per_appointment  -> flat per-appointment fee
 *  - revenue_share    -> % of the sale amount
 *  - hybrid           -> per-lead + per-appointment + revenue-share combined
 *  - subscription     -> 0 here (billed separately, not per sale)
 *
 * If there is no agreement, returns 0 with type 'none' (admin can override).
 */
export function computeCommission(
  agreement: PricingAgreement | null,
  saleAmount: number
): CommissionResult {
  if (!agreement) {
    return { amount: 0, type: 'none', billingEventType: 'adjustment' };
  }

  const share = (pct: number | null) =>
    pct ? (saleAmount * pct) / 100 : 0;

  switch (agreement.model) {
    case 'per_lead':
      return {
        amount: agreement.per_lead_amount ?? 0,
        type: 'fixed',
        billingEventType: 'lead_fee',
      };
    case 'per_appointment':
      return {
        amount: agreement.per_appointment_amount ?? 0,
        type: 'fixed',
        billingEventType: 'appointment_fee',
      };
    case 'revenue_share':
      return {
        amount: share(agreement.revenue_share_pct),
        type: 'revenue_share',
        billingEventType: 'revenue_share',
      };
    case 'hybrid':
      return {
        amount:
          (agreement.per_lead_amount ?? 0) +
          (agreement.per_appointment_amount ?? 0) +
          share(agreement.revenue_share_pct),
        type: 'hybrid',
        billingEventType: 'adjustment',
      };
    case 'subscription':
    default:
      return { amount: 0, type: 'none', billingEventType: 'adjustment' };
  }
}
