'use client';

import { useState } from 'react';
import { photoSrcSet, type ShownPhoto } from './state';

/** The photo card is this wide: the content column (32 px gutters on phones, 560 px on desktop). */
const SIZES = '(min-width: 1024px) 560px, calc(100vw - 64px)';

/**
 * The photo above a step's question. Every option's photo is stacked in the
 * card and loaded up front, so picking an option only fades the right layer
 * in (180 ms, none with reduced motion): the swap is instant and nothing
 * below moves (fixed aspect ratio). A layer whose file fails to load swaps to
 * its fallback.
 */
export function StepPhoto({
  photos,
  selected,
  fit = 'cover',
  caption,
  priority = false,
}: {
  /** One per option id, in option order. */
  photos: [string, ShownPhoto][];
  selected: string;
  /** 'contain' for plan drawings on the white card (fallback photos always cover). */
  fit?: 'cover' | 'contain';
  /** Small label in the corner, e.g. "Example design". */
  caption?: string;
  /** The first screen's photo is the page's largest paint. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<Record<string, true>>({});
  // Several options can share one file (e.g. every size on the fallback): one layer per distinct file.
  const layers: { src: string; photo: ShownPhoto; ids: string[] }[] = [];
  for (const [id, raw] of photos) {
    const photo = failed[raw.src] && raw.fallback ? { ...raw.fallback, isFallback: true } : raw;
    const hit = layers.find((l) => l.src === photo.src);
    if (hit) hit.ids.push(id);
    else layers.push({ src: photo.src, photo, ids: [id] });
  }
  const shown = layers.find((l) => l.ids.includes(selected)) ?? layers[0];

  return (
    <div className="relative aspect-[7/4] w-full overflow-hidden rounded-[12px] bg-white lg:aspect-[16/9]">
      {layers.map((layer) => {
        const on = layer === shown;
        const contain = fit === 'contain' && !layer.photo.isFallback;
        return (
          // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP files with their own 1200 / 1800 px srcset
          <img
            key={layer.src}
            src={layer.photo.src}
            srcSet={photoSrcSet(layer.photo)}
            sizes={SIZES}
            alt={on ? layer.photo.alt : ''}
            aria-hidden={on ? undefined : true}
            loading="eager"
            decoding="async"
            fetchPriority={on && priority ? 'high' : 'auto'}
            draggable={false}
            onError={() => {
              if (layer.photo.isFallback) return;
              const original = photos.find(([id]) => layer.ids.includes(id))?.[1];
              if (original?.fallback) setFailed((f) => ({ ...f, [original.src]: true }));
            }}
            className={`fn-layer absolute inset-0 h-full w-full select-none ${contain ? 'object-contain p-3' : 'object-cover'} ${on ? 'opacity-100' : 'opacity-0'}`}
          />
        );
      })}
      {/* Image outline: keeps a light photo's edge crisp on the off-white page. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[12px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]" />
      {caption ? (
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-[4px] bg-white/85 px-1.5 py-0.5 text-[11px] font-medium leading-[14px] text-[#3b3935] backdrop-blur-[2px]">
          {caption}
        </span>
      ) : null}
    </div>
  );
}
