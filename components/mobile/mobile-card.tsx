import { cn } from '@/lib/utils';

/**
 * The phone list-row container: one record as a tappable, self-contained card.
 * Compose with MobileDataRow for label/value pairs and put the primary action
 * buttons in a footer row (max two or three; overflow goes in a sheet).
 */
export function MobileCard({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-xl border bg-card p-4 shadow-xs', className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** A label/value pair, value right-aligned, for the facts inside a card. */
export function MobileDataRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1 text-sm', className)}>
      <dt className="shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

/** A full-width tappable row, for stacks of actions inside a bottom sheet. */
export const sheetRowClass =
  'flex min-h-12 w-full items-center gap-3 rounded-xl border bg-background px-4 text-left text-sm font-medium active:bg-accent';
