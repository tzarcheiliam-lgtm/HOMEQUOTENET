'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { FilterChip } from './filter-chips';

/**
 * The phone filtering flow: a search box, a Filters button that opens a
 * bottom sheet with every control stacked, removable chips for what is
 * active, and Clear all / Apply. It is a plain GET form like the desktop
 * filter bars, so the URL stays the source of truth and nothing changes on
 * the server. Render it next to the desktop bar (`hidden lg:block`).
 *
 * - `q` / `searchName`: current search text and its param name.
 * - `fieldValues`: current values of the controls inside the sheet, echoed as
 *   hidden inputs on the search form so searching never drops a filter.
 * - `carry`: params that are neither search nor sheet fields (saved view…).
 * - `children`: the sheet's controls (full-width labelled fields).
 */
export function MobileFilters({
  action,
  q,
  searchName = 'q',
  searchPlaceholder = 'Search…',
  fieldValues,
  carry,
  chips,
  clearHref,
  children,
  className,
}: {
  action: string;
  q?: string;
  searchName?: string;
  searchPlaceholder?: string;
  fieldValues: Record<string, string | undefined>;
  carry?: Record<string, string | undefined>;
  chips: FilterChip[];
  clearHref: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const formId = useId();
  const fieldCount = Object.values(fieldValues).filter(Boolean).length;
  const hiddenEntries = (o: Record<string, string | undefined>) =>
    Object.entries(o).filter(([, v]) => v);

  return (
    <div className={cn('space-y-2 lg:hidden', className)}>
      <div className="flex gap-2">
        <form method="get" action={action} className="relative min-w-0 flex-1">
          {hiddenEntries({ ...carry, ...fieldValues }).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            name={searchName}
            defaultValue={q ?? ''}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            enterKeyHint="search"
            className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </form>
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title="Filters"
          trigger={
            <button
              type="button"
              className="relative flex h-11 shrink-0 items-center gap-2 rounded-lg border bg-background px-3.5 text-sm font-medium shadow-xs active:bg-accent"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filters
              {fieldCount > 0 ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {fieldCount}
                </span>
              ) : null}
            </button>
          }
          footer={
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href={clearHref} onClick={() => setOpen(false)}>
                  Clear all
                </Link>
              </Button>
              <Button type="submit" form={formId} className="flex-[2]">
                Apply
              </Button>
            </div>
          }
        >
          <form id={formId} method="get" action={action} className="space-y-4 pt-1">
            {hiddenEntries({ ...carry, [searchName]: q }).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            {children}
          </form>
        </BottomSheet>
      </div>

      {chips.length > 0 ? (
        <div className="-mx-3 flex items-center gap-2 overflow-x-auto px-3 pb-1 no-scrollbar">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              aria-label={`Remove filter ${chip.label}`}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-muted/60 pl-3 pr-2 text-sm active:bg-accent"
            >
              <span className="max-w-[10rem] truncate">{chip.label}</span>
              <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
          <Link
            href={clearHref}
            className="flex h-9 shrink-0 items-center px-2 text-sm font-medium text-muted-foreground underline-offset-4 active:underline"
          >
            Clear all
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/** A labelled full-width control row for the filter sheet. */
export function SheetField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
