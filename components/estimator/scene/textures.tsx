import type { ReactNode } from 'react';
import { TEXTURES } from '@/lib/estimator/scene/textures';
import { SCENE, type TextureId } from '@/lib/estimator/scene/types';

/**
 * Texture <pattern>s for the live pool scene. Each tile is the fallback colour,
 * then a light procedural drawing of the material (joints, speckle, boards),
 * then the generated image when TEXTURES[id].src is set (it covers the
 * drawing once loaded). So the scene looks finished before any image exists
 * and while images load. Tiles are TEXTURES[id].realFt feet square in scene
 * units, so materials keep a believable scale at every pool size.
 */

const FT = SCENE.pxPerFt;

/** Small deterministic PRNG (mulberry32), so server and client draw the same texture. */
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

const r1 = (n: number) => Math.round(n * 10) / 10;

export function tileSize(id: TextureId): number {
  return TEXTURES[id].realFt * FT;
}

/** Dots scattered over a tile, wrapped so the tile stays seamless. */
function speckle(size: number, count: number, colors: string[], rMin: number, rMax: number, seed: number, opacity = 1): ReactNode {
  const rand = rng(seed);
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = rMin + rand() * (rMax - rMin);
    const fill = colors[Math.floor(rand() * colors.length)];
    out.push(<circle key={i} cx={r1(x)} cy={r1(y)} r={r1(r)} fill={fill} />);
  }
  return <g opacity={opacity}>{out}</g>;
}

/** Rectangular units in a running bond with tone variation and joints. */
function bond(size: number, uw: number, uh: number, tones: string[], joint: string, seed: number, jointW = 0.9): ReactNode {
  const rand = rng(seed);
  const rows = Math.round(size / uh);
  const cols = Math.round(size / uw);
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? uw / 2 : 0;
    for (let c = -1; c < cols; c++) {
      const x = c * uw + off;
      out.push(
        <rect key={`${r}-${c}`} x={r1(x)} y={r1(r * uh)} width={r1(uw)} height={r1(uh)} fill={tones[Math.floor(rand() * tones.length)]} stroke={joint} strokeWidth={jointW} />,
      );
    }
  }
  return <g>{out}</g>;
}

/** Soft blotches (mottling) for stone and plaster. */
function blotches(size: number, count: number, colors: string[], rMin: number, rMax: number, seed: number, opacity: number): ReactNode {
  const rand = rng(seed);
  const out: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rx = rMin + rand() * (rMax - rMin);
    const ry = rx * (0.5 + rand() * 0.6);
    const fill = colors[Math.floor(rand() * colors.length)];
    // Wrap copies keep the tile seamless.
    for (const [dx, dy] of [
      [0, 0],
      [-size, 0],
      [size, 0],
      [0, -size],
      [0, size],
    ]) {
      out.push(<ellipse key={`${i}-${dx}-${dy}`} cx={r1(x + dx)} cy={r1(y + dy)} rx={r1(rx)} ry={r1(ry)} fill={fill} />);
    }
  }
  return <g opacity={opacity}>{out}</g>;
}

function grid(size: number, step: number, color: string, width: number, opacity = 1): ReactNode {
  const lines: string[] = [];
  for (let v = 0; v <= size + 0.01; v += step) lines.push(`M${r1(v)} 0V${r1(size)}M0 ${r1(v)}H${r1(size)}`);
  return <path d={lines.join('')} stroke={color} strokeWidth={width} fill="none" opacity={opacity} />;
}

const cache = new Map<TextureId, ReactNode>();

/** The procedural drawing for a texture (cached: it never changes). */
function detail(id: TextureId): ReactNode {
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const s = tileSize(id);
  let node: ReactNode = null;
  switch (id) {
    case 'floor_plaster':
      node = blotches(s, 18, ['#ffffff', '#dcebed', '#f3f9f9'], 4, 14, 11, 0.55);
      break;
    case 'floor_quartz':
      node = (
        <>
          {blotches(s, 12, ['#e2f0f2', '#bcd9de'], 5, 14, 12, 0.5)}
          {speckle(s, 90, ['#8fb7c0', '#ffffff', '#6f9dab'], 0.35, 0.9, 13)}
        </>
      );
      break;
    case 'floor_pebble':
      node = speckle(s, 260, ['#6a828c', '#91a7ae', '#566c76', '#a9b8bb', '#7a8e93'], 0.7, 1.6, 14);
      break;
    case 'tile_porcelain':
      node = (
        <>
          {blotches(s, 8, ['#4a7d95', '#36657c'], 3, 6, 15, 0.6)}
          {grid(s, FT / 2, '#e8eef0', 0.5, 0.55)}
        </>
      );
      break;
    case 'tile_glass': {
      const rand = rng(16);
      const step = FT / 4;
      const cells: ReactNode[] = [];
      for (let y = 0; y < s; y += step) {
        for (let x = 0; x < s; x += step) {
          const fill = ['#2f8fb0', '#3aa6c6', '#2380a4', '#4cb6d3', '#1f6f96'][Math.floor(rand() * 5)];
          cells.push(<rect key={`${x}-${y}`} x={r1(x)} y={r1(y)} width={r1(step - 0.35)} height={r1(step - 0.35)} fill={fill} />);
        }
      }
      node = <g>{cells}</g>;
      break;
    }
    case 'tile_stone':
      node = bond(s, FT * 0.75, FT / 2, ['#8a8478', '#9a9284', '#7b7569', '#a59c8b'], '#6c665c', 17, 0.5);
      break;
    case 'coping_concrete':
      node = (
        <>
          {blotches(s, 10, ['#e6e3dc', '#cdc9c0'], 4, 12, 18, 0.5)}
          {speckle(s, 70, ['#b9b5ac', '#f2f0eb'], 0.3, 0.7, 19)}
        </>
      );
      break;
    case 'coping_travertine':
      node = (
        <>
          {blotches(s, 14, ['#ecdfc8', '#d6c6a8', '#efe5d3'], 5, 16, 20, 0.6)}
          {speckle(s, 40, ['#b7a587', '#c9b796'], 0.4, 1.1, 21, 0.7)}
        </>
      );
      break;
    case 'coping_stone':
      node = blotches(s, 16, ['#c9c2b3', '#aaa395', '#b8b0a0', '#d2ccbe'], 5, 15, 22, 0.65);
      break;
    case 'deck_pavers':
      node = bond(s, FT * 1.5, FT * 0.75, ['#d6c8ae', '#cbbb9e', '#dccfb8', '#c4b497', '#d1c2a5'], '#a99a7f', 23, 0.8);
      break;
    case 'deck_concrete':
      node = (
        <>
          {speckle(s, 160, ['#bdb9b1', '#e0ddd6', '#c6c2ba'], 0.3, 0.8, 24)}
          {blotches(s, 8, ['#d8d5ce', '#c3bfb7'], 10, 24, 25, 0.35)}
          <path d={`M0 0H${s}M0 0V${s}`} stroke="#aaa59c" strokeWidth={1.3} />
        </>
      );
      break;
    case 'deck_porcelain': {
      const rand = rng(26);
      const tw = FT * 4;
      const th = FT * 2;
      const tiles: ReactNode[] = [];
      for (let y = 0; y < s; y += th) {
        const off = (y / th) % 2 ? tw / 2 : 0;
        for (let x = -tw; x < s; x += tw) {
          const fill = ['#e4e0d8', '#dedad1', '#e8e4dd', '#dad5cb'][Math.floor(rand() * 4)];
          tiles.push(<rect key={`${x}-${y}`} x={r1(x + off)} y={r1(y)} width={tw} height={th} fill={fill} stroke="#c3bdb1" strokeWidth={0.7} />);
        }
      }
      node = (
        <>
          <g>{tiles}</g>
          {blotches(s, 10, ['#f1eee8', '#d4cfc4'], 6, 18, 27, 0.35)}
        </>
      );
      break;
    }
    case 'deck_resurface':
      node = (
        <>
          {blotches(s, 40, ['#e9e1d2', '#d3c8b4', '#e4dccd'], 2, 7, 28, 0.75)}
          <path d={`M0 0H${s}M0 0V${s}`} stroke="#bfb3a0" strokeWidth={1.2} />
        </>
      );
      break;
    case 'lawn_grass':
      node = (
        <>
          <rect width={s} height={s / 2} fill="#7aa955" opacity={0.55} />
          {speckle(s, 220, ['#5d8a3e', '#86b25f', '#668f45', '#7ea457'], 0.4, 1.1, 29, 0.8)}
        </>
      );
      break;
    case 'lawn_turf':
      node = speckle(s, 240, ['#4f8c32', '#6bab49', '#579a39', '#74b250'], 0.35, 0.8, 30, 0.85);
      break;
    case 'planting_bed':
      node = speckle(s, 160, ['#5a4a37', '#7c6851', '#4a3d2e', '#8a765c'], 0.5, 1.4, 31);
      break;
    case 'gravel_dg':
      node = speckle(s, 220, ['#b9a47e', '#d6c5a2', '#a8936d', '#e0d2b4'], 0.4, 1.1, 32);
      break;
    case 'roof_shingle': {
      const row = FT * 0.85;
      const rand = rng(33);
      const parts: ReactNode[] = [];
      for (let y = 0, i = 0; y < s; y += row, i++) {
        parts.push(<rect key={`r${i}`} x={0} y={r1(y)} width={s} height={r1(row)} fill={['#5b5f66', '#575b62', '#60646b'][i % 3]} />);
        parts.push(<path key={`l${i}`} d={`M0 ${r1(y + row)}H${s}`} stroke="#3f4248" strokeWidth={0.9} />);
        for (let x = (i % 2) * FT * 0.7; x < s; x += FT * 1.4) {
          parts.push(<path key={`t${i}-${x}`} d={`M${r1(x)} ${r1(y)}v${r1(row)}`} stroke="#45484e" strokeWidth={0.6} opacity={0.6 + rand() * 0.4} />);
        }
      }
      node = <g>{parts}</g>;
      break;
    }
    case 'wood_slats': {
      const board = FT * 0.45;
      const rand = rng(34);
      const parts: ReactNode[] = [];
      for (let y = 0, i = 0; y < s; y += board, i++) {
        const fill = ['#9a6b42', '#8a5a34', '#a8764a', '#93633b', '#7f5130'][Math.floor(rand() * 5)];
        parts.push(<rect key={`b${i}`} x={0} y={r1(y)} width={s} height={r1(board - 0.6)} fill={fill} />);
        const joint = rand() * s;
        parts.push(<path key={`j${i}`} d={`M${r1(joint)} ${r1(y)}v${r1(board)}`} stroke="#5e3b20" strokeWidth={0.6} />);
      }
      node = (
        <>
          <rect width={s} height={s} fill="#5e3b20" />
          <g>{parts}</g>
        </>
      );
      break;
    }
    case 'counter_stone':
      node = blotches(s, 12, ['#ece9e3', '#c8c3ba', '#e2ded6'], 4, 14, 35, 0.6);
      break;
    case 'firepit_stone':
      node = bond(s, FT * 0.9, FT * 0.45, ['#8f8a82', '#7d786f', '#a29d94', '#6f6a62'], '#55514b', 36, 0.6);
      break;
    case 'water_caustics':
      node = causticNet(s);
      break;
  }
  cache.set(id, node);
  return node;
}

/** A seamless caustic web: wobbly closed cells around jittered points, white on transparent. */
function causticNet(s: number): ReactNode {
  const rand = rng(37);
  const n = 4;
  const cell = s / n;
  const paths: string[] = [];
  for (let gy = 0; gy < n; gy++) {
    for (let gx = 0; gx < n; gx++) {
      const cx = (gx + 0.5 + (rand() - 0.5) * 0.5) * cell;
      const cy = (gy + 0.5 + (rand() - 0.5) * 0.5) * cell;
      const k = 6;
      const pts: [number, number][] = [];
      for (let i = 0; i < k; i++) {
        const a = (i / k) * Math.PI * 2 + rand() * 0.4;
        const rr = cell * (0.42 + rand() * 0.16);
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      for (const [dx, dy] of [
        [0, 0],
        [-s, 0],
        [s, 0],
        [0, -s],
        [0, s],
      ]) {
        const p = pts.map(([x, y]) => [x + dx, y + dy] as const);
        // Smooth closed curve through midpoints.
        const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const m0 = mid(p[k - 1], p[0]);
        let d = `M${r1(m0[0])} ${r1(m0[1])}`;
        for (let i = 0; i < k; i++) {
          const m = mid(p[i], p[(i + 1) % k]);
          d += `Q${r1(p[i][0])} ${r1(p[i][1])} ${r1(m[0])} ${r1(m[1])}`;
        }
        paths.push(d + 'Z');
      }
    }
  }
  return <path d={paths.join('')} fill="none" stroke="#ffffff" strokeWidth={1.3} strokeLinejoin="round" />;
}

/**
 * One texture as a <pattern>. `transform` rotates or offsets it (e.g. pavers
 * squared to the pool); `tone` lays a translucent colour over the tile.
 */
export function TexturePattern({ id, texture, transform, tone }: { id: string; texture: TextureId; transform?: string; tone?: { color: string; opacity: number } }) {
  const t = TEXTURES[texture];
  const s = tileSize(texture);
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={s} height={s} patternTransform={transform}>
      <rect width={s} height={s} fill={t.fallback === 'transparent' ? 'none' : t.fallback} />
      {t.src ? <image href={t.src} width={s} height={s} preserveAspectRatio="none" /> : detail(texture)}
      {tone ? <rect width={s} height={s} fill={tone.color} opacity={tone.opacity} /> : null}
    </pattern>
  );
}
