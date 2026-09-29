import { cn } from '@/lib/utils';

/**
 * A pinned action bar for phone workspaces (call detail, lead detail).
 * Renders nothing above md. `above-nav` sits on top of the bottom navigation;
 * `bottom` replaces it (focused routes hide the nav, see AppMain).
 */
export function MobileActionBar({
  children,
  placement = 'bottom',
  className,
}: {
  children: React.ReactNode;
  placement?: 'bottom' | 'above-nav';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 z-40 border-t bg-background/95 px-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden',
        placement === 'bottom'
          ? 'bottom-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))]'
          : 'bottom-mnav pb-2',
        className
      )}
    >
      <div className="mx-auto flex max-w-xl items-stretch gap-2">{children}</div>
    </div>
  );
}

/**
 * One slot of a MobileActionBar: icon over a short label, 56px tall. Renders an
 * <a> when given `href`, otherwise a <button>. `primary` fills it (the one
 * action you came here to do); `disabled` keeps the slot so the bar does not
 * reflow between records.
 */
export function ActionBarItem({
  href,
  onClick,
  icon: Icon,
  label,
  primary,
  disabled,
  grow = 1,
  className,
  ...rest
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  grow?: number;
  className?: string;
} & Omit<React.ComponentProps<'a'>, 'href' | 'onClick' | 'className'>) {
  const cls = cn(
    'flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium',
    primary
      ? 'bg-primary font-semibold text-primary-foreground active:opacity-85'
      : 'border bg-background active:bg-accent',
    disabled && 'pointer-events-none opacity-50',
    className
  );
  const style = { flexGrow: grow, flexBasis: 0 };
  const inner = (
    <>
      <Icon className="size-5" aria-hidden="true" />
      <span className="max-w-full truncate px-1">{label}</span>
    </>
  );
  if (href && !disabled) {
    return (
      <a href={href} className={cls} style={style} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={cls}
      style={style}
    >
      {inner}
    </button>
  );
}
