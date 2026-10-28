'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronsLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HERO_IMAGES } from './hero-images';

export { HERO_IMAGES };

/** End labels of the example split. "Example" is in both, so it is never mistaken for their own design. */
export const EXAMPLE_LABELS = { design: 'Example design', photo: 'Its realistic photo' } as const;

const DESIGN_ALT = 'Example design made in this builder: a rectangular pool with a spa, a lounging shelf, a porcelain deck with turf bands and a fire pit';
const PHOTO_ALT = 'The same example design as a realistic photo, made from the design picture';

/** Wait for the frame to be seen, then sweep once from the design to the middle. */
const SWEEP_DELAY_MS = 700;
const SWEEP_MS = 1400;

const CSS = `
.ec-glide .ec-before{transition:clip-path ${SWEEP_MS}ms cubic-bezier(.65,0,.35,1)}
.ec-glide .ec-handle{transition:transform ${SWEEP_MS}ms cubic-bezier(.65,0,.35,1)}
.ec-leave{animation:ec-leave .4s ease-out both}
@keyframes ec-leave{from{opacity:1}to{opacity:0}}
@media (prefers-reduced-motion:reduce){.ec-glide .ec-before,.ec-glide .ec-handle{transition:none}.ec-leave{animation:none;opacity:0}}
`;

/**
 * What the builder ends with, shown in the builder's own frame before the
 * first answer when renders are on: an example design (left) and its
 * realistic photo (right), split by a handle that sweeps across once on its
 * own and can then be dragged (a native range input: keyboard and screen
 * reader friendly). The photo is the real output of the production render
 * from that design picture. Under reduced motion it simply rests in the
 * middle. `leaving` fades it out over their first picture after the first
 * answer. Only mounted when the page can actually make a photo.
 */
export function ExampleCompare({ leaving = false, className }: { leaving?: boolean; className?: string }) {
  // Starts as all design (server and first client render agree); the photo then "develops" out of it.
  const [pos, setPos] = useState(100);
  const [glide, setGlide] = useState(false);
  const touched = useRef(false);

  useEffect(() => {
    if (leaving) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setPos(50);
      return;
    }
    const timers = [
      setTimeout(() => {
        if (touched.current) return;
        setGlide(true);
        setPos(50);
      }, SWEEP_DELAY_MS),
      setTimeout(() => setGlide(false), SWEEP_DELAY_MS + SWEEP_MS + 80),
    ];
    return () => timers.forEach(clearTimeout);
  }, [leaving]);

  const label = 'pointer-events-none absolute bottom-2.5 inline-flex h-7 items-center rounded-full bg-[#06122b]/80 px-2.5 text-[11px] font-semibold text-white sm:bottom-3 sm:h-8 sm:px-3 sm:text-xs';
  return (
    <div
      data-example-compare=""
      aria-hidden={leaving ? true : undefined}
      className={cn('absolute inset-0 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-4 has-[input:focus-visible]:outline-white', glide && 'ec-glide', leaving && 'ec-leave pointer-events-none', className)}
    >
      <style>{CSS}</style>
      <Image src={HERO_IMAGES.photo} alt={PHOTO_ALT} fill priority sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
      <div className="ec-before absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={HERO_IMAGES.illustration} alt={DESIGN_ALT} fill priority sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" />
      </div>
      <div aria-hidden="true" className="ec-handle pointer-events-none absolute inset-y-0 left-0 w-full" style={{ transform: `translateX(${pos}%)` }}>
        <span className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.45)]" />
        <span className="absolute top-1/2 left-0 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#06122b] shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
          <ChevronsLeftRight className="size-5" strokeWidth={2.4} />
        </span>
      </div>
      <span aria-hidden="true" className={cn(label, 'left-2.5 sm:left-3')}>
        {EXAMPLE_LABELS.design}
      </span>
      <span aria-hidden="true" className={cn(label, 'right-2.5 sm:right-3')}>
        {EXAMPLE_LABELS.photo}
      </span>
      {leaving ? null : (
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => {
            touched.current = true;
            setGlide(false);
            setPos(Number(e.target.value));
          }}
          aria-label="Compare an example design with its realistic photo"
          aria-valuetext={`${pos}% example design, ${100 - pos}% realistic photo`}
          // pan-y: a vertical swipe that starts on the picture still scrolls the page (iOS).
          className="absolute inset-0 size-full cursor-ew-resize touch-pan-y opacity-0"
        />
      )}
    </div>
  );
}
