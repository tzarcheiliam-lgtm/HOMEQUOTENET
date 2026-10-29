'use client';

/* eslint-disable @next/next/no-img-element -- pre-rendered variants swap in place with a crossfade; next/image would re-layout and re-request on every swap. */

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ConfiguratorModel, ConfiguratorSpec } from '@/lib/estimator/configurator/types';
import type { StagePhoto } from './photos';

/**
 * sizes for the stage <img>. Desktop: the photo is cover-cropped into a box
 * about (100vh - chrome) tall, so the width it needs is ~1.5 x that height,
 * not the column width (135vh: a 1440 x 900 screen at 1x gets the 1200 px
 * file without upscaling, 2x screens the 1800 px one). Phones: the full width,
 * so 2x and 3x phones get the 1200 px file (390 x 3 = 1170).
 */
export const STAGE_SIZES = '(min-width: 1024px) 135vh, 100vw';

/* ------------------------------------------------------------------ */
/* Preloading                                                          */
/* ------------------------------------------------------------------ */

/** src -> settled load (true: decoded and ready, false: failed). Shared by every stage on the page. */
const loads = new Map<string, Promise<boolean>>();

/** Fetch and decode a photo once, so the swap to it is instant. Server: resolves true without doing anything. */
export function preloadPhoto(photo: Pick<StagePhoto, 'src' | 'srcSet'>): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return Promise.resolve(true);
  const id = `${photo.src}|${photo.srcSet ?? ''}`;
  const known = loads.get(id);
  if (known) return known;
  const p = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    if (photo.srcSet) {
      img.sizes = STAGE_SIZES;
      img.srcset = photo.srcSet;
    }
    img.onload = () => {
      if (typeof img.decode === 'function') img.decode().then(() => resolve(true), () => resolve(true));
      else resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = photo.src;
  });
  loads.set(id, p);
  return p;
}

/** False on Save-Data or a 2G/3G connection: then only the photo being asked for is fetched. */
export function canWarmPhotos(): boolean {
  if (typeof navigator === 'undefined') return true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!c) return true;
  return !c.saveData && !/(^|-)(2g|3g)$/.test(c.effectiveType ?? '');
}

function whenIdle(fn: () => void): () => void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout: 2500 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 600);
  return () => window.clearTimeout(id);
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */

type Layer = StagePhoto & { id: number; failed?: boolean };

export type PhotoStageProps = {
  spec: ConfiguratorSpec;
  view: string;
  onView: (view: string) => void;
  /** The photo to show now (current view, current picks). */
  photo: StagePhoto;
  /** Warm these right away (the other views' current photos). */
  next: StagePhoto[];
  /** Warm these when the browser is idle and the connection allows (one click away in this view). */
  idle: StagePhoto[];
  /** A short "Spa added" note over the photo; `id` changes for each new note. */
  toast: { id: number; text: string } | null;
  /** Small caption, e.g. "Example design · AI-assisted" (hidden while a real photo stands in). */
  caption: string;
  /** The chosen size, drawn to scale on the photo (the photos themselves show one size). */
  model?: ConfiguratorModel;
  models: ConfiguratorModel[];
  /** Phones: the photo is a shorter strip. */
  collapsed: boolean;
  onCollapsed: (collapsed: boolean) => void;
};

/**
 * The big photo with view pills. Variants are pre-rendered files: a new pick
 * preloads and decodes the target, then fades it in over the old one (instant
 * with reduced motion). The box never changes the page layout (fixed on
 * phones, the full column height on desktop), object-cover.
 */
export function PhotoStage({ spec, view, onView, photo, next, idle, toast, caption, model, models, collapsed, onCollapsed }: PhotoStageProps) {
  const [layers, setLayers] = useState<Layer[]>(() => [{ ...photo, id: 0 }]);
  const seq = useRef(0);
  const wanted = useRef(photo.src);

  // Swap to the new photo once it is decoded (the latest request wins).
  useEffect(() => {
    wanted.current = `${photo.src}|${photo.srcSet ?? ''}`;
    const top = layers[layers.length - 1];
    if (top && top.src === photo.src && top.srcSet === photo.srcSet) {
      if (top.alt !== photo.alt || top.key !== photo.key) setLayers((ls) => ls.map((l, i) => (i === ls.length - 1 ? { ...l, alt: photo.alt, key: photo.key } : l)));
      return;
    }
    let live = true;
    const target = photo;
    preloadPhoto(target).then((ok) => {
      if (!live || wanted.current !== `${target.src}|${target.srcSet ?? ''}`) return;
      const shown: StagePhoto = ok ? target : { ...target, src: target.fallback, srcSet: undefined, isFallback: true };
      const id = ++seq.current;
      setLayers((ls) => (prefersReducedMotion() ? [{ ...shown, id }] : [...ls.slice(-1), { ...shown, id }]));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layers is read for the no-op check only
  }, [photo.src, photo.srcSet, photo.alt, photo.key]);

  // Warm the other views now; the one-click neighbours when idle, and only on a good connection.
  useEffect(() => {
    if (!canWarmPhotos()) return;
    for (const p of next) void preloadPhoto(p);
    return whenIdle(() => {
      for (const p of idle) void preloadPhoto(p);
    });
  }, [next, idle]);

  const top = layers[layers.length - 1];
  const showCaption = !top.isFallback && !top.failed;

  return (
    <div className="es-cfg-stage relative isolate h-full w-full overflow-hidden bg-[#e9e6df]">
      {layers.map((l, i) => {
        const isTop = i === layers.length - 1;
        return (
          <img
            key={l.id}
            src={l.src}
            srcSet={l.srcSet}
            sizes={l.srcSet ? STAGE_SIZES : undefined}
            alt={isTop ? l.alt : ''}
            aria-hidden={isTop ? undefined : true}
            decoding="async"
            draggable={false}
            className={`absolute inset-0 h-full w-full select-none object-cover ${isTop && l.id !== 0 ? 'es-cfg-fade' : ''}`}
            onAnimationEnd={isTop ? () => setLayers((ls) => ls.slice(-1)) : undefined}
            onError={() =>
              setLayers((ls) => ls.map((x) => (x.id === l.id && x.src !== x.fallback ? { ...x, src: x.fallback, srcSet: undefined, failed: true } : x)))
            }
          />
        );
      })}

      {/* Soft shade top and bottom so the pills and caption read on any photo. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />

      <div role="group" aria-label="Photo view" className="absolute inset-x-0 top-2.5 flex justify-center gap-1.5 px-3 sm:top-5">
        {spec.views.map((v) => {
          const active = v.id === view;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={active}
              onClick={() => onView(v.id)}
              className={`h-8 touch-manipulation rounded-full px-3.5 text-[13px] font-medium backdrop-blur-md transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none ${
                active ? 'bg-[#111] text-white' : 'bg-white/85 text-[#111] hover:bg-white'
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {model ? <SizePlan model={model} models={models} caption={showCaption ? caption : null} /> : null}

      {toast ? (
        <div key={toast.id} aria-hidden="true" className="es-cfg-toast pointer-events-none absolute inset-x-0 top-12 flex justify-center px-4 sm:top-16">
          <span className="rounded-full bg-white/95 px-4 py-2 text-center text-[13px] font-medium text-[#111] shadow-[0_6px_24px_-8px_rgba(0,0,0,.45)]">{toast.text}</span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Show a bigger photo' : 'Make the photo smaller'}
        className="absolute bottom-2 right-2.5 inline-flex size-9 touch-manipulation items-center justify-center rounded-full bg-white/90 text-[#111] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden"
      >
        {collapsed ? <ChevronDown aria-hidden="true" className="size-4" /> : <ChevronUp aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
}

const dims = (m: ConfiguratorModel) => m.dimensions.match(/\d+(\.\d+)?/g)?.map(Number) ?? [1, 1];

/**
 * The chosen size to scale (the photos show one example pool): every size as
 * a faint outline, the chosen one filled, with its name and measurements.
 */
export function SizePlan({ model, models, caption }: { model: ConfiguratorModel; models: ConfiguratorModel[]; caption: string | null }) {
  const maxW = Math.max(...models.map((m) => dims(m)[0]));
  const maxH = Math.max(...models.map((m) => dims(m)[1]));
  const box = { w: 64, h: 34 };
  const scale = Math.min((box.w - 4) / maxW, (box.h - 4) / maxH);
  const rect = (m: ConfiguratorModel) => {
    const [w, h] = dims(m);
    return { width: w * scale, height: h * scale, x: (box.w - w * scale) / 2, y: (box.h - h * scale) / 2 };
  };
  const on = rect(model);
  return (
    <div className="pointer-events-none absolute bottom-2 left-2.5 flex items-center gap-2.5 rounded-xl bg-white/92 py-1.5 pl-2 pr-3 shadow-[0_4px_18px_-8px_rgba(0,0,0,.4)] backdrop-blur-sm sm:bottom-4 sm:left-4">
      <svg aria-hidden="true" width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} className="shrink-0">
        {models.map((m) => {
          const r = rect(m);
          return <rect key={m.id} x={r.x} y={r.y} width={r.width} height={r.height} rx={1.5} fill="none" stroke="#b9b3a9" strokeDasharray="2 2" strokeWidth={1} />;
        })}
        <rect
          x={on.x}
          y={on.y}
          width={on.width}
          height={on.height}
          rx={1.5}
          fill="#4f9fd6"
          stroke="#26389a"
          strokeWidth={1.2}
          className="transition-all duration-300 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span className="min-w-0 leading-tight">
        <span className="block text-[12.5px] font-semibold text-[#111]">
          {model.name} <span className="font-normal tabular-nums text-[#4a463f]">· {model.dimensions}</span>
        </span>
        <span className="block text-[10.5px] text-[#5f5a52]">{caption ? `To scale · ${caption}` : 'Your size, to scale'}</span>
      </span>
    </div>
  );
}
