'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/*
 * Compact GET filter form. Desktop shows the fields inline with Apply and
 * Reset in the same row; phones collapse it behind a labelled toggle that
 * carries the active-filter count. It is a plain <form method="get">, so
 * filtering keeps working without client JS and the URL stays shareable.
 */
export function FilterPanel({
  activeCount,
  resetHref,
  children,
  className,
}: {
  activeCount: number;
  resetHref: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return (
    <section aria-label="Filters" className={cn('rounded-xl border bg-card', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-sm font-medium lg:hidden"
      >
        <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
        Filters
        {activeCount > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {activeCount} active
          </span>
        )}
        <ChevronDown className={cn('ml-auto size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <form
        id={id}
        method="get"
        className={cn('flex-wrap items-end gap-3 border-t p-4 lg:flex lg:border-t-0 lg:p-3', open ? 'grid' : 'hidden lg:flex')}
      >
        {children}
        <div className="flex items-center gap-2 lg:ml-auto">
          <Button type="submit" size="sm" className="flex-1 lg:flex-none">
            Apply
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 lg:flex-none">
            <Link href={resetHref} aria-disabled={activeCount === 0}>
              Reset
            </Link>
          </Button>
          {activeCount > 0 && (
            <span className="hidden whitespace-nowrap text-xs font-medium text-muted-foreground lg:inline" role="status">
              {activeCount} filter{activeCount === 1 ? '' : 's'} active
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

export function FilterField({
  label,
  htmlFor,
  active,
  children,
}: {
  label: string;
  htmlFor: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 lg:w-44 lg:flex-1">
      <label htmlFor={htmlFor} className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        {active && <span className="size-1.5 rounded-full bg-primary" aria-label="filter set" />}
      </label>
      {children}
    </div>
  );
}
