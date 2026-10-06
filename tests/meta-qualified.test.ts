import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { qualifiedEventSkipReason, type QualifiedEligibilityInput } from '@/lib/meta/qualified';

const now = Date.parse('2026-10-06T12:00:00Z');
const ok: QualifiedEligibilityInput = {
  qualificationStatus: 'qualified', qualifiedAt: '2026-10-05T12:00:00Z', qualifiedBy: 'user-1', leadSource: 'website', hasMetaSignal: true,
  session: { id: 's1', createdAt: '2026-10-04T12:00:00Z', measurementAllowed: true, consentMode: 'opt_out', pixelId: '933962709362966', isDemo: false },
};
const skip = (patch: Partial<QualifiedEligibilityInput>) => qualifiedEventSkipReason({ ...ok, ...patch }, now);

describe('QualifiedLead eligibility', () => {
  it('sends for a person-qualified, consented, Meta-attributed website lead', () => expect(skip({})).toBeNull());
  it('never sends without a human qualification', () => {
    expect(skip({ qualificationStatus: 'needs_qualification' })).toBe('not_human_qualified');
    expect(skip({ qualifiedBy: null })).toBe('not_human_qualified');
  });
  it('skips non-website, demo, pixel-less and non-Meta leads', () => {
    expect(skip({ leadSource: 'meta' })).toBe('not_website_funnel_lead');
    expect(skip({ session: { ...ok.session!, isDemo: true } })).toBe('demo');
    expect(skip({ session: { ...ok.session!, pixelId: undefined } })).toBe('no_pixel');
    expect(skip({ hasMetaSignal: false })).toBe('no_meta_attribution');
  });
  it('honors the stored opt-out and the funnel default only when no choice was recorded', () => {
    expect(skip({ session: { ...ok.session!, measurementAllowed: false } })).toBe('measurement_not_allowed');
    expect(skip({ session: { ...ok.session!, measurementAllowed: null, consentMode: 'opt_in' } })).toBe('measurement_not_allowed');
    expect(skip({ session: { ...ok.session!, measurementAllowed: null, consentMode: 'opt_out' } })).toBeNull();
  });
  it('skips events older than Meta\'s 7-day window or dated before the lead', () => {
    expect(skip({ qualifiedAt: '2026-09-28T12:00:00Z' })).toBe('too_old');
    expect(skip({ qualifiedAt: '2026-10-03T12:00:00Z' })).toBe('before_lead_created');
  });
});
