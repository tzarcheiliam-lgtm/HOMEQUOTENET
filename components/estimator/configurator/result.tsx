/* eslint-disable @next/next/no-img-element -- small lazy thumbnails of files in public/ */

/* The step-3 result page is result/result-page.tsx; this file keeps the design column's project strip. */

import type { GalleryImage } from '@/lib/estimator/types';

/** Real job photos, a quiet horizontal strip. */
export function ProjectStrip({ gallery, title, className = '' }: { gallery: GalleryImage[]; title: string; className?: string }) {
  return (
    <section aria-label={title} className={className}>
      <h2 className="text-[15px] font-semibold text-[#111]">{title}</h2>
      <p className="text-[12.5px] text-[#6d675d]">Real photos of finished jobs.</p>
      <ul className="es-cfg-strip -mx-1 mt-3 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2">
        {gallery.map((g) => (
          <li key={g.src} className="w-[150px] shrink-0 snap-start">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#e9e6df]">
              <img src={g.thumb ?? g.src} alt={g.alt} loading="lazy" decoding="async" sizes="150px" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            {g.caption ? <p className="mt-1.5 text-[12px] leading-4 text-[#5f5a52]">{g.caption}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
