import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/utils';

/**
 * Marketing-site logo. The marketing and contractor-ad surfaces are Navy, so
 * this always uses the reversed logo. Widths include the logo's built-in clear
 * space, so the visible mark is about 85% of the width.
 */
export function Wordmark({
  className,
  size = 'md',
  tone = 'reversed',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** 'primary' on light surfaces (the homeowner journey). */
  tone?: 'primary' | 'reversed';
  /** Kept for call-site compatibility; the logo always includes the wordmark. */
  showName?: boolean;
}) {
  const width = size === 'lg' ? 'w-[200px]' : size === 'sm' ? 'w-[132px]' : 'w-[156px]';
  return <BrandLogo tone={tone} priority className={cn('shrink-0', width, className)} />;
}
