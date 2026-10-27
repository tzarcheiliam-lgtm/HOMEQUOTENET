import { describe, expect, it } from 'vitest';
import { poolGeometry } from '@/lib/estimator/geometry';
import type { Answers, EstimatorTemplate, PoolDimensions } from '@/lib/estimator/types';
import { FIXTURE_TEMPLATE } from './fixtures/estimator-template';

// Fixture presets: small 24x12, medium 30x15, large 36x18; depth 5 ft.
// Rectangle medium: area 450, perimeter 90, interior 450 + 90 x 5 = 900.
const geo = (answers: Answers, dimensions?: PoolDimensions, template: EstimatorTemplate = FIXTURE_TEMPLATE) =>
  poolGeometry(template, { answers, dimensions });

describe('poolGeometry presets', () => {
  it('rectangle medium', () => {
    const g = geo({ shape: ['rectangle'], size: ['medium'] });
    expect(g).toMatchObject({
      shape: 'rectangle',
      size: 'medium',
      lengthFt: 30,
      widthFt: 15,
      avgDepthFt: 5,
      surfaceAreaSqft: 450,
      perimeterFt: 90,
      interiorSqft: 900,
      deckSqft: 0,
      source: 'preset',
    });
  });

  it('rectangle small: 288 area, 72 perimeter, 648 interior', () => {
    const g = geo({ shape: ['rectangle'], size: ['small'] });
    expect([g.surfaceAreaSqft, g.perimeterFt, g.interiorSqft]).toEqual([288, 72, 648]);
  });

  it('rectangle large: 648 area, 108 perimeter, 1188 interior', () => {
    const g = geo({ shape: ['rectangle'], size: ['large'] });
    expect([g.surfaceAreaSqft, g.perimeterFt, g.interiorSqft]).toEqual([648, 108, 1188]);
  });

  it('l_shape medium: 0.9 area, 1.15 perimeter', () => {
    const g = geo({ shape: ['l_shape'], size: ['medium'] });
    expect(g.surfaceAreaSqft).toBeCloseTo(405, 6);
    expect(g.perimeterFt).toBeCloseTo(103.5, 6);
    expect(g.interiorSqft).toBeCloseTo(405 + 103.5 * 5, 6);
  });

  it('freeform medium: 0.85 area, 1.1 perimeter', () => {
    const g = geo({ shape: ['freeform'], size: ['medium'] });
    expect(g.surfaceAreaSqft).toBeCloseTo(382.5, 6);
    expect(g.perimeterFt).toBeCloseTo(99, 6);
    expect(g.interiorSqft).toBeCloseTo(382.5 + 99 * 5, 6);
  });

  it('"unsure" shape uses factors 1/1', () => {
    const g = geo({ shape: ['unsure'], size: ['medium'] });
    expect(g.shape).toBe('unsure');
    expect([g.surfaceAreaSqft, g.perimeterFt]).toEqual([450, 90]);
  });

  it('"unsure" size is medium but stays reported as unsure', () => {
    const g = geo({ shape: ['rectangle'], size: ['unsure'] });
    expect(g.size).toBe('unsure');
    expect([g.lengthFt, g.widthFt]).toEqual([30, 15]);
  });

  it('missing, unknown or empty answers fall back to unsure / medium', () => {
    for (const answers of [{}, { shape: ['hexagon'], size: ['huge'] }, { shape: [], size: [] }] as Answers[]) {
      const g = geo(answers);
      expect([g.shape, g.size, g.lengthFt, g.widthFt, g.interiorSqft]).toEqual(['unsure', 'unsure', 30, 15, 900]);
    }
  });

  it('reads shape and size by role, not by question id', () => {
    const t = structuredClone(FIXTURE_TEMPLATE);
    t.questions.find((q) => q.role === 'shape')!.id = 'poolShape';
    const g = poolGeometry(t, { answers: { poolShape: ['l_shape'], size: ['small'] } });
    expect(g.shape).toBe('l_shape');
    expect(g.size).toBe('small');
  });
});

describe('poolGeometry typed dimensions', () => {
  it('uses dimensions inside the limits, with the default depth', () => {
    // 40 x 20 rectangle: area 800, perimeter 120, interior 800 + 120 x 5 = 1400.
    const g = geo({ shape: ['rectangle'], size: ['small'] }, { lengthFt: 40, widthFt: 20 });
    expect(g).toMatchObject({ lengthFt: 40, widthFt: 20, avgDepthFt: 5, surfaceAreaSqft: 800, perimeterFt: 120, interiorSqft: 1400, source: 'dimensions' });
  });

  it('uses a typed depth inside its limits', () => {
    // interior 800 + 120 x 4 = 1280
    const g = geo({ shape: ['rectangle'] }, { lengthFt: 40, widthFt: 20, avgDepthFt: 4 });
    expect(g.avgDepthFt).toBe(4);
    expect(g.interiorSqft).toBe(1280);
  });

  it('ignores a typed depth outside its limits but keeps valid length and width', () => {
    for (const avgDepthFt of [2.9, 12.1, NaN]) {
      const g = geo({ shape: ['rectangle'] }, { lengthFt: 40, widthFt: 20, avgDepthFt });
      expect(g.source).toBe('dimensions');
      expect(g.avgDepthFt).toBe(5);
      expect(g.interiorSqft).toBe(1400);
    }
  });

  it('limits are inclusive', () => {
    const lo = geo({ shape: ['rectangle'] }, { lengthFt: 6, widthFt: 6, avgDepthFt: 3 });
    expect(lo.source).toBe('dimensions');
    expect(lo.surfaceAreaSqft).toBe(36);
    const hi = geo({ shape: ['rectangle'] }, { lengthFt: 80, widthFt: 50, avgDepthFt: 12 });
    expect(hi.source).toBe('dimensions');
    expect(hi.surfaceAreaSqft).toBe(4000);
  });

  it('falls back to the preset when length or width is outside the limits', () => {
    const bad: PoolDimensions[] = [
      { lengthFt: 5.9, widthFt: 20 },
      { lengthFt: 40, widthFt: 5.9 },
      { lengthFt: 80.1, widthFt: 20 },
      { lengthFt: 40, widthFt: 50.1 },
      { lengthFt: -40, widthFt: 20 },
      { lengthFt: 0, widthFt: 0 },
    ];
    for (const dimensions of bad) {
      const g = geo({ shape: ['rectangle'], size: ['small'] }, dimensions);
      expect([g.source, g.lengthFt, g.widthFt, g.interiorSqft]).toEqual(['preset', 24, 12, 648]);
    }
  });

  it('a bad length also drops the typed depth (all preset)', () => {
    const g = geo({ shape: ['rectangle'], size: ['small'] }, { lengthFt: 500, widthFt: 20, avgDepthFt: 4 });
    expect([g.source, g.avgDepthFt, g.interiorSqft]).toEqual(['preset', 5, 648]);
  });

  it('falls back to the preset for NaN / Infinity', () => {
    for (const dimensions of [
      { lengthFt: NaN, widthFt: 20 },
      { lengthFt: 40, widthFt: Infinity },
    ]) {
      const g = geo({ shape: ['rectangle'] }, dimensions);
      expect(g.source).toBe('preset');
      expect(g.interiorSqft).toBe(900);
    }
  });

  it('applies the shape factors to typed dimensions', () => {
    const g = geo({ shape: ['l_shape'] }, { lengthFt: 40, widthFt: 20 });
    expect(g.surfaceAreaSqft).toBeCloseTo(720, 6);
    expect(g.perimeterFt).toBeCloseTo(138, 6);
  });
});

describe('poolGeometry deck area', () => {
  const scoped = (deckSize?: string, scope = ['deck']): Answers => ({
    shape: ['rectangle'],
    size: ['medium'],
    scope,
    ...(deckSize ? { deckSize: [deckSize] } : {}),
  });

  it('comes from the deckSize answer while the deck-size question is visible', () => {
    expect(geo(scoped('small')).deckSqft).toBe(300);
    expect(geo(scoped('medium')).deckSqft).toBe(600);
    expect(geo(scoped('large')).deckSqft).toBe(1000);
  });

  it('is 0 when unanswered', () => {
    expect(geo(scoped()).deckSqft).toBe(0);
  });

  it('is 0 when the deck-size question is hidden (stale answer)', () => {
    expect(geo(scoped('large', ['surface'])).deckSqft).toBe(0);
  });

  it('is 0 for an unknown deckSize option', () => {
    expect(geo(scoped('huge')).deckSqft).toBe(0);
  });

  it('is 0 for a template without a deckSize question', () => {
    const t = structuredClone(FIXTURE_TEMPLATE);
    t.questions = t.questions.filter((q) => q.role !== 'deckSize');
    expect(poolGeometry(t, { answers: scoped('large') }).deckSqft).toBe(0);
  });

  it('ignores prototype keys in the deck map', () => {
    const t = structuredClone(FIXTURE_TEMPLATE);
    t.questions.find((q) => q.role === 'deckSize')!.options.push({ id: 'constructor', label: 'x' });
    expect(poolGeometry(t, { answers: scoped('constructor') }).deckSqft).toBe(0);
  });
});

describe('poolGeometry guards', () => {
  it('never returns NaN, Infinity or negatives from a broken template', () => {
    const t = structuredClone(FIXTURE_TEMPLATE);
    t.geometry.avgDepthFt = NaN;
    t.geometry.sizes.medium = { lengthFt: -30, widthFt: Infinity };
    t.geometry.shapes.rectangle = { areaFactor: NaN, perimeterFactor: -1 };
    t.geometry.deckSizes.large = NaN;
    const g = poolGeometry(t, { answers: { shape: ['rectangle'], size: ['medium'], scope: ['deck'], deckSize: ['large'] } });
    for (const n of [g.lengthFt, g.widthFt, g.avgDepthFt, g.surfaceAreaSqft, g.perimeterFt, g.interiorSqft, g.deckSqft]) {
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });
});
