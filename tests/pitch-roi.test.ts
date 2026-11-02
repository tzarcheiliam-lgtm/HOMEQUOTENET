import { describe, expect, it } from 'vitest';
import { calculateRoi } from '@/lib/pitch/roi';
import { COMPARISON, FAQS, ROI_EXAMPLE, SLIDES, SLIDE_INDEX, TIERS } from '@/lib/pitch/config';

describe('pitch ROI calculator', () => {
  const base = { avgContract: 35000, marginPct: 30, appointments: 10, showRatePct: 80, closeRatePct: 25, packageCost: 2750, adBudget: 2000 };

  it('follows booked → held → sold → revenue → gross profit, never counting revenue as profit', () => {
    const r = calculateRoi(base);
    expect(r.attended).toBeCloseTo(8);
    expect(r.closedJobs).toBeCloseTo(2);
    expect(r.revenue).toBeCloseTo(70000);
    expect(r.grossProfit).toBeCloseTo(21000);
    expect(r.investment).toBe(4750);
    expect(r.contribution).toBeCloseTo(16250);
    expect(r.romi).toBeCloseTo(16250 / 4750);
    // One job earns 35,000 x 30% = 10,500 of gross profit.
    expect(r.breakEvenJobs).toBeCloseTo(4750 / 10500);
  });

  it('shows a loss honestly when gross profit does not cover the spend', () => {
    const r = calculateRoi({ ...base, closeRatePct: 0 });
    expect(r.closedJobs).toBe(0);
    expect(r.contribution).toBe(-4750);
    expect(r.romi).toBeCloseTo(-1);
  });

  it('guards against empty, negative and out-of-range input', () => {
    const r = calculateRoi({ ...base, marginPct: 0, packageCost: 0, adBudget: 0 });
    expect(r.breakEvenJobs).toBeNull();
    expect(r.romi).toBeNull();
    const c = calculateRoi({ ...base, showRatePct: 140, closeRatePct: -5, appointments: Number.NaN });
    expect(c.attended).toBe(0);
    expect(c.closedJobs).toBe(0);
  });
});

describe('pitch config', () => {
  it('has one recommended package, prices in the agreed band and ad spend kept separate', () => {
    expect(TIERS.filter((t) => t.recommended).map((t) => t.id)).toEqual(['appointments']);
    for (const t of TIERS) {
      expect(t.price).toBeGreaterThanOrEqual(1750);
      expect(t.price).toBeLessThanOrEqual(3500);
      expect(t.adBudget.min).toBeLessThan(t.adBudget.max);
    }
  });

  it('every slide has notes and a unique deep-link id', () => {
    expect(SLIDES).toHaveLength(15);
    expect(new Set(SLIDES.map((s) => s.id)).size).toBe(SLIDES.length);
    for (const s of SLIDES) for (const k of ['say', 'ask', 'emphasize', 'next'] as const) expect(s.notes[k].length).toBeGreaterThan(10);
    expect(SLIDE_INDEX.pricing).toBe(5);
  });

  it('comparison rows only reference real packages, and higher tiers include lower-tier rows', () => {
    const ids = new Set(TIERS.map((t) => t.id));
    for (const g of COMPARISON) for (const r of g.rows) {
      expect(r.tiers.length).toBeGreaterThan(0);
      for (const t of r.tiers) expect(ids.has(t)).toBe(true);
      expect(r.tiers).toContain('growth');
    }
  });

  it('keeps open policy questions flagged, and the ROI example is plain input', () => {
    expect(FAQS.filter((f) => f.decision).length).toBeGreaterThan(0);
    expect(ROI_EXAMPLE.closeRatePct).toBeLessThanOrEqual(100);
  });
});
