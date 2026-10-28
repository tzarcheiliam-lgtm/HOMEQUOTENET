import Image from 'next/image';
import { ArrowRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Hero assets, made once: a <PoolScene> of a Signature-look design rendered to
 * PNG, and the photoreal render of that same picture from the production
 * kie.ai model and prompt (lib/estimator/render.ts). 1200 x 800 WebP, no metadata.
 */
export const HERO_IMAGES = {
  illustration: '/estimator/hero/pool-design-illustration.webp',
  photo: '/estimator/hero/pool-design-photo.webp',
} as const;

const DESIGN_ALT = 'Example design from this builder: a rectangular pool with a spa, a lounging shelf, a porcelain deck with turf bands and a fire pit';
const PHOTO_ALT = 'The same design turned into a realistic photo';

/** Visible caption (tablet and up) and the strip's accessible name. */
export function stripCaption(rendersEnabled: boolean): string {
  return rendersEnabled ? 'Example: a design made here, then its realistic photo' : 'Example design. Your ballpark price comes at the end.';
}

/**
 * One orchestrated moment, once per page load: the photo "develops" out of the
 * illustration (an illustration layer slides off to the right while its image
 * counter-slides, so only transforms move), the price teaser gets one sheen.
 * Nothing moves under prefers-reduced-motion.
 */
const STRIP_CSS = `
.es-wipe,.es-wipe-img{animation-duration:1.2s;animation-timing-function:cubic-bezier(.65,0,.35,1);animation-delay:.8s;animation-fill-mode:both}
.es-wipe{animation-name:es-wipe}
.es-wipe-img{animation-name:es-wipe-counter}
@keyframes es-wipe{to{transform:translateX(101%)}}
@keyframes es-wipe-counter{to{transform:translateX(-101%)}}
.es-sheen{transform:translateX(-120%);animation:es-sheen 1.1s cubic-bezier(.65,0,.35,1) .9s both}
@keyframes es-sheen{to{transform:translateX(120%)}}
.es-live{animation:es-live 2.4s ease-in-out infinite}
@keyframes es-live{50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.es-wipe{display:none}.es-sheen{display:none}.es-live{animation:none}}
`;

const tile =
  'relative min-w-0 flex-1 overflow-hidden rounded-xl bg-[var(--hq-surface)] aspect-[2/1] sm:aspect-[3/2] lg:w-56 lg:flex-none outline outline-1 -outline-offset-1 outline-white/10 shadow-[0_10px_28px_-14px_rgba(0,0,0,0.75)]';
const pill =
  'absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-[rgba(6,18,43,0.82)] px-1.5 text-[10px] font-semibold leading-[18px] text-white sm:gap-1.5 sm:px-2 sm:text-[11px] sm:leading-5';
const SIZES = '(min-width: 1024px) 224px, (min-width: 640px) 40vw, 45vw';
/** Same crop on both pictures (centred on the pool), so the pair reads as one design. */
const crop = 'object-cover object-[42%_62%] origin-[42%_62%] scale-[1.45] sm:scale-[1.25]';

/**
 * The value proposition as a picture: "your design" on the left, what it
 * becomes on the right. With renders on that is a realistic photo of the same
 * design; with renders off it is a locked ballpark-price card. The price card
 * is a placeholder only: no real number ever reaches the browser before the
 * contact step.
 */
export function BeforeAfterStrip({ rendersEnabled, className }: { rendersEnabled: boolean; className?: string }) {
  const caption = stripCaption(rendersEnabled);
  return (
    <figure aria-label={caption} className={cn('min-w-0', className)}>
      <style>{STRIP_CSS}</style>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={tile}>
          <Image src={HERO_IMAGES.illustration} alt={DESIGN_ALT} fill sizes={SIZES} loading="eager" className={crop} />
          <span className={pill}>
            <span aria-hidden="true" className="es-live size-1.5 rounded-full bg-[var(--es-aqua,#2ec5d3)]" />
            Your design
          </span>
        </div>
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--hq-surface-2)] text-[var(--hq-text)] ring-1 ring-[var(--hq-line-strong)]"
        >
          <ArrowRight className="size-3.5" strokeWidth={2.5} />
        </span>
        {rendersEnabled ? (
          <div className={tile} data-reward="photo">
            <Image src={HERO_IMAGES.photo} alt={PHOTO_ALT} fill sizes={SIZES} loading="eager" className={crop} />
            <span aria-hidden="true" className="es-wipe absolute inset-0 overflow-hidden">
              <span className="es-wipe-img absolute inset-0">
                <Image src={HERO_IMAGES.illustration} alt="" fill sizes={SIZES} loading="eager" className={crop} />
              </span>
              <span className="absolute inset-y-0 left-0 w-0.5 bg-white shadow-[0_0_14px_3px_rgba(255,255,255,0.75)]" />
            </span>
            <span className={pill}>Realistic photo</span>
          </div>
        ) : (
          <div
            className={cn(tile, 'flex flex-col justify-center gap-1 bg-[linear-gradient(140deg,var(--hq-surface-2),var(--hq-bg-raised))] px-3 sm:px-4')}
            data-reward="price"
          >
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--hq-text-muted)] sm:text-xs">
              <Lock aria-hidden="true" className="size-3" strokeWidth={2.5} />
              Ballpark price
            </span>
            {/* A placeholder, never a number: prices stay on the server until the contact step. */}
            <span aria-hidden="true" className="flex items-center gap-1.5 font-display text-base font-semibold text-[var(--hq-text)] sm:text-lg">
              $<span className="h-2.5 w-9 rounded-full bg-[var(--hq-text)]/30 sm:h-3 sm:w-12" />
              <span className="text-[var(--hq-text-dim)]">–</span>
              <span className="h-2.5 w-9 rounded-full bg-[var(--hq-text)]/30 sm:h-3 sm:w-12" />
            </span>
            <span aria-hidden="true" className="text-[11px] text-[var(--hq-text-dim)] max-sm:hidden">
              Unlocks at the end
            </span>
            <span className="sr-only">Your ballpark price range unlocks at the end.</span>
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
              <span className="es-sheen absolute inset-y-0 -left-1/4 w-1/2 bg-[linear-gradient(100deg,transparent,rgba(255,255,255,0.14),transparent)]" />
            </span>
          </div>
        )}
      </div>
      <figcaption aria-hidden="true" className="mt-2 text-xs text-[var(--hq-text-dim)] max-sm:hidden">
        {caption}
      </figcaption>
    </figure>
  );
}
