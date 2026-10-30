'use client';

import { useState } from 'react';
import type { FunnelPhotoFrame } from '@/lib/estimator/funnel/types';
import { photoSrcSet, type ShownPhoto } from './state';

/** The photo card is this wide: the content column (32 px gutters on phones, 560 px on desktop). */
const SIZES = '(min-width: 1024px) 560px, calc(100vw - 64px)';

/**
 * The photo above a step's question. Every option's photo is stacked in the
 * card and loaded up front, so picking an option only fades the right layer
 * in (180 ms, none with reduced motion): the swap is instant and nothing
 * below moves (fixed aspect ratio). A layer whose file fails to load swaps to
 * its fallback. Nothing is drawn over the photo (the example-design note
 * is one line in the page footer).
 *
 * `frame` (stepPhotoFrame): 'cover' fills the card; 'contain' shows the whole
 * photo scaled by `zoom` (the pool's plans: 1.3 on white) over the backdrop:
 * white, or a blurred copy of the same file (same srcset, so no extra
 * download) for room photos shown whole.
 */
export function StepPhoto({
  photos,
  selected,
  frame = { fit: 'cover', zoom: 1, backdrop: 'white' },
  priority = false,
}: {
  /** One per option id, in option order. */
  photos: [string, ShownPhoto][];
  selected: string;
  /** How the photo sits in the card (fallback photos cover on a white backdrop). */
  frame?: Required<FunnelPhotoFrame>;
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
    <div className="fn-photo relative w-full overflow-hidden rounded-[12px] bg-white">
      {layers.map((layer) => {
        const on = layer === shown;
        const blur = frame.backdrop === 'blur';
        // On white, a fallback (a room photo standing in for a plan) covers the card; on a blurred backdrop it is shown whole too.
        const contain = frame.fit === 'contain' && (blur || !layer.photo.isFallback);
        const srcSet = photoSrcSet(layer.photo);
        const img = (
          // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP files with their own 1200 / 1800 px srcset
          <img
            key={layer.src}
            src={layer.photo.src}
            srcSet={srcSet}
            sizes={SIZES}
            alt={on ? layer.photo.alt : ''}
            aria-hidden={on ? undefined : true}
            loading="eager"
            decoding="async"
            // The visible layer first; the others (needed only on a tap) never compete with it.
            fetchPriority={on ? (priority ? 'high' : 'auto') : 'low'}
            draggable={false}
            onError={() => {
              if (layer.photo.isFallback) return;
              const original = photos.find(([id]) => layer.ids.includes(id))?.[1];
              if (original?.fallback) setFailed((f) => ({ ...f, [original.src]: true }));
            }}
            className={`fn-layer absolute inset-0 h-full w-full select-none ${contain ? 'object-contain' : 'object-cover'} ${on ? 'opacity-100' : 'opacity-0'}`}
            style={contain && frame.zoom !== 1 ? { scale: String(frame.zoom) } : undefined}
          />
        );
        if (!(contain && blur)) return img;
        return [
          // The same file, blurred and a little larger (its soft edge stays outside the card), behind the whole photo.
          // eslint-disable-next-line @next/next/no-img-element -- decorative copy of the layer below (same srcset, same download)
          <img
            key={`${layer.src}#backdrop`}
            src={layer.photo.src}
            srcSet={srcSet}
            sizes={SIZES}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            fetchPriority={on ? (priority ? 'high' : 'auto') : 'low'}
            draggable={false}
            className={`fn-layer fn-backdrop absolute inset-0 h-full w-full select-none object-cover ${on ? 'opacity-100' : 'opacity-0'}`}
          />,
          img,
        ];
      })}
      {/* Image outline: keeps a light photo's edge crisp on the off-white page. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[12px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]" />
    </div>
  );
}
