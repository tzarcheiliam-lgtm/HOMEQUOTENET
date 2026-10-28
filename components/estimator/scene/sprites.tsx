import type { ReactNode } from 'react';
import { SPRITES } from '@/lib/estimator/scene/textures';
import { SCENE, type SpriteId } from '@/lib/estimator/scene/types';
import { rng } from './textures';

/**
 * Top-down objects for the live pool scene. Each one is drawn in local
 * coordinates (0,0 = top-left of its box) so the caller can move it with a
 * transform (and the move can animate). When SPRITES[id].src is set the image
 * is used instead of the vector drawing. Shadows are drawn separately
 * (ObjectShadow), in one pass under every object, offset away from a sun high
 * in the upper left, like the drone photos.
 */

const FT = SCENE.pxPerFt;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Shadow offset for something `heightFt` tall (sun high in the upper left). */
export function cast(heightFt: number): { dx: number; dy: number } {
  return { dx: r1(heightFt * 3.4), dy: r1(heightFt * 2.7) };
}

/** A circle as path data, so many circles can share one <path>. */
export function circlePath(cx: number, cy: number, r: number): string {
  return `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0`;
}

/** The sprite image, fitted into the box, or null when it is not generated yet. */
export function SpriteImage({ id, w, h, rotate = 0, filter }: { id: SpriteId; w: number; h: number; rotate?: 0 | 90; filter?: string }) {
  const src = SPRITES[id].src;
  if (!src) return null;
  if (rotate === 90) {
    return (
      <g transform={`translate(${r1(w)} 0) rotate(90)`} filter={filter}>
        <image href={src} width={h} height={w} preserveAspectRatio="xMidYMid meet" />
      </g>
    );
  }
  return <image href={src} width={w} height={h} preserveAspectRatio="xMidYMid meet" filter={filter} />;
}

/* ------------------------------ loungers ------------------------------ */

/** Deck chaise (woven frame, thick cushion), head (raised back) at the top. */
export function Lounger({ w, h }: { w: number; h: number }) {
  const back = h * 0.36;
  const weave: string[] = [];
  for (let y = 3; y < h - 2; y += 2.2) weave.push(`M1 ${r1(y)}h${r1(w - 2)}`);
  return (
    <g>
      <rect width={w} height={h} rx={3.5} fill="#b89a74" />
      <path d={weave.join('')} stroke="#8f7352" strokeOpacity={0.35} strokeWidth={0.6} />
      <rect x={2.4} y={2.6} width={w - 4.8} height={back - 3.4} rx={3} fill="#f6f2ea" />
      <rect x={2.4} y={back + 0.8} width={w - 4.8} height={h - back - 3.4} rx={3} fill="#ece6da" />
      <rect x={2.4} y={2.6} width={w - 4.8} height={back * 0.4} rx={3} fill="#ffffff" opacity={0.7} />
      <path d={`M2.4 ${r1(back - 0.4)}H${r1(w - 2.4)}`} stroke="#5a4630" strokeOpacity={0.35} strokeWidth={1.3} />
      <path d={`M${r1(w * 0.33)} ${r1(back + 4)}V${r1(h - 5)}M${r1(w * 0.67)} ${r1(back + 4)}V${r1(h - 5)}`} stroke="#000" strokeOpacity={0.05} strokeWidth={0.8} />
      <rect x={3.5} y={h * 0.6} width={w - 7} height={h * 0.17} rx={1.5} fill="#3f6f9a" opacity={0.85} />
      <path d={`M3.5 ${r1(h * 0.63)}h${r1(w - 7)}M3.5 ${r1(h * 0.74)}h${r1(w - 7)}`} stroke="#fff" strokeOpacity={0.6} strokeWidth={0.8} />
    </g>
  );
}

/** Sculpted one-piece in-water lounger (Baja shelf), lying along x with the back on the left. */
export function ShelfLounger({ w, h }: { w: number; h: number }) {
  if (SPRITES.lounger.src) {
    // The sprite stands upright with the back at the top: turn it to lie along x, back on the left.
    return (
      <g transform={`translate(0 ${r1(h)}) rotate(-90)`}>
        <image href={SPRITES.lounger.src} width={h} height={w} preserveAspectRatio="xMidYMid meet" />
      </g>
    );
  }
  const d = `M${r1(w * 0.06)} ${r1(h * 0.12)}C${r1(w * 0.25)} ${r1(-h * 0.02)} ${r1(w * 0.55)} ${r1(h * 0.16)} ${r1(w * 0.75)} ${r1(h * 0.1)}C${r1(w * 0.92)} ${r1(h * 0.05)} ${r1(w)} ${r1(h * 0.25)} ${r1(w)} ${r1(h * 0.5)}C${r1(w)} ${r1(h * 0.75)} ${r1(w * 0.92)} ${r1(h * 0.95)} ${r1(w * 0.75)} ${r1(h * 0.9)}C${r1(w * 0.55)} ${r1(h * 0.84)} ${r1(w * 0.25)} ${r1(h * 1.02)} ${r1(w * 0.06)} ${r1(h * 0.88)}C${r1(-w * 0.02)} ${r1(h * 0.8)} ${r1(-w * 0.02)} ${r1(h * 0.2)} ${r1(w * 0.06)} ${r1(h * 0.12)}Z`;
  return (
    <g>
      <path d={d} fill="#f7f9f9" />
      <path d={`M${r1(w * 0.36)} ${r1(h * 0.2)}C${r1(w * 0.33)} ${r1(h * 0.45)} ${r1(w * 0.33)} ${r1(h * 0.55)} ${r1(w * 0.36)} ${r1(h * 0.8)}`} stroke="#9fb9be" strokeWidth={1.2} fill="none" opacity={0.6} />
      <path d={d} fill="none" stroke="#c9d6d8" strokeWidth={0.8} />
      <ellipse cx={w * 0.17} cy={h / 2} rx={w * 0.09} ry={h * 0.3} fill="#fff" />
    </g>
  );
}

/* ------------------------------ umbrella ------------------------------ */

export function Umbrella({ d, color = '#2e5a92' }: { d: number; color?: string }) {
  if (SPRITES.umbrella.src) return <SpriteImage id="umbrella" w={d} h={d} />;
  const r = d / 2;
  const n = 8;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2 + Math.PI / n;
    return [r + Math.cos(a) * r, r + Math.sin(a) * r] as const;
  });
  return (
    <g>
      {pts.map((p, i) => {
        const q = pts[(i + 1) % n];
        // Panels facing the sun (upper left) are lighter.
        const mid = Math.atan2((p[1] + q[1]) / 2 - r, (p[0] + q[0]) / 2 - r);
        const lit = Math.cos(mid - (-Math.PI * 3) / 4);
        return <path key={i} d={`M${r1(r)} ${r1(r)}L${r1(p[0])} ${r1(p[1])}L${r1(q[0])} ${r1(q[1])}Z`} fill={color} opacity={0.82 + lit * 0.18} />;
      })}
      <path d={`M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}Z`} fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth={1.2} />
      {pts.map((p, i) => (
        <path key={`rib${i}`} d={`M${r1(r)} ${r1(r)}L${r1(p[0])} ${r1(p[1])}`} stroke="#fff" strokeOpacity={0.22} strokeWidth={0.8} />
      ))}
      <circle cx={r} cy={r} r={2.6} fill="#f3f1ec" />
    </g>
  );
}

/* ------------------------------ plants ------------------------------ */

type Blob = { x: number; y: number; r: number };

function blobs(seed: number, count: number, spread: number, rMin: number, rMax: number, ox = 0, oy = 0): Blob[] {
  const rand = rng(seed);
  return Array.from({ length: count }, () => {
    const a = rand() * Math.PI * 2;
    const dist = Math.sqrt(rand()) * spread;
    return { x: Math.cos(a) * dist + ox, y: Math.sin(a) * dist + oy, r: rMin + rand() * (rMax - rMin) };
  });
}

const blobPath = (list: Blob[], cx: number, cy: number) => list.map((b) => circlePath(cx + b.x, cy + b.y, b.r)).join('');

/** Olive tree canopy seen from above: silvery green, lit from the upper left. */
export function OliveTree({ d, seed }: { d: number; seed: number }) {
  if (SPRITES.olive_tree.src) return <SpriteImage id="olive_tree" w={d} h={d} />;
  const c = d / 2;
  const base = blobs(seed, 13, d * 0.28, d * 0.12, d * 0.2);
  const mid = blobs(seed + 1, 26, d * 0.32, d * 0.06, d * 0.11, -d * 0.03, -d * 0.03);
  const hi = blobs(seed + 2, 24, d * 0.3, d * 0.03, d * 0.065, -d * 0.07, -d * 0.07);
  const dark = blobs(seed + 3, 10, d * 0.3, d * 0.02, d * 0.035, d * 0.04, d * 0.05);
  return (
    <g>
      <path d={blobPath(base, c, c)} fill="#56653f" />
      <path d={blobPath(mid, c, c)} fill="#77885a" />
      <path d={blobPath(hi, c, c)} fill="#a4b285" />
      <path d={blobPath(hi.slice(0, 9), c - d * 0.02, c - d * 0.02)} fill="#c3cda6" opacity={0.7} />
      <path d={blobPath(dark, c, c)} fill="#3e4a2e" opacity={0.65} />
    </g>
  );
}

/** Shadow shape for a tree (its base canopy). */
export function treeShadowPath(d: number, seed: number, x: number, y: number): string {
  return blobPath(blobs(seed, 13, d * 0.28, d * 0.12, d * 0.2), x + d / 2, y + d / 2);
}

/** Ornamental grass clump (blue fescue / feather grass) as a starburst. */
function grassPath(cx: number, cy: number, r: number, seed: number): string {
  const rand = rng(seed);
  const n = 14;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.4;
    const len = r * (0.6 + rand() * 0.45);
    d += `M${r1(cx)} ${r1(cy)}L${r1(cx + Math.cos(a) * len)} ${r1(cy + Math.sin(a) * len)}`;
  }
  return d;
}

/**
 * A landscape strip along a wall: a planted bed (turf yards) or a clipped
 * hedge (existing yards). Drawn as a few shared paths to keep the DOM small.
 */
export function Bed({ x, y, w, h, kind, seed, bedFill }: { x: number; y: number; w: number; h: number; kind: 'planted' | 'hedge'; seed: number; bedFill: string }) {
  const vertical = h > w;
  const len = vertical ? h : w;
  const thick = vertical ? w : h;
  const at = (t: number, across: number) => (vertical ? { x: x + across, y: y + t } : { x: x + t, y: y + across });
  const rand = rng(seed);
  const shrubSrc = SPRITES.shrub.src;
  if (kind === 'hedge') {
    // A clipped hedge: overlapping shrubs on a dark base, casting a short shadow.
    const sh = cast(5);
    const base: string[] = [];
    const tops: { x: number; y: number; r: number }[] = [];
    for (let t = thick * 0.35; t < len - thick * 0.25; t += thick * 0.5) {
      const p = at(t, thick * (0.48 + (rand() - 0.5) * 0.12));
      const r = thick * (0.56 + rand() * 0.1);
      base.push(circlePath(p.x, p.y, r * 0.92));
      tops.push({ x: p.x, y: p.y, r });
    }
    const shadow = vertical ? { x: x + sh.dx * 0.6, y, w, h } : { x, y: y + sh.dy * 0.6, w, h };
    return (
      <g>
        <rect x={shadow.x} y={shadow.y} width={shadow.w} height={shadow.h} fill="#0b1c22" opacity={0.22} />
        <path d={base.join('')} fill="#35592a" />
        {shrubSrc ? (
          <g opacity={0.88}>
            {tops.map((p, i) => (
              <image key={i} href={shrubSrc} x={r1(p.x - p.r)} y={r1(p.y - p.r)} width={r1(2 * p.r)} height={r1(2 * p.r)} />
            ))}
          </g>
        ) : (
          <>
            <path d={tops.map((p) => circlePath(p.x - p.r * 0.15, p.y - p.r * 0.15, p.r * 0.7)).join('')} fill="#4f7f37" />
            <path d={tops.map((p) => circlePath(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.32)).join('')} fill="#6f9c4c" opacity={0.85} />
          </>
        )}
      </g>
    );
  }
  const grasses: string[] = [];
  const shrubs: { x: number; y: number; r: number }[] = [];
  const step = FT * 2.3;
  let i = 0;
  for (let t = step * 0.6; t < len - step * 0.4; t += step, i++) {
    const p = at(t + (rand() - 0.5) * 6, thick * (0.5 + (rand() - 0.5) * 0.25));
    if (i % 3 === 1) shrubs.push({ x: p.x, y: p.y, r: thick * (0.38 + rand() * 0.08) });
    else grasses.push(grassPath(p.x, p.y, thick * 0.4, seed + i));
  }
  const sh = cast(2.5);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={bedFill} />
      <path d={shrubs.map((p) => circlePath(p.x + sh.dx, p.y + sh.dy, p.r * 0.9)).join('')} fill="#0b1c22" opacity={0.25} />
      <path d={grasses.join('')} stroke="#5f7a68" strokeWidth={1.4} strokeLinecap="round" transform="translate(1 1)" opacity={0.6} />
      <path d={grasses.join('')} stroke="#a9bfae" strokeWidth={1.1} strokeLinecap="round" />
      {shrubSrc ? (
        shrubs.map((p, j) => <image key={j} href={shrubSrc} x={r1(p.x - p.r)} y={r1(p.y - p.r)} width={r1(2 * p.r)} height={r1(2 * p.r)} />)
      ) : (
        <>
          <path d={shrubs.map((p) => circlePath(p.x, p.y, p.r)).join('')} fill="#4d7a3a" />
          <path d={shrubs.map((p) => circlePath(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.5)).join('')} fill="#77a157" />
        </>
      )}
    </g>
  );
}

/* ------------------------------ kitchen ------------------------------ */

/** Outdoor kitchen against a side wall (variant: which wall), with bar stools in front. */
export function Kitchen({ w, h, side, counterFill }: { w: number; h: number; side: string; counterFill: string }) {
  const depth = 3 * FT;
  const cx = w - depth; // counter starts here when it backs onto the right wall
  const body = SPRITES.outdoor_kitchen.src ? (
    <g transform={`translate(${r1(cx)} 0)`}>
      <SpriteImage id="outdoor_kitchen" w={depth} h={h} rotate={90} />
    </g>
  ) : (
    <g>
      <rect x={cx} y={0} width={depth} height={h} rx={2} fill={counterFill} />
      <rect x={cx} y={0} width={depth} height={h} rx={2} fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth={1.2} />
      <path d={`M${r1(cx + 1)} 2V${r1(h - 2)}`} stroke="#fff" strokeOpacity={0.5} strokeWidth={1.2} />
      {/* grill */}
      <rect x={cx + 5} y={h * 0.14} width={depth - 10} height={FT * 3.2} rx={3} fill="#a6acb2" />
      <rect x={cx + 7} y={h * 0.14 + 2} width={depth - 14} height={FT * 3.2 - 4} rx={2} fill="#c7ccd0" />
      <path d={`M${r1(cx + 7)} ${r1(h * 0.14 + FT * 1.6)}H${r1(cx + depth - 7)}`} stroke="#7b8187" strokeWidth={1.2} />
      <path d={`M${r1(cx + 6)} ${r1(h * 0.14 + 4)}v${r1(FT * 3.2 - 8)}`} stroke="#5f656b" strokeWidth={1.6} strokeLinecap="round" />
      {/* side burner and sink */}
      <circle cx={cx + depth / 2} cy={h * 0.14 + FT * 4.3} r={5} fill="#3d4246" />
      <circle cx={cx + depth / 2} cy={h * 0.14 + FT * 4.3} r={2.6} fill="#5c6267" />
      <rect x={cx + 9} y={h * 0.66} width={depth - 18} height={FT * 1.6} rx={3} fill="#8f989e" />
      <rect x={cx + 11} y={h * 0.66 + 2} width={depth - 22} height={FT * 1.6 - 4} rx={2} fill="#b6bec3" />
      <circle cx={cx + depth - 7} cy={h * 0.66 + FT * 0.8} r={1.8} fill="#6d757b" />
    </g>
  );
  const stools = [0.42, 0.58, 0.74, 0.9].map((t, i) => (
    <g key={i}>
      <circle cx={cx - FT * 0.85} cy={h * t} r={FT * 0.62} fill="#3b3a38" />
      <circle cx={cx - FT * 0.85 - 1} cy={h * t - 1} r={FT * 0.45} fill="#55524e" />
    </g>
  ));
  const content = (
    <g>
      {body}
      {stools}
    </g>
  );
  return side === 'left' ? <g transform={`translate(${r1(w)} 0) scale(-1 1)`}>{content}</g> : content;
}

/* ---------------------------- patio cover ---------------------------- */

/**
 * Patio cover attached to the house: a lounge set on a paved pad under white
 * aluminium louvers. The slats' shadow stripes are drawn in the shadow pass
 * (PatioCoverShadow) so they land on the ground around it too.
 */
export function PatioCover({ w, h, padFill, night }: { w: number; h: number; padFill: string; night: boolean }) {
  const beam = 6;
  const slats: ReactNode[] = [];
  for (let y = beam + 4; y < h - beam - 2; y += FT * 0.9) {
    slats.push(<rect key={y} x={beam} y={y} width={w - 2 * beam} height={FT * 0.42} fill="#f3f2ef" />);
    slats.push(<rect key={`s${y}`} x={beam} y={y + FT * 0.32} width={w - 2 * beam} height={FT * 0.1} fill="#000" opacity={0.12} />);
  }
  return (
    <g>
      <rect width={w} height={h} fill={padFill} />
      <PatioSet w={w} h={h} />
      <g opacity={night ? 0.6 : 0.95}>{slats}</g>
      <rect x={beam / 2} y={0} width={w - beam} height={h - beam / 2} fill="none" stroke="#e7e5e0" strokeWidth={beam} />
      <rect x={beam / 2} y={0} width={w - beam} height={h - beam / 2} fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={1} />
      {[
        [0, h - beam * 1.6],
        [w - beam * 1.6, h - beam * 1.6],
      ].map(([px, py], i) => (
        <rect key={i} x={px} y={py} width={beam * 1.6} height={beam * 1.6} fill="#d9d6d0" stroke="#000" strokeOpacity={0.2} strokeWidth={0.8} />
      ))}
    </g>
  );
}

/** Sectional sofa, coffee table and rug (under the patio cover). */
function PatioSet({ w, h }: { w: number; h: number }) {
  if (SPRITES.patio_set.src) {
    const sw = Math.min(w * 0.8, SPRITES.patio_set.widthFt * FT);
    const sh = Math.min(h * 0.8, SPRITES.patio_set.heightFt * FT);
    return (
      <g transform={`translate(${r1((w - sw) / 2)} ${r1((h - sh) / 2)})`}>
        <SpriteImage id="patio_set" w={sw} h={sh} />
      </g>
    );
  }
  const x0 = w * 0.14;
  const y0 = h * 0.18;
  const sw = w * 0.72;
  const sh = h * 0.62;
  const seat = FT * 2.6;
  return (
    <g>
      <rect x={x0 + seat * 0.6} y={y0 + seat * 0.6} width={sw - seat * 0.9} height={sh - seat * 0.9} rx={3} fill="#d9d0c0" opacity={0.85} />
      {/* L-sectional: back along the top and left */}
      <rect x={x0} y={y0} width={sw} height={seat} rx={4} fill="#8d8174" />
      <rect x={x0} y={y0} width={seat} height={sh} rx={4} fill="#8d8174" />
      <rect x={x0 + 4} y={y0 + 7} width={sw - 8} height={seat - 10} rx={3} fill="#efebe3" />
      <rect x={x0 + 7} y={y0 + 4} width={seat - 10} height={sh - 8} rx={3} fill="#efebe3" />
      {[0.3, 0.55, 0.8].map((t) => (
        <path key={t} d={`M${r1(x0 + sw * t)} ${r1(y0 + 8)}v${r1(seat - 12)}`} stroke="#000" strokeOpacity={0.1} strokeWidth={1} />
      ))}
      <rect x={x0 + seat + FT * 1.4} y={y0 + seat + FT * 1.2} width={FT * 4} height={FT * 2.4} rx={2} fill="#8b6a49" />
      <rect x={x0 + seat + FT * 1.4} y={y0 + seat + FT * 1.2} width={FT * 4} height={FT * 0.6} rx={2} fill="#a17e5a" />
      <circle cx={x0 + sw - FT * 1.4} cy={y0 + sh - FT * 1.2} r={FT * 1.1} fill="#e8e2d6" stroke="#8d8174" strokeWidth={2} />
    </g>
  );
}

/** Slat shadow stripes cast by the patio cover (sun upper left). */
export function PatioCoverShadow({ w, h }: { w: number; h: number }) {
  const { dx, dy } = cast(9);
  const stripes: string[] = [];
  for (let y = 10; y < h - 8; y += FT * 0.9) stripes.push(`M${r1(dx + 6)} ${r1(y + dy)}h${r1(w - 12)}v${r1(FT * 0.42)}h${r1(-(w - 12))}Z`);
  return (
    <g>
      <path d={stripes.join('')} fill="#10202a" opacity={0.2} />
      <rect x={dx} y={dy} width={w} height={h} fill="none" stroke="#10202a" strokeOpacity={0.22} strokeWidth={6} />
    </g>
  );
}

/* ------------------------------ fire pit ------------------------------ */

export function FirePit({ d, gravelFill, stoneFill }: { d: number; gravelFill: string; stoneFill: string }) {
  const c = d / 2;
  const pitR = Math.min(2.4 * FT, d * 0.19);
  const chairs = [45, 135, 225, 315].map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const dist = d * 0.33;
    const cw = FT * 2.5;
    return (
      <g key={i} transform={`translate(${r1(c + Math.cos(a) * dist)} ${r1(c + Math.sin(a) * dist)}) rotate(${deg + 90})`}>
        <rect x={-cw / 2} y={-cw / 2} width={cw} height={cw} rx={4} fill="#8a6c4f" />
        <rect x={-cw / 2 + 3} y={-cw / 2 + 6} width={cw - 6} height={cw - 9} rx={3} fill="#eee8dc" />
      </g>
    );
  });
  return (
    <g>
      <circle cx={c} cy={c} r={c - 1} fill={gravelFill} />
      <circle cx={c} cy={c} r={c - 1} fill="none" stroke="#5f5346" strokeWidth={1.6} opacity={0.7} />
      {chairs}
      {SPRITES.fire_pit.src ? (
        <g transform={`translate(${r1(c - pitR)} ${r1(c - pitR)})`}>
          <SpriteImage id="fire_pit" w={pitR * 2} h={pitR * 2} />
        </g>
      ) : (
        <g>
          <circle cx={c} cy={c} r={pitR} fill={stoneFill} />
          <circle cx={c} cy={c} r={pitR} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={1} />
          <circle cx={c} cy={c} r={pitR * 0.66} fill="#2b2522" />
          <Flame cx={c} cy={c} r={pitR * 0.55} />
        </g>
      )}
    </g>
  );
}

/** Flickering fire seen from above: a hot core with a few tongues. */
export function Flame({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const tongues = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    return circlePath(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45, r * 0.34);
  });
  return (
    <g className="ps-flicker">
      <path d={tongues.join('')} fill="#ff8a1f" opacity={0.85} />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#ffc53d" />
      <circle cx={cx - r * 0.1} cy={cy - r * 0.1} r={r * 0.28} fill="#fff1b8" />
    </g>
  );
}

/* ------------------------------- bowls ------------------------------- */

export function FireBowl({ r }: { r: number }) {
  if (SPRITES.fire_bowl.src) return <SpriteImage id="fire_bowl" w={r * 2} h={r * 2} />;
  return (
    <g>
      <circle cx={r} cy={r} r={r} fill="#cfcac1" />
      <circle cx={r} cy={r} r={r} fill="none" stroke="#000" strokeOpacity={0.22} strokeWidth={1} />
      <circle cx={r - r * 0.08} cy={r - r * 0.08} r={r * 0.92} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.2} />
      <circle cx={r} cy={r} r={r * 0.72} fill="#3a332e" />
      <Flame cx={r} cy={r} r={r * 0.58} />
    </g>
  );
}

export function WaterBowl({ r }: { r: number }) {
  if (SPRITES.water_bowl.src) return <SpriteImage id="water_bowl" w={r * 2} h={r * 2} />;
  return (
    <g>
      <circle cx={r} cy={r} r={r} fill="#9a5a33" />
      <circle cx={r - r * 0.06} cy={r - r * 0.06} r={r * 0.93} fill="#b8743f" />
      <circle cx={r} cy={r} r={r * 0.76} fill="#4fc0d2" />
      <circle cx={r - r * 0.18} cy={r - r * 0.2} r={r * 0.36} fill="#bff3f8" opacity={0.55} />
      <circle cx={r} cy={r} r={r * 0.76} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1} />
    </g>
  );
}
