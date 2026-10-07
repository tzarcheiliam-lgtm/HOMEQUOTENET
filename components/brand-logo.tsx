import Image from 'next/image';
import { cn } from '@/lib/utils';

/*
 * HomeQuote artwork, served from /assets/brand. Transparent PNGs derived from
 * the supplied logo files (originals untouched), drawn on light surfaces only:
 * the navy wordmark does not hold contrast on dark backgrounds.
 *
 * - horizontal: house + wordmark + NETWORK rule. The tagline is intentionally
 *   cropped out; it is unreadable below ~400px wide.
 * - mark: the house-and-fence icon alone, for tight spaces.
 */
const ART = {
  horizontal: { src: '/assets/brand/hq-logo-horizontal.png', width: 720, height: 111 },
  mark: { src: '/assets/brand/hq-mark.png', width: 160, height: 68 },
} as const;

export function BrandLogo({
  variant = 'horizontal',
  className,
  priority,
}: {
  variant?: keyof typeof ART;
  className?: string;
  priority?: boolean;
}) {
  const art = ART[variant];
  return (
    <Image
      src={art.src}
      width={art.width}
      height={art.height}
      alt="HomeQuote Network"
      priority={priority}
      sizes={variant === 'mark' ? '64px' : '204px'}
      className={cn('h-auto', className)}
    />
  );
}
