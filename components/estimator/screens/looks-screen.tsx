'use client';

import { useId } from 'react';
import type { GalleryImage } from '@/lib/estimator/types';
import { ChoiceTile, QuestionFieldset } from '../ui';

/** "Which look do you like?": photo tiles, multi-select, not priced and skippable. */
export function LooksScreen({
  gallery,
  liked,
  onToggle,
}: {
  gallery: GalleryImage[];
  liked: string[];
  onToggle: (src: string) => void;
}) {
  const uid = useId();
  return (
    <QuestionFieldset
      legend="Which look do you like?"
      help="Pick any you like, or skip this. It helps us understand your taste and does not change your price."
      hideLegend
    >
      <div className="grid grid-cols-2 gap-3 @md:grid-cols-3">
        {gallery.map((img) => (
          <ChoiceTile
            key={img.src}
            type="checkbox"
            name={`${uid}-looks`}
            value={img.src}
            checked={liked.includes(img.src)}
            onChange={() => onToggle(img.src)}
            label={img.caption ?? img.alt}
            visual={
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.thumb ?? img.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            }
          />
        ))}
      </div>
    </QuestionFieldset>
  );
}
