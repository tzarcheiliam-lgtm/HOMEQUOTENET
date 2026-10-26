/**
 * ADU_LAYERS: the one config map behind the live preview. Every layer of the
 * image points to EITHER a clean flat SVG illustration (the built-in default,
 * so the page works with zero image assets) OR a transparent PNG/WebP file you
 * supply later. Swap art by editing this map only; no quiz logic changes.
 *
 * All layers share one 900 x 520 canvas and are stacked in this order:
 *   base      the lot and the main house
 *   body      the ADU (varies by placement + size + style)
 *   color     optional tint overlay (only used when a body override is a real render)
 *   extras    solar, porch, landscaping, large windows
 *
 * To use real renders, set a path (served from /public, 900 x 520, transparent):
 *   ADU_LAYERS.base.src          = '/adu-quiz/layers/base.webp'
 *   ADU_LAYERS.body.overrides    = { 'backyard:1br:modern': '/adu-quiz/layers/body-backyard-1br-modern.webp', ... }
 *   ADU_LAYERS.color.overrides   = { sage: '/adu-quiz/layers/color-sage.webp', ... }
 *   ADU_LAYERS.extras.solar.src  = '/adu-quiz/layers/extra-solar.webp'   (and porch, landscaping, large_windows)
 * The full list of files is in docs/adu-quiz.md.
 */
import { useId, type ComponentType } from 'react';
import type { ResolvedDesign } from '@/lib/adu-quiz/design';

export const CANVAS = { w: 900, h: 520 } as const;

type Rect = { x: number; y: number; w: number; h: number };
export type LayerProps = { design: ResolvedDesign; geo: Rect };
type LayerRef = { src: string | null; Svg: ComponentType<LayerProps> };

/* ------------------------------ geometry ------------------------------ */

const WIDTH: Record<string, number> = { studio: 100, '1br': 130, '2br': 160, '3br': 190 };
const WINDOWS: Record<string, number> = { studio: 1, '1br': 2, '2br': 3, '3br': 4 };
const GROUND = 400;
/** The main house, fixed. The attached garage sits to its right. */
export const HOUSE = { x: 220, y: 240, w: 250, h: 160 } as const;
export const GARAGE = { x: 470, y: 282, w: 150, h: 118 } as const;

/** Wall rectangle of the ADU for a placement and size. */
export function geometry(placement: string, size: string): Rect {
  const w = WIDTH[size] ?? 130;
  if (placement === 'garage_conversion') return { ...GARAGE };
  if (placement === 'above_garage') return { x: GARAGE.x, y: 190, w: GARAGE.w, h: 92 };
  if (placement === 'attached') return { x: HOUSE.x - w, y: 290, w, h: GROUND - 290 };
  return { x: 670, y: 290, w, h: 105 }; // backyard
}

const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const pts = (list: [number, number][]) => list.map((p) => p.join(',')).join(' ');

const ROOF_COLOR: Record<string, string> = { modern: '#3e444c', craftsman: '#6a4a38', mediterranean: '#b4583a', farmhouse: '#2b3036' };

/* -------------------------------- base -------------------------------- */

function BaseScene() {
  const id = useId();
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfdcf2" />
          <stop offset="1" stopColor="#eef6fb" />
        </linearGradient>
      </defs>
      <rect width={CANVAS.w} height={CANVAS.h} fill={`url(#${id}-sky)`} />
      <circle cx="790" cy="78" r="34" fill="#ffe9a8" opacity=".9" />
      <g fill="#fff" opacity=".85">
        <ellipse cx="150" cy="90" rx="62" ry="17" /><ellipse cx="195" cy="80" rx="38" ry="15" />
        <ellipse cx="560" cy="60" rx="55" ry="14" /><ellipse cx="600" cy="52" rx="32" ry="12" />
      </g>
      <path d="M0 330 Q120 270 260 320 T520 310 T760 300 T900 320 V400 H0Z" fill="#a9c9b0" opacity=".7" />
      {/* lawn, driveway, sidewalk */}
      <rect y={GROUND - 6} width={CANVAS.w} height={CANVAS.h - GROUND + 6} fill="#9ccf84" />
      <rect y={GROUND - 6} width={CANVAS.w} height="40" fill="#8cc275" />
      <polygon points="488,400 604,400 650,520 440,520" fill="#cfd3d6" />
      <rect y="486" width={CANVAS.w} height="16" fill="#e6e8ea" />
      {/* backyard fence */}
      <rect x="640" y="342" width="260" height="58" fill="#d9c5a0" />
      {Array.from({ length: 14 }, (_, i) => <rect key={i} x={646 + i * 19} y="338" width="3" height="62" fill="#c4ae86" />)}
      <rect x="640" y="352" width="260" height="3" fill="#c4ae86" /><rect x="640" y="380" width="260" height="3" fill="#c4ae86" />
      {/* main house */}
      <rect {...HOUSE} fill="#ebe0cf" />
      <polygon points={pts([[HOUSE.x - 16, HOUSE.y], [HOUSE.x + HOUSE.w / 2, HOUSE.y - 72], [HOUSE.x + HOUSE.w + 16, HOUSE.y]])} fill="#6d6965" />
      <rect x={HOUSE.x + 28} y="272" width="48" height="52" fill="#bcd9ec" stroke="#8a7f70" strokeWidth="3" />
      <rect x={HOUSE.x + 160} y="272" width="48" height="52" fill="#bcd9ec" stroke="#8a7f70" strokeWidth="3" />
      <rect x={HOUSE.x + 96} y="326" width="34" height="74" fill="#5b6b8c" />
      <circle cx={HOUSE.x + 123} cy="364" r="2.5" fill="#f5b700" />
      {/* attached garage */}
      <rect {...GARAGE} fill="#ebe0cf" />
      <rect x={GARAGE.x - 8} y={GARAGE.y - 14} width={GARAGE.w + 16} height="14" fill="#6d6965" />
      <rect x={GARAGE.x + 18} y="312" width={GARAGE.w - 36} height="88" fill="#d8cfbf" stroke="#bdb3a1" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={GARAGE.x + 18} y={312 + i * 22} width={GARAGE.w - 36} height="2" fill="#bdb3a1" />)}
    </g>
  );
}

/* ------------------------------- ADU body ------------------------------- */

function Material({ id, type, x, y, w, h }: { id: string; type: string; x: number; y: number; w: number; h: number }) {
  if (type === 'wood') {
    return <g stroke="#000" strokeOpacity=".13" strokeWidth="1.4">{Array.from({ length: Math.floor(h / 9) }, (_, i) => <line key={i} x1={x} x2={x + w} y1={y + 9 + i * 9} y2={y + 9 + i * 9} />)}</g>;
  }
  if (type === 'board_batten') {
    return <g stroke="#000" strokeOpacity=".16" strokeWidth="2">{Array.from({ length: Math.floor(w / 14) }, (_, i) => <line key={i} x1={x + 7 + i * 14} x2={x + 7 + i * 14} y1={y} y2={y + h} />)}</g>;
  }
  // stucco: fine speckle
  return (
    <g fill="#000" fillOpacity=".1">
      {Array.from({ length: Math.floor((w * h) / 70) }, (_, i) => {
        const a = (i * 9301 + 49297) % 233280; const b = (i * 7919 + 12345) % 233280;
        return <circle key={`${id}-${i}`} cx={x + (a / 233280) * w} cy={y + (b / 233280) * h} r="0.9" />;
      })}
    </g>
  );
}

function Win({ style, x, y, w, h, trim }: { style: string; x: number; y: number; w: number; h: number; trim: string }) {
  const glass = '#bcd9ec';
  if (style === 'mediterranean') {
    const r = w / 2;
    return <path d={`M${x} ${y + h} V${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h}Z`} fill={glass} stroke={trim === '#3b4048' ? '#6b4a3a' : '#f4efe6'} strokeWidth="3" />;
  }
  if (style === 'craftsman') {
    return <g><rect x={x} y={y} width={w} height={h} fill={glass} stroke="#f4efe6" strokeWidth="3" /><line x1={x + w / 3} x2={x + w / 3} y1={y} y2={y + h * 0.45} stroke="#f4efe6" strokeWidth="2" /><line x1={x + (2 * w) / 3} x2={x + (2 * w) / 3} y1={y} y2={y + h * 0.45} stroke="#f4efe6" strokeWidth="2" /><line x1={x} x2={x + w} y1={y + h * 0.45} y2={y + h * 0.45} stroke="#f4efe6" strokeWidth="2" /></g>;
  }
  if (style === 'farmhouse') {
    return <g><rect x={x} y={y} width={w} height={h} fill={glass} stroke="#1f2329" strokeWidth="3.5" /><line x1={x + w / 2} x2={x + w / 2} y1={y} y2={y + h} stroke="#1f2329" strokeWidth="2.5" /><line x1={x} x2={x + w} y1={y + h / 2} y2={y + h / 2} stroke="#1f2329" strokeWidth="2.5" /></g>;
  }
  return <rect x={x} y={y} width={w} height={h} fill={glass} stroke="#1f2933" strokeWidth="2.5" />; // modern
}

function Roof({ style, x, y0, w, h }: { style: string; x: number; y0: number; w: number; h: number }) {
  const c = ROOF_COLOR[style] ?? '#3e444c';
  if (style === 'craftsman') {
    const apex: [number, number] = [x + w / 2, y0 - Math.max(34, h * 0.5)];
    return <g><polygon points={pts([[x - 14, y0], apex, [x + w + 14, y0]])} fill={c} />{Array.from({ length: 5 }, (_, i) => <rect key={i} x={x - 12 + i * ((w + 24) / 4) - 2} y={y0 - 2} width="4" height="7" fill="#4a3426" />)}</g>;
  }
  if (style === 'mediterranean') {
    const top = y0 - Math.max(24, h * 0.28);
    return <g><polygon points={pts([[x - 10, y0], [x + 20, top], [x + w - 20, top], [x + w + 10, y0]])} fill={c} />{Array.from({ length: 4 }, (_, i) => <line key={i} x1={x - 6 + i * 6} x2={x + w + 6 - i * 6} y1={y0 - i * ((y0 - top) / 4) - 2} y2={y0 - i * ((y0 - top) / 4) - 2} stroke="#8e3f27" strokeWidth="2" />)}</g>;
  }
  if (style === 'farmhouse') {
    const apex: [number, number] = [x + w / 2, y0 - Math.max(44, h * 0.68)];
    return <g><polygon points={pts([[x - 8, y0], apex, [x + w + 8, y0]])} fill={c} /><line x1={x - 8} y1={y0} x2={apex[0]} y2={apex[1]} stroke="#4b525a" strokeWidth="2" /><line x1={x + w + 8} y1={y0} x2={apex[0]} y2={apex[1]} stroke="#4b525a" strokeWidth="2" /></g>;
  }
  return <g><polygon points={pts([[x - 8, y0], [x - 8, y0 - 24], [x + w + 8, y0 - 10], [x + w + 8, y0]])} fill={c} /><rect x={x - 8} y={y0 - 3} width={w + 16} height="3" fill="#2a2f35" /></g>; // modern shed
}

/** Where solar panels sit for each roof style. Returns a quad (4 points). */
function solarQuad(style: string, x: number, y0: number, w: number, h: number): [number, number][] {
  if (style === 'craftsman' || style === 'farmhouse') {
    const rise = style === 'craftsman' ? Math.max(34, h * 0.5) : Math.max(44, h * 0.68);
    const apex: [number, number] = [x + w / 2, y0 - rise];
    const eave: [number, number] = [x + w + (style === 'craftsman' ? 14 : 8), y0];
    const q1 = lerp(apex, eave, 0.22); const q2 = lerp(apex, eave, 0.78);
    const d: [number, number] = [-7, Math.min(24, rise * 0.55)];
    return [[q1[0] + 2, q1[1] + 4], [q2[0], q2[1] - 2], [q2[0] + d[0], q2[1] + d[1]], [q1[0] + d[0] + 2, q1[1] + d[1]]];
  }
  if (style === 'mediterranean') {
    const top = y0 - Math.max(24, h * 0.28);
    return [[x + w * 0.24, top + 4], [x + w * 0.76, top + 4], [x + w * 0.8, y0 - 4], [x + w * 0.2, y0 - 4]];
  }
  return [[x + 8, y0 - 21], [x + w - 6, y0 - 12], [x + w - 6, y0 - 5], [x + 8, y0 - 14]]; // modern shed
}

function wallTop(design: ResolvedDesign, geo: Rect) {
  return design.placement === 'garage_conversion' ? null : geo.y;
}

function AduBody({ design, geo }: LayerProps) {
  const id = useId();
  const { x, y, w, h } = geo;
  const garageSide = design.placement === 'garage_conversion' || design.placement === 'above_garage';
  const count = Math.min(WINDOWS[design.size] ?? 2, garageSide ? (design.size === '3br' ? 3 : 2) : 4);
  const doorW = 24; const doorX = x + w - doorW - 12;
  const avail = doorX - (x + 10);
  const ww = Math.max(18, Math.min(36, avail / count - 10));
  const wh = Math.min(40, h * 0.38);
  const wy = y + h * 0.2;
  const hasDoor = design.placement !== 'above_garage';
  const gap = (avail - ww * count) / (count + 1);
  const top = wallTop(design, geo);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={design.hex} />
      <Material id={id} type={design.material} x={x} y={y} w={w} h={h} />
      <rect x={x} y={y + h - 6} width={w} height="6" fill="#000" opacity=".12" />
      {Array.from({ length: count }, (_, i) => <Win key={i} style={design.style} x={x + 10 + gap * (i + 1) + ww * i} y={wy} w={ww} h={wh} trim={design.trim} />)}
      {hasDoor ? <g><rect x={doorX} y={y + h - 54} width={doorW} height="54" fill={design.trim === '#3b4048' ? '#5b6b8c' : '#f4efe6'} stroke={design.trim} strokeOpacity=".5" strokeWidth="1.5" /><circle cx={doorX + doorW - 5} cy={y + h - 26} r="1.8" fill="#f5b700" /></g> : null}
      {top !== null ? <Roof style={design.style} x={x} y0={y} w={w} h={h} /> : null}
    </g>
  );
}

/* -------------------------------- extras -------------------------------- */

function Solar({ design, geo }: LayerProps) {
  const q = solarQuad(design.style, geo.x, design.placement === 'garage_conversion' ? GARAGE.y - 14 : geo.y, geo.w, geo.h);
  const a = lerp(q[0], q[1], 0.5); const b = lerp(q[3], q[2], 0.5);
  return (
    <g>
      <polygon points={pts(q)} fill="#1f3556" stroke="#c9d6e8" strokeWidth="1.5" />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#c9d6e8" strokeWidth="1" />
      {[0.25, 0.5, 0.75].map((t) => { const p = lerp(q[0], q[1], t); const r = lerp(q[3], q[2], t); return <line key={t} x1={p[0]} y1={p[1]} x2={r[0]} y2={r[1]} stroke="#c9d6e8" strokeWidth="1" />; })}
    </g>
  );
}

function Porch({ design, geo }: LayerProps) {
  const { x, y, w, h } = geo;
  const bottom = y + h;
  if (design.placement === 'above_garage') {
    return <g><rect x={x - 6} y={bottom - 4} width={w + 12} height="6" fill="#8a6a46" />{Array.from({ length: 9 }, (_, i) => <rect key={i} x={x - 2 + i * ((w + 4) / 8)} y={bottom - 26} width="2.5" height="22" fill="#2a2f35" />)}<rect x={x - 6} y={bottom - 28} width={w + 12} height="3" fill="#2a2f35" /></g>;
  }
  const px = x + w - 62; const pw = 56;
  return (
    <g>
      <rect x={px - 6} y={bottom - 6} width={pw + 12} height="8" fill="#8a6a46" />
      <rect x={px} y={bottom - 66} width="4" height="62" fill="#f4efe6" stroke="#8a8a85" strokeWidth=".6" /><rect x={px + pw - 4} y={bottom - 66} width="4" height="62" fill="#f4efe6" stroke="#8a8a85" strokeWidth=".6" />
      <polygon points={pts([[px - 10, bottom - 66], [px + pw + 10, bottom - 66], [px + pw + 2, bottom - 80], [px - 2, bottom - 80]])} fill="#6a4a38" />
    </g>
  );
}

function Landscaping({ design, geo }: LayerProps) {
  const { x, y, w, h } = geo;
  const base = y + h;
  const treeX = design.placement === 'attached' ? x - 28 : x + w + 30;
  return (
    <g>
      {Array.from({ length: Math.max(2, Math.floor(w / 38)) }, (_, i) => <ellipse key={i} cx={x + 10 + i * 36} cy={base + 1} rx="18" ry="11" fill={i % 2 ? '#4e9a4f' : '#5fae5a'} />)}
      <rect x={treeX - 3} y={base - 48} width="6" height="50" fill="#7a5638" />
      <circle cx={treeX} cy={base - 62} r="26" fill="#4a9a52" /><circle cx={treeX - 14} cy={base - 48} r="18" fill="#58a95c" /><circle cx={treeX + 14} cy={base - 50} r="17" fill="#3f8a49" />
      <ellipse cx={treeX + 40} cy={base + 2} rx="14" ry="8" fill="#d77a9b" /><ellipse cx={treeX + 56} cy={base + 3} rx="12" ry="7" fill="#e6a23c" />
    </g>
  );
}

function LargeWindows({ design, geo }: LayerProps) {
  const { x, y, w, h } = geo;
  const pw = Math.min(64, w - 62); const px = x + 10; const py = y + h * 0.18; const ph = h * 0.66;
  const frame = design.style === 'farmhouse' ? '#1f2329' : design.trim === '#3b4048' ? '#3b4048' : '#f4efe6';
  return (
    <g>
      <rect x={px} y={py} width={pw} height={ph} fill="#a9d0e8" stroke={frame} strokeWidth="4" />
      <line x1={px + pw / 2} x2={px + pw / 2} y1={py} y2={py + ph} stroke={frame} strokeWidth="3" />
      <polygon points={pts([[px + 4, py + 4], [px + 20, py + 4], [px + 4, py + 24]])} fill="#fff" opacity=".55" />
    </g>
  );
}

/* ------------------------------ the config map ------------------------------ */

export const ADU_LAYERS = {
  base: { src: null, Svg: BaseScene } as LayerRef,
  /** Key: `${placement}:${size}:${style}`. A path here replaces the drawn ADU for that combination. */
  body: { Svg: AduBody, overrides: {} as Record<string, string> },
  /** Key: colour id. Transparent tint drawn over a body override (the drawn SVG recolours itself). */
  color: { overrides: {} as Record<string, string> },
  extras: {
    solar: { src: null, Svg: Solar } as LayerRef,
    porch: { src: null, Svg: Porch } as LayerRef,
    landscaping: { src: null, Svg: Landscaping } as LayerRef,
    large_windows: { src: null, Svg: LargeWindows } as LayerRef,
  },
};

/** Every image file the config points to, for preloading. SVG layers need no preload. */
export function layerSources(): string[] {
  const out: string[] = [];
  if (ADU_LAYERS.base.src) out.push(ADU_LAYERS.base.src);
  out.push(...Object.values(ADU_LAYERS.body.overrides), ...Object.values(ADU_LAYERS.color.overrides));
  for (const e of Object.values(ADU_LAYERS.extras)) if (e.src) out.push(e.src);
  return out;
}

/** Draws a layer: the supplied image if there is one, otherwise the SVG illustration. */
export function Layer({ layer, props }: { layer: LayerRef; props: LayerProps }) {
  if (layer.src) return <image href={layer.src} x="0" y="0" width={CANVAS.w} height={CANVAS.h} preserveAspectRatio="xMidYMid slice" />;
  const { Svg } = layer;
  return <Svg {...props} />;
}
