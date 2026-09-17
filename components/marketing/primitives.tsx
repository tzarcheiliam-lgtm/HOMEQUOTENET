import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ---- Layout ------------------------------------------------------------- */

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>
      {children}
    </div>
  );
}

export function Section({
  children,
  id,
  className,
  bleed = false,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  /** Skip the Container when the section manages its own width. */
  bleed?: boolean;
}) {
  return (
    <section id={id} className={cn('relative py-20 sm:py-28', className)}>
      {bleed ? children : <Container>{children}</Container>}
    </section>
  );
}

/* ---- Typography --------------------------------------------------------- */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--hq-accent-bright)]">
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' && 'mx-auto text-center',
        className
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2
        className={cn(
          'text-balance text-3xl font-semibold tracking-tight text-[var(--hq-text)] sm:text-4xl',
          eyebrow && 'mt-3'
        )}
      >
        {title}
      </h2>
      {lead ? (
        <p className="mt-4 text-pretty text-base leading-7 text-[var(--hq-text-muted)] sm:text-lg sm:leading-8">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

/* ---- Buttons ------------------------------------------------------------ */

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap disabled:pointer-events-none disabled:opacity-60';

const buttonSizes = {
  md: 'h-11 px-6',
  lg: 'h-13 px-7 text-[15px] py-3.5',
} as const;

const buttonVariants = {
  /** Primary CTA. The only saturated fill on the page. */
  primary:
    'bg-[var(--hq-accent)] text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_8px_24px_-8px_rgba(61,125,255,0.6)] hover:bg-[var(--hq-accent-bright)] hover:shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_10px_30px_-8px_rgba(61,125,255,0.7)]',
  /** Secondary: outlined, quiet. */
  secondary:
    'border border-[var(--hq-line-strong)] bg-[var(--hq-surface)]/60 text-[var(--hq-text)] hover:border-[var(--hq-text-dim)] hover:bg-[var(--hq-surface-2)]',
  ghost:
    'text-[var(--hq-text-muted)] hover:text-[var(--hq-text)]',
} as const;

export type CtaProps = {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  className?: string;
};

export function Cta({
  href,
  children,
  variant = 'primary',
  size = 'lg',
  className,
}: CtaProps) {
  const isHash = href.startsWith('/#') || href.startsWith('#');
  const classes = cn(
    buttonBase,
    buttonSizes[size],
    buttonVariants[variant],
    className
  );

  // In-page anchors use a plain <a> so the browser handles the scroll natively.
  if (isHash) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

/* ---- Small parts -------------------------------------------------------- */

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        tone === 'accent'
          ? 'border-[var(--hq-accent-dim)] bg-[var(--hq-accent-glow)] text-[var(--hq-accent-bright)]'
          : 'border-[var(--hq-line)] bg-[var(--hq-surface)] text-[var(--hq-text-muted)]'
      )}
    >
      {children}
    </span>
  );
}

/**
 * A standing compliance note. Rendered in a deliberately plain, legible style
 * so it reads as a term of business rather than as fine print to be skipped.
 */
export function Disclosure({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'rounded-xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/50 px-4 py-3 text-sm leading-6 text-[var(--hq-text-muted)]',
        className
      )}
    >
      {children}
    </p>
  );
}

export function Rule({ className }: { className?: string }) {
  return <div className={cn('hq-rule', className)} aria-hidden="true" />;
}
