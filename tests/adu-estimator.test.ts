import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SELECTION,
  clampFinish,
  computeEstimate,
  formatUsd,
  monthlyPayment,
  normalizeBathrooms,
  resolveReturnKey,
  resolveTier,
  type AduSelection,
} from '@/lib/adu/pricing';
import { BASE_PRICE, SITE_QUESTIONS, SIZE_TIERS, UPGRADE_COST } from '@/lib/adu/pricing-config';

// These assert the PLACEHOLDER numbers on purpose. When the real costs replace
// lib/adu/pricing-config.ts, update the expected values here in the same commit.

const allNo = Object.fromEntries(SITE_QUESTIONS.map((q) => [q.id, 'no'])) as AduSelection['site'];

function select(over: Partial<AduSelection>): AduSelection {
  return { ...DEFAULT_SELECTION, site: allNo, ...over };
}

describe('base prices (all Basic, all site answers No)', () => {
  const cases: [string, Partial<AduSelection>, number][] = [
    ['garage', { kind: 'garage' }, 142000],
    ['studio', { bedrooms: 'studio', bathrooms: 1 }, 178000],
    ['1 bed', { bedrooms: '1', bathrooms: 1 }, 178000],
    ['2 bed 1 bath', { bedrooms: '2', bathrooms: 1 }, 224000],
    ['2 bed 2 bath', { bedrooms: '2', bathrooms: 2 }, 242000],
    ['3 bed 2 bath', { bedrooms: '3', bathrooms: 2 }, 288000],
    ['3 bed 3 bath', { bedrooms: '3', bathrooms: 3 }, 288000],
  ];
  it.each(cases)('%s', (_name, over, expected) => {
    const e = computeEstimate(select(over));
    expect(e.basePrice).toBe(expected);
    expect(e.total).toBe(expected);
    expect(e.items).toEqual([]);
    expect(e.isFirm).toBe(true);
  });

  it('every tier has a base price', () => {
    for (const tier of SIZE_TIERS) expect(Number.isFinite(BASE_PRICE[tier])).toBe(true);
  });
});

describe('tiers and sizes', () => {
  it('maps bedrooms and bathrooms to the right tier', () => {
    expect(resolveTier('garage', '3', 3)).toBe('garage');
    expect(resolveTier('new', 'studio', 1)).toBe('studio1');
    expect(resolveTier('new', '1', 1)).toBe('studio1');
    expect(resolveTier('new', '2', 1)).toBe('b2ba1');
    expect(resolveTier('new', '2', 2)).toBe('b2ba2');
    expect(resolveTier('new', '3', 2)).toBe('b3ba2');
    expect(resolveTier('new', '3', 3)).toBe('b3ba3');
  });

  it('coerces an invalid bathroom count instead of producing an invalid price', () => {
    expect(normalizeBathrooms('2', 3)).toBe(1);
    expect(normalizeBathrooms('3', 1)).toBe(2);
    expect(normalizeBathrooms('studio', 2)).toBe(1);
    expect(computeEstimate(select({ bedrooms: '3', bathrooms: 1 })).tier).toBe('b3ba2');
  });

  it('reports approximate square footage; none for a garage', () => {
    expect(computeEstimate(select({ kind: 'garage' })).approxSqft).toBeNull();
    expect(computeEstimate(select({ bedrooms: 'studio' })).approxSqft).toBe(400);
    expect(computeEstimate(select({ bedrooms: '1' })).approxSqft).toBe(600);
    expect(computeEstimate(select({ bedrooms: '2', bathrooms: 1 })).approxSqft).toBe(800);
    expect(computeEstimate(select({ bedrooms: '3', bathrooms: 2 })).approxSqft).toBe(1200);
  });

  it('separates the studio and 1 bed return rows', () => {
    expect(resolveReturnKey('new', 'studio', 1)).toBe('studio');
    expect(resolveReturnKey('new', '1', 1)).toBe('bed1');
    expect(resolveReturnKey('garage', '2', 2)).toBe('garage');
    expect(resolveReturnKey('new', '3', 3)).toBe('b3ba3');
  });
});

describe('upgrades', () => {
  it('garage: kitchen premium plus + bathroom premium', () => {
    const e = computeEstimate(
      select({ kind: 'garage', finishes: { bedroom: 'basic', kitchen: 'premiumPlus', bathroom: 'premium', livingRoom: 'basic' } }),
    );
    expect(e.total).toBe(142000 + 9650 + 1250);
    expect(e.items.map((i) => i.amount)).toEqual([9650, 1250]);
  });

  it('studio/1 bed: everything premium', () => {
    const e = computeEstimate(
      select({ bedrooms: '1', finishes: { bedroom: 'premium', kitchen: 'premium', bathroom: 'premium', livingRoom: 'premium' } }),
    );
    expect(e.total).toBe(178000 + 1050 + 6400 + 1250 + 1400);
  });

  it('2 bed 1 bath: bedroom premium plus + living room premium', () => {
    const e = computeEstimate(
      select({ bedrooms: '2', bathrooms: 1, finishes: { bedroom: 'premiumPlus', kitchen: 'basic', bathroom: 'basic', livingRoom: 'premium' } }),
    );
    expect(e.total).toBe(224000 + 4650 + 2500);
  });

  it('2 bed 2 bath: kitchen premium + bathroom premium', () => {
    const e = computeEstimate(
      select({ bedrooms: '2', bathrooms: 2, finishes: { bedroom: 'basic', kitchen: 'premium', bathroom: 'premium', livingRoom: 'basic' } }),
    );
    expect(e.total).toBe(242000 + 9250 + 2500);
  });

  it('3 bed 2 bath: bedroom premium + kitchen premium plus + living room premium', () => {
    const e = computeEstimate(
      select({ bedrooms: '3', bathrooms: 2, finishes: { bedroom: 'premium', kitchen: 'premiumPlus', bathroom: 'basic', livingRoom: 'premium' } }),
    );
    expect(e.total).toBe(288000 + 3350 + 15750 + 3750);
  });

  it('3 bed 3 bath: all upgrades at their highest level', () => {
    const e = computeEstimate(
      select({ bedrooms: '3', bathrooms: 3, finishes: { bedroom: 'premiumPlus', kitchen: 'premiumPlus', bathroom: 'premium', livingRoom: 'premium' } }),
    );
    expect(e.total).toBe(288000 + 6850 + 15750 + 3500 + 4000);
    expect(e.items).toHaveLength(4);
  });

  it('bathroom and living room never offer Premium Plus', () => {
    expect(clampFinish('bathroom', 'premiumPlus')).toBe('premium');
    expect(clampFinish('livingRoom', 'premiumPlus')).toBe('premium');
    expect(clampFinish('kitchen', 'premiumPlus')).toBe('premiumPlus');
    // A stale Premium Plus from another state is priced as Premium, never NaN.
    const e = computeEstimate(
      select({ kind: 'garage', finishes: { bedroom: 'basic', kitchen: 'basic', bathroom: 'premiumPlus', livingRoom: 'basic' } }),
    );
    expect(e.total).toBe(142000 + 1250);
  });

  it('has an upgrade cost for every tier of every offered level', () => {
    for (const room of Object.keys(UPGRADE_COST) as (keyof typeof UPGRADE_COST)[]) {
      for (const costs of Object.values(UPGRADE_COST[room])) {
        for (const tier of SIZE_TIERS) expect(Number.isFinite(costs[tier])).toBe(true);
      }
    }
  });

  it('switching between garage and new build always yields a finite price', () => {
    for (const kind of ['garage', 'new'] as const) {
      for (const bedrooms of ['studio', '1', '2', '3'] as const) {
        for (const bathrooms of [1, 2, 3]) {
          const e = computeEstimate(
            select({ kind, bedrooms, bathrooms, finishes: { bedroom: 'premiumPlus', kitchen: 'premiumPlus', bathroom: 'premiumPlus', livingRoom: 'premiumPlus' } }),
          );
          expect(Number.isFinite(e.total)).toBe(true);
          expect(e.total).toBeGreaterThan(0);
          expect(formatUsd(e.total)).toMatch(/^\$\d{1,3}(,\d{3})*$/);
        }
      }
    }
  });
});

describe('site-visit warning', () => {
  it('is firm only when every site question is answered No', () => {
    expect(computeEstimate(select({})).status).toBe('firm');
  });

  it('a Yes makes it a starting price and lists the item', () => {
    const e = computeEstimate(select({ site: { ...allNo, hillside: 'yes' } }));
    expect(e.status).toBe('site_visit');
    expect(e.isFirm).toBe(false);
    expect(e.siteVisitItems).toEqual([{ id: 'hillside', label: 'Hillside lot', answer: 'yes' }]);
  });

  it('Not sure also triggers it, and several items are all listed', () => {
    const e = computeEstimate(select({ site: { ...allNo, floodZone: 'unsure', septic: 'yes', overlayZone: 'unsure' } }));
    expect(e.status).toBe('site_visit');
    expect(e.siteVisitItems.map((i) => i.id)).toEqual(['floodZone', 'septic', 'overlayZone']);
  });

  it('unanswered questions are not firm either, but are not site-visit items', () => {
    const e = computeEstimate(select({ site: { hillside: 'no' } }));
    expect(e.status).toBe('pending');
    expect(e.isFirm).toBe(false);
    expect(e.siteVisitItems).toEqual([]);
    expect(e.unansweredCount).toBe(SITE_QUESTIONS.length - 1);
  });

  it('does not change the number', () => {
    const base = computeEstimate(select({})).total;
    expect(computeEstimate(select({ site: { ...allNo, hillside: 'yes' } })).total).toBe(base);
  });
});

describe('monthly payment', () => {
  it('matches the standard amortization formula at the 7% / 30 year defaults', () => {
    const p = 178000;
    const i = 0.07 / 12;
    const n = 360;
    expect(monthlyPayment(p, 7, 30)).toBeCloseTo((p * i) / (1 - Math.pow(1 + i, -n)), 6);
    expect(Math.round(monthlyPayment(p, 7, 30)!)).toBe(1184);
  });

  it('handles a 0% rate and rejects unusable input without NaN', () => {
    expect(monthlyPayment(120000, 0, 10)).toBe(1000);
    expect(monthlyPayment(178000, Number.NaN, 30)).toBeNull();
    expect(monthlyPayment(178000, 7, 0)).toBeNull();
    expect(monthlyPayment(178000, -1, 30)).toBeNull();
    expect(monthlyPayment(0, 7, 30)).toBeNull();
  });
});

describe('formatUsd', () => {
  it('formats whole dollars and never prints NaN', () => {
    expect(formatUsd(178000)).toBe('$178,000');
    expect(formatUsd(1184.4)).toBe('$1,184');
    expect(formatUsd(Number.NaN)).toBe('—');
  });
});
