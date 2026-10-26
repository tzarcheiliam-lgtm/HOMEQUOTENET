import { describe, expect, it } from 'vitest';
import {
  BUILD_OPTIONS, COLORS, EXTRAS, PLACEMENTS, SIZES, STYLES, designChips, describeDesign, isDesignComplete, resolveDesign,
} from '@/lib/adu-quiz/design';
import { estimateRange } from '@/lib/adu-quiz/estimate';
import { PRICING } from '@/lib/adu-quiz/config';
import { ADU_LAYERS, geometry, layerSources } from '@/components/adu-quiz/layers';

const design = { placement: 'backyard', size: '1br', style: 'modern', color: 'sage', goal: 'rental_income' };

describe('design', () => {
  it('has the option lists from the brief', () => {
    expect(PLACEMENTS.map((o) => o.value)).toEqual(['backyard', 'garage_conversion', 'attached', 'above_garage']);
    expect(SIZES.map((o) => [o.value, o.sqft])).toEqual([['studio', 400], ['1br', 600], ['2br', 800], ['3br', 1000]]);
    expect(STYLES.map((o) => o.value)).toEqual(['modern', 'craftsman', 'mediterranean', 'farmhouse']);
    expect(COLORS).toHaveLength(6);
    expect(EXTRAS.map((o) => o.value)).toEqual(['solar', 'porch', 'landscaping', 'large_windows']);
  });

  it('chips fill in as choices are made', () => {
    expect(designChips({})).toEqual([]);
    expect(designChips({ placement: 'backyard' })).toEqual(['Backyard']);
    expect(designChips(design)).toEqual(['Backyard', '1 bed', '600 sq ft', 'Modern', 'Sage green']);
    expect(designChips({ ...design, size: '3br', material: 'wood', extras: ['solar', 'porch'] }))
      .toEqual(['Backyard', '3 bed', '1,000+ sq ft', 'Modern', 'Sage green, wood siding', 'Solar panels', 'Covered porch or deck']);
  });

  it('describes the design for the alt text and the screen-reader announcement', () => {
    expect(describeDesign({})).toMatch(/lot and main house/);
    expect(describeDesign({ ...design, extras: ['solar', 'landscaping'] }))
      .toBe('Your ADU: backyard, 1 bedroom, about 600 square feet, modern style, sage green exterior, with solar panels, landscaping.');
  });

  it('validates a finished design', () => {
    expect(isDesignComplete(design)).toBe(true);
    expect(isDesignComplete({ ...design, color: 'plaid' })).toBe(false);
    expect(isDesignComplete({ ...design, goal: undefined })).toBe(false);
    expect(isDesignComplete({ ...design, extras: ['solar', 'solar'] })).toBe(false);
    for (const key of Object.keys(BUILD_OPTIONS)) expect(Array.isArray(BUILD_OPTIONS[key as keyof typeof BUILD_OPTIONS])).toBe(true);
  });

  it('fills unchosen steps with defaults so the preview never breaks', () => {
    const r = resolveDesign({});
    expect(r).toMatchObject({ hasAdu: false, size: '1br', style: 'modern', color: 'white' });
    expect(resolveDesign({ style: 'farmhouse' }).material).toBe('board_batten');
    expect(resolveDesign({ style: 'farmhouse', material: 'wood' }).material).toBe('wood');
  });
});

describe('live preview layers', () => {
  it('places the ADU for every placement and size without overlapping the canvas edge', () => {
    for (const p of PLACEMENTS) for (const s of SIZES) {
      const g = geometry(p.value, s.value);
      expect(g.x).toBeGreaterThanOrEqual(0);
      expect(g.x + g.w).toBeLessThanOrEqual(900);
      expect(g.y + g.h).toBeLessThanOrEqual(400);
    }
  });
  it('grows with size for a detached ADU and stays fixed for a garage', () => {
    const widths = SIZES.map((s) => geometry('backyard', s.value).w);
    expect(widths).toEqual([...widths].sort((a, b) => a - b));
    expect(new Set(widths).size).toBe(4);
    expect(new Set(SIZES.map((s) => geometry('garage_conversion', s.value).w)).size).toBe(1);
  });
  it('has a drawing for every extra and uses no image files until you supply them', () => {
    expect(Object.keys(ADU_LAYERS.extras).sort()).toEqual(EXTRAS.map((e) => e.value).sort());
    expect(layerSources()).toEqual([]);
  });
});

describe('estimate (server only)', () => {
  const full = {
    basePerSqft: { backyard: 400, garage_conversion: 300, attached: 350, above_garage: 380 },
    styleMultiplier: { modern: 1, craftsman: 1.1, mediterranean: 1.15, farmhouse: 1.05 },
    extraPrice: { solar: 20000, porch: 10000, landscaping: 8000, large_windows: 6000 },
    rangeFactor: { low: 0.9, high: 1.1 },
  };
  it('shows nothing numeric while PRICING is not filled in', () => {
    expect(estimateRange(design)).toBeNull();
    expect(Object.values(PRICING.basePerSqft).every((v) => v === null)).toBe(true);
  });
  it('computes sqft x base x style + extras, as a range', () => {
    expect(estimateRange(design, full)).toEqual({ low: 216000, high: 264000 }); // 600 x 400 = 240,000
    expect(estimateRange({ ...design, style: 'craftsman', extras: ['solar', 'porch'] }, full)).toEqual({ low: 264600, high: 323400 }); // 264,000 + 30,000 = 294,000
  });
  it('returns null, never a guess, when anything the design needs is unset or the design is incomplete', () => {
    expect(estimateRange(design, { ...full, basePerSqft: { ...full.basePerSqft, backyard: null } })).toBeNull();
    expect(estimateRange({ ...design, extras: ['solar'] }, { ...full, extraPrice: { ...full.extraPrice, solar: null } })).toBeNull();
    expect(estimateRange({ ...design, extras: [] }, { ...full, extraPrice: { solar: null, porch: null, landscaping: null, large_windows: null } })).not.toBeNull();
    expect(estimateRange({ ...design, size: undefined }, full)).toBeNull();
    expect(estimateRange(design, { ...full, rangeFactor: { low: 1.2, high: 1 } })).toBeNull();
  });
});
