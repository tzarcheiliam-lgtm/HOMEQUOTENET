'use client';

import { useCallback, useRef } from 'react';
import Image from 'next/image';
import { Expand, X } from 'lucide-react';
import type { ProofImage } from '@/content/proof';
import { cn } from '@/lib/utils';

/**
 * A screenshot that opens full size.
 *
 * Proof assets are dense — an Ads Manager table, a week of appointments — and
 * at section width a visitor can see the shape but not read the rows. So the
 * thumbnail is a button that opens the same file in a native <dialog>, which
 * brings Esc, focus trapping and the top layer with it rather than us
 * reimplementing them. Clicking the backdrop closes it too.
 *
 * Deliberately no zoom, pan or transition beyond the dialog appearing: this is
 * evidence, and it should behave like a document, not a gallery.
 *
 * Both <Image>s are `unoptimized`. The source files are already hand-optimised
 * webp (~100-150KB each) at their native resolution, and the optimiser was
 * picking a srcset candidate narrower than the rendered box, which on a dense
 * screenshot of a table turns the numbers to mush. Serving the file as-is keeps
 * the figures legible at every device pixel ratio for very little weight.
 */
export function ExpandableImage({
  image,
  sizes,
  /** Shown under the thumbnail, and repeated under the expanded view. */
  caption,
  /** Accessible label for the expand button. */
  label = 'Expand image',
  className,
  priority = false,
}: {
  image: ProofImage;
  sizes: string;
  caption?: string;
  label?: string;
  className?: string;
  priority?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => dialogRef.current?.showModal(), []);
  const close = useCallback(() => dialogRef.current?.close(), []);

  /*
    Scroll locking is CSS, not JavaScript: see html:has(dialog.hq-lightbox[open])
    in marketing.css. An earlier version set documentElement.style.overflow when
    opening and cleared it from a 'close' listener, and the listener did not
    always run — closing with Esc left the page stuck at overflow: hidden and
    the visitor unable to scroll. A declarative rule cannot desynchronise from
    the dialog's state, and where :has is unsupported it simply falls back to
    the browser's own modal behaviour rather than to a frozen page.
  */

  return (
    <figure className={cn('m-0', className)}>
      <button
        type="button"
        onClick={open}
        aria-label={label}
        className="hq-photo hq-expandable group block w-full cursor-zoom-in p-0"
        style={{ aspectRatio: `${image.width} / ${image.height}` }}
      >
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          unoptimized
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-[var(--hq-line-strong)] bg-[rgb(8_9_11/0.82)] px-3 py-1.5 text-xs font-medium text-[var(--hq-text)] backdrop-blur-sm transition-colors group-hover:border-[var(--hq-accent-dim)] group-hover:text-[var(--hq-accent-bright)]"
        >
          <Expand className="size-3.5" />
          Expand
        </span>
      </button>

      {caption ? (
        <figcaption className="mt-3 text-sm leading-6 text-[var(--hq-text-dim)]">
          {caption}
        </figcaption>
      ) : null}

      <dialog
        ref={dialogRef}
        className="hq hq-lightbox"
        aria-label={label}
        onClick={(event) => {
          // Only the backdrop: clicks inside the figure below stop here.
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="hq-lightbox-inner">
          <button
            type="button"
            onClick={close}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--hq-line-strong)] bg-[var(--hq-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--hq-text)] hover:border-[var(--hq-text-dim)]"
          >
            <X className="size-3.5" />
            Close
          </button>

          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes="100vw"
            unoptimized
            className="mt-3 h-auto w-full rounded-lg border border-[var(--hq-line)]"
          />

          {caption ? (
            <p className="mt-3 text-sm leading-6 text-[var(--hq-text-muted)]">
              {caption}
            </p>
          ) : null}
        </div>
      </dialog>
    </figure>
  );
}
