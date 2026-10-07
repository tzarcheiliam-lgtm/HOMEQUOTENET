/**
 * Page geometry for signing fields.
 *
 * Fields are stored as fractions (0..1) of the DISPLAYED page: the page as a viewer shows it,
 * i.e. after /Rotate and using the CropBox, origin at the TOP-LEFT, y growing downward.
 * That is the same space the browser editor draws in, so what the sender sees is what is stamped.
 * Only at stamping time are those fractions converted to PDF user space (below), which is where
 * rotated pages and non-zero box origins would otherwise shift fields.
 */
export type Rotation = 0 | 90 | 180 | 270;

export interface PageGeom {
  /** Displayed size in points (already swapped for 90/270). */
  width: number;
  height: number;
  rotation: Rotation;
  /** Unrotated visible box in PDF user space (the CropBox, or MediaBox). */
  box: { x: number; y: number; w: number; h: number };
}

export interface FractionRect { x: number; y: number; w: number; h: number }

export function normalizeRotation(angle: number): Rotation {
  const a = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
  return a as Rotation;
}

export function makePageGeom(box: { x: number; y: number; w: number; h: number }, rotationDeg: number): PageGeom {
  const rotation = normalizeRotation(rotationDeg);
  const swap = rotation === 90 || rotation === 270;
  return { box, rotation, width: swap ? box.h : box.w, height: swap ? box.w : box.h };
}

/** Displayed point (dx right, dy down, in points from the top-left) -> PDF user space. */
export function displayedToUser(g: PageGeom, dx: number, dy: number): { x: number; y: number } {
  const { x: bx, y: by, w, h } = g.box;
  switch (g.rotation) {
    case 0: return { x: bx + dx, y: by + h - dy };
    case 90: return { x: bx + dy, y: by + dx };
    case 180: return { x: bx + w - dx, y: by + dy };
    case 270: return { x: bx + w - dy, y: by + h - dx };
  }
}

/** PDF user-space point -> displayed point (dx right, dy down). */
export function userToDisplayed(g: PageGeom, ux: number, uy: number): { x: number; y: number } {
  const { x: bx, y: by, w, h } = g.box;
  switch (g.rotation) {
    case 0: return { x: ux - bx, y: by + h - uy };
    case 90: return { x: uy - by, y: ux - bx };
    case 180: return { x: bx + w - ux, y: uy - by };
    case 270: return { x: by + h - uy, y: bx + w - ux };
  }
}

/** A displayed-space fraction rectangle expressed for drawing: anchor = displayed bottom-left in user space. */
export interface Placement { x: number; y: number; width: number; height: number; rotateDeg: Rotation }

export function placeRect(g: PageGeom, r: FractionRect): Placement {
  const width = r.w * g.width;
  const height = r.h * g.height;
  const anchor = displayedToUser(g, r.x * g.width, (r.y + r.h) * g.height);
  return { x: anchor.x, y: anchor.y, width, height, rotateDeg: g.rotation };
}

/** A user-space rectangle (e.g. a form widget) -> displayed fraction rectangle, clamped to the page. */
export function userRectToFraction(g: PageGeom, ur: { x: number; y: number; w: number; h: number }): FractionRect {
  const a = userToDisplayed(g, ur.x, ur.y);
  const b = userToDisplayed(g, ur.x + ur.w, ur.y + ur.h);
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  return clampFraction({ x: x0 / g.width, y: y0 / g.height, w: (x1 - x0) / g.width, h: (y1 - y0) / g.height });
}

export function clampFraction(r: FractionRect): FractionRect {
  const w = Math.min(1, Math.max(0.002, r.w));
  const h = Math.min(1, Math.max(0.002, r.h));
  return { x: Math.min(1 - w, Math.max(0, r.x)), y: Math.min(1 - h, Math.max(0, r.y)), w, h };
}

/** Displayed-points rectangle (top-left origin) -> fraction rectangle. */
export function pointsToFraction(g: { width: number; height: number }, r: { x: number; y: number; w: number; h: number }): FractionRect {
  return clampFraction({ x: r.x / g.width, y: r.y / g.height, w: r.w / g.width, h: r.h / g.height });
}
