import type { CSSProperties } from 'react';
import type { Rect, SceneLayout } from '@/lib/estimator/scene/geometry';
import { sparkleSpots, type SceneHighlight } from '@/lib/estimator/scene/highlights';
import { SCENE } from '@/lib/estimator/scene/types';
import { deckPath } from './water';

/**
 * The short "this is what changed" moment on the picture after a pick: a soft
 * band of light sweeping over new coping, tile or deck, rings spreading on the
 * water for a new finish, a glow around a resized pool, and a sparkle where a
 * feature or extra was added (with a ring that pings outward, so it reads
 * even when the camera shows the whole yard). Drawn inside the camera, so it lands on the spot
 * at any zoom. Every piece starts invisible and animates opacity/transform
 * only; under reduced motion the whole layer is hidden (see pool-scene CSS),
 * and the panel removes it after HIGHLIGHT_MS anyway.
 */

/** Sweep, ring and sparkle CSS (classes `ps-hl-*`); included in PoolScene's style block. */
export const HIGHLIGHT_CSS = `
.ps-hl *{transform-box:fill-box;transform-origin:center}
.ps-hl-wash{opacity:0;animation:ps-hl-wash 520ms ease-out both}
@keyframes ps-hl-wash{0%{opacity:0}30%{opacity:.32}100%{opacity:0}}
.ps-hl-sweep{opacity:0;animation:ps-hl-sweep 520ms cubic-bezier(.45,.05,.35,1) both}
@keyframes ps-hl-sweep{0%{opacity:0;transform:translateX(0)}18%{opacity:1}82%{opacity:1}100%{opacity:0;transform:translateX(200%)}}
.ps-hl-ring{opacity:0;animation:ps-hl-ring 560ms cubic-bezier(.22,.8,.24,1) both}
@keyframes ps-hl-ring{0%{opacity:.9;transform:scale(.1)}100%{opacity:0;transform:none}}
.ps-hl-edge{opacity:0;animation:ps-hl-edge 520ms ease-out both}
@keyframes ps-hl-edge{0%{opacity:0}30%{opacity:1}100%{opacity:0}}
.ps-hl-glow{opacity:0;animation:ps-hl-glow 520ms ease-out both}
@keyframes ps-hl-glow{0%{opacity:0;transform:scale(.3)}35%{opacity:.85}100%{opacity:0;transform:scale(1.25)}}
.ps-hl-star{opacity:0;animation:ps-hl-star 480ms cubic-bezier(.22,.8,.24,1) both}
@keyframes ps-hl-star{0%{opacity:0;transform:scale(0) rotate(0deg)}40%{opacity:1;transform:scale(1.1) rotate(25deg)}100%{opacity:0;transform:scale(.4) rotate(70deg)}}
.ps-hl-ping{opacity:0;animation:ps-hl-ping 560ms cubic-bezier(.22,.8,.24,1) both}
@keyframes ps-hl-ping{0%{opacity:0;transform:scale(.55)}20%{opacity:1}100%{opacity:0;transform:scale(1.5)}}
@media (prefers-reduced-motion:reduce){.ps-hl{display:none}}
`;

const r1 = (n: number) => Math.round(n * 10) / 10;
/** Start offsets stay small so every highlight ends inside HIGHLIGHT_MS (the longest runs 560 ms). */
const delay = (ms: number): CSSProperties => ({ animationDelay: `${Math.min(ms, 130)}ms` });

/** Four-pointed glint, centred on 0,0. */
function starPath(r: number): string {
  const k = r * 0.16;
  return `M0 ${-r}C${k} ${-k} ${k} ${-k} ${r} 0C${k} ${k} ${k} ${k} 0 ${r}C${-k} ${k} ${-k} ${k} ${-r} 0C${-k} ${-k} ${-k} ${-k} 0 ${-r}Z`;
}

/** A quick lift of the whole area, plus a band of light crossing it (draw inside the area's mask). */
function Sweep({ id, box, at }: { id: string; box: Rect; at: number }) {
  return (
    <>
      <rect className="ps-hl-wash" style={delay(at)} x={r1(box.x)} y={r1(box.y)} width={r1(box.w)} height={r1(box.h)} fill="#fff" />
      {/* The band starts one width to the left of the area and travels two widths (translateX(200%) of itself). */}
      <rect className="ps-hl-sweep" style={delay(at)} x={r1(box.x - box.w)} y={r1(box.y)} width={r1(box.w)} height={r1(box.h)} fill={`url(#${id})`} />
    </>
  );
}

export function SceneHighlights({ uid, layout, items }: { uid: string; layout: SceneLayout; items: readonly SceneHighlight[] }) {
  if (items.length === 0) return null;
  const { pool, deck } = layout;
  const band = `${uid}-hl-band`;
  const ringR = Math.max(pool.box.w, pool.box.h) * 0.42;
  const cx = pool.box.x + pool.box.w / 2;
  const cy = pool.box.y + pool.box.h / 2;
  // The coping as a shape: the slab outline (or the band around a freeform pool) minus the water.
  const copingShape = (
    <>
      {pool.copingPath ? (
        <path d={pool.copingPath} fill="#fff" />
      ) : (
        <path d={pool.path} fill="#fff" stroke="#fff" strokeWidth={2 * pool.coping} strokeLinejoin="round" />
      )}
      <path d={pool.path} fill="#000" />
    </>
  );
  return (
    <g className="ps-hl" pointerEvents="none" data-highlights={items.map((h) => (h.kind === 'sparkle' ? h.target : h.kind)).join(' ')}>
      <defs>
        <linearGradient id={band} x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0.28" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0.95} />
          <stop offset="0.72" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={`${uid}-hl-glow`}>
          <stop offset="0" stopColor="#fff" stopOpacity={0.9} />
          <stop offset="0.45" stopColor="#fff8e6" stopOpacity={0.35} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      {items.map((h, i) => {
        const at = i * 40;
        switch (h.kind) {
          case 'coping': {
            const mask = `${uid}-hl-coping`;
            return (
              <g key="coping">
                <mask id={mask} maskUnits="userSpaceOnUse" x={0} y={0} width={SCENE.width} height={SCENE.height}>{copingShape}</mask>
                <g mask={`url(#${mask})`}>
                  <Sweep id={band} box={layout.core} at={at} />
                </g>
              </g>
            );
          }
          case 'tile': {
            const mask = `${uid}-hl-tile`;
            return (
              <g key="tile" clipPath={`url(#${uid}-water)`}>
                <mask id={mask} maskUnits="userSpaceOnUse" x={0} y={0} width={SCENE.width} height={SCENE.height}>
                  <path d={pool.path} fill="none" stroke="#fff" strokeWidth={2 * pool.tile + 2} />
                </mask>
                <g mask={`url(#${mask})`}>
                  <Sweep id={band} box={layout.core} at={at} />
                </g>
              </g>
            );
          }
          case 'deck': {
            const mask = `${uid}-hl-deck`;
            return (
              <g key="deck">
                <mask id={mask} maskUnits="userSpaceOnUse" x={0} y={0} width={SCENE.width} height={SCENE.height}>
                  <path d={deckPath(deck.box, deck.rx)} fill="#fff" />
                  {pool.copingPath ? (
                    <path d={pool.copingPath} fill="#000" />
                  ) : (
                    <path d={pool.path} fill="#000" stroke="#000" strokeWidth={2 * pool.coping} />
                  )}
                </mask>
                <g mask={`url(#${mask})`}>
                  <Sweep id={band} box={deck.box} at={at} />
                </g>
                {/* A light deck barely brightens, so its edge against the lawn lights up too. */}
                <g className="ps-hl-edge" style={delay(at)}>
                  <path d={deckPath(deck.box, deck.rx, true)} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={10} strokeLinejoin="round" />
                  <path d={deckPath(deck.box, deck.rx, true)} fill="none" stroke="#fff" strokeOpacity={0.95} strokeWidth={2.5} strokeLinejoin="round" />
                </g>
              </g>
            );
          }
          case 'water':
            return (
              <g key="water" clipPath={`url(#${uid}-water)`}>
                {[0, 1, 2].map((j) => (
                  <circle
                    key={j}
                    className="ps-hl-ring"
                    style={delay(at + j * 60)}
                    cx={r1(cx)}
                    cy={r1(cy)}
                    r={r1(ringR * (1 - j * 0.18))}
                    fill="none"
                    stroke="#fff"
                    strokeOpacity={0.85}
                    strokeWidth={2.5}
                    // Screen pixels: the ring stays a crisp line while it grows, at any camera zoom.
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
            );
          case 'pool':
            return (
              <g key="pool" className="ps-hl-edge" style={delay(at)}>
                <path d={pool.path} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={10} strokeLinejoin="round" />
                <path d={pool.path} fill="none" stroke="#fff" strokeOpacity={0.95} strokeWidth={2.5} strokeLinejoin="round" />
              </g>
            );
          case 'sparkle':
            return (
              <g key={`sparkle-${h.target}`}>
                {sparkleSpots(layout, h.target).map((p, j) => (
                  <g key={j} transform={`translate(${r1(p.x)} ${r1(p.y)})`}>
                    <circle className="ps-hl-glow" style={delay(at + j * 50)} r={60} fill={`url(#${uid}-hl-glow)`} />
                    {/* A ring in screen pixels: still easy to spot when the camera is zoomed out to the whole yard. */}
                    <circle
                      className="ps-hl-ping"
                      style={delay(at + j * 50)}
                      r={46}
                      fill="none"
                      stroke="#fff"
                      strokeOpacity={0.95}
                      strokeWidth={3}
                      vectorEffect="non-scaling-stroke"
                    />
                    <path className="ps-hl-star" style={delay(at + j * 50 + 40)} d={starPath(30)} fill="#fff" />
                    {/* Two small glints beside the big one. */}
                    <g transform="translate(26 -22)">
                      <path className="ps-hl-star" style={delay(at + j * 50 + 90)} d={starPath(11)} fill="#fff" />
                    </g>
                    <g transform="translate(-24 18)">
                      <path className="ps-hl-star" style={delay(at + j * 50 + 120)} d={starPath(8)} fill="#fff8e6" />
                    </g>
                  </g>
                ))}
              </g>
            );
        }
      })}
    </g>
  );
}
