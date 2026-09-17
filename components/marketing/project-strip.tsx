import { photos } from '@/content/photos';
import { Container } from './primitives';
import { PoolPhoto } from './photo';

/**
 * Asymmetric mosaic directly beneath the hero.
 *
 * Its job is recognition, not decoration: within one screen of arriving, a pool
 * contractor should see waterline tile, night lighting and decking — the work
 * they actually sell — and conclude this site is for them.
 *
 * The ratios are chosen so the tall frame and the two stacked frames finish at
 * the same height (3/4 against two at 3/2), which keeps the row flush without
 * fixed pixel heights that would break on a phone.
 */
export function ProjectStrip() {
  return (
    <section
      aria-label="Pool project types"
      className="border-y border-[var(--hq-line)] bg-[var(--hq-bg-raised)] py-10 sm:py-12"
    >
      <Container>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <PoolPhoto
            photo={photos.tileDetail}
            ratio="3 / 4"
            className="row-span-2"
            sizes="(max-width: 640px) 47vw, (max-width: 1024px) 47vw, 45vw"
            zoom
          />
          <PoolPhoto
            photo={photos.lapPoolEvening}
            ratio="3 / 2"
            sizes="(max-width: 640px) 47vw, (max-width: 1024px) 47vw, 45vw"
            zoom
          />
          <PoolPhoto
            photo={photos.woodDeck}
            ratio="3 / 2"
            sizes="(max-width: 640px) 47vw, (max-width: 1024px) 47vw, 45vw"
            zoom
          />
        </div>

        <p className="mt-5 text-sm leading-6 text-[var(--hq-text-muted)]">
          Tile and coping, equipment and lighting, decking — the categories you
          can choose from when we define which appointments we book for you.
        </p>
      </Container>
    </section>
  );
}
