'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { registerBathPainter } from '@/lib/estimator/scene/bath/rasterize';
import { BATH_TEXTURES } from '@/lib/estimator/scene/bath/textures';
import { BATH_SCENE, type BathMood, type BathSceneSpec } from '@/lib/estimator/scene/bath/types';
import { bathAssetsLoading, onBathAssetLoad, preloadBathAssets, preloadBathAssetsWhenIdle, recordBathAssets } from './assets';
import { materialTexture, paintBathScene, releaseBathCanvases } from './paint';

export type BathSceneProps = {
  scene: BathSceneSpec;
  mood?: BathMood;
  /** Accessible description of the design (the parent builds it from the answers). */
  label: string;
  className?: string;
  /** The drawing element, for "Save my design" and the photoreal render (PNG capture: rasterizeBathScene). */
  onCanvas?: (el: SVGSVGElement | HTMLCanvasElement | null) => void;
  /** 'close' zooms in for the finish questions... */
  focus?: 'overview' | 'close';
  /** ...on the shower wall (tile) or the vanity (cabinet, counter, fixtures). */
  target?: 'shower' | 'vanity';
  /** No crossfade and no draft frame (thumbnails, reduced motion is detected on its own). */
  still?: boolean;
  /** Hidden from screen readers (a decorative copy, e.g. under the example photo). */
  decorative?: boolean;
};

/** Crossfade between the old and the new frame. */
export const BATH_FADE_MS = 250;
/** Device pixels per frame unit are capped here (2x is sharp on every phone). */
const MAX_SCALE = 2;
/** Two sharp paints in a row slower than this (no GPU canvas) drop the next ones to 1x. */
const SLOW_PAINT_MS = 90;
/** A pick paints a fast draft at once; the sharp frame follows once picks pause this long. */
const SETTLE_MS = 180;

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

/** Mounted scenes: the shared texture caches and scratch canvases are released when the last one goes. */
let mountedScenes = 0;

/**
 * The live bathroom picture: a photo-like, eye-level view into the
 * homeowner's bathroom, painted on a canvas (see paint.ts). A pick paints a
 * fast draft frame at once (crossfading from the old one), then the sharp
 * frame once picks pause; a texture or sprite file arriving repaints only the
 * scenes that use it, at most once per animation frame. The rest of the files
 * preload when the page is idle. Before the script runs the box shows the
 * wall colour, so nothing flashes.
 */
export function BathScene({ scene, mood = 'day', label, className, onCanvas, focus = 'overview', target, still = false, decorative = false }: BathSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [cap, setCap] = useState(MAX_SCALE);
  const latest = useRef({ scene, mood, focus, target, scale });
  latest.current = { scene, mood, focus, target, scale };
  const painted = useRef<string | null>(null);
  /** Files the last paint used (a file arriving repaints only when it is one of these). */
  const used = useRef<Set<string>>(new Set());
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assetFrame = useRef<number | null>(null);
  const slowPaints = useRef(0);

  /** Paint the latest props onto the visible canvas. Never throws (the wall colour stays). */
  const paint = useCallback((draft: boolean): number => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return 0;
    const now = latest.current;
    const t0 = performance.now();
    try {
      used.current = recordBathAssets(() =>
        paintBathScene(ctx, now.scene, { scale: now.scale, mood: now.mood, focus: now.focus, target: now.target, draft }),
      );
    } catch {
      // A drawing failure must never break the flow.
    }
    return performance.now() - t0;
  }, []);

  /** A sharp paint; two slow ones in a row (once files have settled) drop the picture to 1x. */
  const sharp = useCallback(() => {
    const ms = paint(false);
    if (bathAssetsLoading()) return;
    slowPaints.current = ms > SLOW_PAINT_MS ? slowPaints.current + 1 : 0;
    if (slowPaints.current >= 2 && latest.current.scale > 1) setCap(1);
  }, [paint]);

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

  // Files: the rest preload when idle; one arriving that this picture uses repaints it (once per frame).
  useEffect(() => {
    mountedScenes++;
    preloadBathAssetsWhenIdle();
    const off = onBathAssetLoad((url) => {
      if (!used.current.has(url) || assetFrame.current !== null) return;
      assetFrame.current = requestAnimationFrame(() => {
        assetFrame.current = null;
        // A pending settle paints sharp anyway.
        if (!settleTimer.current) paint(false);
      });
    });
    const prev = prevRef.current;
    // The old frame's copy is only needed while it fades: give its memory back afterwards.
    const shrink = () => {
      if (prev && prev.style.opacity === '0') prev.width = prev.height = 1;
    };
    prev?.addEventListener('transitionend', shrink);
    return () => {
      off();
      prev?.removeEventListener('transitionend', shrink);
      if (assetFrame.current !== null) cancelAnimationFrame(assetFrame.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = null;
      if (--mountedScenes === 0) releaseBathCanvases();
    };
  }, [paint]);

  const key = `${JSON.stringify(scene)}|${mood}|${focus}|${target ?? ''}`;
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = Math.round(BATH_SCENE.width * scale);
    const h = Math.round(BATH_SCENE.height * scale);
    const changed = painted.current !== null && painted.current !== key;
    const animate = changed && !still && !reducedMotion();
    // Keep the old frame on top and fade it out over the new one.
    const prev = prevRef.current;
    if (animate && prev && canvas.width > 1) {
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
    const resized = canvas.width !== w || canvas.height !== h;
    if (resized) {
      canvas.width = w;
      canvas.height = h;
    }
    painted.current = key;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
    if (changed && !still) {
      // Instant response: a draft now, the sharp frame when the picks pause.
      paint(true);
      settleTimer.current = setTimeout(() => {
        settleTimer.current = null;
        sharp();
      }, SETTLE_MS);
    } else {
      sharp();
    }
    // `key` stands for scene / mood / focus (a new but equal spec object does not repaint).
  }, [key, scale, still, paint, sharp]);

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
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
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
