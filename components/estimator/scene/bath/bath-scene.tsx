'use client';

import { useEffect, useRef } from 'react';
import { bathOptionTexture, BATH_DEFAULT_TEXTURES, BATH_METAL_COLORS, BATH_DEFAULT_METAL, BATH_TEXTURES } from '@/lib/estimator/scene/bath/textures';
import { BATH_SCENE, type BathMood, type BathSceneSpec } from '@/lib/estimator/scene/bath/types';

export type BathSceneProps = {
  scene: BathSceneSpec;
  mood?: BathMood;
  /** Accessible description of the design (the parent builds it from the answers). */
  label: string;
  className?: string;
  /** The drawing element, for "Save my design" and the photoreal render (PNG capture). */
  onCanvas?: (el: SVGSVGElement | HTMLCanvasElement | null) => void;
};

/** Fallback colour of a material, or of its neutral default. */
function colour(question: keyof typeof BATH_DEFAULT_TEXTURES, id: string | null): string {
  const texture = (id && bathOptionTexture(question, id)) || BATH_DEFAULT_TEXTURES[question];
  return BATH_TEXTURES[texture].fallback;
}

/**
 * STAND-IN for the live bathroom picture: flat front-on blocks in the chosen
 * colours so the flow can be wired and tested. The real layered renderer
 * replaces this file's body and keeps its props.
 */
export function BathScene({ scene, mood = 'day', label, className, onCanvas }: BathSceneProps) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    onCanvas?.(ref.current);
    return () => onCanvas?.(null);
  }, [onCanvas]);

  const { width: W, height: H } = BATH_SCENE;
  const metal = BATH_METAL_COLORS[scene.metal ?? BATH_DEFAULT_METAL] ?? BATH_METAL_COLORS[BATH_DEFAULT_METAL];
  const vanityW = scene.vanity === 'double' ? 440 : scene.vanity === 'floating' ? 320 : 240;
  const vanityY = scene.vanity === 'floating' ? 470 : 500;
  const vanityH = scene.vanity === 'floating' ? 110 : 160;
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label={label}
      data-bath-scene=""
      data-mood={mood}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width={W} height={660} fill={colour('paint', scene.paint)} />
      <rect y={660} width={W} height={H - 660} fill={colour('floor', scene.floor)} />
      <rect x={60} y={120} width={420} height={540} fill={colour('showerTile', scene.showerTile)} />
      {scene.bathing !== 'walk_in' ? <rect x={60} y={560} width={420} height={100} rx={10} fill="#fbfbfa" stroke="#d9d9d6" /> : null}
      {scene.glass ? <rect x={470} y={140} width={10} height={520} fill="#cfe3ea" opacity={0.7} /> : null}
      <rect x={1100 - vanityW} y={vanityY} width={vanityW} height={vanityH} fill={colour('vanityFinish', scene.vanityFinish)} />
      <rect x={1090 - vanityW} y={vanityY - 18} width={vanityW + 20} height={18} fill={colour('counter', scene.counter)} />
      <rect x={1100 - vanityW / 2 - 6} y={vanityY - 60} width={12} height={42} fill={metal} />
      <rect x={1100 - vanityW / 2 - 90} y={180} width={180} height={220} rx={scene.extras.ledMirror ? 20 : 4} fill="#dfe8ec" stroke={scene.extras.ledMirror ? '#fff6d8' : metal} strokeWidth={6} />
      {mood === 'evening' ? <rect width={W} height={H} fill="#1b1a33" opacity={0.35} /> : null}
    </svg>
  );
}
