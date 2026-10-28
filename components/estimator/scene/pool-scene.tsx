'use client';

import { useEffect, useId, useMemo, useRef, type RefObject } from 'react';
import { layoutScene, sceneCamera, type CameraFocus } from '@/lib/estimator/scene/geometry';
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
  /**
   * What the drone frames: the whole design (default) or a close look at the
   * pool while finish, tile and coping are chosen. The camera glides between them.
   */
  focus?: CameraFocus;
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
.ps-cam{transition:transform .8s ${EASE}}
.ps-morph{transition:d .5s ${EASE},x .5s ${EASE},y .5s ${EASE},width .5s ${EASE},height .5s ${EASE}}
.ps-caustic-a{animation:ps-ca 26s linear infinite}
.ps-caustic-b{animation:ps-cb 41s linear infinite}
@keyframes ps-ca{from{transform:translate(0,0)}to{transform:translate(${CAUSTICS.t}px,${CAUSTICS.t}px)}}
@keyframes ps-cb{from{transform:translate(0,0)}to{transform:translate(${-CAUSTICS.b.x}px,${-CAUSTICS.b.y}px)}}
.ps-flicker{transform-box:fill-box;transform-origin:center;animation:ps-flicker 1.7s ease-in-out infinite alternate}
@keyframes ps-flicker{0%{opacity:.86;transform:scale(.93)}55%{opacity:1;transform:scale(1.05)}100%{opacity:.92;transform:scale(.97)}}
@media (pointer:coarse){.ps-caustic-b{animation:none}}
.ps-root[data-paused] *{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){.ps-root *{animation:none!important;transition:none!important}}
`;

/** Text fields: while one has focus (the phone keyboard is up) the water stops moving. */
const TYPING = 'input:not([type=radio]):not([type=checkbox]):not([type=range]),textarea,select';

/**
 * Pause the water and fire whenever nobody is watching them: the picture is
 * scrolled off screen, the tab is hidden, or a text field has focus. The
 * animations repaint the whole SVG, which costs battery and typing smoothness
 * on phones, where the picture is pinned on screen.
 */
function usePausedWhenIdle(ref: RefObject<SVGSVGElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let offscreen = false;
    const update = () => {
      const typing = document.activeElement instanceof Element && document.activeElement.matches(TYPING);
      const paused = offscreen || document.visibilityState === 'hidden' || typing;
      if (paused) el.setAttribute('data-paused', '');
      else el.removeAttribute('data-paused');
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            offscreen = !entries.some((e) => e.isIntersecting);
            update();
          });
    observer?.observe(el);
    document.addEventListener('visibilitychange', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, [ref]);
}

/**
 * The live top-down picture of the homeowner's pool and backyard: one inline
 * SVG, layered back to front (ground and walls, deck, pool, bowls, objects,
 * house roof, optional night layer) under a drone "camera" (sceneCamera) that
 * frames the design, then a light pass. Pure function of the SceneSpec and
 * focus; materials crossfade, objects glide to new spots, the camera glides,
 * and the pool outline tweens between sizes where the browser supports it.
 */
export function PoolScene({ scene, night = false, label, focus = 'yard', className }: PoolSceneProps) {
  const uid = `ps${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const ref = useRef<SVGSVGElement>(null);
  usePausedWhenIdle(ref);
  const specKey = JSON.stringify(scene);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the spec's content, not its identity
  const layout = useMemo(() => layoutScene(scene), [specKey]);
  const cam = sceneCamera(layout, focus);
  const zoom = Math.round((SCENE.width / cam.w) * 10000) / 10000;
  // The same matrix as an attribute (any renderer) and as CSS (so the camera glides).
  const matrix = [zoom, 0, 0, zoom, Math.round(-cam.x * zoom * 100) / 100, Math.round(-cam.y * zoom * 100) / 100];
  const keys = materialKeys(scene);
  const dayNight = useFadeKeys(night ? 'night' : 'day');
  const showNight = dayNight.includes('night');
  const nightClass = dayNight.length > 1 ? (night ? 'ps-fade' : 'ps-fade-out') : undefined;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
      role="img"
      aria-label={label}
      className={className ? `ps-root ${className}` : 'ps-root'}
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{CSS}</style>
      <g aria-hidden="true">
        <g className="ps-cam" transform={`matrix(${matrix.join(' ')})`} style={{ transform: `matrix(${matrix.join(',')})` }}>
          <defs>
            <GroundDefs uid={uid} scene={scene} />
          </defs>
          <Ground uid={uid} layout={layout} scene={scene} groundKey={keys.ground} />
          <PoolLayer uid={uid} layout={layout} scene={scene} keys={keys} night={night} />
          <Shadows layout={layout} />
          <Objects uid={uid} layout={layout} night={night} />
          <House uid={uid} />
          {showNight ? (
            <g className={nightClass}>
              <NightLayer uid={uid} layout={layout} scene={scene} />
            </g>
          ) : null}
        </g>
        {/* Lens light pass: in frame space, so it stays put while the camera moves. */}
        <DaylightPass uid={uid} />
      </g>
    </svg>
  );
}
