import { BATH_SPRITES } from './textures.ts';
import { BATH_SCENE, type BathSceneSpec, type BathVanity } from './types.ts';

/**
 * Live bathroom picture: camera and room layout. Pure (no DOM), so every
 * spec combination is checked in node.
 *
 * The picture is a one-point-perspective interior shot, the way a real-estate
 * photographer stands in the doorway at eye level with a wide lens:
 *
 * - World units are feet. x runs from the left wall (0) to the right wall
 *   (roomW), y from the floor (0) up to the ceiling (BATH_CEILING_FT), z is
 *   the distance from the camera; the back wall sits at zBack.
 * - Everything the homeowner picks stands against the back wall, front-on,
 *   left to right: the bathing zone in the back-left corner, then the toilet
 *   (always: a bathroom without one reads as fake), then the vanity. A
 *   freestanding tub sits just off the wall under a window, clear of the
 *   shower glass. A room too narrow for the picks is drawn wider (the picture
 *   is an illustration of THEIR choices, not a floor plan).
 * - The camera is fitted per room so the floor, ceiling and both side walls
 *   always fill the frame: small rooms get a wider lens and tighter framing
 *   (the squeezed hall-bath look), large rooms show more back wall.
 */

export const BATH_CEILING_FT = 8;
/** Camera height: a photographer's eye level. */
export const BATH_EYE_FT = 4.6;
/** Horizon (vanishing point) height in the frame. */
const VP_Y_FRAC = 0.4;
/** Widest lens used (px focal length at the 1200 px frame, ~81 deg horizontal). */
const FOCAL_MAX = 700;
const FOCAL_MIN = 320;
/** Back wall scale cap (px per ft) and how much of the frame width it may take. */
const SCALE_MAX = 60;
const BACK_WALL_FRAC = 0.74;
/** Drawn room limits (typed dimensions beyond these still draw a sensible room). */
const ROOM_W_MAX = 20;
const ROOM_D_MAX = 16;
/** Floor space right of a freestanding tub for its filler. */
const FILLER_ROOM = 0.45;
/** Beside a freestanding tub the separate shower stays shallow, so the tub never overlaps its glass. */
const SEPARATE_SHOWER_DEPTH = 3;
const FREESTANDING_DEPTH = 2.5;
const FREESTANDING_WALL_GAP = 0.35;

export type Pt = { x: number; y: number };

export type BathCamera = {
  /** Focal length in frame px. */
  f: number;
  /** Back wall scale: frame px per ft. */
  s: number;
  eye: number;
  camX: number;
  vpX: number;
  vpY: number;
  zBack: number;
  /** Front of the room (behind the camera when <= 0). */
  zFront: number;
  roomW: number;
  roomD: number;
  ceiling: number;
  frameW: number;
  frameH: number;
};

/** World point (ft) -> frame px. */
export function project(cam: BathCamera, x: number, y: number, z: number): Pt {
  return { x: cam.vpX + (cam.f * (x - cam.camX)) / z, y: cam.vpY - (cam.f * (y - cam.eye)) / z };
}

/** Frame px per ft at depth z (frontal planes scale uniformly). */
export function scaleAt(cam: BathCamera, z: number): number {
  return cam.f / z;
}

/** Depth of the floor seen at frame row y (below the horizon). */
export function floorDepthAt(cam: BathCamera, frameY: number): number {
  return (cam.f * cam.eye) / Math.max(1e-6, frameY - cam.vpY);
}

/** Depth of the ceiling seen at frame row y (above the horizon). */
export function ceilingDepthAt(cam: BathCamera, frameY: number): number {
  return (cam.f * (cam.ceiling - cam.eye)) / Math.max(1e-6, cam.vpY - frameY);
}

/** Depth of a side wall (x = 0 or roomW) seen at frame column x. */
export function wallDepthAt(cam: BathCamera, side: 'left' | 'right', frameX: number): number {
  const dx = side === 'left' ? cam.camX : cam.roomW - cam.camX;
  return (cam.f * dx) / Math.max(1e-6, side === 'left' ? cam.vpX - frameX : frameX - cam.vpX);
}

/** Nearest depth each surface reaches inside the frame (where it leaves the picture). */
export function frameEdgeDepths(cam: BathCamera): { floor: number; ceiling: number; left: number; right: number } {
  return {
    floor: floorDepthAt(cam, cam.frameH),
    ceiling: ceilingDepthAt(cam, 0),
    left: wallDepthAt(cam, 'left', 0),
    right: wallDepthAt(cam, 'right', cam.frameW),
  };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** A tiled walk-in shower in the back-left corner, closed by frameless glass. */
export type ShowerLayout = {
  x0: number;
  x1: number;
  /** How far the shower comes out from the back wall. */
  depth: number;
  tileTop: number;
  /** Glass front panel + return; false = open (never for a walk-in). */
  glass: boolean;
  curb: number;
};

/** An alcove tub (tub + shower combo, or the existing one) in the back-left corner. */
export type AlcoveLayout = {
  x0: number;
  x1: number;
  depth: number;
  rim: number;
  tileTop: number;
  /** End wall closing the alcove on the right. */
  partition: { x0: number; x1: number } | null;
  /** Glass screen (false = a shower curtain). */
  glass: boolean;
};

export type FreestandingLayout = { cx: number; width: number; depth: number; height: number; /** Front of the tub. */ zFront: number };

export type VanityLayout = {
  kind: BathVanity;
  x0: number;
  x1: number;
  depth: number;
  /** Underside of the cabinet (0 = on the floor; floating sits above it). */
  bottom: number;
  /** Counter top. */
  top: number;
  sinks: number[];
};

export type Rect = { x0: number; x1: number; y0: number; y1: number };

export type BathLayout = {
  camera: BathCamera;
  shower: ShowerLayout | null;
  alcove: AlcoveLayout | null;
  freestanding: FreestandingLayout | null;
  toilet: { cx: number };
  vanity: VanityLayout;
  mirrors: Rect[];
  sconces: Pt[];
  /** Window: on the back wall (x/y rect) or the right wall (z0..z1 along the wall, y0..y1). */
  window: { wall: 'back'; rect: Rect } | { wall: 'right'; z0: number; z1: number; y0: number; y1: number };
  /** Recessed niche on the back wall inside the bathing zone. */
  niche: Rect | null;
  /** Tiled bench along the left wall inside the shower: z measured from the back wall. */
  bench: { x1: number; height: number; zFromBack0: number; zFromBack1: number } | null;
  showerHead: { x: number; y: number; kind: 'wall' | 'rain' } | null;
  /** Shower valve trim (handle). */
  valve: Pt | null;
  towel: { x: number; y: number } | null;
  /** Floor plant near the camera, x and depth. */
  plant: { x: number; z: number } | null;
  /** Ceiling cans. */
  cans: { x: number; z: number }[];
};

const VANITY_W: Record<BathVanity, [number, number, number]> = {
  // small, medium, large
  single: [2.5, 3, 3.5],
  double: [5, 6, 6.5],
  floating: [3, 4, 5],
};

const SIZE_INDEX = { small: 0, medium: 1, large: 2 } as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function finiteOr(v: number, fallback: number): number {
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/** Fit the lens so the room fills the frame (see the module comment). */
export function fitCamera(roomW: number, roomD: number): BathCamera {
  const frameW = BATH_SCENE.width;
  const frameH = BATH_SCENE.height;
  const eye = BATH_EYE_FT;
  const ceiling = BATH_CEILING_FT;
  const vpX = frameW / 2;
  const vpY = frameH * VP_Y_FRAC;
  const camX = roomW / 2;
  const s = Math.min(SCALE_MAX, (BACK_WALL_FRAC * frameW) / roomW);
  // Each surface leaves the frame at depth f * m; the room front (zBack - D)
  // must be nearer than all of them: f / s - D <= f * m.
  const m = Math.min(camX / vpX, eye / (frameH - vpY), (ceiling - eye) / vpY);
  const gap = 1 / s - m;
  const fit = gap > 0 ? (0.97 * roomD) / gap : FOCAL_MAX;
  const f = clamp(fit, FOCAL_MIN, FOCAL_MAX);
  const zBack = f / s;
  return { f, s, eye, camX, vpX, vpY, zBack, zFront: zBack - roomD, roomW, roomD, ceiling, frameW, frameH };
}

/**
 * Spec -> camera + fixture placement. Pure; never NaN for any spec (bad or
 * missing dimensions fall back to the room-size preset).
 */
export function bathLayout(spec: BathSceneSpec): BathLayout {
  const size = SIZE_INDEX[spec.room] ?? 1;
  const defaults: [number, number][] = [[8, 5], [10, 8], [14, 12]];
  const [dl, dw] = defaults[size];
  const a = finiteOr(spec.lengthFt, dl);
  const b = finiteOr(spec.widthFt, dw);
  // Look across the long wall: it holds the vanity and the bathing zone.
  const wallW = clamp(Math.max(a, b), 5, ROOM_W_MAX);
  const roomD = clamp(Math.min(a, b), 4.5, ROOM_D_MAX);

  const bathing = spec.bathing;
  const separate = bathing === 'tub_and_shower';
  const walkIn = bathing === 'walk_in' || separate;
  const alcoveTub = bathing === 'tub_shower' || bathing === 'existing';

  // Widths along the back wall.
  const showerW = walkIn ? (separate ? [3.2, 3.6, 4] : [3.4, 4, 5])[size] : 0;
  const showerDepth = walkIn ? (separate ? SEPARATE_SHOWER_DEPTH : [3, 3.2, 3.6][size]) : 0;
  const alcoveW = alcoveTub ? 5 : 0;
  const partitionW = alcoveTub ? 0.35 : 0;
  const tubW = separate ? [4.6, 5, 5.3][size] : 0;
  const tubGap = separate ? 0.45 : 0;
  const vanityKind: BathVanity = spec.vanity ?? 'single';
  const vanityW = VANITY_W[vanityKind][size];
  const toiletW = 2.2;
  const rightGap = 0.35;
  const minGap = 0.25;

  const bathingW = showerW + alcoveW + partitionW + (separate ? tubGap + tubW + tubGap + FILLER_ROOM : 0);
  const core = bathingW + minGap + vanityW + rightGap;
  // The toilet always comes along: a narrow room is drawn wider rather than drop it.
  // A freestanding tub stands in front of the shower's glass return: it moves right until the picture
  // shows it clear of the glass (the camera depends on the room width, so fit twice).
  let tubShift = 0;
  let needed = core + toiletW;
  let roomW = Math.max(wallW, needed);
  for (let i = 0; separate && i < 3; i++) {
    const cam = fitCamera(roomW, roomD);
    const zf = cam.zBack - FREESTANDING_WALL_GAP - FREESTANDING_DEPTH + 0.3;
    const clearX = cam.camX + ((showerW - cam.camX) * zf) / cam.zBack + (BATH_SPRITES.tub_freestanding.widthFt / 2) * (zf / (zf - 0.3)) + 0.1;
    const cx = showerW + tubGap + tubShift + tubW / 2;
    if (cx >= clearX) break;
    tubShift += clearX - cx;
    needed = core + tubShift + toiletW;
    roomW = Math.max(wallW, needed);
  }

  const camera = fitCamera(roomW, roomD);
  const C = BATH_CEILING_FT;

  // Bathing zone.
  let shower: ShowerLayout | null = null;
  let alcove: AlcoveLayout | null = null;
  let freestanding: FreestandingLayout | null = null;
  let niche: Rect | null = null;
  let bench: BathLayout['bench'] = null;
  let showerHead: BathLayout['showerHead'] = null;
  let valve: Pt | null = null;
  let cursor = 0;
  if (walkIn) {
    shower = { x0: 0, x1: showerW, depth: showerDepth, tileTop: C, glass: true, curb: separate ? 0.15 : 0.12 };
    const mid = showerW / 2;
    if (spec.extras.niche) niche = { x0: mid - 0.75, x1: mid + 0.75, y0: 4.45, y1: 5.45 };
    if (spec.extras.bench) bench = { x1: 1.25, height: 1.5, zFromBack0: 0, zFromBack1: showerDepth - 0.35 };
    showerHead = spec.extras.rainHead ? { x: mid, y: 7.25, kind: 'rain' } : { x: mid + 0.2, y: 6.6, kind: 'wall' };
    valve = { x: mid + 0.2, y: 3.6 };
    cursor = showerW;
    if (separate) {
      const cx = cursor + tubGap + tubShift + tubW / 2;
      freestanding = { cx, width: tubW, depth: FREESTANDING_DEPTH, height: 1.95, zFront: camera.zBack - FREESTANDING_WALL_GAP - FREESTANDING_DEPTH };
      // Room on the right for the floor-mounted filler.
      cursor = cx + tubW / 2 + tubGap + FILLER_ROOM;
    }
  } else {
    const glass = spec.glass;
    alcove = {
      x0: 0,
      x1: alcoveW,
      depth: 2.55,
      rim: 1.75,
      tileTop: bathing === 'existing' ? 6.6 : 7.4,
      partition: { x0: alcoveW, x1: alcoveW + partitionW },
      glass,
    };
    if (spec.extras.niche) niche = { x0: 1.6, x1: 3.0, y0: 3.4, y1: 4.4 };
    showerHead = spec.extras.rainHead ? { x: 2.5, y: 7.2, kind: 'rain' } : { x: 2.5, y: 6.4, kind: 'wall' };
    valve = { x: 2.5, y: 2.8 };
    cursor = alcoveW + partitionW;
  }

  // Vanity on the right, with spare wall split between the middle and the right corner.
  const slack = roomW - needed;
  const vanityX1 = roomW - rightGap - Math.min(slack * 0.3, 1.6);
  const vanityX0 = vanityX1 - vanityW;
  const toilet = { cx: (cursor + vanityX0) / 2 };
  const floating = vanityKind === 'floating';
  const vanity: VanityLayout = {
    kind: vanityKind,
    x0: vanityX0,
    x1: vanityX1,
    depth: 1.75,
    bottom: floating ? 0.95 : 0,
    top: floating ? 2.75 : 2.83,
    sinks: vanityKind === 'double' ? [vanityX0 + vanityW * 0.27, vanityX1 - vanityW * 0.27] : [(vanityX0 + vanityX1) / 2],
  };

  // Mirrors over each sink; sconces either side (shared in the middle of a double).
  const perSink = vanityW / vanity.sinks.length;
  const mirrorW = Math.min(spec.extras.ledMirror ? 2.5 : 2.2, perSink * 0.72);
  const mirrorY0 = vanity.top + 1.0;
  const mirrorY1 = Math.min(C - 0.75, mirrorY0 + (spec.extras.ledMirror ? 3.0 : 2.8));
  const mirrors: Rect[] = vanity.sinks.map((cx) => ({ x0: cx - mirrorW / 2, x1: cx + mirrorW / 2, y0: mirrorY0, y1: mirrorY1 }));
  const sconceY = Math.min(C - 1.2, mirrorY0 + 1.65);
  const sconceXs: number[] = [mirrors[0].x0 - 0.42];
  for (let i = 1; i < mirrors.length; i++) sconceXs.push((mirrors[i - 1].x1 + mirrors[i].x0) / 2);
  sconceXs.push(mirrors[mirrors.length - 1].x1 + 0.42);
  const bathingRight = shower ? shower.x1 : alcove ? (alcove.partition?.x1 ?? alcove.x1) : 0;
  const sconces = sconceXs.filter((x) => x > bathingRight + 0.3 && x < roomW - 0.25).map((x) => ({ x, y: sconceY }));

  // Window: over a freestanding tub, otherwise on the right wall near the back.
  const right = frameEdgeDepths(camera).right;
  const winLen = Math.min(2.6, Math.max(1.2, camera.zBack - right - 1.2));
  const window: BathLayout['window'] = freestanding
    ? { wall: 'back', rect: { x0: freestanding.cx - 1.5, x1: freestanding.cx + 1.5, y0: 4.3, y1: 7.2 } }
    : { wall: 'right', z0: camera.zBack - 0.7 - winLen, z1: camera.zBack - 0.7, y0: 4.2, y1: 6.9 };

  // Towel: on a hook between the bathing zone and the vanity when there is wall for it.
  const towelGapX0 = bathingRight + 0.2;
  const towelGapX1 = toilet.cx - 1.15 - 0.2;
  // (A freestanding tub has its towel draped over the rim instead.)
  const towel = !freestanding && towelGapX1 - towelGapX0 >= 1.5 ? { x: (towelGapX0 + towelGapX1) / 2, y: 5.6 } : null;

  // Plant near the camera in the front-right corner, where the floor shows.
  const edges = frameEdgeDepths(camera);
  const plantZ = Math.max(edges.floor + 0.9, camera.zFront + 0.9, camera.zBack - roomD + 1);
  const plantVisibleRight = camera.camX + ((camera.frameW - camera.vpX) * plantZ) / camera.f;
  const plantX = Math.min(roomW - 0.7, plantVisibleRight - 0.45);
  const plant = plantZ < camera.zBack - vanity.depth - 1.2 && plantX > vanityX0 ? { x: plantX, z: plantZ } : null;

  // Ceiling cans: one over the shower or tub (its evening downlight), one over the vanity, one over a freestanding tub.
  const canZ = camera.zBack - Math.min(2.2, roomD * 0.3);
  const bathX = shower ? (shower.x0 + shower.x1) / 2 : alcove ? (alcove.x0 + alcove.x1) / 2 : roomW * 0.3;
  const bathDepth = shower?.depth ?? alcove?.depth ?? 2.4;
  const cans = [
    { x: bathX, z: camera.zBack - bathDepth / 2 },
    ...(freestanding ? [{ x: freestanding.cx, z: canZ }] : []),
    { x: (vanityX0 + vanityX1) / 2, z: canZ },
  ];

  return { camera, shower, alcove, freestanding, toilet, vanity, mirrors, sconces, window, niche, bench, showerHead, valve, towel, plant, cans };
}

/** A frame-space box (1200 x 800 frame units, before any close-up zoom). */
export type FrameBox = { x: number; y: number; w: number; h: number };

/** The parts of the picture a scope item renews, for the "this is what changes" highlight. */
export type BathArea = 'bathing' | 'vanity' | 'floor' | 'walls';

/** Where each area sits in the frame (unzoomed), from the layout. */
export function bathAreaBoxes(L: BathLayout): Record<BathArea, FrameBox> {
  const cam = L.camera;
  const zb = cam.zBack;
  const box = (a: Pt, b: Pt): FrameBox => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });
  const bathRight = L.freestanding
    ? L.freestanding.cx + L.freestanding.width / 2 + 0.4
    : L.shower
      ? L.shower.x1
      : (L.alcove?.partition?.x1 ?? L.alcove?.x1 ?? 4);
  const bathNear = zb - Math.max(L.shower?.depth ?? 0, L.alcove?.depth ?? 0, L.freestanding ? zb - L.freestanding.zFront : 0);
  const v = L.vanity;
  return {
    bathing: box(project(cam, 0, BATH_CEILING_FT - 0.3, zb), project(cam, bathRight, 0, bathNear)),
    vanity: box(project(cam, v.x0 - 0.1, (L.mirrors[0]?.y1 ?? v.top + 3) + 0.2, zb), project(cam, v.x1 + 0.1, 0, zb - v.depth)),
    floor: box(project(cam, 0, 0, zb), { x: cam.frameW, y: cam.frameH }),
    walls: box(project(cam, 0, BATH_CEILING_FT, zb), project(cam, cam.roomW, 0, zb)),
  };
}

/** Where a close-up looks (frame units): the shower wall for tile picks, the vanity otherwise. */
export function bathFocusPoint(L: BathLayout, target: 'shower' | 'vanity'): Pt {
  const cam = L.camera;
  if (target === 'shower') {
    const x0 = L.shower?.x0 ?? L.alcove?.x0 ?? 0;
    const x1 = L.shower?.x1 ?? L.alcove?.x1 ?? 4;
    const p = project(cam, (x0 + x1) / 2, 4.6, cam.zBack);
    return { x: p.x + 30, y: p.y };
  }
  const v = L.vanity;
  const p = project(cam, (v.x0 + v.x1) / 2, v.top + 0.9, cam.zBack);
  return { x: p.x - 60, y: p.y };
}

/** Every finite number in a layout (tests: no NaN / Infinity anywhere). */
export function layoutNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => layoutNumbers(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => layoutNumbers(v, out));
  return out;
}
