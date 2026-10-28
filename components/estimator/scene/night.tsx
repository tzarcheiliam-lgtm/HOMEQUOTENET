import { FRAME, type SceneLayout } from '@/lib/estimator/scene/geometry';
import { SCENE, type SceneSpec } from '@/lib/estimator/scene/types';
import { Flame } from './sprites';

/**
 * Dusk: a deep blue wash over the yard, lighter around the pool (its glow
 * lifts the deck, like the night drone photos) and darkest at the walls, then
 * everything that gives off light drawn on top of it: glowing pool water
 * (brighter, with a violet edge, when LED lights are picked), the spa, water
 * bowls lit from below, fire bowls and the fire pit with warm 2700K light
 * pooling on the deck, warm window spill from the house, eave and path
 * lights, and uplit trees. Gradients only, no filters, so it stays cheap.
 */

const FT = SCENE.pxPerFt;
const W = SCENE.width;
const H = SCENE.height;
const r1 = (n: number) => Math.round(n * 10) / 10;

export function NightLayer({ uid, layout, scene }: { uid: string; layout: SceneLayout; scene: SceneSpec }) {
  const { pool, spa } = layout;
  const box = pool.box;
  const lit = scene.features.lights;
  const glow = lit ? '#5fe6ff' : '#3fb6cc';
  const g = (id: string) => `url(#${uid}-n-${id})`;
  const eave = [];
  for (let x = 70; x < W; x += 14 * FT) eave.push(x);
  const fires = layout.bowls.filter((b) => b.kind === 'fire');
  const pit = layout.objects.find((o) => o.kind === 'fire_pit');
  const cover = layout.objects.find((o) => o.kind === 'patio_cover');
  const kitchen = layout.objects.find((o) => o.kind === 'kitchen');
  const trees = layout.objects.filter((o) => o.kind === 'olive_tree');

  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={`${uid}-n-water`} cx="0.5" cy="0.5" r="0.62">
          {lit ? (
            <>
              <stop offset="0" stopColor="#c8fdff" />
              <stop offset="0.45" stopColor="#52def3" />
              <stop offset="0.82" stopColor="#3b86ef" />
              <stop offset="1" stopColor="#5a47d4" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#62d4e2" />
              <stop offset="0.6" stopColor="#2391b3" />
              <stop offset="1" stopColor="#163f7a" />
            </>
          )}
        </radialGradient>
        <radialGradient id={`${uid}-n-led`}>
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
          <stop offset="0.25" stopColor="#bff8ff" stopOpacity={0.7} />
          <stop offset="1" stopColor="#5fe6ff" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}-n-spa`} cx="0.45" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#d4fbff" />
          <stop offset="0.4" stopColor={lit ? '#7fe3fa' : '#5cc4d8'} />
          <stop offset="1" stopColor={lit ? '#3f8fe8' : '#2a86a8'} />
        </radialGradient>
        <radialGradient id={`${uid}-n-warm`}>
          <stop offset="0" stopColor="#ffbf5e" stopOpacity={0.6} />
          <stop offset="0.45" stopColor="#ff9a3c" stopOpacity={0.22} />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}-n-soft`}>
          <stop offset="0" stopColor="#ffe2a6" stopOpacity={0.5} />
          <stop offset="1" stopColor="#ffe2a6" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}-n-uplight`}>
          <stop offset="0" stopColor="#ffe6b0" stopOpacity={0.3} />
          <stop offset="0.5" stopColor="#ffd890" stopOpacity={0.1} />
          <stop offset="1" stopColor="#ffd890" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}-n-window`} cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#ffcf86" stopOpacity={0.75} />
          <stop offset="0.55" stopColor="#ffcf86" stopOpacity={0.22} />
          <stop offset="1" stopColor="#ffcf86" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}-n-sky`} gradientUnits="userSpaceOnUse" cx={box.x + box.w / 2} cy={box.y + box.h / 2} r={Math.max(box.w, box.h) * 0.6 + 26 * FT}>
          <stop offset="0" stopColor="#0d1f48" stopOpacity={0.58} />
          <stop offset="0.45" stopColor="#0b1a3d" stopOpacity={0.7} />
          <stop offset="1" stopColor="#050c22" stopOpacity={0.86} />
        </radialGradient>
        <radialGradient id={`${uid}-n-hearth`}>
          <stop offset="0" stopColor="#ffb35c" stopOpacity={0.5} />
          <stop offset="0.35" stopColor="#ffb35c" stopOpacity={0.3} />
          <stop offset="1" stopColor="#ff9a3c" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}-n-spill`}>
          <stop offset="0" stopColor="#b8f6ff" stopOpacity={0.75} />
          <stop offset="1" stopColor="#5fe6ff" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Dusk wash: lighter near the glowing pool */}
      <rect width={W} height={H} fill={g('sky')} />

      {/* Warm light from the house */}
      <clipPath id={`${uid}-n-yard`}>
        <rect x={0} y={FRAME.roofH} width={W} height={H - FRAME.roofH} />
      </clipPath>
      <g clipPath={`url(#${uid}-n-yard)`}>
        {layout.windows.map((w, i) => (
          <ellipse key={i} cx={w.x + w.w / 2} cy={FRAME.roofH} rx={w.w * 0.75} ry={7 * FT} fill={g('window')} />
        ))}
      </g>
      {eave.map((x) => (
        <g key={x}>
          <circle cx={x} cy={FRAME.roofH + 6} r={30} fill={g('soft')} opacity={0.6} />
          <circle cx={x} cy={FRAME.roofH + 3} r={1.8} fill="#fff4d8" />
        </g>
      ))}

      {trees.map((t, i) => (
        <circle key={i} cx={t.box.x + t.box.w * 0.5} cy={t.box.y + t.box.h * 0.55} r={t.box.w * 0.48} fill={g('uplight')} />
      ))}

      {cover ? (
        <g>
          <ellipse cx={cover.box.x + cover.box.w / 2} cy={cover.box.y + cover.box.h / 2} rx={cover.box.w * 0.8} ry={cover.box.h * 0.8} fill={g('hearth')} opacity={0.8} />
          <ellipse cx={cover.box.x + cover.box.w / 2} cy={cover.box.y + cover.box.h / 2} rx={cover.box.w * 0.62} ry={cover.box.h * 0.62} fill={g('soft')} />
          {Array.from({ length: 4 }, (_, row) =>
            Array.from({ length: 6 }, (_, col) => (
              <circle
                key={`${row}-${col}`}
                cx={cover.box.x + (cover.box.w * (col + 0.5)) / 6}
                cy={cover.box.y + (cover.box.h * (row + 0.5)) / 4}
                r={1.6}
                fill="#fff0c4"
              />
            )),
          )}
        </g>
      ) : null}
      {kitchen ? (
        <ellipse
          cx={kitchen.variant === 'left' ? kitchen.box.x + kitchen.box.w * 0.6 : kitchen.variant === 'house' ? kitchen.box.x + kitchen.box.w / 2 : kitchen.box.x + kitchen.box.w * 0.4}
          cy={kitchen.box.y + kitchen.box.h / 2}
          rx={kitchen.box.w * 0.9}
          ry={kitchen.box.h * 0.6}
          fill={g('soft')}
          opacity={0.8}
        />
      ) : null}

      {/* Pool: halo on the coping and deck, then glowing water */}
      <path className="ps-morph" d={pool.path} fill="none" stroke={glow} strokeOpacity={lit ? 0.06 : 0.04} strokeWidth={96} strokeLinejoin="round" />
      <path className="ps-morph" d={pool.path} fill="none" stroke={glow} strokeOpacity={lit ? 0.09 : 0.06} strokeWidth={58} strokeLinejoin="round" />
      <path className="ps-morph" d={pool.path} fill="none" stroke={glow} strokeOpacity={lit ? 0.14 : 0.09} strokeWidth={30} strokeLinejoin="round" />
      <g clipPath={`url(#${uid}-water)`}>
        <path className="ps-morph" d={pool.path} fill={g('water')} opacity={lit ? 0.92 : 0.8} />
        <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={`url(#${uid}-ca)`} opacity={lit ? 0.22 : 0.12} />
        {layout.baja ? <rect x={layout.baja.box.x} y={box.y} width={layout.baja.box.w} height={box.h} fill="#e8feff" opacity={0.16} /> : null}
        {layout.baja?.loungers.map((l, i) => <rect key={i} x={l.x} y={l.y} width={l.w} height={l.h} rx={l.h / 2} fill="#eafcff" opacity={0.3} />)}
        {layout.lights.map((p, i) => {
          const r = Math.min(box.h * 0.6, 7 * FT);
          return <ellipse key={i} cx={p.x} cy={p.y - r * 0.25} rx={r} ry={r * 0.8} fill={g('led')} />;
        })}
        <path className="ps-morph" d={pool.path} fill="none" stroke="#ffffff" strokeOpacity={lit ? 0.35 : 0.2} strokeWidth={3} />
      </g>
      {spa ? (
        spa.shape === 'round' ? (
          <circle cx={spa.box.x + spa.box.w / 2} cy={spa.box.y + spa.box.h / 2} r={spa.box.w / 2 - Math.min(spa.box.w * 0.13, 1.1 * FT)} fill={g('spa')} opacity={0.82} />
        ) : (
          <rect
            x={spa.box.x + Math.min(spa.box.w * 0.13, 1.1 * FT)}
            y={spa.box.y + Math.min(spa.box.w * 0.13, 1.1 * FT)}
            width={spa.box.w - 2 * Math.min(spa.box.w * 0.13, 1.1 * FT)}
            height={spa.box.h - 2 * Math.min(spa.box.w * 0.13, 1.1 * FT)}
            rx={2}
            fill={g('spa')}
            opacity={0.82}
          />
        )
      ) : null}
      {layout.lights.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.4} fill="#ffffff" />
      ))}

      {/* Water bowls: lit from below, the sheet glowing where it meets the pool */}
      {layout.bowls.map((b, i) =>
        b.spillTo ? (
          <g key={`w${i}`}>
            <circle cx={b.cx} cy={b.cy} r={b.r * 0.75} fill={g('spill')} />
            <ellipse cx={b.spillTo.x} cy={b.spillTo.y} rx={b.r * 1.3} ry={b.r * 0.8} fill={g('spill')} />
            <path d={`M${r1(b.cx)} ${r1(b.cy + b.r * 0.7)}L${r1(b.spillTo.x)} ${r1(b.spillTo.y)}`} stroke="#c8fbff" strokeOpacity={0.7} strokeWidth={b.r * 0.4} strokeLinecap="round" />
          </g>
        ) : null,
      )}

      {/* Fire: warm 2700K light pooling on the deck around each flame */}
      {fires.map((b, i) => (
        <g key={i}>
          <circle cx={b.cx} cy={b.cy} r={7 * FT} fill={g('hearth')} />
          <circle cx={b.cx} cy={b.cy} r={3 * FT} fill={g('warm')} />
          <Flame cx={b.cx} cy={b.cy} r={b.r * 0.58} />
        </g>
      ))}
      {pit ? (
        <g>
          <circle cx={pit.box.x + pit.box.w / 2} cy={pit.box.y + pit.box.h / 2} r={pit.box.w * 0.85} fill={g('hearth')} />
          <circle cx={pit.box.x + pit.box.w / 2} cy={pit.box.y + pit.box.h / 2} r={pit.box.w * 0.45} fill={g('warm')} />
          <Flame cx={pit.box.x + pit.box.w / 2} cy={pit.box.y + pit.box.h / 2} r={Math.min(2.4 * FT, pit.box.w * 0.19) * 0.55} />
        </g>
      ) : null}

      {/* Path lights */}
      {layout.pathLights.map((p, i) => (
        <g key={i}>
          <circle cx={r1(p.x)} cy={r1(p.y)} r={16} fill={g('soft')} />
          <circle cx={r1(p.x)} cy={r1(p.y)} r={1.8} fill="#fff6dc" />
        </g>
      ))}
    </g>
  );
}
