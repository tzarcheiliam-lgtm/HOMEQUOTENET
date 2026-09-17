import Image from 'next/image';
import type { Photo } from '@/content/photos';
import { cn } from '@/lib/utils';

/**
 * A pool photograph with the shared navy scrim.
 *
 * Wrapping next/image here keeps three things consistent everywhere: the scrim
 * (see .hq-scrim in marketing.css), an explicit aspect ratio so nothing shifts
 * while loading, and a required `sizes` value so the browser never downloads a
 * desktop-width file for a phone.
 */

type Scrim = 'soft' | 'hero' | 'band' | 'none';

const scrimClass: Record<Scrim, string> = {
  soft: 'hq-scrim hq-scrim-soft',
  hero: 'hq-scrim hq-scrim-hero',
  band: 'hq-scrim hq-scrim-band',
  none: '',
};

export function PoolPhoto({
  photo,
  sizes,
  ratio,
  scrim = 'soft',
  priority = false,
  zoom = false,
  className,
  imgClassName,
}: {
  photo: Photo;
  /** Required: the rendered width at each breakpoint. */
  sizes: string;
  /** CSS aspect-ratio, e.g. '16 / 9'. Reserves space before the image loads. */
  ratio: string;
  scrim?: Scrim;
  /** Only the true hero should set this. */
  priority?: boolean;
  zoom?: boolean;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div
      className={cn('hq-photo', scrimClass[scrim], zoom && 'hq-photo-zoom', className)}
      style={{ aspectRatio: ratio }}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        quality={82}
        className={imgClassName}
      />
    </div>
  );
}

/**
 * Full-bleed background photograph, for the hero and the closing CTA band.
 * Absolutely positioned behind its section's content.
 */
export function PhotoBackdrop({
  photo,
  scrim = 'hero',
  priority = false,
  className,
  objectClassName,
}: {
  photo: Photo;
  scrim?: Scrim;
  priority?: boolean;
  className?: string;
  /** Responsive object-position, e.g. 'object-[60%_35%] md:object-center'. */
  objectClassName?: string;
}) {
  return (
    <div
      className={cn(
        'absolute inset-0 -z-10 overflow-hidden',
        scrimClass[scrim],
        className
      )}
      aria-hidden={false}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        // Full-bleed at every breakpoint.
        sizes="100vw"
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        quality={80}
        className={cn('object-cover', objectClassName)}
      />
    </div>
  );
}
