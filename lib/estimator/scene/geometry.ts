import { SCENE, type SceneDeckSize, type SceneShape, type SceneSpec } from './types.ts';

/**
 * Yard layout for the live pool scene (pure, unit-tested).
 *
 * The picture is a straight-down drone view on the 1200 x 800 SCENE canvas at
 * 13 units per foot: the house roof along the top edge with a walk under the
 * eave, a block wall around the other three sides with a landscape strip
 * (beds or hedges) inside it, and the pool with its coping and deck right
 * off the house (the deck runs into the walk, like the Pool Masters jobs).
 * Everything else (spa, Baja shelf, bowls, lights, kitchen and patio cover
 * against the house, fire pit, loungers, trees) is placed close around that,
 * so nothing overlaps the pool or each other and the yard reads dense, not
 * like a pool floating in a field. A typed pool too big to draw at true scale
 * is scaled down uniformly (pool.scale < 1) so the largest pool plus a large
 * deck always fits. sceneCamera frames the result like a drone shot.
 */

const FT = SCENE.pxPerFt;

export type Rect = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };

/** The fixed frame of the picture, in scene units. */
export const FRAME = {
  /** House roof strip along the top edge. */
  roofH: 112,
  /** Concrete walk along the back of the house. */
  walkH: 46,
  /** Neighbour sliver outside the block wall. */
  edge: 14,
  /** Block wall thickness. */
  wall: 10,
  /** Landscape strip (beds or hedges) inside the wall. */
  strip: 3 * FT,
} as const;

const IN = FRAME.edge + FRAME.wall;
/** Inside of the lot walls (the house wall is the top edge). */
export const YARD: Rect = { x: IN, y: FRAME.roofH, w: SCENE.width - 2 * IN, h: SCENE.height - FRAME.roofH - IN };
const WALK_BOTTOM = FRAME.roofH + FRAME.walkH;
const YARD_RIGHT = YARD.x + YARD.w;
const YARD_BOTTOM = YARD.y + YARD.h;
/** Where free-standing things may go: inside the landscape strips, below the walk. */
const OPEN: Rect = { x: YARD.x + FRAME.strip, y: WALK_BOTTOM, w: YARD.w - 2 * FRAME.strip, h: YARD_BOTTOM - FRAME.strip - WALK_BOTTOM };

/** Largest pool drawn at true scale (feet); bigger typed pools are scaled down to fit. */
export const MAX_DRAWN_FT = { length: 40, width: 20 } as const;
/** Wide, bright coping band (the white frame of the drone photos). */
export const COPING_FT = 1.8;
/** Waterline tile band, drawn wider than true so glass, porcelain and stone read at phone size. */
export const TILE_FT = 0.85;
/** Paved area (sq ft) around the pool for each deck size; 'none' is a narrow existing band. */
export const DECK_SQFT: Record<Exclude<SceneDeckSize, 'none'>, number> = { small: 300, medium: 600, large: 1000 };

export type PoolLayout = {
  shape: SceneShape;
  /** Water bounding box: the outline touches all four sides. */
  box: Rect;
  /** Drawn size / real size (1 unless a typed pool was too big to draw at true scale). */
  scale: number;
  /** Outline vertices (rectangle, L-shape) or spline control points (freeform), absolute. */
  points: Pt[];
  /** Corner radius for rectangle and L-shape outlines. */
  radius: number;
  /** Closed outline path of the water edge. */
  path: string;
  /**
   * Outer edge of the coping for rectangle and L pools: the water outline
   * pushed out by the coping width with square corners, like modern coping.
   * Null for freeform (its coping follows the curve).
   */
  copingPath: string | null;
  /** Coping joints for rectangle and L pools: a joint every ~2 ft along each side plus a mitre at each corner. */
  copingJoints: string | null;
  /** Sampled outline, for hit tests and placing things along the edge. */
  outline: Pt[];
  /** Coping ring width and waterline tile band width (units). */
  coping: number;
  tile: number;
  /** The L-shape cut-out (paved), else null. */
  notch: Rect | null;
};

export type SpaLayout = {
  shape: 'square' | 'round';
  /** Outer wall box (round spas: the circle's bounding box). */
  box: Rect;
  /** Spillway lip into the pool: a short segment on the wall facing the water. */
  spill: { x1: number; y1: number; x2: number; y2: number; side: 'left' | 'bottom' };
};

export type BajaLayout = {
  /** Shelf area (clip it with the pool outline). */
  box: Rect;
  /** The shelf's step edge, a straight vertical line at x. */
  edgeX: number;
  /** In-water loungers (length along x). */
  loungers: Rect[];
};

export type BowlLayout = {
  kind: 'fire' | 'water';
  cx: number;
  cy: number;
  r: number;
  /** Water bowls: where the arc of water lands in the pool. */
  spillTo: Pt | null;
};

export type SceneObjectKind = 'kitchen' | 'patio_cover' | 'fire_pit' | 'lounge_set' | 'olive_tree';

export type SceneObject = {
  kind: SceneObjectKind;
  /** Footprint (axis aligned). Objects never overlap each other or the pool. */
  box: Rect;
  /**
   * kitchen: the wall it backs onto ('left' | 'right').
   * lounge_set: 'deck' (loungers point at the pool) or 'lawn' (loungers lie sideways).
   * patio_cover: the house corner it sits in ('left' | 'right').
   */
  variant: string;
};

export type DeckLayout = {
  box: Rect;
  /** Corner radius of the deck's corners away from the house (0 for rectangle and L pools). */
  rx: number;
  /** Paved area excluding the pool and spa footprint, sq ft. */
  areaSqft: number;
  /** True when the deck runs right up to the house walk. */
  joinsWalk: boolean;
  /** Turf bands set between big pavers (turf + planting with a new deck). */
  turfBands: Rect[];
};

export type SceneLayout = {
  pool: PoolLayout;
  /** Pool + coping + spa: nothing else may touch it. */
  core: Rect;
  deck: DeckLayout;
  spa: SpaLayout | null;
  baja: BajaLayout | null;
  bowls: BowlLayout[];
  /** LED light niches on the pool wall. */
  lights: Pt[];
  objects: SceneObject[];
  /** Landscape strips along the walls (beds, or hedges in an existing yard), minus what stands there. */
  beds: Rect[];
  /** Path from the house walk to the deck. */
  path: { kind: 'pavers' | 'walk'; rects: Rect[] } | null;
  /** Low path lights (drawn at night). */
  pathLights: Pt[];
  /** Doors and windows along the house (warm light spill at night). */
  windows: { x: number; w: number }[];
};

/* ------------------------------ helpers ------------------------------ */

const right = (r: Rect) => r.x + r.w;
const bottom = (r: Rect) => r.y + r.h;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** True when two rects overlap, or come closer than `gap`. */
export function rectsOverlap(a: Rect, b: Rect, gap = 0): boolean {
  return a.x < right(b) + gap && b.x < right(a) + gap && a.y < bottom(b) + gap && b.y < bottom(a) + gap;
}

/** True when `inner` lies fully inside `outer`. */
export function rectInside(inner: Rect, outer: Rect): boolean {
  const e = 0.01;
  return inner.x >= outer.x - e && inner.y >= outer.y - e && right(inner) <= right(outer) + e && bottom(inner) <= bottom(outer) + e;
}

function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(right(a), right(b)) - x, h: Math.max(bottom(a), bottom(b)) - y };
}

function grow(r: Rect, by: number): Rect {
  return { x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by };
}

const finitePositive = (n: unknown, fallback: number) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : fallback);

/** Point-in-polygon (even-odd). */
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Top (min y) or bottom (max y) of the outline at x, from its sampled points. */
function edgeYAt(outline: Pt[], x: number, which: 'top' | 'bottom'): number {
  const ys: number[] = [];
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    if ((a.x <= x && b.x >= x) || (b.x <= x && a.x >= x)) {
      const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
      ys.push(a.y + (b.y - a.y) * t);
    }
  }
  if (!ys.length) return which === 'top' ? Math.min(...outline.map((p) => p.y)) : Math.max(...outline.map((p) => p.y));
  return which === 'top' ? Math.min(...ys) : Math.max(...ys);
}

/* --------------------------- pool outlines --------------------------- */

/**
 * Freeform control points (unit box): an organic lagoon with one soft, wide
 * bay on the house side (no cusp: the bay's curve is many feet across), and
 * a fuller deep end on the right. Matches the shape tile's soft outline.
 */
const KIDNEY: [number, number][] = [
  [0.0, 0.5],
  [0.04, 0.2],
  [0.17, 0.04],
  [0.34, 0.03],
  [0.5, 0.13],
  [0.66, 0.06],
  [0.84, 0.02],
  [0.97, 0.18],
  [1.0, 0.5],
  [0.95, 0.8],
  [0.8, 0.97],
  [0.55, 1.0],
  [0.3, 0.97],
  [0.1, 0.86],
];

/** Closed Catmull-Rom spline through the points as cubic segments [p1, c1, c2, p2]. */
function splineSegments(pts: Pt[]): [Pt, Pt, Pt, Pt][] {
  const n = pts.length;
  return pts.map((p1, i) => {
    const p0 = pts[(i - 1 + n) % n];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    return [p1, c1, c2, p2];
  });
}

function sampleSpline(pts: Pt[], steps = 10): Pt[] {
  const out: Pt[] = [];
  for (const [a, b, c, d] of splineSegments(pts)) {
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      out.push({
        x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
        y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
      });
    }
  }
  return out;
}

/** Freeform control points whose sampled outline exactly fills the box. */
function kidneyPoints(box: Rect): Pt[] {
  const raw = KIDNEY.map(([u, v]) => ({ x: u * box.w, y: v * box.h }));
  const s = sampleSpline(raw);
  const minX = Math.min(...s.map((p) => p.x));
  const maxX = Math.max(...s.map((p) => p.x));
  const minY = Math.min(...s.map((p) => p.y));
  const maxY = Math.max(...s.map((p) => p.y));
  return raw.map((p) => ({
    x: box.x + ((p.x - minX) / (maxX - minX)) * box.w,
    y: box.y + ((p.y - minY) / (maxY - minY)) * box.h,
  }));
}

/** Rounded polygon path: each corner cut back by up to r and joined with a curve. */
function roundedPolygonPath(pts: Pt[], r: number, dx: number, dy: number): string {
  const n = pts.length;
  const parts: string[] = [];
  pts.forEach((p, i) => {
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const lp = Math.hypot(prev.x - p.x, prev.y - p.y) || 1;
    const ln = Math.hypot(next.x - p.x, next.y - p.y) || 1;
    const rr = Math.min(r, lp / 2, ln / 2);
    const a = { x: p.x + ((prev.x - p.x) / lp) * rr + dx, y: p.y + ((prev.y - p.y) / lp) * rr + dy };
    const b = { x: p.x + ((next.x - p.x) / ln) * rr + dx, y: p.y + ((next.y - p.y) / ln) * rr + dy };
    parts.push(`${i === 0 ? 'M' : 'L'}${r2(a.x)} ${r2(a.y)}Q${r2(p.x + dx)} ${r2(p.y + dy)} ${r2(b.x)} ${r2(b.y)}`);
  });
  return parts.join('') + 'Z';
}

/**
 * An orthogonal polygon (rectangle, L) pushed out by `by` on every side, with
 * square corners: each vertex moves along both of its edges' outward normals.
 */
export function offsetOrthogonal(pts: Pt[], by: number): Pt[] {
  const n = pts.length;
  // Signed area: positive = clockwise in screen coordinates (y down).
  let area = 0;
  for (let i = 0; i < n; i++) area += pts[i].x * pts[(i + 1) % n].y - pts[(i + 1) % n].x * pts[i].y;
  const sign = area > 0 ? 1 : -1;
  const normal = (a: Pt, b: Pt) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // Outward normal of edge a->b for a clockwise (screen) polygon.
    return { x: (sign * (b.y - a.y)) / len, y: (sign * -(b.x - a.x)) / len };
  };
  return pts.map((p, i) => {
    const n1 = normal(pts[(i - 1 + n) % n], p);
    const n2 = normal(p, pts[(i + 1) % n]);
    return { x: p.x + by * (n1.x + n2.x), y: p.y + by * (n1.y + n2.y) };
  });
}

/** Joints across the coping of an orthogonal pool: mitres at the corners, then one every ~2 ft per side. */
function copingJointsPath(inner: Pt[], outer: Pt[]): string {
  const n = inner.length;
  const parts: string[] = [];
  const seg = (a: Pt, b: Pt) => `M${r2(a.x)} ${r2(a.y)}L${r2(b.x)} ${r2(b.y)}`;
  for (let i = 0; i < n; i++) {
    const a = inner[i];
    const b = inner[(i + 1) % n];
    const oa = outer[i];
    parts.push(seg(a, oa));
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const count = Math.max(1, Math.round(len / (2 * FT)));
    const nx = (outer[i].x - a.x + outer[(i + 1) % n].x - b.x) / 2;
    const ny = (outer[i].y - a.y + outer[(i + 1) % n].y - b.y) / 2;
    // The shared outward offset of this side (both ends move the same way across it).
    const ax = b.x - a.x === 0 ? nx : 0;
    const ay = b.y - a.y === 0 ? ny : 0;
    for (let k = 1; k < count; k++) {
      const p = { x: a.x + ((b.x - a.x) * k) / count, y: a.y + ((b.y - a.y) * k) / count };
      parts.push(seg(p, { x: p.x + ax, y: p.y + ay }));
    }
  }
  return parts.join('');
}

function polygonPath(pts: Pt[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${r2(p.x)} ${r2(p.y)}`).join('') + 'Z';
}

/**
 * Closed path of the pool's water edge, optionally shifted by (dx, dy) (used
 * for the wall shadow). The command structure depends only on the shape, so a
 * CSS `d` transition can tween between sizes.
 */
export function poolOutlinePath(pool: Pick<PoolLayout, 'shape' | 'points' | 'radius'>, dx = 0, dy = 0): string {
  if (pool.shape !== 'freeform') return roundedPolygonPath(pool.points, pool.radius, dx, dy);
  const segs = splineSegments(pool.points);
  const f = (p: Pt) => `${r2(p.x + dx)} ${r2(p.y + dy)}`;
  return `M${f(segs[0][0])}` + segs.map(([, c1, c2, p2]) => `C${f(c1)} ${f(c2)} ${f(p2)}`).join('') + 'Z';
}

/** Drawn pool size in feet (length along x is the longer side), and the scale used. */
export function drawnPoolSize(lengthFt: number, widthFt: number): { lengthFt: number; widthFt: number; scale: number } {
  let l = Math.max(6, finitePositive(lengthFt, 30));
  let w = Math.max(6, finitePositive(widthFt, 15));
  if (w > l) [l, w] = [w, l];
  const scale = Math.min(1, MAX_DRAWN_FT.length / l, MAX_DRAWN_FT.width / w);
  return { lengthFt: l * scale, widthFt: w * scale, scale };
}

type LocalPool = { pool: PoolLayout; spa: SpaLayout | null };

/** The pool (and spa) with the water box's top-left at (x, y). */
function buildPool(spec: SceneSpec, x: number, y: number): LocalPool {
  const size = drawnPoolSize(spec.lengthFt, spec.widthFt);
  const L = size.lengthFt * FT;
  const W = size.widthFt * FT;
  const box: Rect = { x, y, w: L, h: W };
  // Modern pools: nearly square water corners (the coping outside them is square).
  const radius = spec.shape === 'freeform' ? 0 : Math.min(0.35 * FT, W / 10);
  const coping = COPING_FT * FT;
  const tile = TILE_FT * FT;

  // Spa: 6-8 ft, never more than 60% of the width or 30% of the length.
  const s = Math.max(1.5 * FT, Math.min(Math.max(6 * FT, Math.min(8 * FT, W * 0.5)), W * 0.6, L * 0.3));

  let points: Pt[];
  let notch: Rect | null = null;
  let spa: SpaLayout | null = null;
  if (spec.shape === 'l_shape') {
    const nw = L * 0.36;
    const nh = W * 0.46;
    notch = { x: x + L - nw, y, w: nw, h: nh };
    points = [
      { x, y },
      { x: x + L - nw, y },
      { x: x + L - nw, y: y + nh },
      { x: x + L, y: y + nh },
      { x: x + L, y: y + W },
      { x, y: y + W },
    ];
    if (spec.features.spa) {
      // Nested in the L's inner corner, its walls standing in for the coping there.
      const ss = Math.min(s, nw - FT, nh + tile);
      const bx = x + L - nw - tile;
      const by = y + nh + tile - ss;
      spa = {
        shape: 'square',
        box: { x: bx, y: by, w: ss, h: ss },
        spill: { x1: bx + ss * 0.3, y1: by + ss, x2: bx + ss * 0.7, y2: by + ss, side: 'bottom' },
      };
    }
  } else if (spec.shape === 'freeform') {
    points = kidneyPoints(box);
  } else {
    points = [
      { x, y },
      { x: x + L, y },
      { x: x + L, y: y + W },
      { x, y: y + W },
    ];
    if (spec.features.spa) {
      // Inside the pool's far corner on the house side, spilling toward the middle.
      spa = {
        shape: 'square',
        box: { x: x + L - s, y, w: s, h: s },
        spill: { x1: x + L - s, y1: y + s * 0.3, x2: x + L - s, y2: y + s * 0.7, side: 'left' },
      };
    }
  }

  const base = { shape: spec.shape, points, radius };
  const outline = spec.shape === 'freeform' ? sampleSpline(points, 12) : points;
  const outer = spec.shape === 'freeform' ? null : offsetOrthogonal(points, coping);
  const copingPath = outer ? polygonPath(outer) : null;
  const copingJoints = outer ? copingJointsPath(points, outer) : null;
  const pool: PoolLayout = { ...base, box, scale: size.scale, path: poolOutlinePath(base), copingPath, copingJoints, outline, coping, tile, notch };

  if (spec.shape === 'freeform' && spec.features.spa) {
    // Round raised spa set into the lagoon's bay, standing mostly in the water.
    const cx = x + L * 0.5;
    const biteY = edgeYAt(outline, cx, 'top');
    const r = s / 2;
    const cy = biteY + r * 0.2;
    spa = {
      shape: 'round',
      box: { x: cx - r, y: cy - r, w: s, h: s },
      spill: { x1: cx - r * 0.4, y1: cy + r * 0.92, x2: cx + r * 0.4, y2: cy + r * 0.92, side: 'bottom' },
    };
  }
  return { pool, spa };
}

/* -------------------------------- deck -------------------------------- */

/** Deck margins around the core (house side widest): top 2.4k, sides k, bottom 0.7k. */
function deckMargins(core: Rect, deckSize: SceneDeckSize): { t: number; s: number; b: number } {
  if (deckSize === 'none') return { t: 4 * FT, s: 3 * FT, b: 3 * FT };
  const area = DECK_SQFT[deckSize] * FT * FT;
  // (w + 2k)(h + 3.1k) - w h = area  ->  6.2k^2 + (3.1w + 2h)k - area = 0
  const a = 6.2;
  const b = 3.1 * core.w + 2 * core.h;
  const k = (-b + Math.sqrt(b * b + 4 * a * area)) / (2 * a);
  return { t: 2.4 * k, s: k, b: 0.7 * k };
}

/* ------------------------------ placement ------------------------------ */

/** First candidate inside its region that clears every obstacle by `gap`. */
function firstFit(cands: { box: Rect; region: Rect; variant: string }[], taken: Rect[], gap: number) {
  return cands.find((c) => rectInside(c.box, c.region) && taken.every((t) => !rectsOverlap(c.box, t, gap))) ?? null;
}

/** Positions sliding along a span in steps (centre first, then outward). */
function spread(from: number, to: number, step: number): number[] {
  if (to < from) return [];
  const out: number[] = [];
  for (let v = from; v <= to + 0.01; v += step) out.push(v);
  if (out[out.length - 1] < to - 0.01) out.push(to);
  return out;
}

/** Landscape strips along the walls, cut where a placed object stands in them. */
function stripsAround(objects: SceneObject[]): Rect[] {
  const s = FRAME.strip;
  const raw: Rect[] = [
    { x: YARD.x, y: WALK_BOTTOM, w: s, h: YARD_BOTTOM - WALK_BOTTOM },
    { x: YARD_RIGHT - s, y: WALK_BOTTOM, w: s, h: YARD_BOTTOM - WALK_BOTTOM },
    { x: YARD.x + s, y: YARD_BOTTOM - s, w: YARD.w - 2 * s, h: s },
  ];
  const blockers = objects.filter((o) => o.kind !== 'olive_tree').map((o) => o.box);
  const out: Rect[] = [];
  for (const strip of raw) {
    const vertical = strip.h > strip.w;
    let pieces: Rect[] = [strip];
    for (const b of blockers) {
      pieces = pieces.flatMap((p) => {
        if (!rectsOverlap(p, b, 6)) return [p];
        if (vertical) {
          const top = { ...p, h: b.y - 6 - p.y };
          const bot = { ...p, y: bottom(b) + 6, h: bottom(p) - bottom(b) - 6 };
          return [top, bot].filter((r) => r.h > FT);
        }
        const l = { ...p, w: b.x - 6 - p.x };
        const rr = { ...p, x: right(b) + 6, w: right(p) - right(b) - 6 };
        return [l, rr].filter((r) => r.w > FT);
      });
    }
    out.push(...pieces);
  }
  return out;
}

/* ------------------------------- layout ------------------------------- */

/** Lay the whole yard out for a scene. Pure and deterministic. */
export function layoutScene(spec: SceneSpec): SceneLayout {
  // 1. Pool at the origin, to measure the core (pool + coping + spa).
  const probe = buildPool(spec, 0, 0);
  const coping = probe.pool.coping;
  let coreLocal = grow(probe.pool.box, coping);
  if (probe.spa) coreLocal = union(coreLocal, grow(probe.spa.box, spec.shape === 'freeform' ? FT * 0.5 : 0));

  // 2. Deck around the core, centred across the yard, against the house.
  const m = deckMargins(coreLocal, spec.deckSize);
  const deckW = coreLocal.w + 2 * m.s;
  const deckH = coreLocal.h + m.t + m.b;
  const minX = OPEN.x + FT;
  const maxX = right(OPEN) - FT - deckW;
  const deckX = Math.min(Math.max(SCENE.width / 2 - deckW / 2, minX), Math.max(minX, maxX));
  // Right off the house: the deck runs into the walk under the eave, like every reference job.
  const joinsWalk = true;
  const deckY = WALK_BOTTOM;
  const deckBox: Rect = { x: deckX, y: deckY, w: deckW, h: deckH };

  // 3. The real pool, offset so its core sits inside the deck margins.
  const px = deckX + m.s - coreLocal.x;
  const py = deckY + m.t - coreLocal.y;
  const { pool, spa } = buildPool(spec, px, py);
  const core: Rect = { x: coreLocal.x + px, y: coreLocal.y + py, w: coreLocal.w, h: coreLocal.h };
  const { box } = pool;
  const L = box.w;
  const W = box.h;

  // 4. Baja shelf at the shallow (left) end.
  let baja: BajaLayout | null = null;
  if (spec.features.baja) {
    const b = Math.min(8 * FT, L * 0.3);
    const midX = box.x + b / 2;
    const top = edgeYAt(pool.outline, midX, 'top');
    const bot = edgeYAt(pool.outline, midX, 'bottom');
    const mid = (top + bot) / 2;
    const len = Math.min(5.5 * FT, b - FT);
    const wid = 2 * FT;
    const loungers: Rect[] =
      len >= 3.5 * FT && bot - top >= 2 * wid + 2 * FT
        ? [-1, 1].map((sgn) => ({ x: midX - len / 2, y: mid + sgn * (wid / 2 + 0.6 * FT) - wid / 2, w: len, h: wid }))
        : [];
    baja = { box: { x: box.x, y: box.y, w: b, h: W }, edgeX: box.x + b, loungers };
  }

  // 5. Bowls along the house-side long edge, clear of the spa.
  const bowls: BowlLayout[] = [];
  const kinds: BowlLayout['kind'][] = [];
  if (spec.features.fireBowls && spec.features.waterBowls) kinds.push('fire', 'water', 'water', 'fire');
  else if (spec.features.fireBowls) kinds.push('fire', 'fire');
  else if (spec.features.waterBowls) kinds.push('water', 'water');
  if (kinds.length) {
    const n = kinds.length;
    let fractions: number[];
    let seg: [number, number];
    if (spec.shape === 'freeform') {
      seg = [box.x, right(box)];
      fractions = n === 2 ? [0.24, 0.86] : [0.15, 0.31, 0.78, 0.93];
      if (!spec.features.spa && n === 2) fractions = [0.24, 0.86];
    } else {
      const end = spec.shape === 'l_shape' ? box.x + L * 0.64 : spa ? spa.box.x - FT : right(box);
      seg = [box.x, end];
      fractions = n === 2 ? [0.27, 0.73] : [0.12, 0.37, 0.63, 0.88];
    }
    const segLen = seg[1] - seg[0];
    let spacing = Math.min(fractions[0], 1 - fractions[n - 1]) * 2;
    for (let i = 1; i < n; i++) spacing = Math.min(spacing, fractions[i] - fractions[i - 1]);
    const r = Math.min(1.5 * FT, segLen * spacing * 0.42);
    kinds.forEach((kind, i) => {
      const cx = seg[0] + segLen * fractions[i];
      let edge = Infinity;
      for (let dx = -r; dx <= r; dx += r / 4) edge = Math.min(edge, edgeYAt(pool.outline, cx + dx, 'top'));
      const cy = edge - r - 3;
      bowls.push({ kind, cx, cy, r, spillTo: kind === 'water' ? { x: cx, y: edgeYAt(pool.outline, cx, 'top') + Math.min(1.8 * FT, W * 0.15) } : null });
    });
  }

  // 6. LED lights on the far wall.
  const lights: Pt[] = spec.features.lights
    ? [0.42, 0.72].map((f) => {
        const x = box.x + L * f;
        return { x, y: edgeYAt(pool.outline, x, 'bottom') - 0.55 * FT };
      })
    : [];

  // 7. Free-standing objects, biggest first; each clears the pool core by a walkway.
  const objects: SceneObject[] = [];
  const poolZone = grow(core, FT);
  const bowlBoxes = bowls.map((b) => ({ x: b.cx - b.r, y: b.cy - b.r, w: 2 * b.r, h: 2 * b.r }));
  const taken = (): Rect[] => [poolZone, ...bowlBoxes, ...objects.map((o) => o.box)];
  const yardRegion: Rect = { x: YARD.x, y: FRAME.roofH, w: YARD.w, h: YARD.h - FRAME.strip };

  // Kitchen and patio cover stand against the house (like the reference jobs), as near the
  // deck as they fit: candidates slide along the house wall, closest to the deck first. The side
  // walls are the fallback when the house side is full.
  const deckLeft = deckX;
  const deckRight = right(deckBox);
  const alongHouse = (w: number, h: number, prefer: 'left' | 'right') => {
    const y = FRAME.roofH + 0.25 * FT;
    const xs = spread(YARD.x + 0.25 * FT, YARD_RIGHT - 0.25 * FT - w, FT / 2);
    // Preferred side first: centred on that deck edge, sliding outward; then the other side.
    const score = (x: number) => {
      const cx = x + w / 2;
      const left = Math.abs(cx - deckLeft) + (prefer === 'left' ? 0 : 0.5 * YARD.w);
      const rightScore = Math.abs(cx - deckRight) + (prefer === 'right' ? 0 : 0.5 * YARD.w);
      return Math.min(left, rightScore);
    };
    return xs.sort((a, b) => score(a) - score(b)).map((x) => ({ box: { x, y, w, h }, region: yardRegion, variant: 'house' }));
  };

  if (spec.extras.patioCover) {
    const sizes: [number, number][] = [
      [16, 12],
      [14, 11],
      [12, 10],
    ];
    const cands = sizes.flatMap(([w, h]) => {
      const bw = w * FT;
      const bh = h * FT;
      return [
        ...alongHouse(bw, bh, 'left').map((c) => ({ ...c, variant: c.box.x + bw / 2 < SCENE.width / 2 ? 'left' : 'right' })),
        { box: { x: YARD.x, y: FRAME.roofH, w: bw, h: bh }, region: yardRegion, variant: 'left' },
        { box: { x: YARD_RIGHT - bw, y: FRAME.roofH, w: bw, h: bh }, region: yardRegion, variant: 'right' },
      ];
    });
    const hit = firstFit(cands, taken(), FT);
    if (hit) objects.push({ kind: 'patio_cover', box: hit.box, variant: hit.variant });
  }

  if (spec.extras.kitchen) {
    // Against the house: a 12 ft counter (grill, sink) with bar stools on the yard side.
    const kw = 12 * FT;
    const kh = 4.2 * FT + 2.4 * FT;
    const house = alongHouse(kw, kh, 'right');
    // Fallback: along a side wall, stools facing the yard.
    const depth = 3 * FT;
    const reach = 2.4 * FT;
    const len = Math.min(12 * FT, OPEN.h * 0.45);
    const ys = spread(WALK_BOTTOM + 0.5 * FT, bottom(OPEN) - len, FT);
    const cands = [
      ...house,
      ...ys.map((y) => ({ box: { x: YARD_RIGHT - depth - reach, y, w: depth + reach, h: len }, region: yardRegion, variant: 'right' })),
      ...ys.map((y) => ({ box: { x: YARD.x, y, w: depth + reach, h: len }, region: yardRegion, variant: 'left' })),
    ];
    const hit = firstFit(cands, taken(), FT);
    if (hit) objects.push({ kind: 'kitchen', box: hit.box, variant: hit.variant });
  }

  const lawnBlock = grow(deckBox, FT);

  if (spec.extras.firePit) {
    const cands = [13, 11.5, 10].flatMap((ft) => {
      const d = ft * FT;
      const g = FT;
      const leftX = OPEN.x + g;
      const rightX = right(OPEN) - g - d;
      const lowY = bottom(OPEN) - g - d;
      const midY = deckBox.y + deckBox.h / 2 - d / 2;
      const belowY = bottom(deckBox) + 2 * g;
      // Close to the deck first (a compact yard frames better), then out to the corners.
      const besideRight = right(deckBox) + 2 * g;
      const besideLeft = deckBox.x - 2 * g - d;
      const anchors: [number, number][] = [
        [right(deckBox) - d, belowY],
        [deckBox.x, belowY],
        [SCENE.width / 2 - d / 2, belowY],
        [besideRight, Math.max(midY, deckBox.y + deckBox.h - d)],
        [besideLeft, Math.max(midY, deckBox.y + deckBox.h - d)],
        [rightX, lowY],
        [leftX, lowY],
        [rightX, midY],
        [leftX, midY],
      ];
      return anchors.map(([x, y]) => ({ box: { x, y, w: d, h: d }, region: OPEN, variant: 'lawn' }));
    });
    const hit = firstFit(cands, [...taken(), lawnBlock], FT);
    if (hit) objects.push({ kind: 'fire_pit', box: hit.box, variant: hit.variant });
  }

  // Lounge set: two loungers and an umbrella. On the deck when there is room, else on the lawn.
  {
    const w = 14.4 * FT;
    const h = 7 * FT;
    const deckRegion: Rect = grow(deckBox, -0.4 * FT);
    const topY = core.y - 2 * FT - h;
    const botY = bottom(core) + 2 * FT;
    const xs = spread(deckBox.x + FT, right(deckBox) - FT - w, FT / 2);
    const onDeck = [topY, botY].flatMap((y) => xs.map((x) => ({ box: { x, y, w, h }, region: deckRegion, variant: 'deck' })));
    const deckHit = firstFit(onDeck, taken(), FT * 0.5);
    if (deckHit) objects.push({ kind: 'lounge_set', box: deckHit.box, variant: 'deck' });
    else {
      const lw = 7 * FT;
      const lh = 14.4 * FT; // on the lawn the set stands upright: loungers sideways, umbrella below
      const near = (x: number) => Math.abs(x + w / 2 - (deckBox.x + deckBox.w / 2));
      // Closest to the deck first: on the lawn beside it, then just past its far edge, then by the walls.
      const below = spread(OPEN.x + FT, right(OPEN) - FT - w, FT / 2)
        .sort((a, b) => near(a) - near(b))
        .map((x) => ({ box: { x, y: bottom(deckBox) + 1.5 * FT, w, h }, region: OPEN, variant: 'lawn_wide' }));
      const besideYs = spread(WALK_BOTTOM + FT, bottom(OPEN) - FT - lh, FT);
      const beside = besideYs.flatMap((y) => [
        { box: { x: right(deckBox) + 1.5 * FT, y, w: lw, h: lh }, region: OPEN, variant: 'lawn' },
        { box: { x: deckBox.x - 1.5 * FT - lw, y, w: lw, h: lh }, region: OPEN, variant: 'lawn' },
      ]);
      const ys = spread(OPEN.y + FT, bottom(OPEN) - FT - lh, FT);
      const lawn = [
        ...beside,
        ...below,
        ...ys.map((y) => ({ box: { x: OPEN.x + FT, y, w: lw, h: lh }, region: OPEN, variant: 'lawn' })),
        ...ys.map((y) => ({ box: { x: right(OPEN) - FT - lw, y, w: lw, h: lh }, region: OPEN, variant: 'lawn' })),
        ...spread(OPEN.x + FT, right(OPEN) - FT - w, FT).map((x) => ({
          box: { x, y: bottom(OPEN) - FT - h, w, h },
          region: OPEN,
          variant: 'lawn_wide',
        })),
      ];
      const hit = firstFit(lawn, [...taken(), lawnBlock], FT * 0.5);
      if (hit) objects.push({ kind: 'lounge_set', box: hit.box, variant: hit.variant });
    }
  }

  // Olive trees in the landscape strips (canopies overhang the lawn and walls).
  {
    const d = 8 * FT;
    const want = spec.extras.turfPlanting ? 4 : spec.project === 'backyard' ? 3 : 2;
    const c = 0.3 * d;
    const anchors: Pt[] = [
      // In planters just off the deck's far corners, like the olive trees in the photos.
      { x: deckBox.x - d * 0.56, y: bottom(deckBox) - d * 0.3 },
      { x: right(deckBox) + d * 0.56, y: bottom(deckBox) - d * 0.3 },
      { x: YARD.x + c, y: YARD_BOTTOM - c },
      { x: YARD_RIGHT - c, y: YARD_BOTTOM - c },
      { x: YARD.x + c, y: (WALK_BOTTOM + YARD_BOTTOM) / 2 },
      { x: YARD_RIGHT - c, y: (WALK_BOTTOM + YARD_BOTTOM) / 2 + FT * 4 },
      { x: SCENE.width / 2 + 9 * FT, y: YARD_BOTTOM - c },
      { x: SCENE.width / 2 - 13 * FT, y: YARD_BOTTOM - c },
      { x: YARD.x + c, y: WALK_BOTTOM + d * 0.7 },
      { x: YARD_RIGHT - c, y: WALK_BOTTOM + d * 0.7 },
    ];
    const canvas: Rect = { x: 0, y: FRAME.roofH, w: SCENE.width, h: SCENE.height - FRAME.roofH };
    for (const a of anchors) {
      if (objects.filter((o) => o.kind === 'olive_tree').length >= want) break;
      const tree = { box: { x: a.x - d / 2, y: a.y - d / 2, w: d, h: d }, region: canvas, variant: 'olive' };
      if (firstFit([tree], [...taken(), deckBox], FT * 0.25)) objects.push({ kind: 'olive_tree', box: tree.box, variant: 'olive' });
    }
  }

  // 8. Ground details: beds, turf bands, the path to the house, night lights.
  const beds = stripsAround(objects);

  const turfBands: Rect[] = [];
  if (spec.extras.turfPlanting && spec.deck && spec.deckSize !== 'none') {
    const band = 0.6 * FT;
    const pitch = 5.5 * FT;
    const topH = core.y - deckBox.y;
    const botH = bottom(deckBox) - bottom(core);
    for (let x = deckBox.x + pitch; x < right(deckBox) - pitch / 2; x += pitch) {
      if (topH > 2 * FT) turfBands.push({ x, y: deckBox.y, w: band, h: topH });
      if (botH > 2 * FT) turfBands.push({ x, y: bottom(core), w: band, h: botH });
    }
  }

  let path: SceneLayout['path'] = null;
  const gap = deckBox.y - WALK_BOTTOM;
  if (gap > FT) {
    const pw = (spec.extras.turfPlanting ? 5 : 4) * FT;
    const x = deckBox.x + deckBox.w / 2 - pw / 2;
    if (spec.extras.turfPlanting) {
      const rects: Rect[] = [];
      const ph = 2 * FT;
      const n = Math.max(1, Math.floor((gap + FT) / (ph + FT)));
      const pitch = gap / n;
      for (let i = 0; i < n; i++) rects.push({ x, y: WALK_BOTTOM + i * pitch + (pitch - ph) / 2, w: pw, h: Math.min(ph, pitch - 4) });
      path = { kind: 'pavers', rects };
    } else {
      path = { kind: 'walk', rects: [{ x, y: WALK_BOTTOM - 2, w: pw, h: gap + 4 }] };
    }
  }

  const pathLights: Pt[] = [];
  const blocked = (p: Pt) => objects.some((o) => o.kind !== 'olive_tree' && rectsOverlap({ x: p.x - 4, y: p.y - 4, w: 8, h: 8 }, o.box));
  for (const bed of beds) {
    const vertical = bed.h > bed.w;
    const len = vertical ? bed.h : bed.w;
    const n = Math.floor(len / (10 * FT));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const p = vertical
        ? { x: bed.x < SCENE.width / 2 ? right(bed) - 5 : bed.x + 5, y: bed.y + bed.h * t }
        : { x: bed.x + bed.w * t, y: bed.y + 5 };
      if (!blocked(p)) pathLights.push(p);
    }
  }
  if (path) {
    for (const r of path.rects.slice(0, 3)) {
      pathLights.push({ x: r.x - 8, y: r.y + r.h / 2 }, { x: right(r) + 8, y: r.y + r.h / 2 });
    }
  }

  const windows = [
    { x: deckBox.x + deckBox.w / 2 - 5 * FT, w: 10 * FT },
    { x: SCENE.width * 0.18, w: 6 * FT },
    { x: SCENE.width * 0.74, w: 7 * FT },
  ];

  const deckArea = (deckBox.w * deckBox.h - core.w * core.h) / (FT * FT);
  return {
    pool,
    core,
    deck: { box: deckBox, rx: spec.shape === 'freeform' ? 2 * FT : 0, areaSqft: deckArea, joinsWalk, turfBands },
    spa,
    baja,
    bowls,
    lights,
    objects,
    beds,
    path,
    pathLights,
    windows,
  };
}

/* ------------------------------- camera ------------------------------- */

/** What the picture frames: the whole design (yard) or a close look at the pool edge and finish. */
export type CameraFocus = 'yard' | 'pool';

/** Scene units of roof always left in view at the top of a yard shot (the Day/Night switch sits there). */
const ROOF_IN_VIEW = 90;

/**
 * The part of the canvas the picture shows, as a drone would frame it (3:2,
 * inside the canvas). 'yard': the deck, everything placed on or near it and a
 * strip of roof, at least 68% of the canvas wide, so a simple pool fills the
 * frame and a full backyard pulls back to show it all. 'pool': pool, coping,
 * spa and bowls with a few feet of deck, for choosing finish, tile and coping
 * (they read at phone size), extra room on top for the Day/Night switch.
 */
export function sceneCamera(layout: SceneLayout, focus: CameraFocus = 'yard'): Rect {
  const aspect = SCENE.width / SCENE.height;
  let box: Rect;
  let minW: number;
  if (focus === 'pool') {
    box = layout.core;
    for (const b of layout.bowls) box = union(box, { x: b.cx - b.r, y: b.cy - b.r, w: 2 * b.r, h: 2 * b.r });
    box = { x: box.x - 4 * FT, y: box.y - 7 * FT, w: box.w + 8 * FT, h: box.h + 11 * FT };
    minW = SCENE.width / 2;
  } else {
    box = layout.deck.box;
    // Trees stand by the walls: they may be cropped, like the edge of a real drone shot.
    for (const o of layout.objects) if (o.kind !== 'olive_tree') box = union(box, o.box);
    box = { x: box.x - 4 * FT, y: box.y, w: box.w + 8 * FT, h: box.h + 4 * FT };
    const top = Math.min(box.y, FRAME.roofH - ROOF_IN_VIEW);
    box = { ...box, y: top, h: bottom(box) - top };
    minW = SCENE.width * 0.68;
  }
  const w = Math.min(SCENE.width, Math.max(box.w, box.h * aspect, minW));
  const h = w / aspect;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const x = clamp(box.x + box.w / 2 - w / 2, 0, SCENE.width - w);
  const y = clamp(focus === 'yard' ? box.y : box.y + box.h / 2 - h / 2, 0, SCENE.height - h);
  return { x: r2(x), y: r2(y), w: r2(w), h: r2(h) };
}
