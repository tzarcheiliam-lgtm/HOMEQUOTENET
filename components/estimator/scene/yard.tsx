import { FRAME, YARD, type SceneLayout, type SceneObject } from '@/lib/estimator/scene/geometry';
import { SCENE, type SceneSpec } from '@/lib/estimator/scene/types';
import { Crossfade } from './crossfade';
import {
  Bed,
  FirePit,
  Kitchen,
  Lounger,
  OliveTree,
  PatioCover,
  PatioCoverShadow,
  Umbrella,
  cast,
  circlePath,
  treeShadowPath,
} from './sprites';
import { rng, TexturePattern } from './textures';

/**
 * The yard around the pool: neighbours' ground, lawn or turf, landscape strips,
 * the block wall, the walk along the house and the path to the deck (Ground);
 * object shadows (Shadows); free-standing objects (Objects); the house roof
 * (House); and the final light pass that makes it read like a drone photo.
 */

const FT = SCENE.pxPerFt;
const W = SCENE.width;
const H = SCENE.height;
const r1 = (n: number) => Math.round(n * 10) / 10;
const right = YARD.x + YARD.w;
const bottom = YARD.y + YARD.h;

type Props = { uid: string; layout: SceneLayout; scene: SceneSpec; groundKey: string };

export function Ground({ uid, layout, scene, groundKey }: Props) {
  const turf = scene.extras.turfPlanting;
  const walkBottom = FRAME.roofH + FRAME.walkH;
  return (
    <g>
      {/* Neighbours beyond the wall */}
      <rect width={W} height={H} fill={`url(#${uid}-neighbour)`} />
      <Crossfade k={groundKey}>
        {(k) => <rect x={YARD.x} y={YARD.y} width={YARD.w} height={YARD.h} fill={`url(#${uid}-${k === 'turf' ? 'turf' : 'grass'})`} />}
      </Crossfade>
      <LawnVariation uid={uid} stripes={!turf} />
      {layout.beds.map((b, i) => (
        <Bed key={`${i}-${turf}`} x={b.x} y={b.y} w={b.w} h={b.h} kind={turf ? 'planted' : 'hedge'} seed={i * 31 + 7} bedFill={`url(#${uid}-bed)`} />
      ))}
      {/* Walk along the house */}
      <rect x={YARD.x} y={FRAME.roofH} width={YARD.w} height={FRAME.walkH} fill={`url(#${uid}-walk)`} />
      <rect x={YARD.x} y={walkBottom - 1.2} width={YARD.w} height={1.2} fill="#000" opacity={0.12} />
      {layout.path
        ? layout.path.rects.map((r, i) => (
            <g key={i}>
              <rect x={r.x + 1.5} y={r.y + 1.5} width={r.w} height={r.h} fill="#000" opacity={0.12} />
              <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={layout.path!.kind === 'pavers' ? `url(#${uid}-paver)` : `url(#${uid}-walk)`} />
            </g>
          ))
        : null}
      {/* Block wall: cap, with its shadow falling into the yard on the left */}
      <rect x={YARD.x} y={FRAME.roofH} width={1.6 * FT} height={YARD.h} fill="#0d1d22" opacity={0.2} />
      <rect x={FRAME.edge} y={FRAME.roofH} width={FRAME.wall} height={H - FRAME.roofH - FRAME.edge} fill="#d7ccb6" />
      <rect x={right} y={FRAME.roofH} width={FRAME.wall} height={H - FRAME.roofH - FRAME.edge} fill="#d7ccb6" />
      <rect x={FRAME.edge} y={bottom} width={W - 2 * FRAME.edge} height={FRAME.wall} fill="#d7ccb6" />
      <rect x={right + FRAME.wall} y={FRAME.roofH} width={FRAME.edge} height={H} fill="#0d1d22" opacity={0.18} />
      <rect x={0} y={bottom + FRAME.wall} width={W} height={FRAME.edge} fill="#0d1d22" opacity={0.18} />
      <path
        d={`M${FRAME.edge + 0.5} ${FRAME.roofH}V${bottom + FRAME.wall - 0.5}H${right + FRAME.wall - 0.5}V${FRAME.roofH}M${YARD.x - 0.5} ${FRAME.roofH}V${bottom + 0.5}H${right + 0.5}V${FRAME.roofH}`}
        fill="none"
        stroke="#8f826b"
        strokeOpacity={0.5}
        strokeWidth={1}
      />
    </g>
  );
}

/**
 * Breaks up the tiled lawn: a few big soft light and dark patches, plus
 * mowing stripes on real grass (turf is uniform).
 */
function LawnVariation({ uid, stripes }: { uid: string; stripes: boolean }) {
  const rand = rng(91);
  const patches = Array.from({ length: 12 }, () => ({
    x: YARD.x + rand() * YARD.w,
    y: YARD.y + rand() * YARD.h,
    rx: 60 + rand() * 140,
    ry: 40 + rand() * 90,
    dark: rand() > 0.5,
  }));
  const bands: string[] = [];
  for (let x = YARD.x; x < right; x += 12 * FT) bands.push(`M${x} ${YARD.y}h${6 * FT}V${bottom}h${-6 * FT}Z`);
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={`${uid}-lawn-dark`}>
          <stop offset="0" stopColor="#1f3a12" stopOpacity={0.16} />
          <stop offset="1" stopColor="#1f3a12" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}-lawn-light`}>
          <stop offset="0" stopColor="#e8f0b0" stopOpacity={0.12} />
          <stop offset="1" stopColor="#e8f0b0" stopOpacity={0} />
        </radialGradient>
      </defs>
      {patches.map((p, i) => (
        <ellipse key={i} cx={r1(p.x)} cy={r1(p.y)} rx={r1(p.rx)} ry={r1(p.ry)} fill={`url(#${uid}-lawn-${p.dark ? 'dark' : 'light'})`} />
      ))}
      {stripes ? <path d={bands.join('')} fill="#f4ffd8" opacity={0.05} /> : null}
    </g>
  );
}

/** Ground textures shared by every layer (one set per scene instance). */
export function GroundDefs({ uid, scene }: { uid: string; scene: SceneSpec }) {
  return (
    <>
      <TexturePattern id={`${uid}-grass`} texture="lawn_grass" tone={{ color: '#8f9c62', opacity: 0.2 }} />
      <TexturePattern id={`${uid}-turf`} texture="lawn_turf" />
      <TexturePattern id={`${uid}-bed`} texture="planting_bed" />
      <TexturePattern id={`${uid}-gravel`} texture="gravel_dg" />
      <TexturePattern id={`${uid}-walk`} texture="deck_concrete" transform={`translate(${YARD.x} ${FRAME.roofH})`} tone={{ color: '#efe9de', opacity: 0.15 }} />
      <TexturePattern id={`${uid}-paver`} texture="deck_porcelain" />
      <TexturePattern id={`${uid}-roof`} texture="roof_shingle" />
      <TexturePattern id={`${uid}-counter`} texture="counter_stone" />
      <TexturePattern id={`${uid}-firestone`} texture="firepit_stone" />
      <TexturePattern id={`${uid}-neighbour`} texture="lawn_grass" tone={{ color: '#a9a07f', opacity: 0.7 }} />
      <TexturePattern id={`${uid}-pad`} texture={scene.deck === 'pavers' ? 'deck_pavers' : 'deck_porcelain'} />
    </>
  );
}

/* ------------------------------ objects ------------------------------ */

const LOUNGER = { w: 2.4 * FT, h: 6.5 * FT, gap: 1.4 * FT };
const UMBRELLA_D = 7 * FT;

/** Where the loungers and umbrella of a lounge set sit, in the set's local coordinates. */
function loungeParts(o: SceneObject) {
  const { w, h } = o.box;
  if (o.variant === 'lawn') {
    // Loungers lying sideways, stacked, with the umbrella below.
    return {
      loungers: [0, 1].map((i) => ({ x: 3, y: 2 + i * (LOUNGER.w + LOUNGER.gap), rotate: true })),
      umbrella: { x: (w - UMBRELLA_D) / 2, y: h - UMBRELLA_D },
    };
  }
  return {
    loungers: [0, 1].map((i) => ({ x: 2 + i * (LOUNGER.w + LOUNGER.gap), y: (h - LOUNGER.h) / 2, rotate: false })),
    umbrella: { x: w - UMBRELLA_D, y: (h - UMBRELLA_D) / 2 },
  };
}

export function Shadows({ layout }: { layout: SceneLayout }) {
  const tree = cast(9);
  const umbrella = cast(7.5);
  const lounger = cast(1.3);
  const kitchen = cast(3);
  const chair = cast(2.2);
  return (
    <g fill="#0b1c22">
      {layout.objects.map((o, i) => {
        const { x, y, w, h } = o.box;
        switch (o.kind) {
          case 'olive_tree':
            return <path key={i} d={treeShadowPath(w, i * 17 + 3, x + tree.dx, y + tree.dy)} opacity={0.26} />;
          case 'lounge_set': {
            const p = loungeParts(o);
            return (
              <g key={i} opacity={0.24}>
                {p.loungers.map((l, j) => (
                  <rect key={j} x={x + l.x + lounger.dx} y={y + l.y + lounger.dy} width={l.rotate ? LOUNGER.h : LOUNGER.w} height={l.rotate ? LOUNGER.w : LOUNGER.h} rx={3} />
                ))}
                <circle cx={x + p.umbrella.x + UMBRELLA_D / 2 + umbrella.dx} cy={y + p.umbrella.y + UMBRELLA_D / 2 + umbrella.dy} r={UMBRELLA_D / 2} />
              </g>
            );
          }
          case 'kitchen': {
            const depth = 3 * FT;
            const cx = o.variant === 'left' ? x : x + w - depth;
            return <rect key={i} x={cx + kitchen.dx} y={y + kitchen.dy} width={depth} height={h} opacity={0.26} />;
          }
          case 'patio_cover':
            return (
              <g key={i} transform={`translate(${r1(x)} ${r1(y)})`}>
                <PatioCoverShadow w={w} h={h} />
              </g>
            );
          case 'fire_pit': {
            const c = w / 2;
            const d = [45, 135, 225, 315]
              .map((deg) => {
                const a = (deg * Math.PI) / 180;
                return circlePath(x + c + Math.cos(a) * w * 0.33 + chair.dx, y + c + Math.sin(a) * w * 0.33 + chair.dy, FT * 1.35);
              })
              .join('');
            return <path key={i} d={d} opacity={0.22} />;
          }
          default:
            return null;
        }
      })}
    </g>
  );
}

export function Objects({ uid, layout, night }: { uid: string; layout: SceneLayout; night: boolean }) {
  // Trees last, so their canopies sit over anything they overhang.
  const ordered = [...layout.objects.map((o, i) => ({ o, i }))].sort((a, b) => Number(a.o.kind === 'olive_tree') - Number(b.o.kind === 'olive_tree'));
  return (
    <g>
      {ordered.map(({ o, i }) => (
        <g key={`${o.kind}-${i}`} className="ps-move" style={{ transform: `translate(${r1(o.box.x)}px, ${r1(o.box.y)}px)` }}>
          <SceneObjectView uid={uid} o={o} seed={i * 17 + 3} night={night} />
        </g>
      ))}
    </g>
  );
}

function SceneObjectView({ uid, o, seed, night }: { uid: string; o: SceneObject; seed: number; night: boolean }) {
  const { w, h } = o.box;
  switch (o.kind) {
    case 'olive_tree':
      return <OliveTree d={w} seed={seed} />;
    case 'kitchen':
      return <Kitchen w={w} h={h} side={o.variant} counterFill={`url(#${uid}-counter)`} />;
    case 'patio_cover':
      return <PatioCover w={w} h={h} padFill={`url(#${uid}-pad)`} night={night} />;
    case 'fire_pit':
      return <FirePit d={w} gravelFill={`url(#${uid}-gravel)`} stoneFill={`url(#${uid}-firestone)`} />;
    case 'lounge_set': {
      const p = loungeParts(o);
      return (
        <g>
          {p.loungers.map((l, j) =>
            l.rotate ? (
              <g key={j} transform={`translate(${r1(l.x + LOUNGER.h)} ${r1(l.y)}) rotate(90)`}>
                <Lounger w={LOUNGER.w} h={LOUNGER.h} />
              </g>
            ) : (
              <g key={j} transform={`translate(${r1(l.x)} ${r1(l.y)})`}>
                <Lounger w={LOUNGER.w} h={LOUNGER.h} />
              </g>
            ),
          )}
          <circle
            cx={o.variant === 'lawn' ? LOUNGER.h / 2 + 3 : 2 + LOUNGER.w + LOUNGER.gap / 2}
            cy={o.variant === 'lawn' ? 2 + LOUNGER.w + LOUNGER.gap / 2 : h / 2 - LOUNGER.h * 0.28}
            r={5.5}
            fill="#c9b79c"
            stroke="#8b7558"
            strokeWidth={1}
          />
          <g transform={`translate(${r1(p.umbrella.x)} ${r1(p.umbrella.y)})`}>
            <Umbrella d={UMBRELLA_D} />
          </g>
        </g>
      );
    }
    default:
      return null;
  }
}

/* ------------------------------- house ------------------------------- */

/** The house roof along the top edge, with its eave shadow on the walk. */
export function House({ uid }: { uid: string }) {
  const y = FRAME.roofH;
  const facet = { l: 360, r: 840, top: 46 };
  const panels: string[] = [];
  const cells: string[] = [];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 2; j++) {
      const px = 872 + i * 42;
      const py = 14 + j * 34;
      panels.push(`M${px} ${py}h39v31h-39Z`);
      for (let c = 1; c < 4; c++) cells.push(`M${px + c * 9.75} ${py}v31`);
      for (let c = 1; c < 6; c++) cells.push(`M${px} ${r1(py + c * 5.17)}h39`);
    }
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-roofshade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.1} />
          <stop offset="1" stopColor="#000000" stopOpacity={0.14} />
        </linearGradient>
        <linearGradient id={`${uid}-panelsky`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9dcf0" stopOpacity={0.28} />
          <stop offset="0.5" stopColor="#c9dcf0" stopOpacity={0.04} />
          <stop offset="1" stopColor="#c9dcf0" stopOpacity={0.14} />
        </linearGradient>
      </defs>
      {/* Eave shadow on the walk (sun upper left) */}
      <rect x={0} y={y} width={W} height={1.3 * FT} fill="#0b1a22" opacity={0.26} />
      <rect x={0} y={y} width={W} height={0.5 * FT} fill="#0b1a22" opacity={0.14} />
      <rect width={W} height={y} fill={`url(#${uid}-roof)`} />
      <rect width={W} height={y} fill={`url(#${uid}-roofshade)`} />
      {/* Hip roof over the back room, facing the yard */}
      <path d={`M${facet.l} ${y}L${facet.l + 60} ${facet.top}H${facet.r - 60}L${facet.r} ${y}Z`} fill="#000" opacity={0.07} />
      <path d={`M${facet.l} ${y}L${facet.l + 60} ${facet.top}H${facet.r - 60}L${facet.r} ${y}`} fill="none" stroke="#d9dadc" strokeOpacity={0.35} strokeWidth={2} />
      <path d={`M0 ${facet.top}H${facet.l + 60}M${facet.r - 60} ${facet.top}H${W}`} stroke="#d9dadc" strokeOpacity={0.22} strokeWidth={2} />
      {/* Solar panels and vents */}
      <path d={panels.join('')} fill="#1d2a3d" stroke="#8fa2b8" strokeOpacity={0.55} strokeWidth={0.8} />
      <path d={cells.join('')} stroke="#8fa2b8" strokeOpacity={0.28} strokeWidth={0.6} />
      <rect x={872} y={14} width={249} height={65} fill={`url(#${uid}-panelsky)`} />
      <circle cx={220} cy={70} r={5} fill="#7d8187" stroke="#2f3236" strokeWidth={1} />
      <circle cx={640} cy={28} r={4} fill="#7d8187" stroke="#2f3236" strokeWidth={1} />
      <rect x={150} y={22} width={30} height={22} rx={2} fill="#aab8c2" stroke="#e6e8ea" strokeWidth={2} />
      {/* Gutter */}
      <rect x={0} y={y - 5} width={W} height={5} fill="#eceae5" />
      <rect x={0} y={y - 1} width={W} height={1} fill="#000" opacity={0.25} />
    </g>
  );
}

/** Daylight pass: warm sun from the upper left, cool falloff and a soft vignette. */
export function DaylightPass({ uid }: { uid: string }) {
  return (
    <g pointerEvents="none">
      <defs>
        <linearGradient id={`${uid}-sun`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff4d6" stopOpacity={0.14} />
          <stop offset="0.5" stopColor="#fff4d6" stopOpacity={0} />
          <stop offset="1" stopColor="#0d2f3f" stopOpacity={0.1} />
        </linearGradient>
        <radialGradient id={`${uid}-vignette`} cx="0.5" cy="0.55" r="0.75">
          <stop offset="0.62" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.22} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-sun)`} />
      <rect width={W} height={H} fill={`url(#${uid}-vignette)`} />
    </g>
  );
}
