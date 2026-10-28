import type { Rect, SceneLayout, SpaLayout } from '@/lib/estimator/scene/geometry';
import { FRAME, YARD, poolOutlinePath } from '@/lib/estimator/scene/geometry';
import { TEXTURES } from '@/lib/estimator/scene/textures';
import { SCENE, type SceneSpec, type TextureId } from '@/lib/estimator/scene/types';
import { Crossfade } from './crossfade';
import { copingTexture, tileTexture, waterLook, type WaterLook } from './materials';
import { FireBowl, ShelfLounger, WaterBowl, cast } from './sprites';
import { rng, TexturePattern, tileSize } from './textures';

/**
 * The pool, back to front: deck (which also paves the walk along the house
 * when a new deck is picked, so it reads as one patio), coping (square-cornered
 * on rectangle and L pools), water (floor texture tinted by the finish, depth
 * gradient, wall shadow, caustics, ripples, sun glint), Baja shelf, waterline
 * tile, spa, lights and bowls on pedestals. Each material sits in its own
 * crossfading group keyed by the material, so a new pick fades in over the old.
 */

const FT = SCENE.pxPerFt;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Caustic tile period and the second layer's transform; the CSS drift moves exactly one lattice step. */
export const CAUSTICS = (() => {
  const t = tileSize('water_caustics');
  const k = 1.45;
  const deg = 28;
  const a = (deg * Math.PI) / 180;
  return { t, k, deg, b: { x: r1(k * t * Math.cos(a)), y: r1(k * t * Math.sin(a)) } };
})();

type Props = { uid: string; layout: SceneLayout; scene: SceneSpec; keys: { water: string; tile: string; coping: string; deck: string }; night: boolean };

/**
 * The deck outline: square corners against the house (the deck runs into the
 * walk there), `rx` on the two far corners. Always the same commands, so a
 * CSS `d` transition can tween it. `open` leaves out the house edge (for the outline stroke).
 */
export function deckPath(b: Rect, rx: number, open = false): string {
  const r = Math.max(0, Math.min(rx, b.w / 2, b.h / 2));
  const x2 = b.x + b.w;
  const y2 = b.y + b.h;
  const body = `V${r1(y2 - r)}Q${r1(b.x)} ${r1(y2)} ${r1(b.x + r)} ${r1(y2)}H${r1(x2 - r)}Q${r1(x2)} ${r1(y2)} ${r1(x2)} ${r1(y2 - r)}V${r1(b.y)}`;
  return `M${r1(b.x)} ${r1(b.y)}${body}${open ? '' : 'Z'}`;
}

export function PoolLayer({ uid, layout, scene, keys, night }: Props) {
  const { pool, deck } = layout;
  const box = pool.box;
  const waterClip = `${uid}-water`;
  const c = pool.coping;
  const shadowShift = poolOutlinePath(pool, 1.1 * FT, 0.9 * FT);
  const pad = 2 * FT;
  const fillBox = { x: box.x - pad, y: box.y - pad, width: box.w + 2 * pad, height: box.h + 2 * pad };
  const deckD = deckPath(deck.box, deck.rx);

  return (
    <g>
      <defs>
        <clipPath id={waterClip}>
          <path className="ps-morph" d={pool.path} />
        </clipPath>
        <clipPath id={`${uid}-deck`}>
          <path className="ps-morph" d={deckD} />
        </clipPath>
        {/* Saw-cut control joints every 10 ft on a new concrete deck. */}
        <pattern id={`${uid}-sawcut`} patternUnits="userSpaceOnUse" width={10 * FT} height={10 * FT} patternTransform={`translate(${r1(deck.box.x)} ${r1(deck.box.y)})`}>
          <path d={`M0 0H${10 * FT}M0 0V${10 * FT}`} stroke="#7f796e" strokeOpacity={0.55} strokeWidth={1.3} />
        </pattern>
      </defs>

      {/* Deck (a new one also paves the walk along the house: one continuous patio) */}
      <Crossfade k={keys.deck}>
        {(k) => {
          const existing = k === 'existing';
          const tex: TextureId = existing ? 'deck_concrete' : (k as TextureId);
          const id = `${uid}-deck-${k}`;
          return (
            <>
              <defs>
                <TexturePattern
                  id={id}
                  texture={tex}
                  transform={`translate(${r1(deck.box.x)} ${r1(deck.box.y)})`}
                  tone={existing ? { color: '#8f8676', opacity: 0.34 } : undefined}
                />
              </defs>
              {existing ? null : <rect x={YARD.x} y={FRAME.roofH} width={YARD.w} height={FRAME.walkH} fill={`url(#${id})`} />}
              <path className="ps-morph" d={deckD} fill={`url(#${id})`} />
              {tex === 'deck_concrete' ? (
                <path className="ps-morph" d={deckD} fill={`url(#${uid}-sawcut)`} opacity={existing ? 0.6 : 1} />
              ) : null}
              {existing ? <ExistingWear deck={deck.box} seed={Math.round(deck.box.w)} clip={`${uid}-deck`} /> : null}
            </>
          );
        }}
      </Crossfade>
      {deck.turfBands.length ? (
        <g clipPath={`url(#${uid}-deck)`}>
          {deck.turfBands.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={`url(#${uid}-turf)`} />
              <rect x={b.x + b.w - 0.8} y={b.y} width={0.8} height={b.h} fill="#000" opacity={0.15} />
            </g>
          ))}
        </g>
      ) : null}
      <path className="ps-morph" d={deckPath(deck.box, deck.rx, true)} fill="none" stroke="#3a3328" strokeOpacity={0.2} strokeWidth={1.6} />

      {/* Coping: square-cornered slabs around rectangle and L pools; a band following the curve on freeform */}
      {pool.copingPath ? (
        <>
          <path className="ps-morph" d={pool.copingPath} fill="#0e1c20" opacity={0.16} transform="translate(2.2 2.6)" />
          <path className="ps-morph" d={pool.copingPath} fill="none" stroke="#1d2a2c" strokeOpacity={0.3} strokeWidth={2.4} strokeLinejoin="miter" />
        </>
      ) : (
        <path className="ps-morph" d={pool.path} fill="none" stroke="#1d2a2c" strokeOpacity={0.28} strokeWidth={2 * c + 3} strokeLinejoin="round" />
      )}
      <Crossfade k={keys.coping}>
        {(k) => {
          const id = `${uid}-coping-${k}`;
          return (
            <>
              <defs>
                <TexturePattern id={id} texture={k as TextureId} />
              </defs>
              {pool.copingPath ? (
                <path className="ps-morph" d={pool.copingPath} fill={`url(#${id})`} />
              ) : (
                <path className="ps-morph" d={pool.path} fill="none" stroke={`url(#${id})`} strokeWidth={2 * c} strokeLinejoin="round" />
              )}
            </>
          );
        }}
      </Crossfade>
      {pool.copingJoints ? (
        <path className="ps-morph" d={pool.copingJoints} fill="none" stroke="#5d584f" strokeOpacity={0.4} strokeWidth={0.9} />
      ) : (
        <path
          className="ps-morph"
          d={pool.path}
          fill="none"
          stroke="#5d584f"
          strokeOpacity={0.35}
          strokeWidth={2 * c}
          strokeDasharray={`0.9 ${r1(2 * FT - 0.9)}`}
          strokeLinejoin="round"
        />
      )}
      {/* Sunlit outer arris of the coping */}
      {pool.copingPath ? <path className="ps-morph" d={pool.copingPath} fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={1} /> : null}

      {/* Water */}
      <g clipPath={`url(#${waterClip})`}>
        <Crossfade k={keys.water}>
          {(k) => {
            const look = waterLook(k === 'default' ? null : k);
            return <Water uid={uid} k={k} look={look} fillBox={fillBox} box={box} />;
          }}
        </Crossfade>
        {/* Shadow of the wall on the sun side, and darker water along every wall */}
        <path className="ps-morph" d={`${pool.path}${shadowShift}`} fillRule="evenodd" fill="#04374a" opacity={0.26} />
        <path className="ps-morph" d={pool.path} fill="none" stroke="#06485e" strokeOpacity={0.12} strokeWidth={30} />
        <path className="ps-morph" d={pool.path} fill="none" stroke="#06485e" strokeOpacity={0.14} strokeWidth={12} />
        {layout.baja ? <BajaShelf uid={uid} layout={layout} /> : null}
        <Caustics uid={uid} box={box} night={night} />
        {night ? null : <Surface uid={uid} box={box} />}
      </g>

      {/* Waterline tile band, inside the edge */}
      <g clipPath={`url(#${waterClip})`}>
        <path className="ps-morph" d={pool.path} fill="none" stroke="#062c38" strokeOpacity={0.35} strokeWidth={2 * pool.tile + 3.5} />
        <Crossfade k={keys.tile}>
          {(k) => {
            const id = `${uid}-tile-${k}`;
            return (
              <>
                <defs>
                  <TexturePattern id={id} texture={k as TextureId} />
                </defs>
                <path className="ps-morph" d={pool.path} fill="none" stroke={`url(#${id})`} strokeWidth={2 * pool.tile} />
              </>
            );
          }}
        </Crossfade>
      </g>
      <path className="ps-morph" d={pool.path} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1.2} />

      {layout.spa ? <Spa uid={uid} spa={layout.spa} scene={scene} night={night} /> : null}

      {layout.lights.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3.6} fill="#e9f3f4" stroke="#7d9aa1" strokeWidth={1} />
          <circle cx={p.x} cy={p.y} r={1.8} fill={night ? '#ffffff' : '#c6e4ea'} />
        </g>
      ))}

      <Bowls uid={uid} layout={layout} />
    </g>
  );
}

/** Floor texture, finish tint and depth gradient for one finish. */
function Water({ uid, k, look, fillBox, box }: { uid: string; k: string; look: WaterLook; fillBox: { x: number; y: number; width: number; height: number }; box: { x: number; y: number; w: number; h: number } }) {
  const floor = `${uid}-floor-${k}`;
  const depth = `${uid}-depth-${k}`;
  return (
    <>
      <defs>
        <TexturePattern id={floor} texture={look.floor} />
        <linearGradient id={depth} gradientUnits="userSpaceOnUse" x1={box.x} y1={box.y} x2={box.x + box.w} y2={box.y + box.h * 0.3}>
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.2} />
          <stop offset="0.32" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="0.62" stopColor={look.deep} stopOpacity={0} />
          <stop offset="1" stopColor={look.deep} stopOpacity={0.5} />
        </linearGradient>
      </defs>
      <rect {...fillBox} fill={`url(#${floor})`} />
      <rect {...fillBox} fill={look.tint} opacity={look.tintOpacity} />
      <rect {...fillBox} fill={`url(#${depth})`} />
    </>
  );
}

/**
 * Two caustic layers drifting slowly in different directions (CSS; paused
 * off screen and while typing, one layer only on touch screens, off under
 * reduced motion). The texture is white light in its alpha channel, so it
 * needs no blend mode (blend modes make every frame far more expensive to paint).
 */
function Caustics({ uid, box, night }: { uid: string; box: { x: number; y: number; w: number; h: number }; night: boolean }) {
  const t = CAUSTICS.t;
  const pad = 2 * t;
  const rect = { x: box.x - pad, y: box.y - pad, width: box.w + 2 * pad, height: box.h + 2 * pad };
  const image = !!TEXTURES.water_caustics.src;
  return (
    <g opacity={night ? 0.16 : image ? 0.5 : 0.3}>
      <defs>
        <TexturePattern id={`${uid}-ca`} texture="water_caustics" />
        <TexturePattern id={`${uid}-cb`} texture="water_caustics" transform={`rotate(${CAUSTICS.deg}) scale(${CAUSTICS.k})`} />
      </defs>
      <g className="ps-caustic-a">
        <rect {...rect} fill={`url(#${uid}-ca)`} />
      </g>
      <g className="ps-caustic-b" opacity={0.55}>
        <rect {...rect} fill={`url(#${uid}-cb)`} />
      </g>
    </g>
  );
}

/** Surface: sky reflection, wind ripples and a sun glint (daytime only). */
function Surface({ uid, box }: { uid: string; box: { x: number; y: number; w: number; h: number } }) {
  const rand = rng(Math.round(box.w * 7 + box.h));
  const n = Math.round(Math.min(46, Math.max(14, (box.w * box.h) / 1500)));
  const light: string[] = [];
  const dark: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = box.x + rand() * box.w;
    const y = box.y + rand() * box.h;
    const len = 6 + rand() * 12;
    light.push(`M${r1(x)} ${r1(y)}q${r1(len / 2)} ${r1(-2 - rand() * 2)} ${r1(len)} 0`);
    dark.push(`M${r1(x + 1)} ${r1(y + 2)}q${r1(len / 2)} -1.5 ${r1(len)} 0`);
  }
  const gx = box.x + box.w * 0.74;
  const gy = box.y + box.h * 0.3;
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-sky`} gradientUnits="userSpaceOnUse" cx={box.x + box.w * 0.25} cy={box.y + box.h * 0.2} r={Math.max(box.w, box.h) * 0.7}>
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.16} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}-glint`}>
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.55} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={`url(#${uid}-sky)`} />
      <path d={dark.join('')} stroke="#05465a" strokeOpacity={0.12} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <path d={light.join('')} stroke="#ffffff" strokeOpacity={0.32} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <ellipse cx={gx} cy={gy} rx={22} ry={12} fill={`url(#${uid}-glint)`} transform={`rotate(-18 ${r1(gx)} ${r1(gy)})`} />
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={i} cx={gx - 10 + i * 5} cy={gy + Math.sin(i * 1.7) * 4} rx={2.6} ry={0.9} fill="#ffffff" opacity={0.75} transform={`rotate(-18 ${r1(gx)} ${r1(gy)})`} />
      ))}
    </g>
  );
}

function BajaShelf({ uid, layout }: { uid: string; layout: SceneLayout }) {
  const baja = layout.baja!;
  const b = baja.box;
  const sh = cast(0.8);
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-baja`} gradientUnits="userSpaceOnUse" x1={b.x} y1={0} x2={baja.edgeX} y2={0}>
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.36} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0.22} />
        </linearGradient>
      </defs>
      <rect className="ps-morph" x={b.x - 30} y={b.y - 30} width={b.w + 30} height={b.h + 60} fill={`url(#${uid}-baja)`} />
      {/* The step down into the pool: lit lip, then shadow */}
      <rect className="ps-morph" x={baja.edgeX} y={b.y - 30} width={7} height={b.h + 60} fill="#043a4d" opacity={0.2} />
      <rect className="ps-morph" x={baja.edgeX - 1.6} y={b.y - 30} width={1.6} height={b.h + 60} fill="#ffffff" opacity={0.55} />
      {baja.loungers.map((l, i) => (
        <g key={i}>
          <rect x={l.x + sh.dx} y={l.y + sh.dy} width={l.w} height={l.h} rx={l.h / 2} fill="#04394b" opacity={0.25} />
          <g className="ps-move" style={{ transform: `translate(${r1(l.x)}px, ${r1(l.y)}px)` }}>
            <ShelfLounger w={l.w} h={l.h} />
          </g>
          {/* A few inches of water over the lounger */}
          <rect x={l.x} y={l.y + l.h * 0.15} width={l.w} height={l.h * 0.7} rx={l.h / 3} fill="#5fd6e4" opacity={0.12} />
        </g>
      ))}
    </g>
  );
}

function Spa({ uid, spa, scene, night }: { uid: string; spa: SpaLayout; scene: SceneSpec; night: boolean }) {
  const b = spa.box;
  const rim = Math.max(5, Math.min(b.w * 0.13, 1.1 * FT));
  const look = waterLook(scene.surface);
  const sh = cast(1.6);
  const floor = `${uid}-spa-floor`;
  const tile = `${uid}-spa-tile`;
  const cap = `${uid}-spa-cap`;
  const round = spa.shape === 'round';
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const R = b.w / 2;
  const inner = { x: b.x + rim, y: b.y + rim, w: b.w - 2 * rim, h: b.h - 2 * rim };
  const shape = (inset: number, props: Record<string, unknown>) =>
    round ? (
      <circle cx={cx} cy={cy} r={Math.max(1, R - inset)} {...props} />
    ) : (
      <rect x={b.x + inset} y={b.y + inset} width={Math.max(1, b.w - 2 * inset)} height={Math.max(1, b.h - 2 * inset)} rx={Math.max(1.5, 3 - inset * 0.1)} {...props} />
    );
  const rand = rng(Math.round(b.x + b.y));
  const jets = Array.from({ length: 9 }, () => {
    const a = rand() * Math.PI * 2;
    const d = (Math.min(inner.w, inner.h) / 2) * (0.55 + rand() * 0.3);
    return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 1 + rand() * 2 };
  });
  const s = spa.spill;
  const sheet = 1.3 * FT;
  return (
    <g>
      <defs>
        <TexturePattern id={floor} texture={look.floor} />
        <TexturePattern id={tile} texture={tileTexture(scene.tile)} />
        <TexturePattern id={cap} texture={copingTexture(scene.coping)} />
        <radialGradient id={`${uid}-spa-glow`} gradientUnits="userSpaceOnUse" cx={cx - R * 0.2} cy={cy - R * 0.2} r={R}>
          <stop offset="0" stopColor="#ffffff" stopOpacity={night ? 0 : 0.28} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* Raised spa: shadow on the water and deck */}
      {round ? (
        <circle cx={cx + sh.dx} cy={cy + sh.dy} r={R} fill="#062f3c" opacity={0.3} />
      ) : (
        <rect x={b.x + sh.dx} y={b.y + sh.dy} width={b.w} height={b.h} rx={3} fill="#062f3c" opacity={0.3} />
      )}
      {/* Water sheeting over the spillway into the pool */}
      <SpillSheet uid={uid} spa={spa} len={sheet} />
      {/* Raised wall: a coping cap you see from above, then the dark tile face inside it */}
      {shape(0, { fill: `url(#${cap})` })}
      {shape(0, { fill: 'none', stroke: '#ffffff', strokeOpacity: 0.4, strokeWidth: 1 })}
      {shape(rim * 0.58, { fill: '#2b363c' })}
      {shape(rim * 0.8, { fill: '#3a464c', opacity: 0.9 })}
      {shape(rim, { fill: `url(#${floor})` })}
      {shape(rim, { fill: look.tint, opacity: look.tintOpacity * 0.85 })}
      {shape(rim, { fill: 'none', stroke: `url(#${tile})`, strokeWidth: 5 })}
      {shape(rim + 0.95 * FT, { fill: 'none', stroke: '#ffffff', strokeOpacity: 0.14, strokeWidth: 0.9 * FT })}
      {shape(rim, { fill: `url(#${uid}-spa-glow)` })}
      <g fill="#ffffff" opacity={0.6}>
        {jets.map((j, i) => (
          <circle key={i} cx={r1(j.x)} cy={r1(j.y)} r={r1(j.r)} />
        ))}
      </g>
      {/* Spillway lip */}
      {s.side === 'left' ? (
        <rect x={b.x - 0.5} y={s.y1} width={rim + 1} height={s.y2 - s.y1} fill="#d8d3c8" />
      ) : round ? (
        <path d={`M${r1(s.x1)} ${r1(s.y1)}Q${r1(cx)} ${r1(b.y + b.h + 2)} ${r1(s.x2)} ${r1(s.y2)}`} stroke="#d8d3c8" strokeWidth={rim * 0.9} fill="none" />
      ) : (
        <rect x={s.x1} y={b.y + b.h - rim - 0.5} width={s.x2 - s.x1} height={rim + 1} fill="#d8d3c8" />
      )}
    </g>
  );
}

function SpillSheet({ uid, spa, len }: { uid: string; spa: SpaLayout; len: number }) {
  const s = spa.spill;
  const id = `${uid}-spill`;
  const left = s.side === 'left';
  const x = left ? s.x1 - len : s.x1;
  const y = left ? s.y1 : spa.shape === 'round' ? s.y1 - 2 : s.y1;
  const w = left ? len : s.x2 - s.x1;
  const h = left ? s.y2 - s.y1 : len;
  const streaks: string[] = [];
  for (let i = 1; i < 6; i++) {
    streaks.push(left ? `M${r1(x + len)} ${r1(y + (h * i) / 6)}h${r1(-len * 0.8)}` : `M${r1(x + (w * i) / 6)} ${r1(y)}v${r1(len * 0.8)}`);
  }
  return (
    <g>
      <defs>
        <linearGradient id={id} x1={left ? 1 : 0} y1={0} x2={0} y2={left ? 0 : 1}>
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.85} />
          <stop offset="0.5" stopColor="#e6fbff" stopOpacity={0.45} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} />
      <path d={streaks.join('')} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={0.8} />
    </g>
  );
}

/** An existing, weathered slab: a few stains and hairline cracks, so a new deck visibly upgrades it. */
function ExistingWear({ deck, seed, clip }: { deck: Rect; seed: number; clip: string }) {
  const rand = rng(seed);
  const stains = Array.from({ length: 7 }, () => ({
    x: deck.x + rand() * deck.w,
    y: deck.y + rand() * deck.h,
    rx: 2 * FT + rand() * 4 * FT,
    ry: 1.5 * FT + rand() * 3 * FT,
  }));
  const cracks: string[] = [];
  for (let i = 0; i < 4; i++) {
    let x = deck.x + rand() * deck.w;
    let y = deck.y + rand() * deck.h;
    let d = `M${r1(x)} ${r1(y)}`;
    for (let j = 0; j < 5; j++) {
      x += (rand() - 0.3) * 1.6 * FT;
      y += (rand() - 0.5) * 1.2 * FT;
      d += `L${r1(x)} ${r1(y)}`;
    }
    cracks.push(d);
  }
  return (
    <g clipPath={`url(#${clip})`}>
      {stains.map((st, i) => (
        <ellipse key={i} cx={r1(st.x)} cy={r1(st.y)} rx={r1(st.rx)} ry={r1(st.ry)} fill="#5f574a" opacity={0.07} />
      ))}
      <path d={cracks.join('')} fill="none" stroke="#4a443b" strokeOpacity={0.3} strokeWidth={0.7} />
    </g>
  );
}

/**
 * Fire and water bowls standing on square stucco pedestals at the pool's edge
 * (like the Pool Masters jobs), each casting a shadow down and to the right.
 * Water bowls pour a sheet into the pool; fire bowls warm the coping around them.
 */
function Bowls({ uid, layout }: { uid: string; layout: SceneLayout }) {
  if (!layout.bowls.length) return null;
  const sh = cast(3.2);
  const side = (b: { r: number }) => b.r * 2.12;
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-sheet`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
          <stop offset="0.55" stopColor="#e9fbff" stopOpacity={0.7} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0.25} />
        </linearGradient>
        <radialGradient id={`${uid}-firewarm`}>
          <stop offset="0" stopColor="#ffb35c" stopOpacity={0.22} />
          <stop offset="1" stopColor="#ffb35c" stopOpacity={0} />
        </radialGradient>
      </defs>
      {layout.bowls.map((b, i) => (
        <rect key={`s${i}`} x={b.cx - side(b) / 2 + sh.dx} y={b.cy - side(b) / 2 + sh.dy} width={side(b)} height={side(b)} rx={1.5} fill="#0b2129" opacity={0.28} />
      ))}
      {layout.bowls.map((b, i) =>
        b.kind === 'fire' ? <circle key={`f${i}`} cx={b.cx} cy={b.cy} r={b.r * 2.4}  fill={`url(#${uid}-firewarm)`} /> : null,
      )}
      {layout.bowls.map((b, i) => {
        if (!b.spillTo) return null;
        const top = b.cy + b.r * 0.7;
        const lip = b.r * 0.28;
        const foot = b.r * 0.42;
        const { x, y } = b.spillTo;
        return (
          <g key={`w${i}`}>
            <path d={`M${r1(b.cx - lip)} ${r1(top)}L${r1(b.cx + lip)} ${r1(top)}L${r1(x + foot)} ${r1(y)}L${r1(x - foot)} ${r1(y)}Z`} fill={`url(#${uid}-sheet)`} />
            <path d={`M${r1(b.cx)} ${r1(top)}L${r1(x)} ${r1(y)}`} stroke="#bdf1f7" strokeOpacity={0.8} strokeWidth={1.1} />
            <ellipse cx={x} cy={y} rx={foot * 1.4} ry={foot * 0.8} fill="#ffffff" opacity={0.55} />
            <ellipse cx={x} cy={y + 1} rx={foot * 2.4} ry={foot * 1.4} fill="none" stroke="#ffffff" strokeOpacity={0.4} strokeWidth={1.2} />
            <ellipse cx={x} cy={y + 2} rx={foot * 3.6} ry={foot * 2.1} fill="none" stroke="#ffffff" strokeOpacity={0.18} strokeWidth={1} />
          </g>
        );
      })}
      {layout.bowls.map((b, i) => (
        <g key={`b${i}`} className="ps-move" style={{ transform: `translate(${r1(b.cx - b.r)}px, ${r1(b.cy - b.r)}px)` }}>
          {/* Pedestal: light stucco block with a sunlit top-left edge */}
          <rect x={b.r - side(b) / 2} y={b.r - side(b) / 2} width={side(b)} height={side(b)} rx={1.5} fill="#d8d2c6" />
          <path d={`M${r1(b.r - side(b) / 2 + 0.8)} ${r1(b.r + side(b) / 2 - 1)}V${r1(b.r - side(b) / 2 + 0.8)}H${r1(b.r + side(b) / 2 - 1)}`} fill="none" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1.2} />
          <rect x={b.r - side(b) / 2} y={b.r - side(b) / 2} width={side(b)} height={side(b)} rx={1.5} fill="none" stroke="#3a3328" strokeOpacity={0.3} strokeWidth={0.9} />
          <g transform={`translate(${r1(b.r * 0.06)} ${r1(b.r * 0.06)}) scale(0.94)`}>{b.kind === 'fire' ? <FireBowl r={b.r} /> : <WaterBowl r={b.r} />}</g>
        </g>
      ))}
    </g>
  );
}

