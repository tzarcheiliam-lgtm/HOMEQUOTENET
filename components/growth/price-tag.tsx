import { cn } from '@/lib/utils';
import { PRICE_UNITS, formatPrice, type ServicePrice } from '@/lib/growth/catalog';

/**
 * A service's price on a Growth Tools card: the figure, then its type
 * (/mo, one-time, per campaign...) so contractors can tell them apart.
 * `inverse` is for the dark featured card.
 */
export function PriceTag({
  price,
  tone = 'default',
  size = 'md',
  className,
}: {
  price: ServicePrice;
  tone?: 'default' | 'inverse';
  size?: 'md' | 'lg';
  className?: string;
}) {
  const inverse = tone === 'inverse';
  const muted = inverse ? 'text-white/65' : 'text-muted-foreground';
  const figure = cn('font-semibold tabular-nums tracking-tight', size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-lg');

  let main: React.ReactNode;
  if (price.type === 'custom_quote') {
    main = (
      <>
        <span className={cn(figure, size === 'md' && 'text-base')}>Custom quote</span>
        <span className={cn('text-sm', muted)}>priced to your project</span>
      </>
    );
  } else if (price.type === 'included') {
    main = (
      <>
        <span className={cn(figure, size === 'md' && 'text-base')}>Included</span>
        <span className={cn('text-sm', muted)}>with eligible HomeQuote plans</span>
      </>
    );
  } else if (price.type === 'starting_at') {
    main = (
      <>
        <span className={cn('text-sm', muted)}>Starting at</span>
        <span className={figure}>{price.amount}</span>
      </>
    );
  } else {
    main = (
      <>
        <span className={figure}>{price.amount}</span>
        <span className={cn('text-sm font-medium', muted)}>{PRICE_UNITS[price.type]}</span>
      </>
    );
  }

  return (
    <div className={cn('space-y-0.5', className)}>
      {/* One readable string for screen readers; the styled parts are hidden. */}
      <p className="sr-only">Price: {formatPrice(price)}</p>
      <p aria-hidden className="flex flex-wrap items-baseline gap-x-1.5">
        {main}
      </p>
      {price.setup && (
        <p aria-hidden className={cn('text-sm', muted)}>
          + <span className={cn('font-medium tabular-nums', inverse ? 'text-white/90' : 'text-foreground')}>{price.setup}</span> one-time setup
        </p>
      )}
      {price.note && <p className={cn('text-xs', muted)}>{price.note}</p>}
    </div>
  );
}
