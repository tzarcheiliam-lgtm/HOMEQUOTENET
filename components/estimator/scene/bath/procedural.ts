import type { BathTextureId } from '@/lib/estimator/scene/bath/types';
import { BATH_TEXTURES } from '@/lib/estimator/scene/bath/textures';

/**
 * Procedural stand-ins for the bathroom materials, drawn once per texture
 * into a seamless square canvas (browser only). They are what the picture
 * shows until (or instead of) a generated texture file: real tile layouts at
 * real sizes (3 x 6" subway in running bond, 2" hex, 8" planks...) with
 * per-tile colour variation, glaze highlights and grout, so the live picture
 * looks finished from the first frame. Nothing here comes from the web.
 */

/** Pixels per texture tile (one tile covers BATH_TEXTURES[id].realFt feet). */
export const PROC_PX = 512;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available.');
  return ctx;
}

/** Deterministic RNG (mulberry32) so a texture looks the same on every visit. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Rgb = [number, number, number];

export function hexRgb(hex: string): Rgb {
  const v = hex.replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** rgb() string, each channel shifted by `d` (lightness) and clamped. */
export function shade([r, g, b]: Rgb, d: number, a = 1): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v + d)));
  return a >= 1 ? `rgb(${c(r)},${c(g)},${c(b)})` : `rgba(${c(r)},${c(g)},${c(b)},${a})`;
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Smooth, seamless value noise (cells x cells blobs) as a canvas of `size`. */
function smoothNoise(size: number, cells: number, rand: () => number): HTMLCanvasElement {
  const small = makeCanvas(cells, cells);
  const sctx = ctx2d(small);
  const img = sctx.createImageData(cells, cells);
  for (let i = 0; i < cells * cells; i++) {
    const v = Math.round(rand() * 255);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);
  // Tile 3 x 3 and crop the middle: bilinear upscaling then wraps seamlessly.
  const big = makeCanvas(size * 3, size * 3);
  const bctx = ctx2d(big);
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = 'high';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) bctx.drawImage(small, i * size, j * size, size, size);
  const out = makeCanvas(size, size);
  ctx2d(out).drawImage(big, size, size, size, size, 0, 0, size, size);
  return out;
}

/** Fine grain noise tile, shared. */
let grainTile: HTMLCanvasElement | null = null;
export function grain(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const c = makeCanvas(256, 256);
  const ctx = ctx2d(c);
  const img = ctx.createImageData(256, 256);
  const rand = rng(7);
  for (let i = 0; i < 256 * 256; i++) {
    const v = Math.round(110 + rand() * 36);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

/** Overlay mottling (soft-light) and fine grain onto a region. */
function mottle(ctx: CanvasRenderingContext2D, size: number, rand: () => number, cells: number, alpha: number, grainAlpha = 0.25) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = alpha;
  ctx.drawImage(smoothNoise(size, cells, rand), 0, 0);
  ctx.globalAlpha = grainAlpha;
  const pattern = ctx.createPattern(grain(), 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.restore();
}

/** Run `draw` at the 9 wrap offsets so strokes crossing an edge come back on the other side. */
function wrapped(ctx: CanvasRenderingContext2D, size: number, draw: () => void) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      ctx.save();
      ctx.translate(dx, dy);
      draw();
      ctx.restore();
    }
  }
}

/** Soft marble / stone veins: meandering strokes, blurred by shadow. */
function veins(ctx: CanvasRenderingContext2D, size: number, rand: () => number, colour: string, count: number, width: number, alpha: number) {
  const paths: { pts: [number, number][]; w: number }[] = [];
  for (let i = 0; i < count; i++) {
    let x = rand() * size;
    let y = rand() * size;
    // Long, gently meandering diagonals (real veining flows; it does not branch like twigs).
    let ang = 0.35 + rand() * 0.5;
    const turn = (rand() - 0.5) * 0.05;
    const pts: [number, number][] = [[x, y]];
    const steps = 10 + Math.floor(rand() * 10);
    for (let k = 0; k < steps; k++) {
      ang += turn + (rand() - 0.5) * 0.28;
      x += Math.cos(ang) * size * 0.035;
      y += Math.sin(ang) * size * 0.035;
      pts.push([x, y]);
    }
    paths.push({ pts, w: width * (0.4 + rand() * 1.2) });
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  wrapped(ctx, size, () => {
    for (const p of paths) {
      ctx.lineWidth = p.w;
      ctx.shadowColor = colour;
      ctx.shadowBlur = p.w * 2.5;
      ctx.beginPath();
      ctx.moveTo(p.pts[0][0], p.pts[0][1]);
      for (let k = 1; k < p.pts.length - 1; k++) {
        const mx = (p.pts[k][0] + p.pts[k + 1][0]) / 2;
        const my = (p.pts[k][1] + p.pts[k + 1][1]) / 2;
        ctx.quadraticCurveTo(p.pts[k][0], p.pts[k][1], mx, my);
      }
      ctx.stroke();
    }
  });
  ctx.restore();
}

type GridOpts = {
  cols: number;
  rows: number;
  /** Running bond: every other row shifted half a tile. */
  bond?: boolean;
  grout: string;
  groutPx: number;
  base: Rgb;
  /** Lightness jitter per tile (+-). */
  jitter: number;
  /** Glossy glaze: a soft highlight and darker bottom edge per tile. */
  glaze?: number;
  /** Handmade: uneven edges and a glossy pool (zellige). */
  handmade?: boolean;
  /** Per-tile hue drift towards this colour (0..1 random amount). */
  drift?: Rgb;
};

function tileGrid(ctx: CanvasRenderingContext2D, size: number, rand: () => number, o: GridOpts) {
  ctx.fillStyle = o.grout;
  ctx.fillRect(0, 0, size, size);
  const tw = size / o.cols;
  const th = size / o.rows;
  const g = o.groutPx / 2;
  for (let r = 0; r < o.rows; r++) {
    const shift = o.bond && r % 2 === 1 ? tw / 2 : 0;
    for (let c = -1; c < o.cols; c++) {
      const x = c * tw + shift;
      if (x >= size || x + tw <= 0) continue;
      const y = r * th;
      let colour: Rgb = o.base;
      if (o.drift) colour = mix(colour, o.drift, rand() * rand());
      const d = (rand() - 0.5) * 2 * o.jitter;
      const draw = (ox: number) => {
        const x0 = x + ox + g;
        const y0 = y + g;
        const w = tw - o.groutPx;
        const h = th - o.groutPx;
        ctx.fillStyle = shade(colour, d);
        if (o.handmade) {
          const j = () => (rand() - 0.5) * o.groutPx * 1.2;
          ctx.beginPath();
          ctx.moveTo(x0 + j(), y0 + j());
          ctx.lineTo(x0 + w / 2 + j(), y0 + j());
          ctx.lineTo(x0 + w + j(), y0 + j());
          ctx.lineTo(x0 + w + j(), y0 + h / 2 + j());
          ctx.lineTo(x0 + w + j(), y0 + h + j());
          ctx.lineTo(x0 + w / 2 + j(), y0 + h + j());
          ctx.lineTo(x0 + j(), y0 + h + j());
          ctx.lineTo(x0 + j(), y0 + h / 2 + j());
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(x0, y0, w, h);
        }
        if (o.glaze) {
          const lg = ctx.createLinearGradient(0, y0, 0, y0 + h);
          lg.addColorStop(0, `rgba(255,255,255,${0.55 * o.glaze})`);
          lg.addColorStop(0.18, `rgba(255,255,255,${0.12 * o.glaze})`);
          lg.addColorStop(0.75, 'rgba(255,255,255,0)');
          lg.addColorStop(1, `rgba(0,0,0,${0.16 * o.glaze})`);
          ctx.fillStyle = lg;
          ctx.fillRect(x0, y0, w, h);
          // Pillowed edge: darker sides.
          const sg = ctx.createLinearGradient(x0, 0, x0 + w, 0);
          sg.addColorStop(0, `rgba(0,0,0,${0.08 * o.glaze})`);
          sg.addColorStop(0.12, 'rgba(0,0,0,0)');
          sg.addColorStop(0.88, 'rgba(0,0,0,0)');
          sg.addColorStop(1, `rgba(0,0,0,${0.1 * o.glaze})`);
          ctx.fillStyle = sg;
          ctx.fillRect(x0, y0, w, h);
        }
        if (o.handmade) {
          // Uneven glaze pooling: a few soft light and dark blobs per tile.
          for (let k = 0; k < 3; k++) {
            const cx = x0 + rand() * w;
            const cy = y0 + rand() * h;
            const rr = (0.25 + rand() * 0.45) * w;
            const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
            const light = rand() < 0.55;
            rg.addColorStop(0, light ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)');
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = rg;
            ctx.fillRect(x0, y0, w, h);
          }
        }
      };
      draw(0);
      // Tiles that cross the right edge wrap to the left.
      if (x + tw > size) draw(-size);
    }
  }
}

/** Planks running vertically (along the room's depth on the floor). */
function planks(ctx: CanvasRenderingContext2D, size: number, rand: () => number, o: { cols: number; lengths: number; base: Rgb; jitter: number; grain: number; gap: string; dark: Rgb }) {
  ctx.fillStyle = o.gap;
  ctx.fillRect(0, 0, size, size);
  const pw = size / o.cols;
  const pl = size / o.lengths;
  for (let c = 0; c < o.cols; c++) {
    const offset = rand() * pl;
    for (let k = -1; k < o.lengths + 1; k++) {
      const y = k * pl + offset;
      const colour = mix(o.base, o.dark, rand() * 0.55);
      const d = (rand() - 0.5) * 2 * o.jitter;
      const segs = [y, y - size];
      for (const yy of segs) {
        if (yy >= size || yy + pl <= 0) continue;
        const x0 = c * pw + 1;
        const w = pw - 2;
        const y0 = yy + 1;
        const h = pl - 2;
        ctx.fillStyle = shade(colour, d);
        ctx.fillRect(x0, y0, w, h);
        // Grain: long thin streaks along the plank.
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, w, h);
        ctx.clip();
        const streaks = 9 + Math.floor(rand() * 8);
        for (let s = 0; s < streaks; s++) {
          const sx = x0 + rand() * w;
          const amp = 1 + rand() * 3;
          const freq = 0.004 + rand() * 0.01;
          const ph = rand() * 6;
          ctx.strokeStyle = rand() < 0.6 ? shade(colour, -30 - rand() * 25, o.grain) : shade(colour, 25, o.grain * 0.8);
          ctx.lineWidth = 0.6 + rand() * 1.6;
          ctx.beginPath();
          for (let t = 0; t <= h; t += 12) {
            const xx = sx + Math.sin((y0 + t) * freq + ph) * amp;
            if (t === 0) ctx.moveTo(xx, y0 + t);
            else ctx.lineTo(xx, y0 + t);
          }
          ctx.stroke();
        }
        // A knot now and then.
        if (rand() < 0.3) {
          const kx = x0 + w * (0.25 + rand() * 0.5);
          const ky = y0 + h * rand();
          ctx.strokeStyle = shade(colour, -45, 0.35);
          ctx.lineWidth = 1;
          for (let r = 2; r < 9; r += 2.5) {
            ctx.beginPath();
            ctx.ellipse(kx, ky, r * 0.6, r * 2.2, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        // Slight end-to-end tone change and a micro bevel.
        const lg = ctx.createLinearGradient(x0, 0, x0 + w, 0);
        lg.addColorStop(0, 'rgba(0,0,0,0.10)');
        lg.addColorStop(0.08, 'rgba(255,255,255,0.05)');
        lg.addColorStop(0.92, 'rgba(0,0,0,0)');
        lg.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = lg;
        ctx.fillRect(x0, y0, w, h);
        ctx.restore();
      }
    }
  }
}

function hexMosaic(ctx: CanvasRenderingContext2D, size: number, rand: () => number, base: Rgb, grout: string, accent: Rgb | null) {
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, size, size);
  const cols = 9;
  const rows = 10;
  const w = size / cols;
  const h = size / rows;
  const r = w / Math.sqrt(3) * 0.97;
  for (let row = -1; row <= rows; row++) {
    for (let col = -1; col <= cols; col++) {
      const cx = col * w + (row % 2 !== 0 ? w / 2 : 0) + w / 2;
      const cy = row * h + h / 2;
      const isAccent = accent && rand() < 0.015;
      const colour = isAccent ? accent : base;
      ctx.fillStyle = shade(colour, (rand() - 0.5) * 12);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        const px = cx + Math.cos(a) * r * 0.9;
        const py = cy + Math.sin(a) * r * 0.9 * (h / (w * 0.866));
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      const gl = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      gl.addColorStop(0, 'rgba(255,255,255,0.22)');
      gl.addColorStop(1, 'rgba(0,0,0,0.05)');
      ctx.fillStyle = gl;
      ctx.fill();
    }
  }
}

const DRAW: Record<BathTextureId, (ctx: CanvasRenderingContext2D, size: number, rand: () => number) => void> = {
  tile_subway: (ctx, S, r) => {
    tileGrid(ctx, S, r, { cols: 4, rows: 8, bond: true, grout: '#d6d3cc', groutPx: 3, base: hexRgb('#f3f2ee'), jitter: 4, glaze: 1 });
    mottle(ctx, S, r, 6, 0.12, 0.12);
  },
  tile_large_porcelain: (ctx, S, r) => {
    ctx.fillStyle = '#e6e3dc';
    ctx.fillRect(0, 0, S, S);
    mottle(ctx, S, r, 5, 0.35, 0.2);
    veins(ctx, S, r, 'rgba(160,152,140,1)', 4, 1.6, 0.18);
    // 24 x 48" slabs in a half bond: grout lines only.
    ctx.fillStyle = 'rgba(150,145,136,0.55)';
    ctx.fillRect(0, 0, S, 2);
    ctx.fillRect(0, S / 2, S, 2);
    ctx.fillRect(0, 0, 2, S / 2);
    ctx.fillRect(S / 2, S / 2, 2, S / 2);
    const lg = ctx.createLinearGradient(0, 0, S, S);
    lg.addColorStop(0, 'rgba(255,255,255,0.10)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, S, S);
  },
  tile_zellige: (ctx, S, r) => {
    tileGrid(ctx, S, r, { cols: 6, rows: 6, grout: '#e7e6df', groutPx: 4, base: hexRgb('#b9d3c6'), jitter: 14, glaze: 0.45, handmade: true, drift: hexRgb('#e9efe7') });
    mottle(ctx, S, r, 12, 0.2, 0.1);
  },
  tile_marble: (ctx, S, r) => {
    ctx.fillStyle = '#efeeeb';
    ctx.fillRect(0, 0, S, S);
    mottle(ctx, S, r, 4, 0.3, 0.12);
    // Broad cloudy drifts, then a few crisp veins inside them.
    veins(ctx, S, r, 'rgba(150,150,156,1)', 3, 14, 0.1);
    veins(ctx, S, r, 'rgba(125,124,126,1)', 3, 1.6, 0.3);
    veins(ctx, S, r, 'rgba(165,160,155,1)', 2, 0.7, 0.22);
    ctx.fillStyle = 'rgba(170,168,160,0.5)';
    ctx.fillRect(0, 0, S, 2);
    ctx.fillRect(0, 0, 2, S);
  },
  tile_plain: (ctx, S, r) => {
    tileGrid(ctx, S, r, { cols: 4, rows: 4, grout: '#d2cdc2', groutPx: 3, base: hexRgb('#ebe7df'), jitter: 3, glaze: 0.5 });
    mottle(ctx, S, r, 6, 0.15, 0.12);
  },
  floor_porcelain_wood: (ctx, S, r) => {
    planks(ctx, S, r, { cols: 9, lengths: 1.5, base: hexRgb('#b98f66'), dark: hexRgb('#8a6440'), jitter: 10, grain: 0.35, gap: '#6e5238' });
  },
  floor_large_stone: (ctx, S, r) => {
    ctx.fillStyle = '#d2cdc3';
    ctx.fillRect(0, 0, S, S);
    mottle(ctx, S, r, 7, 0.5, 0.3);
    veins(ctx, S, r, 'rgba(150,142,130,1)', 3, 1.0, 0.1);
    ctx.fillStyle = 'rgba(140,134,124,0.8)';
    ctx.fillRect(0, 0, S, 3);
    ctx.fillRect(0, S / 2, S, 3);
    ctx.fillRect(0, 0, 3, S);
    ctx.fillRect(S / 2, 0, 3, S);
  },
  floor_hex_mosaic: (ctx, S, r) => {
    hexMosaic(ctx, S, r, hexRgb('#f1f1ee'), '#c9c8c3', hexRgb('#9ea2a6'));
  },
  floor_lvp: (ctx, S, r) => {
    planks(ctx, S, r, { cols: 9, lengths: 1.2, base: hexRgb('#ab967f'), dark: hexRgb('#8b765f'), jitter: 7, grain: 0.25, gap: '#7d6a56' });
  },
  floor_plain: (ctx, S, r) => {
    tileGrid(ctx, S, r, { cols: 2, rows: 2, grout: '#b9b1a3', groutPx: 4, base: hexRgb('#d9d3c7'), jitter: 4 });
    mottle(ctx, S, r, 8, 0.4, 0.25);
  },
  paint_soft_white: (ctx, S, r) => paint(ctx, S, r, BATH_TEXTURES.paint_soft_white.fallback),
  paint_greige: (ctx, S, r) => paint(ctx, S, r, BATH_TEXTURES.paint_greige.fallback),
  paint_sage: (ctx, S, r) => paint(ctx, S, r, BATH_TEXTURES.paint_sage.fallback),
  paint_navy: (ctx, S, r) => paint(ctx, S, r, BATH_TEXTURES.paint_navy.fallback),
  counter_quartz_white: (ctx, S, r) => {
    ctx.fillStyle = '#f5f4f1';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = r() < 0.7 ? 'rgba(170,168,162,0.35)' : 'rgba(120,118,112,0.3)';
      ctx.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
    }
    veins(ctx, S, r, 'rgba(175,172,165,1)', 2, 1.2, 0.2);
  },
  counter_marble_look: (ctx, S, r) => {
    ctx.fillStyle = '#efede8';
    ctx.fillRect(0, 0, S, S);
    mottle(ctx, S, r, 4, 0.25, 0.1);
    veins(ctx, S, r, 'rgba(130,125,118,1)', 3, 2.6, 0.3);
    veins(ctx, S, r, 'rgba(176,150,110,1)', 3, 1.0, 0.25);
  },
  counter_concrete: (ctx, S, r) => {
    ctx.fillStyle = '#a9a7a2';
    ctx.fillRect(0, 0, S, S);
    mottle(ctx, S, r, 9, 0.6, 0.45);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = 'rgba(70,70,68,0.35)';
      ctx.beginPath();
      ctx.arc(r() * S, r() * S, 0.6 + r() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  vanity_white: (ctx, S, r) => paint(ctx, S, r, BATH_TEXTURES.vanity_white.fallback, 0.12),
  vanity_wood: (ctx, S, r) => {
    planks(ctx, S, r, { cols: 3, lengths: 0.5, base: hexRgb('#ad8156'), dark: hexRgb('#8c6440'), jitter: 6, grain: 0.4, gap: '#9b7550' });
  },
  vanity_navy_green: (ctx, S, r) => paint(ctx, S, r, BATH_TEXTURES.vanity_navy_green.fallback, 0.16),
  vanity_black: (ctx, S, r) => paint(ctx, S, r, BATH_TEXTURES.vanity_black.fallback, 0.16),
};

function paint(ctx: CanvasRenderingContext2D, S: number, r: () => number, colour: string, grainAlpha = 0.1) {
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, S, S);
  mottle(ctx, S, r, 5, 0.1, grainAlpha);
}

const cache = new Map<BathTextureId, HTMLCanvasElement>();

/** The procedural texture for an id (drawn once, then cached). */
export function proceduralTexture(id: BathTextureId): HTMLCanvasElement {
  const hit = cache.get(id);
  if (hit) return hit;
  const c = makeCanvas(PROC_PX, PROC_PX);
  const ctx = ctx2d(c);
  ctx.fillStyle = BATH_TEXTURES[id].fallback;
  ctx.fillRect(0, 0, PROC_PX, PROC_PX);
  try {
    DRAW[id](ctx, PROC_PX, rng(hashString(id)));
  } catch {
    // A canvas feature missing: the flat fallback colour still reads fine.
  }
  cache.set(id, c);
  return c;
}
