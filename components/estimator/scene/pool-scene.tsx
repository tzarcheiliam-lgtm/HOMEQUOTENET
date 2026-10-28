'use client';

import { useId, useMemo } from 'react';
import { layoutScene } from '@/lib/estimator/scene/geometry';
import type { SceneSpec } from '@/lib/estimator/scene/types';
import { SCENE } from '@/lib/estimator/scene/types';
import { FADE_MS, useFadeKeys } from './crossfade';
import { materialKeys } from './materials';
import { NightLayer } from './night';
import { CAUSTICS, PoolLayer } from './water';
import { DaylightPass, Ground, GroundDefs, House, Objects, Shadows } from './yard';

export type PoolSceneProps = {
  scene: SceneSpec;
  /** Night view: dusk lighting with glowing LEDs and fire. */
  night?: boolean;
  /** Accessible description of the design (the parent builds it from the answers). */
  label: string;
  className?: string;
};

const EASE = 'cubic-bezier(.22,.8,.24,1)';

/**
 * Scene-wide CSS. Class names are prefixed `ps-`; every instance carries the
 * same rules, so duplicates are harmless. All motion stops under
 * prefers-reduced-motion.
 */
const CSS = `
.ps-fade{animation:ps-fade ${FADE_MS}ms ease-out both}
.ps-fade-out{animation:ps-fade ${FADE_MS}ms ease-in reverse both}
@keyframes ps-fade{from{opacity:0}to{opacity:1}}
.ps-move{transition:transform .5s ${EASE}}
.ps-morph{transition:d .5s ${EASE},x .5s ${EASE},y .5s ${EASE},width .5s ${EASE},height .5s ${EASE}}
.ps-caustic-a{animation:ps-ca 26s linear infinite}
.ps-caustic-b{animation:ps-cb 41s linear infinite}
@keyframes ps-ca{from{transform:translate(0,0)}to{transform:translate(${CAUSTICS.t}px,${CAUSTICS.t}px)}}
@keyframes ps-cb{from{transform:translate(0,0)}to{transform:translate(${-CAUSTICS.b.x}px,${-CAUSTICS.b.y}px)}}
.ps-flicker{transform-box:fill-box;transform-origin:center;animation:ps-flicker 1.7s ease-in-out infinite alternate}
@keyframes ps-flicker{0%{opacity:.86;transform:scale(.93)}55%{opacity:1;transform:scale(1.05)}100%{opacity:.92;transform:scale(.97)}}
@media (prefers-reduced-motion:reduce){.ps-root *{animation:none!important;transition:none!important}}
`;

/**
 * The live top-down picture of the homeowner's pool and backyard: one inline
 * SVG, layered back to front (ground and walls, deck, pool, bowls, objects,
 * house roof, light pass, optional night layer). Pure function of the
 * SceneSpec; materials crossfade, objects glide to new spots, and the
 * pool outline tweens between sizes where the browser supports it.
 */
export function PoolScene({ scene, night = false, label, className }: PoolSceneProps) {
  const uid = `ps${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const specKey = JSON.stringify(scene);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the spec's content, not its identity
  const layout = useMemo(() => layoutScene(scene), [specKey]);
  const keys = materialKeys(scene);
  const dayNight = useFadeKeys(night ? 'night' : 'day');
  const showNight = dayNight.includes('night');
  const nightClass = dayNight.length > 1 ? (night ? 'ps-fade' : 'ps-fade-out') : undefined;

  return (
    <svg
      viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
      role="img"
      aria-label={label}
      className={className ? `ps-root ${className}` : 'ps-root'}
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{CSS}</style>
      <g aria-hidden="true">
        <defs>
          <GroundDefs uid={uid} scene={scene} />
        </defs>
        <Ground uid={uid} layout={layout} scene={scene} groundKey={keys.ground} />
        <PoolLayer uid={uid} layout={layout} scene={scene} keys={keys} night={night} />
        <Shadows layout={layout} />
        <Objects uid={uid} layout={layout} night={night} />
        <House uid={uid} />
        <DaylightPass uid={uid} />
        {showNight ? (
          <g className={nightClass}>
            <NightLayer uid={uid} layout={layout} scene={scene} />
          </g>
        ) : null}
      </g>
    </svg>
  );
}
