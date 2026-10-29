import {
  bathFocusPoint,
  bathLayout,
  BATH_CEILING_FT,
  frameEdgeDepths,
  project,
  type BathCamera,
  type BathLayout,
  type Pt,
  type Rect,
} from '@/lib/estimator/scene/bath/geometry';
import { BATH_DEFAULT_METAL, BATH_DEFAULT_TEXTURES, BATH_METAL_COLORS, BATH_SPRITES, BATH_TEXTURES, bathOptionTexture } from '@/lib/estimator/scene/bath/textures';
import { BATH_SCENE, type BathMood, type BathSceneSpec, type BathSpriteId, type BathTextureId } from '@/lib/estimator/scene/bath/types';
import { spriteImage, textureSource } from './assets';
import { grain, hexRgb, makeCanvas, mix, shade } from './procedural';

/**
 * Canvas 2D painter for the live bathroom picture (browser only).
 *
 * One frame, back to front, in 1200 x 800 frame units:
 * 1. Room planes. Each wall / floor is composed flat ("unrolled", in feet) on
 *    its own canvas: material, tile zones, window, niche, backsplash, contact
 *    shadows, corner occlusion and floor light. The back wall is then drawn
 *    straight on; the floor goes row by row and the side walls column by
 *    column. In one-point perspective each row (column) of a plane sits at a
 *    single depth, so it is a uniformly scaled strip of the flat canvas: real
 *    foreshortened tile, plank and grout lines at device-pixel steps.
 * 2. Fixtures, nearest last: shower (bench, glass), alcove tub (curtain or
 *    screen), freestanding tub, toilet, vanity (with its perspective counter
 *    top, sinks and faucets), towel, plant. Generated sprites replace the
 *    vector drawings for small decor once their files exist.
 * 3. Light: a light map (daylight from the window, or an evening of warm
 *    sconce / can / LED pools on a dim blue ambient) multiplies the frame,
 *    then glows are screened on top, then a soft vignette, a warm grade and
 *    film grain.
 *
 * Redraws are synchronous; the flat textures are cached per material and
 * plane scale (bounded by pixels, released with releaseBathCanvases). A
 * `draft` paint (while the homeowner is picking) draws the perspective planes
 * in coarser strips and skips the reflections, for a fraction of the cost;
 * the scene repaints sharp once picks settle.
 */

const C = BATH_CEILING_FT;
const { width: FW, height: FH } = BATH_SCENE;

export type PaintOptions = {
  /** Device pixels per frame unit (canvas width / 1200). */
  scale: number;
  mood: BathMood;
  /** 'close' zooms in for the finish questions... */
  focus?: 'overview' | 'close';
  /** ...on the shower wall (tile) or the vanity (cabinet, counter, fixtures). Default vanity. */
  target?: 'shower' | 'vanity';
  /** Fast, slightly softer frame for the instant response to a pick (a sharp paint follows). */
  draft?: boolean;
};

/**
 * A texture the painter can draw: a manifest texture, or one of the two
 * "fresh" neutrals (the default tile or floor, cleaned up) that stand in for
 * a renewed area before its material is picked.
 */
type PaintTexture = BathTextureId | 'tile_plain:fresh' | 'floor_plain:fresh';

function baseTexture(id: PaintTexture): BathTextureId {
  return id.endsWith(':fresh') ? (id.slice(0, -6) as BathTextureId) : (id as BathTextureId);
}

type Ctx = CanvasRenderingContext2D;

/** Catalog swaps the manifest has no file for: the closest look. */
const CLOSEST: Record<string, Record<string, BathTextureId>> = {
  showerTile: { ceramic: 'tile_plain', terrazzo: 'tile_large_porcelain' },
  counter: { granite: 'counter_concrete', quartzite: 'counter_marble_look' },
  floor: { ceramic: 'floor_plain', marble: 'floor_large_stone' },
};

export function materialTexture(question: keyof typeof BATH_DEFAULT_TEXTURES, id: string | null): BathTextureId {
  if (!id) return BATH_DEFAULT_TEXTURES[question];
  return bathOptionTexture(question, id) ?? CLOSEST[question]?.[id] ?? BATH_DEFAULT_TEXTURES[question];
}

// ---------------------------------------------------------------------------
// Textures at plane scale
// ---------------------------------------------------------------------------

/** Resampled textures, least recently used first; bounded by total pixels (iOS caps canvas memory). */
const scaledCache = new Map<string, HTMLCanvasElement>();
const SCALED_MAX_PX = 24e6;
let scaledPx = 0;

/** Plane scales snap to these steps, so live, close-up and export paints share cached textures. */
function snapP(P: number): number {
  const steps = [24, 32, 40, 48, 64, 80, 96, 112, 128, 150];
  return steps.find((s) => s >= P - 0.5) ?? 150;
}

/** The texture resampled so one copy spans realFt * P px (cached per size). */
function scaledTexture(id: PaintTexture, P: number): HTMLCanvasElement {
  const base = baseTexture(id);
  const src = textureSource(base);
  const w = Math.max(4, Math.round(src.realFt * P));
  const h = Math.max(4, Math.round((w * src.height) / src.width));
  const key = `${id}|${w}|${src.file ? 1 : 0}`;
  const hit = scaledCache.get(key);
  if (hit) {
    scaledCache.delete(key);
    scaledCache.set(key, hit);
    return hit;
  }
  const c = makeCanvas(w, h);
  const cx = c.getContext('2d')!;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(src.image, 0, 0, w, h);
  if (id !== base) freshen(cx, w, h);
  scaledPx += w * h;
  for (const [k, old] of scaledCache) {
    if (scaledPx <= SCALED_MAX_PX) break;
    scaledPx -= old.width * old.height;
    scaledCache.delete(k);
  }
  scaledCache.set(key, c);
  return c;
}

/** A renewed area before its pick: the existing beige finish, desaturated and lifted to a clean new white-grey. */
function freshen(cx: Ctx, w: number, h: number) {
  cx.save();
  cx.globalCompositeOperation = 'saturation';
  cx.fillStyle = 'rgb(128,128,128)';
  cx.fillRect(0, 0, w, h);
  cx.globalCompositeOperation = 'screen';
  cx.fillStyle = 'rgb(118,120,122)';
  cx.fillRect(0, 0, w, h);
  cx.restore();
}

/**
 * Drop the cached textures and scratch canvases (the last BathScene
 * unmounted). They are rebuilt on the next paint.
 */
export function releaseBathCanvases(): void {
  scaledCache.clear();
  scaledPx = 0;
  for (const c of pool.values()) {
    c.width = 1;
    c.height = 1;
  }
  pool.clear();
  if (lightCanvas) lightCanvas.width = lightCanvas.height = 1;
  lightCanvas = null;
}

/** Fill a px rect with a texture whose pattern origin is (ax, ay). */
function fillTexture(ctx: Ctx, id: PaintTexture, P: number, x: number, y: number, w: number, h: number, ax = 0, ay = 0) {
  const pattern = ctx.createPattern(scaledTexture(id, P), 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.fillStyle = pattern;
  ctx.fillRect(x - ax, y - ay, w, h);
  ctx.restore();
}

function linear(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

function radial(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][], r0 = 0): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, r0, x, y, Math.max(r, r0 + 0.01));
  for (const [t, c] of stops) g.addColorStop(t, c);
  return g;
}

/** A blurred shape via the shadow trick (canvas filter is not everywhere): draws only the shadow. */
function softShape(ctx: Ctx, blur: number, colour: string, path: (ctx: Ctx) => void) {
  const OFF = 10000;
  const t = ctx.getTransform();
  ctx.save();
  ctx.shadowColor = colour;
  ctx.shadowBlur = blur * Math.hypot(t.a, t.b);
  ctx.shadowOffsetX = OFF * t.a;
  ctx.shadowOffsetY = OFF * t.d;
  ctx.translate(-OFF, -OFF);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  path(ctx);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Perspective strips
// ---------------------------------------------------------------------------

/**
 * A horizontal plane at height y (x0..x1 wide, zFar..zNear deep), drawn row by
 * row from a flat canvas whose u = (x - x0) * P and v = (zFar - z) * P.
 */
function hPlane(ctx: Ctx, cam: BathCamera, src: HTMLCanvasElement, P: number, x0: number, x1: number, zFar: number, zNear: number, y: number, step: number) {
  const dy = cam.eye - y;
  if (Math.abs(dy) < 1e-3 || zNear >= zFar) return;
  const yFar = project(cam, 0, y, zFar).y;
  const yNear = project(cam, 0, y, zNear).y;
  const top = Math.min(yFar, yNear);
  const bottom = Math.max(yFar, yNear);
  const zAt = (sy: number) => (cam.f * dy) / (sy - cam.vpY);
  const from = Math.max(top, -10);
  const to = Math.min(bottom, FH + 10);
  const srcW = (x1 - x0) * P;
  ctx.save();
  // Strips are thin and many: 'high' quality would build a mip chain per call.
  ctx.imageSmoothingQuality = 'low';
  for (let sy = Math.floor(from / step) * step; sy < to; sy += step) {
    const a = Math.max(sy, top);
    const b = Math.min(sy + step, bottom);
    if (b <= a) continue;
    const za = zAt(a);
    const zb = zAt(b);
    const v0 = (zFar - Math.max(za, zb)) * P;
    const v1 = (zFar - Math.min(za, zb)) * P;
    const zm = (za + zb) / 2;
    const xl = cam.vpX + (cam.f * (x0 - cam.camX)) / zm;
    const xr = cam.vpX + (cam.f * (x1 - cam.camX)) / zm;
    const sv = Math.max(0, Math.min(src.height - 0.5, v0));
    const sh = Math.max(0.5, Math.min(src.height - sv, v1 - v0));
    ctx.drawImage(src, 0, sv, srcW, sh, xl, a, xr - xl, b - a + 0.04);
  }
  ctx.restore();
}

/**
 * A vertical plane facing sideways at x = xWall (zFar..zNear deep, y0..y1
 * tall), column by column from a flat canvas whose u = (zFar - z) * P and
 * v = (y1 - y) * P.
 */
function vPlane(ctx: Ctx, cam: BathCamera, src: HTMLCanvasElement, P: number, xWall: number, zFar: number, zNear: number, y0: number, y1: number, step: number) {
  const dx = xWall - cam.camX;
  if (Math.abs(dx) < 1e-3 || zNear >= zFar) return;
  const xFar = project(cam, xWall, 0, zFar).x;
  const xNear = project(cam, xWall, 0, zNear).x;
  const left = Math.min(xFar, xNear);
  const right = Math.max(xFar, xNear);
  const zAt = (sx: number) => (cam.f * dx) / (sx - cam.vpX);
  const from = Math.max(left, -10);
  const to = Math.min(right, FW + 10);
  const srcH = (y1 - y0) * P;
  ctx.save();
  ctx.imageSmoothingQuality = 'low';
  for (let sx = Math.floor(from / step) * step; sx < to; sx += step) {
    const a = Math.max(sx, left);
    const b = Math.min(sx + step, right);
    if (b <= a) continue;
    const za = zAt(a);
    const zb = zAt(b);
    const u0 = (zFar - Math.max(za, zb)) * P;
    const u1 = (zFar - Math.min(za, zb)) * P;
    const zm = (za + zb) / 2;
    const yt = cam.vpY - (cam.f * (y1 - cam.eye)) / zm;
    const yb = cam.vpY - (cam.f * (y0 - cam.eye)) / zm;
    const su = Math.max(0, Math.min(src.width - 0.5, u0));
    const sw = Math.max(0.5, Math.min(src.width - su, u1 - u0));
    ctx.drawImage(src, su, 0, sw, srcH, a, yt, b - a + 0.04, yb - yt);
  }
  ctx.restore();
}

const pool = new Map<string, HTMLCanvasElement>();

/**
 * Scratch canvases reused frame to frame (allocating several megapixel
 * canvases per pick is what makes a redraw slow, not the drawing). Paints are
 * synchronous, so instances can share them.
 */
function pooled(key: string, w: number, h: number): HTMLCanvasElement {
  const cw = Math.max(1, Math.round(w));
  const ch = Math.max(1, Math.round(h));
  let c = pool.get(key);
  if (!c) {
    c = makeCanvas(cw, ch);
    pool.set(key, c);
  } else if (c.width !== cw || c.height !== ch) {
    c.width = cw;
    c.height = ch;
  } else {
    const cx = c.getContext('2d')!;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.globalAlpha = 1;
    cx.globalCompositeOperation = 'source-over';
    cx.clearRect(0, 0, cw, ch);
  }
  return c;
}

/** A flat canvas filled with a texture, w x h feet at P px/ft (pattern anchored bottom-left). */
function surface(key: string, id: PaintTexture, wFt: number, hFt: number, P: number, anchorBottom = true): HTMLCanvasElement {
  const c = pooled(key, wFt * P, hFt * P);
  const cx = c.getContext('2d')!;
  fillTexture(cx, id, P, 0, 0, c.width, c.height, 0, anchorBottom ? c.height : 0);
  return c;
}

function polygon(ctx: Ctx, pts: Pt[]) {
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// The frame
// ---------------------------------------------------------------------------

type Look = {
  spec: BathSceneSpec;
  L: BathLayout;
  cam: BathCamera;
  mood: BathMood;
  tile: PaintTexture;
  floor: PaintTexture;
  paint: BathTextureId;
  counter: BathTextureId;
  cabinet: BathTextureId;
  metal: string;
  metalRgb: [number, number, number];
  paintRgb: [number, number, number];
  dark: boolean;
  /** Device px per frame unit, after any zoom. */
  dpx: number;
  step: number;
  P: number;
  draft: boolean;
};

/** Paint one frame. `ctx` belongs to a canvas of 1200 * scale x 800 * scale px. */
export function paintBathScene(ctx: Ctx, spec: BathSceneSpec, opts: PaintOptions): void {
  const L = bathLayout(spec);
  const cam = L.camera;
  const metalId = spec.metal && BATH_METAL_COLORS[spec.metal] ? spec.metal : BATH_DEFAULT_METAL;
  const paintId = materialTexture('paint', spec.paint);
  const zoom = opts.focus === 'close' ? 1.55 : 1;
  const dpx = opts.scale * zoom;
  const draft = Boolean(opts.draft);
  // A renewed area shows a clean new neutral until its material is picked (a new layout always gets new tile).
  const freshTile = !spec.showerTile && (spec.bathing !== 'existing' || Boolean(spec.renew?.bathing));
  const freshFloor = !spec.floor && Boolean(spec.renew?.floor);
  const look: Look = {
    spec,
    L,
    cam,
    mood: opts.mood,
    tile: freshTile ? 'tile_plain:fresh' : materialTexture('showerTile', spec.showerTile),
    floor: freshFloor ? 'floor_plain:fresh' : materialTexture('floor', spec.floor),
    paint: paintId,
    counter: materialTexture('counter', spec.counter),
    cabinet: materialTexture('vanityFinish', spec.vanityFinish),
    metal: BATH_METAL_COLORS[metalId],
    metalRgb: hexRgb(BATH_METAL_COLORS[metalId]),
    paintRgb: hexRgb(textureFallback(paintId)),
    dark: opts.mood === 'evening',
    dpx,
    // Strip step: device px, but no finer than 1/1.5 frame px (invisible on 2x screens, half the draws);
    // a draft uses 2.5 frame px strips (about a third of the draws).
    step: draft ? 2.5 : 1 / Math.min(dpx, 1.5),
    // Plane canvases: enough px per ft for the nearest surfaces, capped for memory (lower for a draft).
    P: snapP(Math.min(150, Math.max(draft ? 32 : 48, Math.round((draft ? 40 : 64) * dpx)))),
    draft,
  };

  ctx.save();
  ctx.setTransform(opts.scale, 0, 0, opts.scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = look.dark ? '#2a2a33' : '#e8e4dc';
  ctx.fillRect(0, 0, FW, FH);
  if (zoom !== 1) {
    const target = bathFocusPoint(L, opts.target ?? 'vanity');
    const tx = Math.min(FW - FW / (2 * zoom), Math.max(FW / (2 * zoom), target.x));
    const ty = Math.min(FH - FH / (2 * zoom), Math.max(FH / (2 * zoom), target.y));
    ctx.translate(FW / 2, FH / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-tx, -ty);
  }

  drawRoom(ctx, look);
  drawFixtures(ctx, look);
  drawLight(ctx, look);
  ctx.restore();

  // Grade in device space (unzoomed).
  ctx.save();
  ctx.setTransform(opts.scale, 0, 0, opts.scale, 0, 0);
  grade(ctx, look);
  ctx.restore();
}

function textureFallback(texture: PaintTexture): string {
  const id = baseTexture(texture);
  const mean = textureSource(id).file ? sampleMean(id) : FALLBACKS[id] ?? '#e9e6df';
  if (id === texture) return mean;
  const [r, g, b] = mix(hexRgb(mean), [236, 236, 236], 0.75).map((v) => Math.round(v));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const FALLBACKS: Record<string, string> = Object.fromEntries(Object.entries(BATH_TEXTURES).map(([k, v]) => [k, v.fallback]));

const meanCache = new Map<string, string>();
/** Mean colour of a loaded texture file (for reflections and tinted glass). */
function sampleMean(id: BathTextureId): string {
  const hit = meanCache.get(id);
  if (hit) return hit;
  const src = textureSource(id);
  const c = makeCanvas(1, 1);
  const cx = c.getContext('2d', { willReadFrequently: true })!;
  cx.drawImage(src.image, 0, 0, 1, 1);
  let value = FALLBACKS[id] ?? '#e9e6df';
  try {
    const d = cx.getImageData(0, 0, 1, 1).data;
    value = `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    // Tainted (should not happen: same-origin files); keep the manifest colour.
  }
  meanCache.set(id, value);
  return value;
}

// ---------------------------------------------------------------------------
// Room planes
// ---------------------------------------------------------------------------

function drawRoom(ctx: Ctx, k: Look) {
  const { cam, P, step } = k;
  const edges = frameEdgeDepths(cam);
  const zl = Math.max(0.5, Math.min(edges.left, cam.zBack - 0.5));
  const zr = Math.max(0.5, Math.min(edges.right, cam.zBack - 0.5));
  const zf = Math.max(0.5, Math.min(edges.floor, cam.zBack - 0.5));

  // Side walls (columns), then floor rows over their lower edge, then ceiling.
  const leftDepth = cam.zBack - zl;
  const rightDepth = cam.zBack - zr;
  vPlane(ctx, cam, sideWall(k, 'left', leftDepth), P, 0, cam.zBack, zl, 0, C, step);
  vPlane(ctx, cam, sideWall(k, 'right', rightDepth), P, cam.roomW, cam.zBack, zr, 0, C, step);
  const backTL = project(cam, 0, C, cam.zBack);
  const backBR = project(cam, cam.roomW, 0, cam.zBack);
  ctx.save();
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(backWall(k), backTL.x, backTL.y, backBR.x - backTL.x, backBR.y - backTL.y);
  ctx.restore();
  hPlane(ctx, cam, floorPlane(k, cam.zBack - zf), P, 0, cam.roomW, cam.zBack, zf, 0, step);
  drawCeiling(ctx, k);
}

/** Back wall, flat: x * P across, (C - y) * P down. */
function backWall(k: Look): HTMLCanvasElement {
  const { cam, L, P, spec } = k;
  const W = cam.roomW;
  const c = pooled('back', W * P, C * P);
  const ctx = c.getContext('2d')!;
  const X = (x: number) => x * P;
  const Y = (y: number) => (C - y) * P;
  fillTexture(ctx, k.paint, P, 0, 0, c.width, c.height, 0, c.height);
  // Paint reads lighter high on the wall (bounce from the ceiling).
  ctx.fillStyle = linear(ctx, 0, 0, 0, c.height, [[0, 'rgba(255,255,255,0.05)'], [1, 'rgba(0,0,0,0.05)']]);
  ctx.fillRect(0, 0, c.width, c.height);

  baseboard(ctx, c.width, Y(0), P);
  // Daylight comes from the window side: the wall brightens towards it.
  const fromRight = L.window.wall === 'right';
  ctx.fillStyle = linear(ctx, 0, 0, c.width, 0, [[0, fromRight ? 'rgba(40,30,20,0.10)' : 'rgba(40,30,20,0.04)'], [1, fromRight ? 'rgba(255,250,240,0.06)' : 'rgba(40,30,20,0.04)']]);
  ctx.fillRect(0, 0, c.width, c.height);

  // Tile zones.
  if (L.shower) tileZone(ctx, k, X(L.shower.x0), Y(L.shower.tileTop), X(L.shower.x1), Y(0));
  if (L.alcove) tileZone(ctx, k, X(L.alcove.x0), Y(L.alcove.tileTop), X(L.alcove.x1), Y(0));
  // Window over a freestanding tub.
  if (L.window.wall === 'back') windowPane(ctx, k, X(L.window.rect.x0), Y(L.window.rect.y1), X(L.window.rect.x1) - X(L.window.rect.x0), Y(L.window.rect.y0) - Y(L.window.rect.y1), P);
  // Backsplash in the counter material.
  const v = L.vanity;
  fillTexture(ctx, k.counter, P, X(v.x0 - 0.06), Y(v.top + 0.35), X(v.x1 + 0.06) - X(v.x0 - 0.06), 0.35 * P, X(v.x0), Y(v.top));
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(X(v.x0 - 0.06), Y(v.top + 0.35) - 1, X(v.x1 + 0.06) - X(v.x0 - 0.06), 2);
  // Cabinet shadow on the wall (strong under a floating vanity).
  if (v.bottom > 0) {
    softShape(ctx, 0.5 * P, 'rgba(0,0,0,0.38)', (s) => s.rect(X(v.x0 + 0.1), Y(v.bottom + 0.15), X(v.x1 - 0.1) - X(v.x0 + 0.1), 0.6 * P));
  }
  // Niche.
  if (L.niche) niche(ctx, k, L.niche, X, Y);
  // Mirrors and sconces hang on this wall.
  for (const m of L.mirrors) mirror(ctx, k, m, X, Y);
  for (const s of L.sconces) sconce(ctx, k, s, X, Y);
  // Shower trim on the wall.
  if (L.valve) valveTrim(ctx, k, X(L.valve.x), Y(L.valve.y));
  if (L.showerHead?.kind === 'wall') wallHead(ctx, k, X(L.showerHead.x), Y(L.showerHead.y));
  if (L.towel) towelHook(ctx, k, X(L.towel.x), Y(L.towel.y));
  if (spec.extras.heatedFloor && thermostatOnBack(k)) thermostat(ctx, k, X(v.x1 + 0.45), Y(4.3));
  // Vector toilet: a soft tank shadow on the wall (the generated toilet casts its own, see toilet()).
  if (!spriteImage('toilet')) softShape(ctx, 0.25 * P, 'rgba(0,0,0,0.2)', (s) => s.rect(X(L.toilet.cx - 0.6), Y(2.5), 1.2 * P, 1.1 * P));
  // Corner occlusion along every edge.
  edgeShade(ctx, c.width, c.height, P, { left: 0.9, right: 0.9, top: 0.5, bottom: 0.45 }, 0.3);
  return c;
}

/** Painted 4" baseboard with a lit top edge (tile zones and the vanity are drawn over it). */
function baseboard(ctx: Ctx, w: number, floorY: number, P: number) {
  const h = 0.33 * P;
  ctx.fillStyle = '#f4f2ed';
  ctx.fillRect(0, floorY - h, w, h);
  ctx.fillStyle = linear(ctx, 0, floorY - h, 0, floorY, [[0, 'rgba(255,255,255,0.9)'], [0.08, 'rgba(0,0,0,0.06)'], [0.15, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.1)']]);
  ctx.fillRect(0, floorY - h, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, floorY - h - 1, w, 1.5);
}

function tileZone(ctx: Ctx, k: Look, x0: number, y0: number, x1: number, y1: number) {
  fillTexture(ctx, k.tile, k.P, x0, y0, x1 - x0, y1 - y0, x0, y1);
  // Schluter / bullnose edge where tile meets paint.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x0, y0, x1 - x0, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x0, y0 + 2, x1 - x0, 2);
}

function edgeShade(ctx: Ctx, w: number, h: number, P: number, e: { left?: number; right?: number; top?: number; bottom?: number }, strength = 0.22) {
  const a = strength;
  if (e.left) {
    ctx.fillStyle = linear(ctx, 0, 0, e.left * P, 0, [[0, `rgba(30,24,18,${a})`], [1, 'rgba(30,24,18,0)']]);
    ctx.fillRect(0, 0, e.left * P, h);
  }
  if (e.right) {
    ctx.fillStyle = linear(ctx, w, 0, w - e.right * P, 0, [[0, `rgba(30,24,18,${a})`], [1, 'rgba(30,24,18,0)']]);
    ctx.fillRect(w - e.right * P, 0, e.right * P, h);
  }
  if (e.top) {
    ctx.fillStyle = linear(ctx, 0, 0, 0, e.top * P, [[0, `rgba(30,24,18,${a * 0.8})`], [1, 'rgba(30,24,18,0)']]);
    ctx.fillRect(0, 0, w, e.top * P);
  }
  if (e.bottom) {
    ctx.fillStyle = linear(ctx, 0, h, 0, h - e.bottom * P, [[0, `rgba(30,24,18,${a})`], [1, 'rgba(30,24,18,0)']]);
    ctx.fillRect(0, h - e.bottom * P, w, e.bottom * P);
  }
}

/** Side wall, flat: u = distance from the back wall, v = (C - y). */
function sideWall(k: Look, side: 'left' | 'right', depth: number): HTMLCanvasElement {
  const { L, P } = k;
  const c = pooled(`side-${side}`, depth * P, C * P);
  const ctx = c.getContext('2d')!;
  const U = (fromBack: number) => fromBack * P;
  const Y = (y: number) => (C - y) * P;
  // Anchor the paint at the back corner so it lines up with the back wall.
  fillTexture(ctx, k.paint, P, 0, 0, c.width, c.height, 0, c.height);
  baseboard(ctx, c.width, Y(0), P);
  if (side === 'left') {
    if (L.shower) tileZoneSide(ctx, k, 0, Y(L.shower.tileTop), U(L.shower.depth), Y(0));
    if (L.alcove) tileZoneSide(ctx, k, 0, Y(L.alcove.tileTop), U(L.alcove.depth), Y(0));
  } else {
    if (L.window.wall === 'right') {
      const zb = k.cam.zBack;
      const w = L.window;
      windowPane(ctx, k, U(zb - w.z1), Y(w.y1), U(w.z1 - w.z0), Y(w.y0) - Y(w.y1), P);
    }
    // Heated floor: its thermostat by the back corner when the back wall has no room beside the vanity.
    if (k.spec.extras.heatedFloor && !thermostatOnBack(k)) thermostat(ctx, k, U(0.4), Y(4.3));
  }
  // Light: the left wall faces the window and reads brighter towards the room.
  // Both side walls fall off towards the camera; the window wall is the darker one
  // (light comes from it, so it is seen against the light).
  const windowWall = (side === 'right') === (L.window.wall === 'right');
  ctx.fillStyle = linear(ctx, 0, 0, c.width, 0, [[0, windowWall ? 'rgba(40,30,22,0.10)' : 'rgba(255,250,240,0.04)'], [1, windowWall ? 'rgba(40,30,22,0.30)' : 'rgba(40,30,22,0.20)']]);
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = linear(ctx, 0, 0, 0, c.height, [[0, 'rgba(40,30,22,0.06)'], [0.5, 'rgba(40,30,22,0)'], [1, 'rgba(40,30,22,0.08)']]);
  ctx.fillRect(0, 0, c.width, c.height);
  edgeShade(ctx, c.width, c.height, P, { left: 0.9, top: 0.5, bottom: 0.45 }, 0.3);
  return c;
}

function tileZoneSide(ctx: Ctx, k: Look, x0: number, y0: number, x1: number, y1: number) {
  // The pattern origin is the back corner, so courses run on from the back wall.
  fillTexture(ctx, k.tile, k.P, x0, y0, x1 - x0, y1 - y0, 0, y1);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x0, y0, x1 - x0, 2);
  // Tile edge trim where the tile stops along the wall.
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(x1 - 2, y0, 3, y1 - y0);
}

/** Floor, flat: u = x, v = distance from the back wall. */
function floorPlane(k: Look, depth: number): HTMLCanvasElement {
  const { cam, L, P, spec } = k;
  const W = cam.roomW;
  const c = pooled('floor', W * P, depth * P);
  const ctx = c.getContext('2d')!;
  const X = (x: number) => x * P;
  const V = (fromBack: number) => fromBack * P;
  const zb = cam.zBack;
  fillTexture(ctx, k.floor, P, 0, 0, c.width, c.height, 0, 0);

  // Shower pan: small hex mosaic tinted by the wall tile, with a linear drain.
  if (L.shower) {
    const s = L.shower;
    const x0 = X(s.x0);
    const w = X(s.x1) - x0;
    const h = V(s.depth);
    fillTexture(ctx, 'floor_hex_mosaic', P * 0.75, x0, 0, w, h, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = shade(hexRgb(textureFallback(k.tile)), 12);
    ctx.fillRect(x0, 0, w, h);
    ctx.restore();
    ctx.fillStyle = shade(k.metalRgb, -25);
    ctx.fillRect(x0 + 0.25 * P, V(0.35), w - 0.5 * P, 0.07 * P);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(x0 + 0.25 * P, V(0.35), w - 0.5 * P, 0.015 * P);
    // Curb.
    ctx.fillStyle = shade(hexRgb(textureFallback(k.tile)), -8);
    ctx.fillRect(x0, h - 0.1 * P, w, 0.1 * P);
  }

  // Bath mat in front of the vanity (or the shower when there is room).
  const v = L.vanity;
  const matW = Math.min(2.6, v.x1 - v.x0 - 0.3);
  const matX = (v.x0 + v.x1) / 2 - matW / 2;
  const matZ = v.depth + 0.35;
  if (matZ + 1.7 < depth - 0.2) {
    softShape(ctx, 0.08 * P, 'rgba(0,0,0,0.25)', (s) => roundRect(s, X(matX), V(matZ), matW * P, 1.7 * P, 0.12 * P));
    ctx.beginPath();
    roundRect(ctx, X(matX), V(matZ), matW * P, 1.7 * P, 0.12 * P);
    ctx.fillStyle = k.dark ? '#e2ddd2' : '#f6f2ea';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.globalCompositeOperation = 'multiply';
    const pat = ctx.createPattern(grain(), 'repeat');
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(X(matX), V(matZ), matW * P, 1.7 * P);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(160,150,135,0.5)';
    ctx.lineWidth = 0.05 * P;
    ctx.beginPath();
    roundRect(ctx, X(matX) + 0.12 * P, V(matZ) + 0.12 * P, (matW - 0.24) * P, 1.46 * P, 0.08 * P);
    ctx.stroke();
    ctx.restore();
  }

  // Contact shadows of everything standing on the floor.
  const shadow = (blur: number, a: number, path: (s: Ctx) => void) => softShape(ctx, blur * P, `rgba(25,18,12,${a})`, path);
  if (v.bottom === 0) shadow(0.18, 0.5, (s) => s.rect(X(v.x0 - 0.02), 0, X(v.x1 + 0.02) - X(v.x0 - 0.02), V(v.depth + 0.05)));
  else shadow(0.55, 0.32, (s) => s.rect(X(v.x0 + 0.2), 0, X(v.x1 - 0.2) - X(v.x0 + 0.2), V(v.depth - 0.2)));
  if (L.toilet) {
    const t = L.toilet;
    shadow(0.2, 0.42, (s) => s.ellipse(X(t.cx), V(1.3), 0.45 * P, 0.8 * P, 0, 0, Math.PI * 2));
  }
  if (L.alcove) shadow(0.15, 0.45, (s) => s.rect(X(L.alcove!.x0), 0, X(L.alcove!.x1) - X(L.alcove!.x0), V(L.alcove!.depth + 0.04)));
  if (L.freestanding) {
    const t = L.freestanding;
    const mid = zb - (t.zFront + t.depth / 2);
    shadow(0.35, 0.4, (s) => s.ellipse(X(t.cx), V(mid), (t.width / 2) * 0.88 * P, (t.depth / 2) * 0.82 * P, 0, 0, Math.PI * 2));
  }
  if (L.plant) {
    const p = L.plant;
    shadow(0.25, 0.4, (s) => s.ellipse(X(p.x), V(zb - p.z), 0.55 * P, 0.4 * P, 0, 0, Math.PI * 2));
  }
  if (L.alcove?.partition) shadow(0.2, 0.35, (s) => s.rect(X(L.alcove!.partition!.x0), 0, X(L.alcove!.partition!.x1) - X(L.alcove!.partition!.x0) + 0.1 * P, V(L.alcove!.depth)));

  // Daylight from the window, or warm can pools in the evening (light map does the rest).
  if (!k.dark) {
    const w = L.window;
    const glow = w.wall === 'right'
      ? { x: X(W - 1.3), y: V((zb - w.z0 + zb - w.z1) / 2 + 0.6), rx: 2.2 * P, ry: 1.7 * P }
      : { x: X((w.rect.x0 + w.rect.x1) / 2), y: V(L.freestanding ? L.freestanding.depth + 1.6 : 1.6), rx: 2.6 * P, ry: 1.6 * P };
    ctx.save();
    ctx.translate(glow.x, glow.y);
    ctx.scale(glow.rx, glow.ry);
    ctx.fillStyle = radial(ctx, 0, 0, 1, [[0, 'rgba(255,248,232,0.30)'], [1, 'rgba(255,248,232,0)']]);
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  // Polished floor: a faint sheen towards the back (reflected wall light).
  ctx.fillStyle = linear(ctx, 0, 0, 0, c.height, [[0, 'rgba(255,255,255,0.10)'], [0.4, 'rgba(255,255,255,0)']]);
  ctx.fillRect(0, 0, c.width, c.height);
  edgeShade(ctx, c.width, c.height, P, { left: 0.55, right: 0.55, top: 0.5 }, 0.28);
  void spec;
  return c;
}

function drawCeiling(ctx: Ctx, k: Look) {
  const { cam, L } = k;
  const tl = project(cam, 0, C, cam.zBack);
  const tr = project(cam, cam.roomW, C, cam.zBack);
  const far = Math.max(0.5, cam.zFront);
  const nl = project(cam, 0, C, far);
  const nr = project(cam, cam.roomW, C, far);
  ctx.save();
  ctx.beginPath();
  polygon(ctx, [nl, nr, tr, tl]);
  ctx.clip();
  const base = shade(k.paintRgb, 0);
  // Ceilings photograph a little darker than the walls, darkest near the camera.
  const ceil = mix(hexRgb('#f1eee8'), k.paintRgb, 0.15);
  ctx.fillStyle = base;
  ctx.fillRect(-10, -10, FW + 20, tl.y + 20);
  ctx.fillStyle = linear(ctx, 0, 0, 0, tl.y, [[0, shade(ceil, -38)], [1, shade(ceil, -10)]]);
  ctx.fillRect(-10, -10, FW + 20, tl.y + 20);
  ctx.restore();
  // Crown shadow along the back edge.
  ctx.fillStyle = linear(ctx, 0, tl.y - 10, 0, tl.y, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.12)']]);
  ctx.fillRect(tl.x, tl.y - 10, tr.x - tl.x, 10);
  // Recessed cans.
  for (const can of L.cans) {
    const p = project(cam, can.x, C, can.z);
    const r = (0.28 * cam.f) / can.z;
    const ry = Math.max(1, Math.abs(project(cam, can.x, C, can.z - 0.28).y - project(cam, can.x, C, can.z + 0.28).y) / 2);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 1.12, ry * 1.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = k.dark ? '#fff4dc' : radial(ctx, p.x, p.y, r, [[0, '#fbfaf7'], [1, '#c9c6bf']]);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Wall-mounted things (drawn into the flat back wall)
// ---------------------------------------------------------------------------

type Map1 = (v: number) => number;

function windowPane(ctx: Ctx, k: Look, x: number, y: number, w: number, h: number, P: number) {
  const frame = 0.18 * P;
  softShape(ctx, 0.12 * P, 'rgba(0,0,0,0.25)', (s) => s.rect(x - frame, y - frame, w + frame * 2, h + frame * 2 + 0.1 * P));
  ctx.fillStyle = '#f7f6f2';
  ctx.fillRect(x - frame, y - frame, w + frame * 2, h + frame * 2);
  // Sill.
  ctx.fillStyle = '#fbfaf7';
  ctx.fillRect(x - frame * 1.6, y + h + frame * 0.6, w + frame * 3.2, frame * 0.8);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x - frame * 1.6, y + h + frame * 1.4, w + frame * 3.2, 2);
  // Frosted glass: bright daylight, or dusk blue.
  ctx.fillStyle = k.dark
    ? linear(ctx, 0, y, 0, y + h, [[0, '#1f2b45'], [1, '#33405c']])
    : linear(ctx, 0, y, 0, y + h, [[0, '#ffffff'], [0.6, '#f4f6f6'], [1, '#e6ebec']]);
  ctx.fillRect(x, y, w, h);
  if (!k.dark) {
    // Soft greenery behind the frosted glass.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = radial(ctx, x + w * (0.15 + i * 0.18), y + h * (0.75 + (i % 2) * 0.1), h * 0.35, [[0, 'rgba(150,175,140,0.28)'], [1, 'rgba(150,175,140,0)']]);
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }
  // Muntin.
  ctx.fillStyle = '#f2f1ec';
  ctx.fillRect(x, y + h / 2 - frame * 0.35, w, frame * 0.7);
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  ctx.fillRect(x, y + h / 2 + frame * 0.35, w, 2);
}

function niche(ctx: Ctx, k: Look, n: Rect, X: Map1, Y: Map1) {
  const x = X(n.x0);
  const y = Y(n.y1);
  const w = X(n.x1) - x;
  const h = Y(n.y0) - y;
  ctx.save();
  fillTexture(ctx, k.tile, k.P, x, y, w, h, X(0), Y(0));
  // Recess depth: shadow from the top and left, a lit sill.
  ctx.fillStyle = linear(ctx, 0, y, 0, y + h, [[0, 'rgba(0,0,0,0.38)'], [0.35, 'rgba(0,0,0,0.12)'], [1, 'rgba(0,0,0,0.02)']]);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = linear(ctx, x, 0, x + w, 0, [[0, 'rgba(0,0,0,0.18)'], [0.15, 'rgba(0,0,0,0)'], [0.85, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.12)']]);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(x - 2, y + h - 3, w + 4, 4);
  ctx.strokeStyle = shade(k.metalRgb, 0, 0.8);
  ctx.lineWidth = 0.025 * k.P;
  ctx.strokeRect(x, y, w, h);
  // Bottles.
  const P = k.P;
  const bottles: [number, number, string][] = [[0.22, 0.62, '#efe9df'], [0.42, 0.75, '#c9b79a'], [0.62, 0.55, '#ffffff']];
  for (const [fx, hFt, col] of bottles) {
    const bw = 0.2 * P;
    const bh = hFt * P * 0.9;
    const bx = x + w * fx;
    const by = y + h - 2 - bh;
    ctx.beginPath();
    roundRect(ctx, bx, by, bw, bh, bw * 0.25);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.fillStyle = linear(ctx, bx, 0, bx + bw, 0, [[0, 'rgba(0,0,0,0.18)'], [0.35, 'rgba(255,255,255,0.25)'], [1, 'rgba(0,0,0,0.22)']]);
    ctx.fill();
    ctx.fillStyle = shade(k.metalRgb, -10);
    ctx.fillRect(bx + bw * 0.3, by - 0.08 * P, bw * 0.4, 0.08 * P);
  }
  ctx.restore();
}

function mirror(ctx: Ctx, k: Look, m: Rect, X: Map1, Y: Map1) {
  const P = k.P;
  const x = X(m.x0);
  const y = Y(m.y1);
  const w = X(m.x1) - x;
  const h = Y(m.y0) - y;
  const led = k.spec.extras.ledMirror;
  const r = led ? 0.22 * P : 0.04 * P;
  softShape(ctx, 0.12 * P, 'rgba(0,0,0,0.32)', (s) => roundRect(s, x + 0.03 * P, y + 0.07 * P, w, h, r));
  // Frame (metal for a framed mirror; a thin bevel for LED).
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = led ? '#dfe3e4' : k.metal;
  ctx.fill();
  const inset = led ? 0.04 * P : 0.09 * P;
  const gx = x + inset;
  const gy = y + inset;
  const gw = w - inset * 2;
  const gh = h - inset * 2;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, gx, gy, gw, gh, Math.max(0, r - inset));
  ctx.clip();
  // Reflection: the room behind the camera (the opposite wall and the doorway), soft.
  const wall = k.paintRgb;
  ctx.fillStyle = linear(ctx, 0, gy, 0, gy + gh, [[0, shade(mix(wall, [255, 255, 255], 0.35), k.dark ? -90 : -4)], [1, shade(wall, k.dark ? -110 : -24)]]);
  ctx.fillRect(gx, gy, gw, gh);
  // Doorway reflected: a darker vertical panel with a white casing.
  const dx = gx + gw * 0.58;
  ctx.fillStyle = k.dark ? 'rgba(20,18,26,0.6)' : 'rgba(120,110,100,0.22)';
  ctx.fillRect(dx, gy + gh * 0.18, gw * 0.3, gh);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(dx - 0.06 * P, gy + gh * 0.14, 0.06 * P, gh);
  // Glass sheen.
  ctx.fillStyle = linear(ctx, gx, gy, gx + gw, gy + gh, [[0, 'rgba(255,255,255,0.28)'], [0.35, 'rgba(255,255,255,0.05)'], [0.55, 'rgba(255,255,255,0.12)'], [0.7, 'rgba(255,255,255,0)']]);
  ctx.fillRect(gx, gy, gw, gh);
  ctx.restore();
  if (led) {
    // Frosted LED band just inside the edge.
    ctx.save();
    ctx.lineWidth = 0.07 * P;
    ctx.strokeStyle = k.dark ? 'rgba(255,240,210,0.95)' : 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    roundRect(ctx, gx + 0.12 * P, gy + 0.12 * P, gw - 0.24 * P, gh - 0.24 * P, Math.max(0, r - 0.12 * P));
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * A generated sprite for trim that only exists in a silver finish: used when
 * the picked metal is silver too, otherwise the vector drawing (which takes
 * any finish) is drawn instead.
 */
function silverSprite(k: Look, id: BathSpriteId): HTMLImageElement | null {
  const metal = k.spec.metal ?? BATH_DEFAULT_METAL;
  return metal === 'chrome' || metal === 'brushed_nickel' ? spriteImage(id) : null;
}

function sconce(ctx: Ctx, k: Look, s: Pt, X: Map1, Y: Map1) {
  const P = k.P;
  const x = X(s.x);
  const y = Y(s.y);
  // The generated sconce is brushed nickel (a warm silver): chrome gets the vector one in true chrome.
  const img = !k.dark && (k.spec.metal ?? BATH_DEFAULT_METAL) === 'brushed_nickel' ? spriteImage('sconce') : null;
  if (img) {
    const e = BATH_SPRITES.sconce;
    softShape(ctx, 0.12 * P, 'rgba(0,0,0,0.28)', (c) => roundRect(c, x - 0.12 * P, y - 0.5 * P + 0.08 * P, 0.24 * P, 1.0 * P, 0.05 * P));
    ctx.drawImage(img, x - (e.widthFt * P) / 2, y - (e.heightFt * P) / 2, e.widthFt * P, e.heightFt * P);
    return;
  }
  softShape(ctx, 0.1 * P, 'rgba(0,0,0,0.3)', (c) => roundRect(c, x - 0.1 * P, y - 0.45 * P + 0.06 * P, 0.2 * P, 0.95 * P, 0.03 * P));
  // Backplate.
  ctx.beginPath();
  roundRect(ctx, x - 0.07 * P, y - 0.3 * P, 0.14 * P, 0.6 * P, 0.03 * P);
  ctx.fillStyle = linear(ctx, x - 0.07 * P, 0, x + 0.07 * P, 0, [[0, shade(k.metalRgb, -30)], [0.4, shade(k.metalRgb, 30)], [1, shade(k.metalRgb, -40)]]);
  ctx.fill();
  // Shade: frosted cylinder.
  const sw = 0.36 * P;
  const sh = 0.7 * P;
  ctx.beginPath();
  roundRect(ctx, x - sw / 2, y - sh / 2, sw, sh, 0.06 * P);
  ctx.fillStyle = k.dark
    ? linear(ctx, x - sw / 2, 0, x + sw / 2, 0, [[0, '#ffd9a0'], [0.5, '#fff6e4'], [1, '#ffd29a']])
    : linear(ctx, x - sw / 2, 0, x + sw / 2, 0, [[0, '#d9d6cf'], [0.45, '#fbfaf6'], [1, '#cfccc4']]);
  ctx.fill();
  ctx.fillStyle = k.metal;
  ctx.fillRect(x - sw / 2 - 0.01 * P, y - sh / 2 - 0.02 * P, sw + 0.02 * P, 0.05 * P);
  ctx.fillRect(x - sw / 2 - 0.01 * P, y + sh / 2 - 0.03 * P, sw + 0.02 * P, 0.05 * P);
}

function valveTrim(ctx: Ctx, k: Look, x: number, y: number) {
  const P = k.P;
  ctx.beginPath();
  ctx.arc(x, y, 0.32 * P, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, x - 0.1 * P, y - 0.1 * P, 0.4 * P, [[0, shade(k.metalRgb, 50)], [1, shade(k.metalRgb, -35)]]);
  ctx.fill();
  ctx.strokeStyle = shade(k.metalRgb, -55, 0.6);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = shade(k.metalRgb, -20);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.3);
  ctx.beginPath();
  roundRect(ctx, -0.04 * P, -0.05 * P, 0.4 * P, 0.1 * P, 0.04 * P);
  ctx.fill();
  ctx.restore();
}

function wallHead(ctx: Ctx, k: Look, x: number, y: number) {
  const P = k.P;
  const img = silverSprite(k, 'shower_head');
  if (img) {
    const e = BATH_SPRITES.shower_head;
    ctx.drawImage(img, x - (e.widthFt * P) / 2, y - 0.1 * P, e.widthFt * P, e.heightFt * P);
    return;
  }
  ctx.fillStyle = shade(k.metalRgb, -15);
  ctx.fillRect(x - 0.035 * P, y - 0.02 * P, 0.07 * P, 0.4 * P);
  ctx.beginPath();
  ctx.ellipse(x, y + 0.4 * P, 0.3 * P, 0.16 * P, 0, 0, Math.PI * 2);
  ctx.fillStyle = radial(ctx, x - 0.08 * P, y + 0.35 * P, 0.32 * P, [[0, shade(k.metalRgb, 55)], [1, shade(k.metalRgb, -40)]]);
  ctx.fill();
}

function towelHook(ctx: Ctx, k: Look, x: number, y: number) {
  const P = k.P;
  ctx.fillStyle = k.metal;
  ctx.beginPath();
  ctx.arc(x, y, 0.06 * P, 0, Math.PI * 2);
  ctx.fill();
  const sprite = spriteImage('towel');
  const tw = 1.25 * P;
  const th = 2.2 * P;
  if (sprite) {
    const e = BATH_SPRITES.towel;
    ctx.drawImage(sprite, x - (e.widthFt * P) / 2, y - 0.05 * P, e.widthFt * P, e.heightFt * P);
    return;
  }
  softShape(ctx, 0.12 * P, 'rgba(0,0,0,0.28)', (s) => towelPath(s, x + 0.05 * P, y + 0.08 * P, tw, th));
  ctx.beginPath();
  towelPath(ctx, x, y, tw, th);
  const base: [number, number, number] = k.spec.paint === 'navy' ? [240, 236, 228] : [214, 200, 182];
  ctx.fillStyle = linear(ctx, x - tw / 2, 0, x + tw / 2, 0, [
    [0, shade(base, -38)], [0.18, shade(base, -5)], [0.32, shade(base, -24)], [0.5, shade(base, 8)], [0.68, shade(base, -20)], [0.85, shade(base, 0)], [1, shade(base, -40)],
  ]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.globalCompositeOperation = 'multiply';
  const pat = ctx.createPattern(grain(), 'repeat');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(x - tw, y, tw * 2, th + 10);
  }
  ctx.restore();
  // Woven band.
  ctx.fillStyle = shade(base, -30, 0.6);
  ctx.fillRect(x - tw / 2 + 2, y + th * 0.82, tw - 4, 0.08 * P);
}

function towelPath(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.moveTo(x - w * 0.2, y);
  ctx.quadraticCurveTo(x - w * 0.5, y + h * 0.15, x - w * 0.48, y + h * 0.5);
  ctx.lineTo(x - w * 0.5, y + h);
  ctx.quadraticCurveTo(x, y + h * 1.03, x + w * 0.5, y + h);
  ctx.lineTo(x + w * 0.48, y + h * 0.5);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.15, x + w * 0.2, y);
  ctx.closePath();
}

/** The heated-floor thermostat goes on the back wall right of the vanity when it fits there. */
function thermostatOnBack(k: Look): boolean {
  return k.L.vanity.x1 + 0.7 < k.cam.roomW - 0.15;
}

function thermostat(ctx: Ctx, k: Look, x: number, y: number) {
  const P = k.P;
  ctx.beginPath();
  roundRect(ctx, x - 0.17 * P, y - 0.22 * P, 0.34 * P, 0.44 * P, 0.04 * P);
  ctx.fillStyle = '#f7f7f5';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = k.dark ? '#ffb46b' : '#3c4a52';
  ctx.fillRect(x - 0.11 * P, y - 0.14 * P, 0.22 * P, 0.12 * P);
}

// ---------------------------------------------------------------------------
// Fixtures in perspective
// ---------------------------------------------------------------------------

type Draw = { z: number; draw: () => void };

function drawFixtures(ctx: Ctx, k: Look) {
  const { L } = k;
  const zb = k.cam.zBack;
  const list: Draw[] = [];
  if (L.showerHead?.kind === 'rain') list.push({ z: zb - 1.2, draw: () => rainHead(ctx, k) });
  if (L.shower) {
    const s = L.shower;
    if (L.bench) list.push({ z: zb - L.bench.zFromBack1, draw: () => bench(ctx, k) });
    list.push({ z: zb - s.depth, draw: () => showerGlass(ctx, k) });
  }
  if (L.alcove) list.push({ z: zb - L.alcove.depth, draw: () => alcoveTub(ctx, k) });
  if (L.freestanding) list.push({ z: L.freestanding.zFront, draw: () => freestandingTub(ctx, k) });
  if (L.toilet) list.push({ z: zb - 2.3, draw: () => toilet(ctx, k) });
  list.push({ z: zb - L.vanity.depth, draw: () => vanity(ctx, k) });
  if (L.plant) list.push({ z: L.plant.z - 0.4, draw: () => plant(ctx, k) });
  list.sort((a, b) => b.z - a.z);
  for (const d of list) d.draw();
  if (!k.draft) mirrorReflections(ctx, k);
}

/**
 * The mirrors catch a dim, soft reflection of the room: a flipped, blurred
 * crop of the frame drawn so far, darkened, under a fresh glass sheen.
 */
function mirrorReflections(ctx: Ctx, k: Look) {
  const { cam, L } = k;
  const zb = cam.zBack;
  const s = cam.f / zb;
  const t = ctx.getTransform();
  const led = k.spec.extras.ledMirror;
  const inset = led ? 0.04 : 0.09;
  for (const m of L.mirrors) {
    const a = pt(k, m.x0 + inset, m.y1 - inset, zb);
    const b = pt(k, m.x1 - inset, m.y0 + inset, zb);
    const w = b.x - a.x;
    const h = b.y - a.y;
    if (w < 4 || h < 4) continue;
    // Source: a wider patch of the room, pulled towards the middle of the frame and down to the fixtures.
    const cx = (a.x + b.x) / 2 + (FW / 2 - (a.x + b.x) / 2) * 0.4;
    const sw = w * 2.4;
    const sh = h * 1.7;
    const sx = cx - sw / 2;
    const sy = a.y + h * 0.35;
    const dx0 = Math.max(0, Math.round(t.a * sx + t.e));
    const dy0 = Math.max(0, Math.round(t.d * sy + t.f));
    const dx1 = Math.min(ctx.canvas.width, Math.round(t.a * (sx + sw) + t.e));
    const dy1 = Math.min(ctx.canvas.height, Math.round(t.d * (sy + sh) + t.f));
    if (dx1 - dx0 < 8 || dy1 - dy0 < 8) continue;
    // Small and smoothed up again: the blur of an out-of-focus reflection.
    const tmp = pooled('mirror', Math.max(4, Math.round((dx1 - dx0) / 7)), Math.max(4, Math.round((dy1 - dy0) / 7)));
    const tc = tmp.getContext('2d')!;
    tc.imageSmoothingQuality = 'high';
    tc.setTransform(-1, 0, 0, 1, tmp.width, 0);
    tc.drawImage(ctx.canvas, dx0, dy0, dx1 - dx0, dy1 - dy0, 0, 0, tmp.width, tmp.height);
    tc.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, a.x, a.y, w, h, led ? Math.max(0, 0.18 * s) : 0);
    ctx.clip();
    ctx.globalAlpha = k.dark ? 0.4 : 0.62;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tmp, a.x, a.y, w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = k.dark ? 'rgba(10,10,16,0.25)' : 'rgba(40,44,48,0.10)';
    ctx.fillRect(a.x, a.y, w, h);
    ctx.fillStyle = linear(ctx, a.x, a.y, b.x, b.y, [[0, 'rgba(255,255,255,0.26)'], [0.32, 'rgba(255,255,255,0.04)'], [0.5, 'rgba(255,255,255,0.1)'], [0.62, 'rgba(255,255,255,0)']]);
    ctx.fillRect(a.x, a.y, w, h);
    ctx.restore();
  }
}

/** A tight dark line where something meets the floor (frame px), so it sits on it instead of floating. */
function contactLine(ctx: Ctx, x0: number, x1: number, y: number, s: number, a = 0.4) {
  const h = Math.max(1.5, 0.09 * s);
  ctx.fillStyle = linear(ctx, 0, y - h * 0.4, 0, y + h, [[0, 'rgba(18,12,8,0)'], [0.35, `rgba(18,12,8,${a})`], [1, 'rgba(18,12,8,0)']]);
  ctx.fillRect(x0, y - h * 0.4, x1 - x0, h * 1.4);
}

function pt(k: Look, x: number, y: number, z: number): Pt {
  return project(k.cam, x, y, z);
}

/** A box's visible faces (front, top or bottom, the side facing the camera). */
type BoxFaces = {
  front?: (ctx: Ctx, quad: Pt[]) => void;
  top?: (ctx: Ctx, quad: Pt[]) => void;
  side?: (ctx: Ctx, quad: Pt[], which: 'left' | 'right') => void;
};

function box(ctx: Ctx, k: Look, b: { x0: number; x1: number; y0: number; y1: number; zNear: number; zFar: number }, faces: BoxFaces) {
  const { cam } = k;
  const P = (x: number, y: number, z: number) => pt(k, x, y, z);
  if (faces.side) {
    if (cam.camX < b.x0) faces.side(ctx, [P(b.x0, b.y0, b.zNear), P(b.x0, b.y0, b.zFar), P(b.x0, b.y1, b.zFar), P(b.x0, b.y1, b.zNear)], 'left');
    else if (cam.camX > b.x1) faces.side(ctx, [P(b.x1, b.y0, b.zNear), P(b.x1, b.y0, b.zFar), P(b.x1, b.y1, b.zFar), P(b.x1, b.y1, b.zNear)], 'right');
  }
  if (faces.top && b.y1 < cam.eye) faces.top(ctx, [P(b.x0, b.y1, b.zNear), P(b.x1, b.y1, b.zNear), P(b.x1, b.y1, b.zFar), P(b.x0, b.y1, b.zFar)]);
  if (faces.front) faces.front(ctx, [P(b.x0, b.y0, b.zNear), P(b.x1, b.y0, b.zNear), P(b.x1, b.y1, b.zNear), P(b.x0, b.y1, b.zNear)]);
}

function fillQuad(ctx: Ctx, quad: Pt[], style: string | CanvasGradient) {
  ctx.beginPath();
  polygon(ctx, quad);
  ctx.fillStyle = style;
  ctx.fill();
}

/** Texture a frontal rect (world x0..x1, y0..y1 at depth z) at its true scale. */
function frontalTexture(ctx: Ctx, k: Look, id: PaintTexture, x0: number, x1: number, y0: number, y1: number, z: number) {
  const s = k.cam.f / z;
  const a = pt(k, x0, y1, z);
  const b = pt(k, x1, y0, z);
  ctx.save();
  ctx.beginPath();
  ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
  ctx.clip();
  // Draw at frame scale s: build the pattern at device resolution, then scale back.
  const P = Math.max(8, Math.round(s * k.dpx));
  ctx.translate(a.x, b.y);
  ctx.scale(s / P, s / P);
  fillTexture(ctx, id, P, 0, -(b.y - a.y) * (P / s), (b.x - a.x) * (P / s), (b.y - a.y) * (P / s), 0, 0);
  ctx.restore();
}

function bench(ctx: Ctx, k: Look) {
  const b = k.L.bench!;
  const zb = k.cam.zBack;
  const P = k.P;
  const zNear = zb - b.zFromBack1;
  const zFar = zb - b.zFromBack0;
  const depth = zFar - zNear;
  const tileRgb = hexRgb(textureFallback(k.tile));
  vPlane(ctx, k.cam, darken(surface('bench-side', k.tile, depth, b.height, P), 0.12), P, b.x1, zFar, zNear, 0, b.height, k.step);
  hPlane(ctx, k.cam, lighten(surface('bench-top', k.tile, b.x1, depth, P, false), 0.06), P, 0, b.x1, zFar, zNear, b.height, k.step);
  frontalTexture(ctx, k, k.tile, 0, b.x1, 0, b.height, zNear);
  const a = pt(k, 0, b.height, zNear);
  const c = pt(k, b.x1, b.height, zNear);
  ctx.fillStyle = shade(tileRgb, 30, 0.7);
  ctx.fillRect(a.x, a.y - 1, c.x - a.x, 2);
}

function darken(c: HTMLCanvasElement, a: number): HTMLCanvasElement {
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = `rgba(20,16,12,${a})`;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function lighten(c: HTMLCanvasElement, a: number): HTMLCanvasElement {
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

function rainHead(ctx: Ctx, k: Look) {
  const head = k.L.showerHead!;
  const zb = k.cam.zBack;
  const m = k.metalRgb;
  const img = silverSprite(k, 'rain_head');
  if (img) {
    // Ceiling-mounted: the sprite hangs from the ceiling over the shower.
    const e = BATH_SPRITES.rain_head;
    const z = zb - 1.2;
    const sc = k.cam.f / z;
    const top = pt(k, head.x, C, z);
    ctx.drawImage(img, top.x - (e.widthFt * sc) / 2, top.y, e.widthFt * sc, e.heightFt * sc);
    return;
  }
  // Arm out of the wall, then a 12" square plate seen from below.
  const a0 = pt(k, head.x, head.y + 0.25, zb);
  const a1 = pt(k, head.x, head.y + 0.25, zb - 1.1);
  ctx.strokeStyle = shade(m, -10);
  ctx.lineWidth = (0.08 * k.cam.f) / (zb - 0.5);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a0.x, a0.y);
  ctx.lineTo(a1.x, a1.y);
  ctx.stroke();
  const zc = zb - 1.2;
  const y = head.y;
  const q = [pt(k, head.x - 0.5, y, zc + 0.5), pt(k, head.x + 0.5, y, zc + 0.5), pt(k, head.x + 0.5, y, zc - 0.5), pt(k, head.x - 0.5, y, zc - 0.5)];
  fillQuad(ctx, q, shade(m, -35));
  const front = [pt(k, head.x - 0.5, y, zc - 0.5), pt(k, head.x + 0.5, y, zc - 0.5), pt(k, head.x + 0.5, y + 0.06, zc - 0.5), pt(k, head.x - 0.5, y + 0.06, zc - 0.5)];
  fillQuad(ctx, front, linear(ctx, front[0].x, 0, front[1].x, 0, [[0, shade(m, -10)], [0.5, shade(m, 45)], [1, shade(m, -20)]]));
}

function showerGlass(ctx: Ctx, k: Look) {
  const s = k.L.shower!;
  const zb = k.cam.zBack;
  const zFront = zb - s.depth;
  const top = 6.6;
  const curb = s.curb;
  const tileRgb = hexRgb(textureFallback(k.tile));
  // Curb (a low tiled step along the front).
  box(ctx, k, { x0: s.x0, x1: s.x1, y0: 0, y1: curb, zNear: zFront - 0.15, zFar: zFront + 0.15 }, {
    front: (c, q) => fillQuad(c, q, shade(tileRgb, -12)),
    top: (c, q) => fillQuad(c, q, shade(tileRgb, 8)),
    side: (c, q) => fillQuad(c, q, shade(tileRgb, -25)),
  });
  // Return panel along x = x1 (seen at an angle), then the front panel + door.
  const ret = [pt(k, s.x1, curb, zFront), pt(k, s.x1, curb, zb), pt(k, s.x1, top, zb), pt(k, s.x1, top, zFront)];
  glassPane(ctx, k, ret, 0.7);
  const front = [pt(k, s.x0, curb, zFront), pt(k, s.x1, curb, zFront), pt(k, s.x1, top, zFront), pt(k, s.x0, top, zFront)];
  glassPane(ctx, k, front, 1);
  // Door split, hinges and handle.
  const doorX = s.x0 + (s.x1 - s.x0) * 0.48;
  const d0 = pt(k, doorX, curb, zFront);
  const d1 = pt(k, doorX, top, zFront);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80,110,110,0.35)';
  ctx.beginPath();
  ctx.moveTo(d0.x + 1.5, d0.y);
  ctx.lineTo(d1.x + 1.5, d1.y);
  ctx.stroke();
  const sc = k.cam.f / zFront;
  const m = k.metalRgb;
  for (const hy of [1.2, 5.6]) {
    const h = pt(k, s.x1, hy, zFront);
    ctx.fillStyle = shade(m, 10);
    ctx.fillRect(h.x - 0.12 * sc, h.y - 0.2 * sc, 0.16 * sc, 0.4 * sc);
  }
  const hx = pt(k, doorX + 0.25, 4.4, zFront);
  const hb = pt(k, doorX + 0.25, 3.0, zFront);
  ctx.strokeStyle = shade(m, -10);
  ctx.lineWidth = 0.07 * sc;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx.x, hx.y);
  ctx.lineTo(hb.x, hb.y);
  ctx.stroke();
  ctx.strokeStyle = shade(m, 60, 0.8);
  ctx.lineWidth = 0.02 * sc;
  ctx.beginPath();
  ctx.moveTo(hx.x - 0.02 * sc, hx.y);
  ctx.lineTo(hb.x - 0.02 * sc, hb.y);
  ctx.stroke();
  // Thin metal channel along the wall and the top of the return.
  const w0 = pt(k, s.x1, curb, zb);
  const w1 = pt(k, s.x1, top, zb);
  ctx.strokeStyle = shade(m, -5, 0.9);
  ctx.lineWidth = 0.05 * (k.cam.f / zb);
  ctx.beginPath();
  ctx.moveTo(w0.x, w0.y);
  ctx.lineTo(w1.x, w1.y);
  ctx.stroke();
}

/** Clear glass: faint tint, green edges, diagonal reflections. */
function glassPane(ctx: Ctx, k: Look, quad: Pt[], strength: number) {
  ctx.save();
  ctx.beginPath();
  polygon(ctx, quad);
  ctx.fillStyle = k.dark ? `rgba(150,170,180,${0.1 * strength})` : `rgba(215,232,234,${0.16 * strength})`;
  ctx.fill();
  ctx.clip();
  const xs = quad.map((p) => p.x);
  const ys = quad.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const w = x1 - x0;
  const h = y1 - y0;
  ctx.fillStyle = linear(ctx, x0, y0, x0 + w * 0.6, y1, [
    [0, 'rgba(255,255,255,0)'],
    [0.3, `rgba(255,255,255,${0.16 * strength})`],
    [0.36, 'rgba(255,255,255,0.02)'],
    [0.5, `rgba(255,255,255,${0.1 * strength})`],
    [0.53, 'rgba(255,255,255,0)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  ctx.fillRect(x0, y0, w, h);
  ctx.restore();
  ctx.beginPath();
  polygon(ctx, quad);
  ctx.strokeStyle = `rgba(120,160,155,${0.55 * strength})`;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.5 * strength})`;
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function alcoveTub(ctx: Ctx, k: Look) {
  const a = k.L.alcove!;
  const zb = k.cam.zBack;
  const zFront = zb - a.depth;
  const tub = { x0: a.x0, x1: a.x1, y0: 0, y1: a.rim, zNear: zFront, zFar: zb };
  const white: [number, number, number] = [246, 245, 241];
  // Partition (alcove end wall), full height.
  if (a.partition) {
    const p = a.partition;
    box(ctx, k, { x0: p.x0, x1: p.x1, y0: 0, y1: C, zNear: zFront - 0.02, zFar: zb }, {
      side: (c, q) => fillQuad(c, q, shade(k.paintRgb, -26)),
      front: (c, q) => {
        // The end wall's edge: lit from the window side, a corner bead highlight.
        fillQuad(c, q, linear(c, q[0].x, 0, q[1].x, 0, [[0, shade(k.paintRgb, -16)], [0.5, shade(k.paintRgb, -4)], [1, shade(k.paintRgb, 4)]]));
        c.fillStyle = linear(c, 0, q[3].y, 0, q[0].y, [[0, 'rgba(0,0,0,0.12)'], [0.3, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.06)']]);
        c.fill();
        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.fillRect(q[1].x - 1.5, q[2].y, 1.5, q[1].y - q[2].y);
        const bb = pt(k, 0, 0.33, zFront - 0.02).y;
        c.fillStyle = '#f2f0eb';
        c.fillRect(q[0].x, bb, q[1].x - q[0].x, q[0].y - bb);
      },
    });
  }
  box(ctx, k, tub, {
    top: (c, q) => {
      fillQuad(c, q, shade(white, 4));
      // Basin: an inset opening, darker towards the front lip.
      const inset = 0.32;
      const basin = [pt(k, a.x0 + inset, a.rim, zFront + inset), pt(k, a.x1 - inset, a.rim, zFront + inset), pt(k, a.x1 - inset, a.rim, zb - inset), pt(k, a.x0 + inset, a.rim, zb - inset)];
      fillQuad(c, basin, linear(c, 0, basin[2].y, 0, basin[0].y, [[0, '#e9e7e2'], [0.7, '#d7d5cf'], [1, '#bfbcb5']]));
      c.strokeStyle = 'rgba(0,0,0,0.08)';
      c.lineWidth = 1;
      c.stroke();
    },
    front: (c, q) => {
      fillQuad(c, q, linear(c, 0, q[3].y, 0, q[0].y, [[0, shade(white, 6)], [0.12, shade(white, -4)], [1, shade(white, -26)]]));
      // Apron shading: rounder at the ends.
      c.fillStyle = linear(c, q[0].x, 0, q[1].x, 0, [[0, 'rgba(0,0,0,0.10)'], [0.1, 'rgba(0,0,0,0)'], [0.9, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.12)']]);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillRect(q[3].x, q[3].y, q[2].x - q[3].x, 1.5);
    },
  });
  {
    const a0 = pt(k, a.x0, 0, zFront);
    const a1 = pt(k, a.x1, a.rim, zFront);
    floorReflection(ctx, k, a0.x, a1.x, a1.y, a0.y);
    contactLine(ctx, a0.x, a1.x, a0.y, k.cam.f / zFront, 0.45);
  }
  // A shower bench on a tub-shower combo: a tiled seat on the tub deck at the open end.
  if (k.spec.extras.bench) tubSeat(ctx, k);
  // Spout under the valve.
  const sp = pt(k, (a.x0 + a.x1) / 2, a.rim + 0.55, zb - 0.02);
  const s = k.cam.f / zb;
  ctx.fillStyle = linear(ctx, 0, sp.y - 0.06 * s, 0, sp.y + 0.12 * s, [[0, shade(k.metalRgb, 50)], [1, shade(k.metalRgb, -40)]]);
  ctx.beginPath();
  roundRect(ctx, sp.x - 0.09 * s, sp.y - 0.06 * s, 0.18 * s, 0.16 * s, 0.05 * s);
  ctx.fill();
  if (a.glass) {
    const top = 6.4;
    const x1 = a.x0 + (a.x1 - a.x0) * 0.55;
    glassPane(ctx, k, [pt(k, a.x0, a.rim, zFront + 0.2), pt(k, x1, a.rim, zFront + 0.2), pt(k, x1, top, zFront + 0.2), pt(k, a.x0, top, zFront + 0.2)], 1);
  } else {
    curtain(ctx, k, a.x0, a.x1, zFront + 0.12);
  }
}

function tubSeat(ctx: Ctx, k: Look) {
  const a = k.L.alcove!;
  const zb = k.cam.zBack;
  const seat = { x0: a.x1 - 1.25, x1: a.x1, y0: a.rim - 0.05, y1: a.rim + 0.5, zNear: zb - 1.15, zFar: zb };
  const tileRgb = hexRgb(textureFallback(k.tile));
  box(ctx, k, seat, {
    top: (c, q) => fillQuad(c, q, shade(tileRgb, 10)),
    front: () => frontalTexture(ctx, k, k.tile, seat.x0, seat.x1, seat.y0, seat.y1, seat.zNear),
  });
  const e0 = pt(k, seat.x0, seat.y1, seat.zNear);
  const e1 = pt(k, seat.x1, seat.y1, seat.zNear);
  ctx.fillStyle = shade(tileRgb, 35, 0.8);
  ctx.fillRect(e0.x, e0.y - 1, e1.x - e0.x, 2);
  const b0 = pt(k, seat.x0, seat.y0, seat.zNear);
  contactLine(ctx, b0.x, e1.x, b0.y, k.cam.f / seat.zNear, 0.3);
}

function curtain(ctx: Ctx, k: Look, x0: number, x1: number, z: number) {
  const s = k.cam.f / z;
  const rodY = 7.0;
  const r0 = pt(k, x0, rodY, z);
  const r1 = pt(k, x1, rodY, z);
  ctx.strokeStyle = shade(k.metalRgb, 0);
  ctx.lineWidth = 0.06 * s;
  ctx.beginPath();
  ctx.moveTo(r0.x, r0.y);
  ctx.lineTo(r1.x, r1.y);
  ctx.stroke();
  // Pulled to the left: soft folds of linen down to just below the rim.
  const cw = (x1 - x0) * 0.36;
  const top = pt(k, x0, rodY - 0.05, z);
  const bottom = pt(k, x0, 1.2, z);
  const right = pt(k, x0 + cw, 0, z).x;
  const linen: [number, number, number] = k.spec.paint === 'soft_white' || !k.spec.paint ? [236, 230, 218] : [246, 243, 236];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(right, top.y);
  ctx.bezierCurveTo(right - 0.1 * s, top.y + (bottom.y - top.y) * 0.4, right + 0.25 * s, top.y + (bottom.y - top.y) * 0.75, right + 0.15 * s, bottom.y);
  for (let i = 0; i <= 8; i++) {
    const x = right + 0.15 * s - ((right + 0.15 * s - top.x) * i) / 8;
    ctx.lineTo(x, bottom.y + (i % 2 ? 0.05 * s : 0));
  }
  ctx.closePath();
  const stops: [number, string][] = [];
  const folds = 7;
  for (let i = 0; i <= folds * 2; i++) stops.push([i / (folds * 2), shade(linen, i % 2 ? 4 : -22)]);
  ctx.fillStyle = linear(ctx, top.x, 0, right + 0.2 * s, 0, stops);
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = linear(ctx, 0, top.y, 0, bottom.y, [[0, 'rgba(255,255,255,0.1)'], [1, 'rgba(0,0,0,0.12)']]);
  ctx.fillRect(top.x - 2, top.y, right - top.x + 0.5 * s, bottom.y - top.y + 0.1 * s);
  ctx.restore();
  // Rings.
  ctx.fillStyle = k.metal;
  for (let i = 0; i < 6; i++) {
    const x = top.x + ((right - top.x) * i) / 5;
    ctx.beginPath();
    ctx.arc(x, r0.y, 0.045 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function freestandingTub(ctx: Ctx, k: Look) {
  const t = k.L.freestanding!;
  const zMid = t.zFront + t.depth / 2;
  const rim = pt(k, t.cx, t.height, zMid);
  const rx = ((t.width / 2) * k.cam.f) / zMid;
  const ryTop = Math.abs(pt(k, t.cx, t.height, t.zFront).y - pt(k, t.cx, t.height, t.zFront + t.depth).y) / 2;
  const base = pt(k, t.cx, 0, zMid);
  const bx = rx * 0.78;
  const bry = Math.abs(pt(k, t.cx, 0, t.zFront + 0.2).y - pt(k, t.cx, 0, t.zFront + t.depth - 0.2).y) / 2;
  const sprite = spriteImage('tub_freestanding');
  if (sprite) {
    const e = BATH_SPRITES.tub_freestanding;
    const s = k.cam.f / t.zFront;
    const b = pt(k, t.cx, 0, t.zFront + 0.3);
    ctx.drawImage(sprite, b.x - (e.widthFt * s) / 2, b.y - e.heightFt * s, e.widthFt * s, e.heightFt * s);
  } else {
    // Body: from the rim's widest points down to a narrower oval foot.
    ctx.beginPath();
    ctx.moveTo(rim.x - rx, rim.y);
    ctx.bezierCurveTo(rim.x - rx, rim.y + (base.y - rim.y) * 0.55, base.x - bx, base.y - bry * 0.4, base.x - bx * 0.9, base.y + bry * 0.5);
    ctx.ellipse(base.x, base.y + bry * 0.5, bx * 0.9, bry * 0.55, 0, Math.PI, 0, true);
    ctx.bezierCurveTo(base.x + bx, base.y - bry * 0.4, rim.x + rx, rim.y + (base.y - rim.y) * 0.55, rim.x + rx, rim.y);
    ctx.ellipse(rim.x, rim.y, rx, ryTop, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, rim.x - rx, 0, rim.x + rx, 0, [[0, '#b9b8b3'], [0.12, '#dedcd7'], [0.4, '#fbfaf8'], [0.55, '#ffffff'], [0.85, '#d7d5cf'], [1, '#a9a7a2']]);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = linear(ctx, 0, rim.y, 0, base.y + bry, [[0, 'rgba(0,0,0,0)'], [0.7, 'rgba(0,0,0,0.04)'], [1, 'rgba(0,0,0,0.2)']]);
    ctx.fillRect(rim.x - rx, rim.y, rx * 2, base.y - rim.y + bry * 2);
    ctx.restore();
    // Rim and interior.
    ctx.beginPath();
    ctx.ellipse(rim.x, rim.y, rx, ryTop, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f7f6f3';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(rim.x, rim.y + ryTop * 0.05, rx * 0.9, ryTop * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = linear(ctx, 0, rim.y - ryTop, 0, rim.y + ryTop, [[0, '#f2f1ee'], [0.55, '#d9d7d1'], [1, '#bdbbb5']]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  floorReflection(ctx, k, rim.x - rx, rim.x + rx, rim.y, base.y + bry * 0.9);
  // Where the foot meets the floor.
  ctx.save();
  ctx.translate(base.x, base.y + bry * 0.55);
  ctx.scale(bx * 0.95, Math.max(2, bry * 0.5));
  ctx.fillStyle = radial(ctx, 0, 0, 1, [[0, 'rgba(18,12,8,0.42)'], [0.7, 'rgba(18,12,8,0.18)'], [1, 'rgba(18,12,8,0)']]);
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
  // Floor-mounted filler beside the tub.
  const fx = t.cx + t.width / 2 + 0.35;
  const fz = zMid + 0.2;
  const f0 = pt(k, fx, 0, fz);
  const f1 = pt(k, fx, 2.9, fz);
  const f2 = pt(k, fx - 0.55, 2.55, fz);
  const s = k.cam.f / fz;
  ctx.strokeStyle = linear(ctx, f0.x - 0.05 * s, 0, f0.x + 0.05 * s, 0, [[0, shade(k.metalRgb, -40)], [0.5, shade(k.metalRgb, 50)], [1, shade(k.metalRgb, -40)]]);
  ctx.lineWidth = 0.09 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(f0.x, f0.y);
  ctx.lineTo(f1.x, f1.y + 0.2 * s);
  ctx.quadraticCurveTo(f1.x, f1.y - 0.05 * s, f2.x, f2.y);
  ctx.stroke();
  ctx.fillStyle = shade(k.metalRgb, -20);
  ctx.beginPath();
  ctx.ellipse(f0.x, f0.y, 0.16 * s, 0.05 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // A towel draped over the far end (the generated tub has its own styling).
  if (sprite) return;
  const tx = pt(k, t.cx - t.width / 2 + 0.6, t.height, zMid);
  const ts = k.cam.f / zMid;
  ctx.beginPath();
  ctx.moveTo(tx.x - 0.45 * ts, tx.y - ryTop * 0.6);
  ctx.quadraticCurveTo(tx.x, tx.y - ryTop * 0.9, tx.x + 0.45 * ts, tx.y - ryTop * 0.5);
  ctx.lineTo(tx.x + 0.4 * ts, tx.y + 0.75 * ts);
  ctx.quadraticCurveTo(tx.x, tx.y + 0.82 * ts, tx.x - 0.42 * ts, tx.y + 0.72 * ts);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, tx.x - 0.45 * ts, 0, tx.x + 0.45 * ts, 0, [[0, '#cdbfae'], [0.3, '#e9e0d3'], [0.6, '#d8ccbc'], [1, '#bdae9b']]);
  ctx.fill();
}

/** How glossy each floor reads (reflection strength). */
const FLOOR_GLOSS: Partial<Record<BathTextureId, number>> = {
  floor_large_stone: 0.2,
  floor_plain: 0.12,
  floor_porcelain_wood: 0.12,
  floor_hex_mosaic: 0.07,
  floor_lvp: 0.06,
};

/**
 * A soft mirror image of what was just drawn above a floor line (frame
 * x0..x1, from yTop down to yBase), fading out below it: polished tile
 * catches the vanity and tub the way it does in a listing photo.
 */
function floorReflection(ctx: Ctx, k: Look, x0: number, x1: number, yTop: number, yBase: number) {
  if (k.draft) return;
  const gloss = FLOOR_GLOSS[baseTexture(k.floor)] ?? 0.08;
  const t = ctx.getTransform();
  const dx0 = Math.max(0, Math.floor(t.a * x0 + t.e));
  const dx1 = Math.min(ctx.canvas.width, Math.ceil(t.a * x1 + t.e));
  const dBase = Math.round(t.d * yBase + t.f);
  const span = Math.min(yBase - yTop, 70) * t.d;
  const h = Math.min(Math.round(span), dBase, ctx.canvas.height - dBase);
  const w = dx1 - dx0;
  if (w <= 2 || h <= 2) return;
  const tmp = pooled('reflection', w, h);
  const tc = tmp.getContext('2d')!;
  tc.setTransform(1, 0, 0, -1, 0, h);
  tc.drawImage(ctx.canvas, dx0, dBase - h, w, h, 0, 0, w, h);
  tc.setTransform(1, 0, 0, 1, 0, 0);
  tc.globalCompositeOperation = 'destination-in';
  tc.fillStyle = linear(tc, 0, 0, 0, h, [[0, 'rgba(0,0,0,1)'], [0.6, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]);
  tc.fillRect(0, 0, w, h);
  tc.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = gloss;
  ctx.drawImage(tmp, dx0, dBase);
  ctx.restore();
}

function toilet(ctx: Ctx, k: Look) {
  const t = k.L.toilet!;
  const zb = k.cam.zBack;
  const sprite = spriteImage('toilet');
  if (sprite) {
    const e = BATH_SPRITES.toilet;
    const z = zb - 1.4;
    const s = k.cam.f / z;
    const b = pt(k, t.cx, 0, z);
    // Contact shadow right under the foot, so it sits on the floor.
    ctx.fillStyle = radial(ctx, 0, 0, 1, [[0, 'rgba(20,14,10,0.55)'], [0.6, 'rgba(20,14,10,0.25)'], [1, 'rgba(20,14,10,0)']]);
    ctx.save();
    ctx.translate(b.x, b.y - 0.04 * s);
    ctx.scale(0.62 * s, 0.14 * s);
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
    // Its own soft shadow on the wall behind, offset away from the window light.
    ctx.save();
    ctx.shadowColor = 'rgba(40,28,18,0.32)';
    ctx.shadowBlur = 0.3 * s * k.dpx;
    ctx.shadowOffsetX = (k.L.window.wall === 'right' ? -0.1 : 0.06) * s * k.dpx;
    ctx.shadowOffsetY = 0.04 * s * k.dpx;
    ctx.drawImage(sprite, b.x - (e.widthFt * s) / 2, b.y - e.heightFt * s, e.widthFt * s, e.heightFt * s);
    ctx.restore();
    return;
  }
  const white = (d: number) => shade([247, 246, 243], d);
  // Tank.
  const zt = zb - 0.55;
  const st = k.cam.f / zt;
  const tank = pt(k, t.cx, 2.55, zt);
  const tankBottom = pt(k, t.cx, 1.45, zt);
  const tw = 1.55 * st;
  // Tank lid (top visible from above).
  const lid = [pt(k, t.cx - 0.82, 2.6, zt + 0.02), pt(k, t.cx + 0.82, 2.6, zt + 0.02), pt(k, t.cx + 0.82, 2.6, zb - 0.02), pt(k, t.cx - 0.82, 2.6, zb - 0.02)];
  fillQuad(ctx, lid, white(4));
  ctx.beginPath();
  roundRect(ctx, tank.x - tw / 2, tank.y, tw, tankBottom.y - tank.y, 0.1 * st);
  ctx.fillStyle = linear(ctx, tank.x - tw / 2, 0, tank.x + tw / 2, 0, [[0, white(-28)], [0.25, white(-2)], [0.6, white(4)], [1, white(-34)]]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(tank.x - tw / 2 + 0.05 * st, tank.y, tw - 0.1 * st, 1.5);
  // Flush lever.
  ctx.fillStyle = k.metal;
  ctx.fillRect(tank.x - tw / 2 + 0.15 * st, tank.y + 0.25 * st, 0.28 * st, 0.06 * st);
  // Bowl: closed lid (an oval seen from above) over a tapered body.
  const zc = zb - 1.55;
  const sc = k.cam.f / zc;
  const seat = pt(k, t.cx, 1.38, zc);
  const rx = 0.68 * sc;
  const ry = Math.abs(pt(k, t.cx, 1.38, zb - 0.75).y - pt(k, t.cx, 1.38, zb - 2.35).y) / 2;
  const foot = pt(k, t.cx, 0, zb - 1.25);
  const fs = k.cam.f / (zb - 1.25);
  ctx.beginPath();
  ctx.moveTo(seat.x - rx * 0.95, seat.y);
  ctx.bezierCurveTo(seat.x - rx * 0.9, seat.y + (foot.y - seat.y) * 0.5, foot.x - 0.4 * fs, foot.y - 0.3 * fs, foot.x - 0.42 * fs, foot.y);
  ctx.lineTo(foot.x + 0.42 * fs, foot.y);
  ctx.bezierCurveTo(foot.x + 0.4 * fs, foot.y - 0.3 * fs, seat.x + rx * 0.9, seat.y + (foot.y - seat.y) * 0.5, seat.x + rx * 0.95, seat.y);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, seat.x - rx, 0, seat.x + rx, 0, [[0, white(-40)], [0.3, white(-6)], [0.55, white(6)], [1, white(-44)]]);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(seat.x, seat.y + ry * 0.1, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = white(-30);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(seat.x, seat.y - ry * 0.05, rx * 0.98, ry * 0.95, 0, 0, Math.PI * 2);
  ctx.fillStyle = linear(ctx, 0, seat.y - ry, 0, seat.y + ry, [[0, white(2)], [0.6, white(6)], [1, white(-12)]]);
  ctx.fill();
}

function vanity(ctx: Ctx, k: Look) {
  const v = k.L.vanity;
  const zb = k.cam.zBack;
  const zFront = zb - v.depth;
  const P = k.P;
  const bodyTop = v.top - 0.12;
  const cab = hexRgb(textureFallback(k.cabinet));
  const sprite = spriteImage(v.kind === 'double' ? 'vanity_double' : v.kind === 'floating' ? 'vanity_floating' : 'vanity_single');
  void sprite; // Vanity sprites are not used: the cabinet is built in 3D to take any finish and width.

  // Cabinet.
  box(ctx, k, { x0: v.x0, x1: v.x1, y0: v.bottom, y1: bodyTop, zNear: zFront, zFar: zb }, {
    side: (c, q, which) => {
      vPlane(c, k.cam, darken(surface('vanity-side', k.cabinet, v.depth, bodyTop - v.bottom, P), 0.22), P, which === 'left' ? v.x0 : v.x1, zb, zFront, v.bottom, bodyTop, k.step);
      void q;
    },
    front: () => {
      frontalTexture(ctx, k, k.cabinet, v.x0, v.x1, v.bottom, bodyTop, zFront);
      cabinetFronts(ctx, k, zFront, bodyTop, cab);
    },
  });

  // Counter slab: perspective top with the sinks cut in, then its front edge.
  const ox = 0.06;
  const cx0 = v.x0 - ox;
  const cx1 = v.x1 + ox;
  const cz = zFront - ox;
  const cdepth = zb - cz;
  const top = surface('counter', k.counter, cx1 - cx0, cdepth, P, false);
  const tctx = top.getContext('2d')!;
  for (const sx of v.sinks) sinkCut(tctx, k, (sx - cx0) * P, (cdepth * 0.55) * P, P);
  // Wall shadow line + front highlight.
  tctx.fillStyle = linear(tctx, 0, 0, 0, 0.25 * P, [[0, 'rgba(0,0,0,0.2)'], [1, 'rgba(0,0,0,0)']]);
  tctx.fillRect(0, 0, top.width, 0.25 * P);
  tctx.fillStyle = linear(tctx, 0, top.height - 0.12 * P, 0, top.height, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0.35)']]);
  tctx.fillRect(0, top.height - 0.12 * P, top.width, 0.12 * P);
  hPlane(ctx, k.cam, top, P, cx0, cx1, zb, cz, v.top, k.step);
  frontalTexture(ctx, k, k.counter, cx0, cx1, v.top - 0.12, v.top, cz);
  const e0 = pt(k, cx0, v.top, cz);
  const e1 = pt(k, cx1, v.top - 0.12, cz);
  ctx.fillStyle = linear(ctx, 0, e0.y, 0, e1.y, [[0, 'rgba(255,255,255,0.45)'], [0.25, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.2)']]);
  ctx.fillRect(e0.x, e0.y, e1.x - e0.x, e1.y - e0.y);
  // Shadow of the slab on the cabinet face.
  ctx.fillStyle = linear(ctx, 0, e1.y, 0, e1.y + 0.18 * (k.cam.f / zFront), [[0, 'rgba(0,0,0,0.28)'], [1, 'rgba(0,0,0,0)']]);
  ctx.fillRect(e0.x + 1, e1.y, e1.x - e0.x - 2, 0.18 * (k.cam.f / zFront));

  if (v.bottom === 0) {
    const fl = pt(k, v.x0, 0, zFront);
    const fr = pt(k, v.x1, v.top, zFront);
    floorReflection(ctx, k, fl.x, fr.x, fr.y, fl.y);
    contactLine(ctx, fl.x, fr.x, fl.y, k.cam.f / zFront, 0.35);
  }

  // Faucets, soap, a folded towel.
  for (const sx of v.sinks) faucet(ctx, k, sx, v.top, zb - 0.28);
  const sDecor = k.cam.f / (zb - 0.45);
  const soapX = v.sinks.length > 1 ? (v.sinks[0] + v.sinks[1]) / 2 : v.sinks[0] + Math.min(0.9, (v.x1 - v.x0) * 0.33);
  const soap = pt(k, soapX, v.top, zb - 0.45);
  ctx.beginPath();
  roundRect(ctx, soap.x - 0.1 * sDecor, soap.y - 0.55 * sDecor, 0.2 * sDecor, 0.55 * sDecor, 0.05 * sDecor);
  ctx.fillStyle = linear(ctx, soap.x - 0.1 * sDecor, 0, soap.x + 0.1 * sDecor, 0, [[0, '#7b5a3a'], [0.4, '#c49a6c'], [1, '#6a4a2e']]);
  ctx.fill();
  ctx.fillStyle = k.metal;
  ctx.fillRect(soap.x - 0.04 * sDecor, soap.y - 0.68 * sDecor, 0.08 * sDecor, 0.13 * sDecor);
  ctx.fillRect(soap.x - 0.02 * sDecor, soap.y - 0.68 * sDecor, 0.14 * sDecor, 0.04 * sDecor);
  if (v.sinks.length === 1 && v.x1 - v.sinks[0] > 1.0) {
    const tx = v.sinks[0] - Math.min(0.95, (v.x1 - v.x0) * 0.34);
    const tw = 0.7;
    for (let i = 0; i < 2; i++) {
      const y0 = v.top + i * 0.17;
      const q = [pt(k, tx - tw / 2, y0 + 0.17, zb - 0.95), pt(k, tx + tw / 2, y0 + 0.17, zb - 0.95), pt(k, tx + tw / 2, y0 + 0.17, zb - 0.25), pt(k, tx - tw / 2, y0 + 0.17, zb - 0.25)];
      const f = [pt(k, tx - tw / 2, y0, zb - 0.95), pt(k, tx + tw / 2, y0, zb - 0.95), pt(k, tx + tw / 2, y0 + 0.17, zb - 0.95), pt(k, tx - tw / 2, y0 + 0.17, zb - 0.95)];
      fillQuad(ctx, f, i ? '#ddd3c5' : '#cfc3b2');
      fillQuad(ctx, q, i ? '#efe9df' : '#e6ddd0');
    }
  }
}

/** Doors, drawers, toe kick and pulls on the cabinet front. */
function cabinetFronts(ctx: Ctx, k: Look, z: number, bodyTop: number, cab: [number, number, number]) {
  const v = k.L.vanity;
  const s = k.cam.f / z;
  const metal = k.metalRgb;
  const R = (x0: number, y0: number, x1: number, y1: number) => {
    const a = pt(k, x0, y1, z);
    const b = pt(k, x1, y0, z);
    return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
  };
  const dark = cab[0] + cab[1] + cab[2] < 300;
  const reveal = (r: { x: number; y: number; w: number; h: number }) => {
    ctx.strokeStyle = dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.28)';
    ctx.lineWidth = Math.max(1, 0.02 * s);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r.x + 1, r.y + r.h - 1);
    ctx.lineTo(r.x + 1, r.y + 1);
    ctx.lineTo(r.x + r.w - 1, r.y + 1);
    ctx.stroke();
  };
  const shaker = (x0: number, y0: number, x1: number, y1: number) => {
    const r = R(x0 + 0.02, y0 + 0.02, x1 - 0.02, y1 - 0.02);
    reveal(r);
    if (v.kind === 'floating') return r;
    const rail = 0.2 * s;
    const inner = { x: r.x + rail, y: r.y + rail, w: r.w - rail * 2, h: r.h - rail * 2 };
    if (inner.w > 4 && inner.h > 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
      ctx.fillStyle = dark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.2)';
      ctx.fillRect(inner.x, inner.y, inner.w, Math.max(1, 0.03 * s));
      ctx.fillRect(inner.x, inner.y, Math.max(1, 0.025 * s), inner.h);
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)';
      ctx.fillRect(inner.x, inner.y + inner.h - Math.max(1, 0.02 * s), inner.w, Math.max(1, 0.02 * s));
      ctx.fillRect(inner.x + inner.w - Math.max(1, 0.02 * s), inner.y, Math.max(1, 0.02 * s), inner.h);
    }
    return r;
  };
  const pull = (cx: number, cy: number, vertical: boolean, len = 0.45) => {
    const p = pt(k, cx, cy, z - 0.04);
    const l = len * s;
    const t = Math.max(2, 0.045 * s);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 0.04 * s * k.dpx;
    ctx.shadowOffsetY = 0.02 * s * k.dpx;
    ctx.fillStyle = vertical
      ? linear(ctx, p.x - t / 2, 0, p.x + t / 2, 0, [[0, shade(metal, -40)], [0.5, shade(metal, 55)], [1, shade(metal, -40)]])
      : linear(ctx, 0, p.y - t / 2, 0, p.y + t / 2, [[0, shade(metal, 55)], [1, shade(metal, -45)]]);
    ctx.beginPath();
    if (vertical) roundRect(ctx, p.x - t / 2, p.y - l / 2, t, l, t / 2);
    else roundRect(ctx, p.x - l / 2, p.y - t / 2, l, t, t / 2);
    ctx.fill();
    ctx.restore();
  };

  const y0 = v.bottom + (v.bottom === 0 ? 0.33 : 0);
  if (v.bottom === 0) {
    // Toe kick: a recess in the cabinet's own colour, in shadow under the doors, lighter where floor light bounces in.
    const tk = R(v.x0 + 0.05, 0, v.x1 - 0.05, 0.33);
    ctx.fillStyle = shade(cab, -70);
    ctx.fillRect(tk.x, tk.y, tk.w, tk.h);
    ctx.fillStyle = linear(ctx, 0, tk.y, 0, tk.y + tk.h, [[0, 'rgba(8,6,4,0.7)'], [0.55, 'rgba(8,6,4,0.35)'], [1, 'rgba(255,245,230,0.08)']]);
    ctx.fillRect(tk.x, tk.y, tk.w, tk.h);
  }
  if (v.kind === 'floating') {
    const mid = (y0 + bodyTop) / 2;
    const cols = v.x1 - v.x0 > 4.2 ? 2 : 1;
    for (let c = 0; c < cols; c++) {
      const xa = v.x0 + ((v.x1 - v.x0) * c) / cols;
      const xb = v.x0 + ((v.x1 - v.x0) * (c + 1)) / cols;
      shaker(xa, mid, xb, bodyTop);
      shaker(xa, y0, xb, mid);
      pull((xa + xb) / 2, bodyTop - 0.18, false, Math.min(1.2, (xb - xa) * 0.4));
      pull((xa + xb) / 2, mid - 0.18, false, Math.min(1.2, (xb - xa) * 0.4));
    }
    return;
  }
  const drawerH = 0.55;
  const doors = (xa: number, xb: number) => {
    shaker(xa, bodyTop - drawerH, xb, bodyTop);
    const mid = (xa + xb) / 2;
    shaker(xa, y0, mid, bodyTop - drawerH);
    shaker(mid, y0, xb, bodyTop - drawerH);
    pull(mid - 0.2, bodyTop - drawerH - 0.45, true);
    pull(mid + 0.2, bodyTop - drawerH - 0.45, true);
  };
  if (v.kind === 'double') {
    const w = v.x1 - v.x0;
    const a = v.x0 + w * 0.36;
    const b = v.x1 - w * 0.36;
    doors(v.x0, a);
    doors(b, v.x1);
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      const ya = y0 + ((bodyTop - y0) * r) / rows;
      const yb = y0 + ((bodyTop - y0) * (r + 1)) / rows;
      shaker(a, ya, b, yb);
      pull((a + b) / 2, (ya + yb) / 2 + 0.05, false, 0.5);
    }
  } else {
    doors(v.x0, v.x1);
  }
}

function sinkCut(ctx: Ctx, k: Look, cx: number, cy: number, P: number) {
  const rx = 0.68 * P;
  const ry = 0.5 * P;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fbfbf9';
  ctx.fill();
  ctx.clip();
  // Bowl shading: the far inner wall catches light, the near lip throws shadow.
  ctx.fillStyle = radial(ctx, cx, cy + ry * 0.35, rx * 1.1, [[0, '#f4f4f1'], [0.6, '#e0dfdb'], [1, '#a9a8a3']]);
  ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  ctx.fillStyle = linear(ctx, 0, cy - ry, 0, cy + ry, [[0, 'rgba(0,0,0,0)'], [0.7, 'rgba(0,0,0,0.02)'], [1, 'rgba(0,0,0,0.3)']]);
  ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.025 * P;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy + ry * 0.15, 0.07 * P, 0.05 * P, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(k.metalRgb, -30);
  ctx.fill();
}

function faucet(ctx: Ctx, k: Look, x: number, y: number, z: number) {
  const id = (`faucet_${k.spec.metal && BATH_METAL_COLORS[k.spec.metal] ? k.spec.metal : BATH_DEFAULT_METAL}`) as BathSpriteId;
  const sprite = spriteImage(id);
  const s = k.cam.f / z;
  if (sprite) {
    const e = BATH_SPRITES[id];
    const b = pt(k, x, y, z);
    ctx.drawImage(sprite, b.x - (e.widthFt * s) / 2, b.y - e.heightFt * s, e.widthFt * s, e.heightFt * s);
    return;
  }
  const m = k.metalRgb;
  const base = pt(k, x, y, z);
  const topP = pt(k, x, y + 0.95, z);
  const tip = pt(k, x, y + 0.72, z - 0.55);
  const metalGrad = linear(ctx, base.x - 0.06 * s, 0, base.x + 0.06 * s, 0, [[0, shade(m, -45)], [0.45, shade(m, 60)], [1, shade(m, -45)]]);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 0.05 * s * k.dpx;
  ctx.shadowOffsetX = 0.03 * s * k.dpx;
  ctx.strokeStyle = metalGrad;
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.1 * s;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(topP.x, topP.y + 0.1 * s);
  ctx.quadraticCurveTo(topP.x, topP.y - 0.06 * s, tip.x, tip.y);
  ctx.stroke();
  ctx.restore();
  // Spout end and escutcheon.
  ctx.fillStyle = shade(m, -50);
  ctx.beginPath();
  ctx.ellipse(tip.x, tip.y + 0.02 * s, 0.05 * s, 0.025 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = metalGrad;
  ctx.beginPath();
  ctx.ellipse(base.x, base.y, 0.11 * s, 0.035 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Two lever handles (widespread).
  for (const dx of [-0.42, 0.42]) {
    const h = pt(k, x + dx, y, z);
    ctx.fillStyle = metalGrad;
    ctx.beginPath();
    roundRect(ctx, h.x - 0.04 * s, h.y - 0.22 * s, 0.08 * s, 0.22 * s, 0.03 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(h.x, h.y, 0.08 * s, 0.025 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function plant(ctx: Ctx, k: Look) {
  const p = k.L.plant!;
  const s = k.cam.f / p.z;
  const base = pt(k, p.x, 0, p.z);
  const sprite = spriteImage('plant');
  if (sprite) {
    const e = BATH_SPRITES.plant;
    ctx.drawImage(sprite, base.x - (e.widthFt * s) / 2, base.y - e.heightFt * s, e.widthFt * s, e.heightFt * s);
    return;
  }
  const potW = 0.85 * s;
  const potH = 0.85 * s;
  // Snake plant: tall sword leaves.
  const rand = (() => {
    let a = 41;
    return () => ((a = (a * 16807) % 2147483647) / 2147483647);
  })();
  for (let i = 0; i < 13; i++) {
    const t = i / 12;
    const lx = base.x - potW * 0.32 + potW * 0.64 * t + (rand() - 0.5) * 6;
    const h = (1.5 + rand() * 1.3) * s;
    const lean = (t - 0.5) * 0.6 * s + (rand() - 0.5) * 0.25 * s;
    const w = (0.12 + rand() * 0.06) * s;
    const g = rand();
    const col: [number, number, number] = [44 + g * 30, 86 + g * 40, 52 + g * 20];
    ctx.beginPath();
    ctx.moveTo(lx - w / 2, base.y - potH + 2);
    ctx.quadraticCurveTo(lx - w / 2 + lean * 0.3, base.y - potH - h * 0.6, lx + lean, base.y - potH - h);
    ctx.quadraticCurveTo(lx + w / 2 + lean * 0.3, base.y - potH - h * 0.6, lx + w / 2, base.y - potH + 2);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, lx - w / 2, 0, lx + w / 2, 0, [[0, shade(col, -25)], [0.5, shade(col, 15)], [1, shade(col, -35)]]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(210,200,120,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  // Pot: matte ceramic.
  ctx.beginPath();
  ctx.moveTo(base.x - potW / 2, base.y - potH);
  ctx.lineTo(base.x + potW / 2, base.y - potH);
  ctx.lineTo(base.x + potW * 0.4, base.y);
  ctx.lineTo(base.x - potW * 0.4, base.y);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, base.x - potW / 2, 0, base.x + potW / 2, 0, [[0, '#8f8a82'], [0.35, '#d9d4cb'], [0.6, '#cbc5bb'], [1, '#77726b']]);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(base.x, base.y - potH, potW / 2, 0.08 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#5b4a3a';
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Light and grade
// ---------------------------------------------------------------------------

let lightCanvas: HTMLCanvasElement | null = null;

function drawLight(ctx: Ctx, k: Look) {
  const { cam, L } = k;
  const t = ctx.getTransform();
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  // Light is smooth: a quarter-resolution map, upscaled, costs a fraction of a full-frame pass.
  const LQ = 4;
  const lw = Math.ceil(cw / LQ);
  const lh = Math.ceil(ch / LQ);
  if (!lightCanvas || lightCanvas.width !== lw || lightCanvas.height !== lh) lightCanvas = makeCanvas(lw, lh);
  const lc = lightCanvas.getContext('2d')!;
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalCompositeOperation = 'source-over';
  lc.clearRect(0, 0, lw, lh);
  lc.setTransform(t.a / LQ, t.b / LQ, t.c / LQ, t.d / LQ, t.e / LQ, t.f / LQ);
  const zb = cam.zBack;
  const win = L.window.wall === 'right'
    ? pt(k, cam.roomW, (L.window.y0 + L.window.y1) / 2, (L.window.z0 + L.window.z1) / 2)
    : pt(k, (L.window.rect.x0 + L.window.rect.x1) / 2, (L.window.rect.y0 + L.window.rect.y1) / 2, zb);

  if (!k.dark) {
    // Daylight: bright by the window, falling off into the far corners.
    lc.fillStyle = '#ffffff';
    lc.fillRect(-50, -50, FW + 100, FH + 100);
    lc.fillStyle = radial(lc, win.x, win.y, 1150, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(236,230,222,0.6)'], [1, 'rgba(196,188,178,1)']]);
    lc.fillRect(-50, -50, FW + 100, FH + 100);
    // Under the counter overhang and inside the toe kick it is darker.
  } else {
    lc.fillStyle = '#4c4a5c';
    lc.fillRect(-50, -50, FW + 100, FH + 100);
    lc.globalCompositeOperation = 'lighter';
    const glow = (x: number, y: number, rx: number, ry: number, colour: string, a: number) => {
      lc.save();
      lc.translate(x, y);
      lc.scale(rx, ry);
      lc.fillStyle = radial(lc, 0, 0, 1, [[0, colour.replace('A', String(a))], [0.45, colour.replace('A', String(a * 0.45))], [1, colour.replace('A', '0')]]);
      lc.fillRect(-1, -1, 2, 2);
      lc.restore();
    };
    const warm = 'rgba(255,196,128,A)';
    const s = cam.f / zb;
    // General warm fill from the vanity lights.
    const v = L.vanity;
    const vc = pt(k, (v.x0 + v.x1) / 2, v.top + 1.8, zb - 0.3);
    glow(vc.x, vc.y, (v.x1 - v.x0 + 5) * s, 5.5 * s, warm, 0.5);
    for (const sc of L.sconces) {
      const p = pt(k, sc.x, sc.y, zb);
      glow(p.x, p.y, 1.3 * s, 2.6 * s, 'rgba(255,214,160,A)', 0.85);
    }
    if (k.spec.extras.ledMirror) {
      for (const m of L.mirrors) {
        const p = pt(k, (m.x0 + m.x1) / 2, (m.y0 + m.y1) / 2, zb);
        glow(p.x, p.y, (m.x1 - m.x0) * 0.95 * s, (m.y1 - m.y0) * 0.85 * s, 'rgba(255,226,184,A)', 0.7);
      }
    }
    // Can lights: pools on the floor and a scallop down the back wall.
    for (const can of L.cans) {
      const f = pt(k, can.x, 0, can.z);
      const rx = (2.2 * cam.f) / can.z;
      const ry = Math.abs(pt(k, can.x, 0, can.z - 1.6).y - pt(k, can.x, 0, Math.min(zb - 0.1, can.z + 1.6)).y) / 2;
      glow(f.x, f.y, rx, Math.max(ry, 8), 'rgba(255,200,140,A)', 0.45);
      const w = pt(k, can.x, 5.5, zb);
      glow(w.x, w.y, 1.2 * s, 3.2 * s, 'rgba(255,205,150,A)', 0.4);
    }
    if (L.niche) {
      const n = L.niche;
      const p = pt(k, (n.x0 + n.x1) / 2, (n.y0 + n.y1) / 2, zb);
      glow(p.x, p.y, (n.x1 - n.x0 + 1.2) * s, (n.y1 - n.y0 + 1.6) * s, 'rgba(255,214,160,A)', 0.75);
    }
    if (v.bottom > 0) {
      const p = pt(k, (v.x0 + v.x1) / 2, 0, zb - v.depth * 0.5);
      glow(p.x, p.y, (v.x1 - v.x0) * 0.65 * s, 0.9 * s, 'rgba(255,200,140,A)', 0.8);
    }
    // Heated floor: a low, even warmth across the tile.
    if (k.spec.extras.heatedFloor) {
      const p = pt(k, cam.roomW / 2, 0, zb - cam.roomD * 0.45);
      glow(p.x, p.y, cam.roomW * 0.7 * s, Math.max(40, (FH - p.y) * 0.9), 'rgba(255,168,112,A)', 0.3);
    }
    lc.globalCompositeOperation = 'source-over';
  }

  // Grade folded into the same map: a warm cast and a soft vignette (frame space, unzoomed).
  const sc = cw / FW / LQ;
  lc.setTransform(sc, 0, 0, sc, 0, 0);
  lc.globalCompositeOperation = 'multiply';
  lc.fillStyle = k.dark ? '#fff0dc' : '#fff8ef';
  lc.fillRect(0, 0, FW, FH);
  lc.fillStyle = radial(lc, FW / 2, FH * 0.46, FW * 0.75, [[0, '#ffffff'], [0.55, '#faf7f2'], [1, k.dark ? '#7a706e' : '#c8c0b8']]);
  lc.fillRect(0, 0, FW, FH);
  lc.globalCompositeOperation = 'source-over';

  // Multiply the frame by the light map.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(lightCanvas, 0, 0, cw, ch);
  ctx.restore();

  // Emissive glows on top.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const s = cam.f / zb;
  const bloom = (x: number, y: number, r: number, colour: string) => {
    ctx.fillStyle = radial(ctx, x, y, r, [[0, colour], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  if (!k.dark) {
    bloom(win.x, win.y, 3.2 * s, 'rgba(255,252,240,0.35)');
  } else {
    for (const sc of L.sconces) {
      const p = pt(k, sc.x, sc.y, zb);
      bloom(p.x, p.y, 0.9 * s, 'rgba(255,220,170,0.7)');
    }
    if (k.spec.extras.ledMirror) {
      for (const m of L.mirrors) {
        const a = pt(k, m.x0, m.y1, zb);
        const b = pt(k, m.x1, m.y0, zb);
        ctx.save();
        ctx.shadowColor = 'rgba(255,220,170,0.9)';
        ctx.shadowBlur = 0.6 * s * k.dpx;
        ctx.strokeStyle = 'rgba(255,236,205,0.55)';
        ctx.lineWidth = 0.08 * s;
        ctx.beginPath();
        roundRect(ctx, a.x + 0.16 * s, a.y + 0.16 * s, b.x - a.x - 0.32 * s, b.y - a.y - 0.32 * s, 0.1 * s);
        ctx.stroke();
        ctx.restore();
      }
    }
    if (L.niche) {
      const n = L.niche;
      const a = pt(k, n.x0, n.y1, zb);
      const b = pt(k, n.x1, n.y1, zb);
      ctx.fillStyle = linear(ctx, 0, a.y, 0, a.y + 0.35 * s, [[0, 'rgba(255,220,170,0.75)'], [1, 'rgba(255,220,170,0)']]);
      ctx.fillRect(a.x, a.y, b.x - a.x, 0.35 * s);
    }
    for (const can of L.cans) {
      const p = pt(k, can.x, C, can.z);
      bloom(p.x, p.y, (0.9 * cam.f) / can.z, 'rgba(255,236,200,0.7)');
    }
    if (L.window.wall === 'right' || L.window.wall === 'back') bloom(win.x, win.y, 1.6 * s, 'rgba(70,90,140,0.25)');
  }
  ctx.restore();
}

function grade(ctx: Ctx, k: Look) {
  // Film grain (the warm cast and vignette are in the light map).
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = k.dark ? 0.22 : 0.16;
  const pat = ctx.createPattern(grain(), 'repeat');
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, FW, FH);
  }
  ctx.restore();
}
