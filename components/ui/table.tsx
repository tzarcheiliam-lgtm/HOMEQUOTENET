import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * `stack` makes this a ResponsiveTable: below lg each row becomes a card and
 * each <TableCell label="…"> shows its label beside its value (rules in
 * globals.css, keyed on data-stack). Use it for simple lists; screens that
 * need real mobile actions get purpose-built cards instead.
 */
function Table({
  className,
  stack,
  ...props
}: React.ComponentProps<'table'> & { stack?: boolean }) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table
        data-stack={stack ? '' : undefined}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      className={cn('bg-muted/40 [&_tr]:border-b', className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-11 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

function TableCell({
  className,
  label,
  ...props
}: React.ComponentProps<'td'> & { label?: string }) {
  return (
    <td
      data-label={label}
      className={cn('px-4 py-3 align-middle', className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
