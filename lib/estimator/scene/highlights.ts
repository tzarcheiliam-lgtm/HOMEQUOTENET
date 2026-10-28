import type { Pt, Rect, SceneLayout } from './geometry.ts';
import type { SceneSpec } from './types.ts';

/**
 * "What just changed" for the live pool picture: a pick answers back on the
 * exact spot it changed (a shimmer over new coping, a ripple on a new finish,
 * a sparkle where a spa or fire pit was added). Pure, so the rules are tested
 * directly; <SceneHighlights> draws them for well under a second, and never
 * under prefers-reduced-motion.
 */

/** Things that can be added, and sparkle where they stand. */
export type SparkleTarget =
  | 'baja'
  | 'spa'
  | 'waterBowls'
  | 'fireBowls'
  | 'lights'
  | 'kitchen'
  | 'patioCover'
  | 'firePit'
  | 'turfPlanting';

/** An area that changed look (shimmer / ripple / outline), or something added (sparkle). */
export type SceneHighlight = { kind: 'water' | 'tile' | 'coping' | 'deck' | 'pool' } | { kind: 'sparkle'; target: SparkleTarget };

/** The longest highlight runs for less than this (ms), stagger included. */
export const HIGHLIGHT_MS = 700;

/** At most this many highlights at once: a package changes everything, and four sweeps already read as "all new". */
export const MAX_HIGHLIGHTS = 4;

const FEATURE_TARGETS: ReadonlyArray<[keyof SceneSpec['features'], SparkleTarget]> = [
  ['spa', 'spa'],
  ['baja', 'baja'],
  ['fireBowls', 'fireBowls'],
  ['waterBowls', 'waterBowls'],
  ['lights', 'lights'],
];
const EXTRA_TARGETS: ReadonlyArray<[keyof SceneSpec['extras'], SparkleTarget]> = [
  ['kitchen', 'kitchen'],
  ['patioCover', 'patioCover'],
  ['firePit', 'firePit'],
  ['turfPlanting', 'turfPlanting'],
];

/**
 * What to highlight after the picture went from `prev` to `next`: added
 * features and extras first (a sparkle each), then the finish (water ripple),
 * waterline tile, coping, deck (material or size), and a new pool shape or
 * size (outline glow). Removals and "back to undecided" are not celebrated.
 * Capped at MAX_HIGHLIGHTS, in that order.
 */
export function sceneHighlights(prev: SceneSpec, next: SceneSpec): SceneHighlight[] {
  const out: SceneHighlight[] = [];
  for (const [key, target] of FEATURE_TARGETS) if (next.features[key] && !prev.features[key]) out.push({ kind: 'sparkle', target });
  for (const [key, target] of EXTRA_TARGETS) if (next.extras[key] && !prev.extras[key]) out.push({ kind: 'sparkle', target });
  if (next.surface && next.surface !== prev.surface) out.push({ kind: 'water' });
  if (next.tile && next.tile !== prev.tile) out.push({ kind: 'tile' });
  if (next.coping && next.coping !== prev.coping) out.push({ kind: 'coping' });
  if ((next.deck && next.deck !== prev.deck) || (next.deckSize !== 'none' && next.deckSize !== prev.deckSize)) out.push({ kind: 'deck' });
  const resized = Math.abs(next.lengthFt - prev.lengthFt) >= 0.05 || Math.abs(next.widthFt - prev.widthFt) >= 0.05;
  if (next.shape !== prev.shape || resized) out.push({ kind: 'pool' });
  return out.slice(0, MAX_HIGHLIGHTS);
}

const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Spread at most `max` points evenly over a list (first and last included). */
function pick<T>(list: readonly T[], max: number): T[] {
  if (list.length <= max) return [...list];
  if (max <= 1) return list.length ? [list[Math.floor(list.length / 2)]] : [];
  return Array.from({ length: max }, (_, i) => list[Math.round((i * (list.length - 1)) / (max - 1))]);
}

/**
 * Where a sparkle goes for an added item, in scene units (the same space as
 * the layout). Empty when the layout did not place the item (e.g. no room).
 * At most three spots per item, so a row of bowls twinkles without a crowd.
 */
export function sparkleSpots(layout: SceneLayout, target: SparkleTarget): Pt[] {
  const objects = (kind: SceneLayout['objects'][number]['kind']) => layout.objects.filter((o) => o.kind === kind).map((o) => center(o.box));
  switch (target) {
    case 'spa':
      return layout.spa ? [center(layout.spa.box)] : [];
    case 'baja':
      return layout.baja ? [center(layout.baja.box)] : [];
    case 'fireBowls':
      return pick(
        layout.bowls.filter((b) => b.kind === 'fire').map((b) => ({ x: b.cx, y: b.cy })),
        3,
      );
    case 'waterBowls':
      return pick(
        layout.bowls.filter((b) => b.kind === 'water').map((b) => ({ x: b.cx, y: b.cy })),
        3,
      );
    case 'lights':
      return pick(layout.lights, 3);
    case 'kitchen':
      return objects('kitchen').slice(0, 1);
    case 'patioCover':
      return objects('patio_cover').slice(0, 1);
    case 'firePit':
      return objects('fire_pit').slice(0, 1);
    case 'turfPlanting':
      return pick(layout.beds.map(center), 3);
  }
}
