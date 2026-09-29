'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A bottom-anchored sheet for phone-first flows: filters, "More" menus,
 * status pickers, quick logging. Built on the same Radix dialog as
 * components/ui/dialog (focus trap, Escape, scroll lock), but always docks to
 * the bottom edge, never exceeds 88% of the viewport, scrolls its body, and
 * keeps an optional footer pinned above the home indicator.
 *
 * Use it from `md:hidden` triggers; on wider screens prefer <Dialog>.
 */
export function BottomSheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Rendered with asChild, so pass a single <button>. */
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Pinned under the scrolling body (Apply / Save buttons). */
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in motion-reduce:animate-none" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-[60] flex max-h-[88dvh] flex-col rounded-t-2xl border-t bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom motion-reduce:animate-none',
            className
          )}
        >
          <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold tracking-tight">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Close"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
          {footer ? (
            <div className="shrink-0 border-t bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
              {footer}
            </div>
          ) : (
            <div className="pb-safe shrink-0" />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
