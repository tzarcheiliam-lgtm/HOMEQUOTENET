import { describe, it, expect } from 'vitest';
import { computeCommission } from '@/lib/outcomes/commission';
import { selectActiveAgreement } from '@/lib/outcomes/pricing';
import type { PricingAgreement } from '@/lib/types';

function agreement(p: Partial<PricingAgreement>): PricingAgreement {
  return {
    id: 'a1',
    contractor_id: 'c1',
    vertical_id: null,
    model: 'per_lead',
    per_lead_amount: null,
    per_appointment_amount: null,
    revenue_share_pct: null,
    subscription_amount: null,
    subscription_period: null,
    is_exclusive: false,
    active_from: '2020-01-01',
    active_to: null,
    is_active: true,
    notes: null,
    created_at: '',
    updated_at: '',
    ...p,
  };
}

describe('computeCommission', () => {
  it('per_lead → flat fee', () => {
    const r = computeCommission(agreement({ model: 'per_lead', per_lead_amount: 75 }), 10000);
    expect(r.amount).toBe(75);
    expect(r.billingEventType).toBe('lead_fee');
  });
  it('per_appointment → flat fee', () => {
    const r = computeCommission(
      agreement({ model: 'per_appointment', per_appointment_amount: 120 }),
      10000
    );
    expect(r.amount).toBe(120);
  });
  it('revenue_share → percentage of sale', () => {
    const r = computeCommission(
      agreement({ model: 'revenue_share', revenue_share_pct: 10 }),
      10000
    );
    expect(r.amount).toBe(1000);
  });
  it('hybrid → sum of components', () => {
    const r = computeCommission(
      agreement({
        model: 'hybrid',
        per_lead_amount: 50,
        per_appointment_amount: 100,
        revenue_share_pct: 5,
      }),
      10000
    );
    expect(r.amount).toBe(650); // 50 + 100 + 500
  });
  it('no agreement → 0 (admin override path)', () => {
    const r = computeCommission(null, 10000);
    expect(r.amount).toBe(0);
    expect(r.type).toBe('none');
  });
});

describe('selectActiveAgreement (H1)', () => {
  const verticalId = 'fencing';
  const all = agreement({ id: 'all', vertical_id: null, per_lead_amount: 50 });
  const specific = agreement({
    id: 'spec',
    vertical_id: verticalId,
    model: 'revenue_share',
    revenue_share_pct: 10,
  });
  const inactive = agreement({ id: 'old', vertical_id: verticalId, is_active: false });
  const expired = agreement({
    id: 'exp',
    vertical_id: verticalId,
    active_to: '2021-01-01',
  });

  it('prefers a vertical-specific agreement over all-verticals', () => {
    const r = selectActiveAgreement([all, specific], verticalId, '2025-01-01');
    expect(r?.id).toBe('spec');
  });
  it('falls back to all-verticals when no specific match', () => {
    const r = selectActiveAgreement([all], 'adu', '2025-01-01');
    expect(r?.id).toBe('all');
  });
  it('ignores inactive and expired agreements', () => {
    const r = selectActiveAgreement([inactive, expired, all], verticalId, '2025-01-01');
    expect(r?.id).toBe('all');
  });
  it('returns null when nothing applies', () => {
    expect(selectActiveAgreement([inactive, expired], verticalId, '2025-01-01')).toBeNull();
  });

  it('END-TO-END: resolved agreement → correct commission (the H1 fix)', () => {
    // Contractor has an all-verticals per-lead deal AND a fencing revenue-share deal.
    const resolved = selectActiveAgreement([all, specific], verticalId, '2025-01-01');
    const commission = computeCommission(resolved, 20000);
    // Should use the fencing-specific 10% revenue share = 2000, NOT $0.
    expect(resolved?.id).toBe('spec');
    expect(commission.amount).toBe(2000);
  });
});
