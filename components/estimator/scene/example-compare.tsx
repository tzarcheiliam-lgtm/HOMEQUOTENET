'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronsLeftRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRADE_META } from '../builders/meta';
import type { ExampleImages, ExampleVideo as ExampleVideoMedia } from '../builders/types';
import { HERO_IMAGES } from './hero-images';

export { HERO_IMAGES };

/** End labels of the example split. "Example" is in both, so it is never mistaken for their own design. */
export const EXAMPLE_LABELS = { design: 'Example design', photo: 'Its realistic photo' } as const;

/** The pool's example pair (the default). */
const POOL_EXAMPLE: ExampleImages = TRADE_META.pool.exampleImages!;

/** The label on the example clip: what it is, so it is never read as a finished job or their design. */
export const EXAMPLE_VIDEO_LABEL = 'AI-rendered example';

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
 * answer. Only mounted when the page can actually make a photo. `images` is
 * the trade's pair (the pool's by default); `onError` reports a file that
 * would not load, so the frame can fall back to the example picture.
 */
export function ExampleCompare({
  leaving = false,
  images = POOL_EXAMPLE,
  onError,
  className,
}: {
  leaving?: boolean;
  images?: ExampleImages;
  onError?: () => void;
  className?: string;
}) {
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
      <Image src={images.photo} alt={images.photoAlt} fill priority sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" onError={onError} />
      <div className="ec-before absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={images.illustration} alt={images.designAlt} fill priority sizes="(min-width: 1024px) 720px, 100vw" className="object-cover" onError={onError} />
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
        {images.photoLabel ?? EXAMPLE_LABELS.photo}
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

/**
 * The example as a short silent clip (a slow push-in on an AI-rendered
 * bathroom), when the trade has no design/photo pair yet: muted, looping,
 * inline on phones, with its poster first. It only plays when motion is
 * welcome (started from an effect, never autoplay, so reduced motion keeps the
 * still poster), has a visible pause / play button (WCAG 2.2.2), and it is
 * labelled as an AI-rendered example. `leaving` fades it out over their first
 * picture.
 */
export function ExampleVideo({
  video,
  leaving = false,
  onError,
  className,
}: {
  video: ExampleVideoMedia;
  leaving?: boolean;
  onError?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const hasClip = Boolean(video.mp4 || video.webm);
  // The homeowner's own pause wins over everything; reduced motion starts it paused.
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(Boolean(reduced?.matches));
    sync();
    reduced?.addEventListener?.('change', sync);
    return () => reduced?.removeEventListener?.('change', sync);
  }, []);
  const playing = hasClip && !leaving && !paused && !reducedMotion;
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasClip) return;
    if (playing) void el.play().catch(() => {});
    else el.pause();
  }, [playing, hasClip]);
  return (
    <div
      data-example-video=""
      role={leaving ? undefined : 'img'}
      aria-label={leaving ? undefined : video.alt}
      aria-hidden={leaving ? true : undefined}
      className={cn('absolute inset-0 bg-[#d8d2c3]', leaving && 'ec-leave pointer-events-none', className)}
    >
      <style>{CSS}</style>
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="metadata"
        poster={video.poster}
        aria-hidden="true"
        onError={onError}
        className="absolute inset-0 size-full object-cover"
      >
        {video.webm ? <source src={video.webm} type="video/webm" /> : null}
        {video.mp4 ? <source src={video.mp4} type="video/mp4" /> : null}
      </video>
      <span className="pointer-events-none absolute bottom-2.5 left-2.5 inline-flex h-7 items-center rounded-full bg-[#06122b]/80 px-2.5 text-[11px] font-semibold text-white sm:bottom-3 sm:left-3 sm:h-8 sm:px-3 sm:text-xs">
        {EXAMPLE_VIDEO_LABEL}
      </span>
      {hasClip && !leaving && !reducedMotion ? (
        <button
          type="button"
          aria-pressed={paused}
          aria-label={paused ? 'Play the example clip' : 'Pause the example clip'}
          onClick={() => setPaused((p) => !p)}
          className="absolute bottom-1.5 right-1.5 grid size-11 place-items-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-white sm:bottom-2 sm:right-2"
        >
          <span className="grid size-8 place-items-center rounded-full bg-[#06122b]/80">
            {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
          </span>
        </button>
      ) : null}
    </div>
  );
}
