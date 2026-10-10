import { cn } from '@/lib/utils';

/*
 * HomeQuote artwork, served from /brand (extracted from the brand guidelines).
 * The files already carry the guideline clear space (one quote-mark width on
 * every side), so size them directly and do not add tight padding or crop them.
 *
 * - tone="primary":  blue/navy logo for white and Mist surfaces.
 * - tone="reversed": white/gold logo for Navy and Blue surfaces. Never use the
 *   primary logo on Blue (guideline).
 * - variant="mark":  the house-and-quote icon alone, for tight spaces.
 *
 * Plain <img> on purpose: these are small SVGs, so next/image optimisation
 * adds nothing.
 */
const ART = {
  horizontal: {
    primary: '/brand/homequote-logo-primary-horizontal.svg',
    reversed: '/brand/homequote-logo-reversed-horizontal.svg',
    width: 1200,
    height: 348,
  },
  mark: {
    primary: '/brand/homequote-icon-primary.svg',
    reversed: '/brand/homequote-icon-reversed.svg',
    width: 1,
    height: 1,
  },
} as const;

export function BrandLogo({
  variant = 'horizontal',
  tone = 'primary',
  className,
  priority,
}: {
  variant?: keyof typeof ART;
  tone?: 'primary' | 'reversed';
  className?: string;
  priority?: boolean;
}) {
  const art = ART[variant];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={art[tone]}
      width={art.width}
      height={art.height}
      alt="HomeQuote"
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('h-auto', className)}
    />
  );
}
