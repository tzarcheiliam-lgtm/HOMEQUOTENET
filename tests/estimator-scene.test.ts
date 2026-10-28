import { describe, expect, it } from 'vitest';
import { applyPackage } from '@/lib/estimator/engine';
import { POOL_TEMPLATE } from '@/lib/estimator/templates/pool';
import { buildScene } from '@/lib/estimator/scene/scene';
import {
  DECK_SQFT,
  YARD,
  layoutScene,
  pointInPolygon,
  rectInside,
  rectsOverlap,
  type Rect,
  type SceneLayout,
} from '@/lib/estimator/scene/geometry';
import { SCENE, type SceneDeckSize, type SceneShape, type SceneSpec } from '@/lib/estimator/scene/types';
import { CUSTOM_PACKAGE_ID, type Answers } from '@/lib/estimator/types';

const T = POOL_TEMPLATE;
const CANVAS: Rect = { x: 0, y: 0, w: SCENE.width, h: SCENE.height };

const spec = (over: Partial<SceneSpec> = {}): SceneSpec => ({
  project: 'remodel',
  shape: 'rectangle',
  lengthFt: 30,
  widthFt: 15,
  surface: null,
  tile: null,
  coping: null,
  deck: null,
  deckSize: 'none',
  features: { baja: false, spa: false, waterBowls: false, fireBowls: false, lights: false },
  extras: { kitchen: false, patioCover: false, turfPlanting: false, firePit: false },
  ...over,
});

describe('buildScene', () => {
  it('draws a medium rectangle with nothing chosen yet', () => {
    const s = buildScene(T, { answers: {} });
    expect(s).toMatchObject({ project: 'remodel', shape: 'rectangle', lengthFt: 30, widthFt: 15, surface: null, deck: null, deckSize: 'none' });
    expect(Object.values(s.features).some(Boolean)).toBe(false);
    expect(Object.values(s.extras).some(Boolean)).toBe(false);
  });

  it('maps shape and size, with "not sure" as a medium rectangle', () => {
    expect(buildScene(T, { answers: { shape: ['l_shape'], size: ['large'] } })).toMatchObject({ shape: 'l_shape', lengthFt: 36, widthFt: 18 });
    expect(buildScene(T, { answers: { shape: ['freeform'], size: ['small'] } })).toMatchObject({ shape: 'freeform', lengthFt: 24, widthFt: 12 });
    expect(buildScene(T, { answers: { shape: ['unsure'], size: ['unsure'] } })).toMatchObject({ shape: 'rectangle', lengthFt: 30, widthFt: 15 });
  });

  it('uses valid typed dimensions the same way pricing does, and ignores invalid ones', () => {
    const typed = buildScene(T, { answers: { size: ['unsure'] }, dimensions: { lengthFt: 42, widthFt: 21 } });
    expect(typed).toMatchObject({ lengthFt: 42, widthFt: 21 });
    const bad = buildScene(T, { answers: { size: ['small'] }, dimensions: { lengthFt: 500, widthFt: 21 } });
    expect(bad).toMatchObject({ lengthFt: 24, widthFt: 12 });
  });

  it('fills in a package (Transformation) including deck, features and lights', () => {
    const answers = applyPackage(T, { project: ['backyard'], shape: ['rectangle'], size: ['medium'] }, 'transformation');
    const s = buildScene(T, { answers });
    expect(s).toMatchObject({ project: 'backyard', surface: 'pebble', tile: 'glass', coping: 'travertine', deck: 'pavers', deckSize: 'medium' });
    expect(s.features).toEqual({ baja: true, spa: false, waterBowls: true, fireBowls: true, lights: true });
  });

  it('Refresh shows no deck and no features', () => {
    const s = buildScene(T, { answers: applyPackage(T, { project: ['remodel'] }, 'refresh') });
    expect(s).toMatchObject({ surface: 'quartz', tile: 'porcelain', coping: 'concrete', deck: null, deckSize: 'none' });
    expect(Object.values(s.features).some(Boolean)).toBe(false);
  });

  it('ignores stale answers to hidden questions', () => {
    // Transformation, then scope narrowed to the surface only: deck, features and edge are hidden now.
    const answers: Answers = {
      ...applyPackage(T, { project: ['remodel'] }, 'transformation'),
      package: [CUSTOM_PACKAGE_ID],
      scope: ['surface'],
      extras: ['kitchen', 'fire_pit'],
    };
    const s = buildScene(T, { answers });
    expect(s.surface).toBe('pebble');
    expect(s).toMatchObject({ tile: null, coping: null, deck: null, deckSize: 'none' });
    expect(Object.values(s.features).some(Boolean)).toBe(false);
    // Extras only show for a pool-and-backyard project.
    expect(Object.values(s.extras).some(Boolean)).toBe(false);
    expect(buildScene(T, { answers: { ...answers, project: ['backyard'] } }).extras).toMatchObject({ kitchen: true, firePit: true });
  });

  it('treats "help me choose" materials as not chosen', () => {
    const s = buildScene(T, { answers: { scope: ['surface', 'tile_coping'], surface: ['unsure'], coping: ['unsure'], tile: ['glass'] } });
    expect(s).toMatchObject({ surface: null, coping: null, tile: 'glass' });
  });

  it('keeps deckSize none until the deck size is answered', () => {
    expect(buildScene(T, { answers: { scope: ['deck'], deck: ['concrete'] } })).toMatchObject({ deck: 'concrete', deckSize: 'none' });
    expect(buildScene(T, { answers: { scope: ['deck'], deck: ['concrete'], deckSize: ['large'] } })).toMatchObject({ deckSize: 'large' });
  });
});

/* ------------------------------ geometry ------------------------------ */

const SHAPES: SceneShape[] = ['rectangle', 'l_shape', 'freeform'];
const SIZES: [number, number][] = [
  [24, 12],
  [30, 15],
  [36, 18],
];
const DECKS: SceneDeckSize[] = ['none', 'small', 'medium', 'large'];

/** Every feature/extras combination worth checking (all 2^9 would be slow and redundant). */
function* combos(): Generator<Pick<SceneSpec, 'features' | 'extras' | 'project'>> {
  for (let mask = 0; mask < 1 << 9; mask += 1) {
    // All features on/off, and each extras subset with and without spa+bowls.
    const bit = (i: number) => (mask & (1 << i)) !== 0;
    yield {
      project: bit(8) ? 'backyard' : 'remodel',
      features: { baja: bit(0), spa: bit(1), waterBowls: bit(2), fireBowls: bit(2) || bit(3), lights: bit(3) },
      extras: { kitchen: bit(4), patioCover: bit(5), turfPlanting: bit(6), firePit: bit(7) },
    };
  }
}

function boxesOf(l: SceneLayout): { name: string; box: Rect }[] {
  return [
    ...l.objects.map((o, i) => ({ name: `${o.kind}#${i}`, box: o.box })),
    ...l.bowls.map((b, i) => ({ name: `bowl#${i}`, box: { x: b.cx - b.r, y: b.cy - b.r, w: 2 * b.r, h: 2 * b.r } })),
  ];
}

/** Broken layout rules as readable strings (empty = fine). Plain checks: this runs ~18k times. */
function problems(s: SceneSpec, l: SceneLayout): string[] {
  const out: string[] = [];
  const tag = `${s.shape} ${s.lengthFt}x${s.widthFt} deck=${s.deckSize} ${JSON.stringify(s.features)} ${JSON.stringify(s.extras)}`;
  const fail = (what: string) => out.push(`${what}: ${tag}`);
  if (!rectInside(l.core, YARD)) fail('pool outside the yard');
  if (!rectInside(l.deck.box, YARD)) fail('deck outside the yard');
  if (!rectInside(l.core, l.deck.box)) fail('pool outside its deck');
  if (/NaN|Infinity/.test(l.pool.path)) fail('bad pool path');
  if (l.pool.outline.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) fail('bad outline');
  const all = boxesOf(l);
  for (const { name, box } of all) {
    if (!rectInside(box, CANVAS)) fail(`${name} outside the canvas`);
    // Free-standing objects clear the pool core; bowls sit on the coping, outside the water.
    if (!name.startsWith('bowl') && rectsOverlap(box, l.core)) fail(`${name} on the pool`);
  }
  for (const b of l.bowls) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      if (pointInPolygon({ x: b.cx + Math.cos(a) * b.r, y: b.cy + Math.sin(a) * b.r }, l.pool.outline)) fail('bowl in the water');
    }
    if (l.spa && rectsOverlap({ x: b.cx - b.r, y: b.cy - b.r, w: 2 * b.r, h: 2 * b.r }, l.spa.box)) fail('bowl on the spa');
  }
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) if (rectsOverlap(all[i].box, all[j].box)) fail(`${all[i].name} overlaps ${all[j].name}`);
  }
  // Pool-internal features stay in the pool.
  for (const r of l.baja?.loungers ?? []) if (!pointInPolygon({ x: r.x + r.w / 2, y: r.y + r.h / 2 }, l.pool.outline)) fail('shelf lounger out of the water');
  for (const p of l.lights) if (!pointInPolygon(p, l.pool.outline)) fail('light out of the water');
  if (l.spa && !rectInside(l.spa.box, l.core)) fail('spa outside the core');
  // Beds never run under a kitchen or patio cover.
  for (const bed of l.beds) for (const o of l.objects) if (o.kind !== 'olive_tree' && rectsOverlap(bed, o.box)) fail(`bed under ${o.kind}`);
  return out;
}

describe('layoutScene', () => {
  it('keeps everything on the canvas and nothing overlapping, for every shape x size x deck x feature set', () => {
    let checked = 0;
    const found: string[] = [];
    for (const shape of SHAPES) {
      for (const [lengthFt, widthFt] of SIZES) {
        for (const deckSize of DECKS) {
          for (const c of combos()) {
            const s = spec({ shape, lengthFt, widthFt, deckSize, deck: deckSize === 'none' ? null : 'pavers', ...c });
            const l = layoutScene(s);
            found.push(...problems(s, l));
            // Every requested extra finds a place at the preset sizes.
            const kinds = new Set(l.objects.map((o) => o.kind));
            if (s.extras.kitchen && !kinds.has('kitchen')) found.push(`no kitchen: ${shape} ${lengthFt} ${deckSize}`);
            if (s.extras.patioCover && !kinds.has('patio_cover')) found.push(`no patio cover: ${shape} ${lengthFt} ${deckSize}`);
            if (s.extras.firePit && !kinds.has('fire_pit')) found.push(`no fire pit: ${shape} ${lengthFt} ${deckSize}`);
            if (!kinds.has('lounge_set')) found.push(`no loungers: ${shape} ${lengthFt} ${deckSize} ${JSON.stringify(s.extras)}`);
            checked += 1;
          }
        }
      }
    }
    expect(found.slice(0, 10)).toEqual([]);
    expect(checked).toBe(3 * 3 * 4 * 512);
  }, 30_000);

  it('sizes the deck from deckSize', () => {
    for (const shape of SHAPES) {
      for (const [lengthFt, widthFt] of SIZES) {
        for (const deckSize of ['small', 'medium', 'large'] as const) {
          const l = layoutScene(spec({ shape, lengthFt, widthFt, deckSize, deck: 'pavers' }));
          expect(l.deck.areaSqft).toBeGreaterThan(DECK_SQFT[deckSize] * 0.9);
          expect(l.deck.areaSqft).toBeLessThan(DECK_SQFT[deckSize] * 1.1);
        }
        // No new deck: a narrow existing band of about 3-4 ft.
        const none = layoutScene(spec({ shape, lengthFt, widthFt }));
        expect(none.core.x - none.deck.box.x).toBeLessThanOrEqual(4 * SCENE.pxPerFt);
        expect(none.core.y - none.deck.box.y).toBeLessThanOrEqual(4 * SCENE.pxPerFt);
        // The house side is the widest.
        const l = layoutScene(spec({ shape, lengthFt, widthFt, deckSize: 'large', deck: 'pavers' }));
        expect(l.core.y - l.deck.box.y).toBeGreaterThan(l.core.x - l.deck.box.x);
        expect(l.core.y - l.deck.box.y).toBeGreaterThan(l.deck.box.y + l.deck.box.h - (l.core.y + l.core.h));
      }
    }
  });

  it('draws the preset pools at 13 units per foot', () => {
    const l = layoutScene(spec({ lengthFt: 36, widthFt: 18 }));
    expect(l.pool.scale).toBe(1);
    expect(l.pool.box.w).toBeCloseTo(36 * SCENE.pxPerFt);
    expect(l.pool.box.h).toBeCloseTo(18 * SCENE.pxPerFt);
  });

  it('scales a huge typed pool down to fit, and handles odd dimensions', () => {
    const odd: [number, number][] = [
      [80, 50],
      [80, 6],
      [6, 6],
      [10, 40],
      [NaN, 15],
      [45, 20],
    ];
    for (const [lengthFt, widthFt] of odd) {
      for (const shape of SHAPES) {
        const s = spec({
          shape,
          lengthFt,
          widthFt,
          deckSize: 'large',
          deck: 'porcelain',
          project: 'backyard',
          features: { baja: true, spa: true, waterBowls: true, fireBowls: true, lights: true },
          extras: { kitchen: true, patioCover: true, turfPlanting: true, firePit: true },
        });
        const l = layoutScene(s);
        expect(problems(s, l)).toEqual([]);
        expect(l.pool.scale).toBeLessThanOrEqual(1);
        expect(l.pool.box.w).toBeGreaterThanOrEqual(l.pool.box.h);
      }
    }
  });

  it('is deterministic', () => {
    const s = spec({ shape: 'freeform', deckSize: 'medium', deck: 'pavers', features: { baja: true, spa: true, waterBowls: true, fireBowls: false, lights: true } });
    expect(layoutScene(s)).toEqual(layoutScene(s));
  });
});
