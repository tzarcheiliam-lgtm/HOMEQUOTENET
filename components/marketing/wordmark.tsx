import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * The HomeQuote Network lockup: the real logo badge plus the business name in
 * live text.
 *
 * The name stays as text rather than being left to the image for two reasons:
 * the badge's own tagline is unreadable below about 150px, and a text wordmark
 * keeps the business name in the document for search engines and screen
 * readers. The image is therefore decorative and marked as such — the adjacent
 * text already names the brand.
 *
 * The source logo is a circular badge on an opaque black square. The published
 * copy is clipped to that circle with an alpha channel, so it sits on the dark
 * background without a visible plate behind it.
 */

const LOGO = '/images/brand/homequote-network-logo.webp';

export function Wordmark({
  className,
  size = 'md',
  showName = true,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}) {
  const box = size === 'lg' ? 44 : size === 'sm' ? 30 : 36;
  const text =
    size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-[13px]' : 'text-[15px]';

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src={LOGO}
        alt=""
        aria-hidden="true"
        width={box}
        height={box}
        // Fixed render size, so a single intrinsic size is enough.
        sizes={`${box}px`}
        priority
        className="shrink-0 rounded-full"
        style={{ width: box, height: box }}
      />
      {showName ? (
        <span
          className={cn(
            'font-semibold tracking-tight text-[var(--hq-text)]',
            text
          )}
        >
          HomeQuote<span className="text-[var(--hq-text-dim)]"> Network</span>
        </span>
      ) : null}
    </span>
  );
}
