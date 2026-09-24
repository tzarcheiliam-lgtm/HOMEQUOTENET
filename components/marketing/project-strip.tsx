import type { Photo } from '@/content/photos';
import { Container } from './primitives';
import { PoolPhoto } from './photo';

/**
 * Asymmetric mosaic directly beneath the hero.
 *
 * Its job is recognition, not decoration: within one screen of arriving, a
 * contractor should see the kind of work they sell and conclude this site is
 * for them.
 *
 * The ratios are chosen so the tall frame and the two stacked frames finish at
 * the same height (3/4 against two at 3/2), which keeps the row flush without
 * fixed pixel heights that would break on a phone.
 */
export function ProjectStrip({
  tall,
  top,
  bottom,
  caption,
}: {
  tall: Photo;
  top: Photo;
  bottom: Photo;
  caption: string;
}) {
  const sizes = '(max-width: 640px) 47vw, (max-width: 1024px) 47vw, 45vw';
  return (
    <section
      aria-label="Project types"
      className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)] py-10 sm:py-12"
    >
      <Container>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <PoolPhoto photo={tall} ratio="3 / 4" className="row-span-2" sizes={sizes} zoom />
          <PoolPhoto photo={top} ratio="3 / 2" sizes={sizes} zoom />
          <PoolPhoto photo={bottom} ratio="3 / 2" sizes={sizes} zoom />
        </div>

        <p className="mt-5 text-sm leading-6 text-[var(--hq-text-muted)]">{caption}</p>
      </Container>
    </section>
  );
}
