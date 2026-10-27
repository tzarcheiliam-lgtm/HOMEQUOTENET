import { useId } from 'react';

/** Material swatch ids. Template options reference these via `option.swatch`. */
export const SWATCH_IDS = [
  'plaster',
  'quartz',
  'pebble',
  'tile_porcelain',
  'tile_glass',
  'stone',
  'concrete',
  'travertine',
  'pavers',
  'porcelain_deck',
  'deck_resurface',
] as const;
export type SwatchId = (typeof SWATCH_IDS)[number];

const SIZE = 48;

/** Small deterministic PRNG so speckles are identical on server and client. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Dot = { x: number; y: number; r: number; fill: string };

function scatter(seed: number, count: number, rMin: number, rMax: number, colors: string[]): Dot[] {
  const rand = rng(seed);
  return Array.from({ length: count }, () => ({
    x: Math.round(rand() * SIZE * 10) / 10,
    y: Math.round(rand() * SIZE * 10) / 10,
    r: Math.round((rMin + rand() * (rMax - rMin)) * 100) / 100,
    fill: colors[Math.floor(rand() * colors.length)],
  }));
}

const QUARTZ_DOTS = scatter(11, 110, 0.35, 1.1, ['#ffffff', '#ffffff', '#9ccbe8', '#7fb4d8', '#b9dcf0']);
const PEBBLE_DOTS = scatter(23, 46, 2, 3.4, ['#3f7cae', '#86b8dc', '#2f6a9b', '#a9cbe5', '#5b9ac8']);
const CONCRETE_DOTS = scatter(37, 120, 0.3, 0.8, ['#d6d8da', '#8e9195', '#e4e5e6', '#a2a5a8']);
const DECK_DOTS = scatter(41, 70, 0.3, 0.7, ['#b9b0a2', '#efe9df', '#c8bfb0']);
const GLASS_CELLS = (() => {
  const rand = rng(53);
  const palette = ['#2b8fc4', '#3aa8d0', '#1f7aa8', '#38b2b0', '#4cc4c0', '#5ab8e0', '#2a9aa4'];
  const cells: { x: number; y: number; fill: string }[] = [];
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 8; col++) cells.push({ x: col * 6, y: row * 6, fill: palette[Math.floor(rand() * palette.length)] });
  return cells;
})();

/** Hand-placed irregular flagstones (clockwise polygons covering the tile). */
const STONES: { points: string; fill: string }[] = [
  { points: '0,0 17,0 15,13 3,15 0,10', fill: '#b9b2a8' },
  { points: '17,0 33,0 36,11 28,17 15,13', fill: '#a8a095' },
  { points: '33,0 48,0 48,14 36,11', fill: '#bcb5ab' },
  { points: '0,10 3,15 15,13 17,26 6,30 0,28', fill: '#a49c91' },
  { points: '15,13 28,17 36,11 48,14 46,28 31,30 17,26', fill: '#b3aca1' },
  { points: '0,28 6,30 17,26 19,38 8,42 0,40', fill: '#bab3a9' },
  { points: '17,26 31,30 46,28 48,28 48,40 33,44 19,38', fill: '#a69e93' },
  { points: '0,40 8,42 19,38 33,44 30,48 0,48', fill: '#aea79c' },
  { points: '33,44 48,40 48,48 30,48', fill: '#bdb6ac' },
];

const TRAVERTINE_VEINS = [
  'M-2 9 C10 4 18 14 30 8 S44 12 50 6',
  'M-2 22 C8 18 20 27 31 21 S45 24 50 19',
  'M-2 36 C12 31 19 41 32 35 S44 40 50 33',
  'M-2 46 C9 42 22 49 34 44 S46 47 50 43',
];

function Content({ id, uid }: { id: string; uid: string }) {
  switch (id) {
    case 'plaster':
      return (
        <>
          <defs>
            <linearGradient id={`${uid}g`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fbfcfd" />
              <stop offset="1" stopColor="#e6edf4" />
            </linearGradient>
          </defs>
          <rect width={SIZE} height={SIZE} fill={`url(#${uid}g)`} />
          <ellipse cx="14" cy="16" rx="12" ry="7" fill="#dbe5ee" fillOpacity="0.35" />
          <ellipse cx="34" cy="34" rx="13" ry="8" fill="#ffffff" fillOpacity="0.5" />
        </>
      );
    case 'quartz':
      return (
        <>
          <rect width={SIZE} height={SIZE} fill="#cde5f4" />
          {QUARTZ_DOTS.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.fill} />
          ))}
        </>
      );
    case 'pebble':
      return (
        <>
          <rect width={SIZE} height={SIZE} fill="#4a86b8" />
          {PEBBLE_DOTS.map((d, i) => (
            <ellipse key={i} cx={d.x} cy={d.y} rx={d.r} ry={d.r * 0.8} fill={d.fill} stroke="#2f6a9b" strokeOpacity="0.5" strokeWidth="0.4" />
          ))}
        </>
      );
    case 'tile_porcelain':
      return (
        <>
          <defs>
            <pattern id={`${uid}p`} width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="#b4bcc6" />
              <rect x="0.75" y="0.75" width="14.5" height="14.5" rx="0.6" fill="#eef1f4" />
              <rect x="0.75" y="0.75" width="14.5" height="7" rx="0.6" fill="#ffffff" fillOpacity="0.5" />
            </pattern>
          </defs>
          <rect width={SIZE} height={SIZE} fill={`url(#${uid}p)`} />
        </>
      );
    case 'tile_glass':
      return (
        <>
          <defs>
            <linearGradient id={`${uid}g`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0.12" />
            </linearGradient>
          </defs>
          <rect width={SIZE} height={SIZE} fill="#14566f" />
          {GLASS_CELLS.map((c, i) => (
            <rect key={i} x={c.x + 0.5} y={c.y + 0.5} width="5" height="5" rx="0.8" fill={c.fill} />
          ))}
          <rect width={SIZE} height={SIZE} fill={`url(#${uid}g)`} />
        </>
      );
    case 'stone':
      return (
        <>
          <rect width={SIZE} height={SIZE} fill="#7d766c" />
          {STONES.map((s, i) => (
            <polygon key={i} points={s.points} fill={s.fill} stroke="#7d766c" strokeWidth="1.2" strokeLinejoin="round" />
          ))}
        </>
      );
    case 'concrete':
      return (
        <>
          <rect width={SIZE} height={SIZE} fill="#b3b6b9" />
          {CONCRETE_DOTS.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.fill} fillOpacity="0.7" />
          ))}
          <path d="M0 24 H48" stroke="#8e9195" strokeOpacity="0.55" strokeWidth="0.8" />
        </>
      );
    case 'travertine':
      return (
        <>
          <rect width={SIZE} height={SIZE} fill="#e6d8bd" />
          {TRAVERTINE_VEINS.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={i % 2 ? '#f3eada' : '#c9b78f'} strokeOpacity="0.8" strokeWidth={i % 2 ? 2.4 : 1.2} strokeLinecap="round" />
          ))}
          <circle cx="12" cy="30" r="0.9" fill="#b9a67c" fillOpacity="0.8" />
          <circle cx="36" cy="14" r="0.7" fill="#b9a67c" fillOpacity="0.8" />
          <circle cx="28" cy="40" r="0.8" fill="#b9a67c" fillOpacity="0.8" />
        </>
      );
    case 'pavers':
      return (
        <>
          <defs>
            <pattern id={`${uid}p`} width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill="#8f867b" />
              <rect x="0.7" y="0.7" width="22.6" height="10.6" rx="0.8" fill="#cdc3b5" />
              <rect x="-11.3" y="12.7" width="22.6" height="10.6" rx="0.8" fill="#c2b7a8" />
              <rect x="12.7" y="12.7" width="22.6" height="10.6" rx="0.8" fill="#d3c9bb" />
            </pattern>
          </defs>
          <rect width={SIZE} height={SIZE} fill={`url(#${uid}p)`} />
        </>
      );
    case 'porcelain_deck':
      return (
        <>
          <defs>
            <pattern id={`${uid}p`} width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill="#c3beb5" />
              <rect x="0.9" y="0.9" width="22.2" height="22.2" rx="0.6" fill="#e9e6e0" />
              <path d="M3 20 L20 3" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.4" />
            </pattern>
          </defs>
          <rect width={SIZE} height={SIZE} fill={`url(#${uid}p)`} />
        </>
      );
    default:
      // deck_resurface: light, lightly textured coating
      return (
        <>
          <defs>
            <pattern id={`${uid}p`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <rect width="6" height="6" fill="#ddd6ca" />
              <rect width="6" height="1.2" fill="#cfc7ba" fillOpacity="0.7" />
            </pattern>
          </defs>
          <rect width={SIZE} height={SIZE} fill={`url(#${uid}p)`} />
          {DECK_DOTS.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.fill} fillOpacity="0.8" />
          ))}
        </>
      );
  }
}

/** Small rounded texture tile for a material option. Unknown ids render nothing. */
export function Swatch({ id, className }: { id: string; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!(SWATCH_IDS as readonly string[]).includes(id)) return null;
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-swatch={id}
    >
      <defs>
        <clipPath id={`${uid}c`}>
          <rect width={SIZE} height={SIZE} rx="8" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}c)`}>
        <Content id={id} uid={uid} />
      </g>
      <rect x="0.5" y="0.5" width={SIZE - 1} height={SIZE - 1} rx="7.5" fill="none" stroke="#ffffff" strokeOpacity="0.28" />
    </svg>
  );
}
