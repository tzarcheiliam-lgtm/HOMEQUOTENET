import * as React from 'react';
import { cn } from '@/lib/utils';

// A lightweight styled native <select>. Keeps forms simple and dependency-free;
// good enough for the CRM's dropdowns.
//
// The closed control names its own background and text rather than inheriting
// them: a <select> that is transparent with an inherited colour is readable
// only for as long as whatever sits behind it stays the colour we assumed. The
// popup half of this — the <option> rows — is handled once in globals.css,
// since the browser draws that list outside the page.
function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'border-input bg-background text-foreground flex h-9 w-full rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Select };
