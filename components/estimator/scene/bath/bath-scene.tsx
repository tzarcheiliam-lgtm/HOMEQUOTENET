'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { registerBathPainter } from '@/lib/estimator/scene/bath/rasterize';
import { BATH_TEXTURES } from '@/lib/estimator/scene/bath/textures';
import { BATH_SCENE, type BathMood, type BathSceneSpec } from '@/lib/estimator/scene/bath/types';
import { onBathAssetLoad, preloadBathAssets } from './assets';
import { materialTexture, paintBathScene } from './paint';

export type BathSceneProps = {
  scene: BathSceneSpec;
  mood?: BathMood;
  /** Accessible description of the design (the parent builds it from the answers). */
  label: string;
  className?: string;
  /** The drawing element, for "Save my design" and the photoreal render (PNG capture: rasterizeBathScene). */
  onCanvas?: (el: SVGSVGElement | HTMLCanvasElement | null) => void;
  /** 'close' frames the vanity and shower tile (for finish questions). */
  focus?: 'overview' | 'close';
  /** No crossfade (thumbnails, reduced motion is detected on its own). */
  still?: boolean;
};

/** Crossfade between the old and the new frame. */
export const BATH_FADE_MS = 250;
/** Device pixels per frame unit are capped here (2x is sharp on every phone). */
const MAX_SCALE = 2;
/** A paint slower than this (no GPU canvas) drops the next ones to 1x. */
const SLOW_PAINT_MS = 70;

const CSS = `
:where(.bs-root){position:relative;display:block;overflow:hidden}
:where(.bs-root.bs-sized){width:100%;aspect-ratio:3/2}
.bs-root>canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.bs-root>.bs-prev{opacity:0;pointer-events:none}
.bs-root>.bs-prev.bs-fading{transition:opacity ${BATH_FADE_MS}ms ease-out}
@media (prefers-reduced-motion:reduce){.bs-root>.bs-prev{display:none}}
`;

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Device px per frame unit for an element `cssWidth` wide. */
export function bathCanvasScale(cssWidth: number, dpr: number, cap = MAX_SCALE): number {
  const w = Number.isFinite(cssWidth) && cssWidth > 0 ? cssWidth : BATH_SCENE.width;
  const raw = (w * (Number.isFinite(dpr) && dpr > 0 ? dpr : 1)) / BATH_SCENE.width;
  // Quarter steps, so a resize by a few px does not repaint at a new size.
  return Math.min(cap, Math.max(0.5, Math.ceil(raw * 4) / 4));
}

/**
 * The live bathroom picture: a photo-like, eye-level view into the
 * homeowner's bathroom, painted on a canvas (see paint.ts) and repainted
 * synchronously on every pick, with a short crossfade from the old frame.
 * Before the script runs the box shows the wall colour, so nothing flashes.
 */
export function BathScene({ scene, mood = 'day', label, className, onCanvas, focus = 'overview', still = false }: BathSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [cap, setCap] = useState(MAX_SCALE);
  const [assetTick, setAssetTick] = useState(0);
  const latest = useRef({ scene, mood, focus });
  latest.current = { scene, mood, focus };
  const painted = useRef<string | null>(null);

  // Size the backing store to the element (and the screen), and follow resizes.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setScale(bathCanvasScale(el.clientWidth, window.devicePixelRatio || 1, cap));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cap]);

  // Texture / sprite files: preload once, repaint as each arrives.
  useEffect(() => {
    const off = onBathAssetLoad(() => setAssetTick((t) => t + 1));
    void preloadBathAssets();
    return () => {
      off();
    };
  }, []);

  const key = `${JSON.stringify(scene)}|${mood}|${focus}`;
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = Math.round(BATH_SCENE.width * scale);
    const h = Math.round(BATH_SCENE.height * scale);
    const changed = painted.current !== null && painted.current !== key;
    // Keep the old frame on top and fade it out over the new one.
    const prev = prevRef.current;
    if (changed && prev && !still && !reducedMotion() && canvas.width > 1) {
      prev.width = canvas.width;
      prev.height = canvas.height;
      prev.getContext('2d')?.drawImage(canvas, 0, 0);
      prev.classList.remove('bs-fading');
      prev.style.opacity = '1';
      // Commit the opaque state, then let the transition run to transparent.
      void prev.offsetWidth;
      prev.classList.add('bs-fading');
      prev.style.opacity = '0';
    }
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const t0 = performance.now();
    const now = latest.current;
    try {
      paintBathScene(ctx, now.scene, { scale, mood: now.mood, focus: now.focus });
    } catch {
      // A drawing failure must never break the flow: the wall colour stays.
    }
    painted.current = key;
    if (performance.now() - t0 > SLOW_PAINT_MS && scale > 1) setCap(1);
    // `key` stands for scene / mood / focus (a new but equal spec object does not repaint);
    // assetTick repaints when a file has loaded.
  }, [key, scale, assetTick, still]);

  // Hand the canvas out, and register a painter so exports are sharp and settled.
  const painter = useCallback(async (width: number, height: number) => {
    await preloadBathAssets();
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('This browser cannot draw the design.');
    const { scene: s, mood: m } = latest.current;
    paintBathScene(ctx, s, { scale: width / BATH_SCENE.width, mood: m, focus: 'overview' });
    return out;
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const off = registerBathPainter(canvas, painter);
    onCanvas?.(canvas);
    return () => {
      off();
      onCanvas?.(null);
    };
  }, [onCanvas, painter]);

  const wall = BATH_TEXTURES[materialTexture('paint', scene.paint)].fallback;
  return (
    <div
      ref={rootRef}
      className={['bs-root', className ? '' : 'bs-sized', className ?? ''].filter(Boolean).join(' ')}
      role="img"
      aria-label={label}
      data-bath-scene=""
      data-mood={mood}
      style={{ backgroundColor: wall }}
    >
      <style>{CSS}</style>
      <canvas ref={canvasRef} width={1} height={1} aria-hidden="true" />
      <canvas ref={prevRef} className="bs-prev" width={1} height={1} aria-hidden="true" />
    </div>
  );
}
