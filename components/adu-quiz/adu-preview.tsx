'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { describeDesign, resolveDesign, type Design } from '@/lib/adu-quiz/design';
import { ADU_LAYERS, CANVAS, Layer, geometry, layerSources, type LayerProps } from './layers';

const FADE_MS = 320;

type Item = { key: string; node: ReactNode; phase: 'enter' | 'on' | 'leave' };

/**
 * Crossfades whenever `k` changes: the old layer fades out while the new one
 * fades and slides in. With reduced motion the swap is instant.
 */
function Crossfade({ k, children, reduced }: { k: string; children: ReactNode; reduced: boolean }) {
  const latest = useRef(children);
  latest.current = children;
  const [items, setItems] = useState<Item[]>([{ key: k, node: children, phase: 'on' }]);

  useEffect(() => {
    setItems((prev) => {
      const without = prev.filter((i) => i.key !== k);
      const faded = without.map((i): Item => ({ ...i, phase: 'leave' }));
      return [...faded, { key: k, node: latest.current, phase: reduced ? 'on' : 'enter' }];
    });
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setItems((p) => p.map((i) => (i.key === k ? { ...i, phase: 'on' } : i)))));
    const done = setTimeout(() => setItems((p) => p.filter((i) => i.phase !== 'leave')), reduced ? 0 : FADE_MS + 60);
    return () => { cancelAnimationFrame(raf); clearTimeout(done); };
  }, [k, reduced]);

  return (
    <>
      {items.map((i) => (
        <g
          key={i.key}
          style={{
            opacity: i.phase === 'on' ? 1 : 0,
            transform: reduced ? undefined : i.phase === 'on' ? 'translateY(0) scale(1)' : i.phase === 'enter' ? 'translateY(8px) scale(0.985)' : 'translateY(-4px) scale(1.01)',
            transformOrigin: '50% 100%',
            transformBox: 'fill-box',
            transition: reduced ? undefined : `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
          } as React.CSSProperties}
        >
          {i.node}
        </g>
      ))}
    </>
  );
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Fetches any supplied layer images once, so swapping them never flickers. SVG layers need nothing. */
function usePreloadLayers() {
  useEffect(() => {
    for (const src of layerSources()) { const img = new Image(); img.src = src; }
  }, []);
}

/**
 * The live image of the visitor's ADU: stacked layers on one fixed-ratio canvas
 * (reserved space, so nothing shifts when it changes). `locked` blurs it for the
 * contact-step reveal; `unlocking` animates the blur away.
 */
export function AduPreview({ design, className, locked = false, unlocking = false }: { design: Design; className?: string; locked?: boolean; unlocking?: boolean }) {
  const reduced = usePrefersReducedMotion();
  usePreloadLayers();
  const d = resolveDesign(design);
  const geo = geometry(d.placement, d.size);
  const props: LayerProps = { design: d, geo };
  const bodyKey = `${d.placement}:${d.size}:${d.style}`;
  const bodyOverride = ADU_LAYERS.body.overrides[bodyKey];
  const colorOverride = ADU_LAYERS.color.overrides[d.color];
  const extraKeys = Object.keys(ADU_LAYERS.extras) as (keyof typeof ADU_LAYERS.extras)[];
  const alt = describeDesign(design);

  return (
    <div
      className={cn('relative mx-auto w-full overflow-hidden rounded-2xl border border-[var(--hq-line-strong)] bg-[#cfe6f7]', className)}
      // Width is capped by --adu-max-h (set by the parent on small screens) so a short phone never lets the image take over the screen.
      style={{ aspectRatio: `${CANVAS.w} / ${CANVAS.h}`, width: `min(100%, calc(var(--adu-max-h, 2000px) * ${CANVAS.w} / ${CANVAS.h}))` }}
    >
      <svg
        role="img"
        aria-label={alt}
        viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid slice"
        style={{
          filter: locked ? 'blur(9px) saturate(.85)' : 'blur(0)',
          transition: reduced || !unlocking ? undefined : 'filter 700ms ease',
        }}
      >
        <Layer layer={ADU_LAYERS.base} props={props} />
        {d.hasAdu ? (
          <Crossfade k={`body:${bodyKey}:${d.color}:${d.material}`} reduced={reduced}>
            {bodyOverride ? <image href={bodyOverride} x="0" y="0" width={CANVAS.w} height={CANVAS.h} preserveAspectRatio="xMidYMid slice" /> : <ADU_LAYERS.body.Svg {...props} />}
            {colorOverride ? <image href={colorOverride} x="0" y="0" width={CANVAS.w} height={CANVAS.h} preserveAspectRatio="xMidYMid slice" /> : null}
          </Crossfade>
        ) : null}
        {d.hasAdu ? extraKeys.map((id) => (
          <Crossfade key={id} k={`${id}:${d.extras.has(id) ? `${bodyKey}:${d.material}` : 'off'}`} reduced={reduced}>
            {d.extras.has(id) ? <Layer layer={ADU_LAYERS.extras[id]} props={props} /> : null}
          </Crossfade>
        )) : null}
      </svg>
      {locked ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0a1b3d]/35" aria-hidden="true">
          <span className="rounded-full border border-white/50 bg-[#0a1b3d]/70 px-4 py-2 text-sm font-semibold text-white">🔒 Your design is ready</span>
        </div>
      ) : null}
    </div>
  );
}
