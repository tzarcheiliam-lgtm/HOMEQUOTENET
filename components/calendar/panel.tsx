'use client';

import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';

/**
 * The calendar's side panel: a bottom sheet on phones, a right-hand drawer
 * from md up (the grid stays visible beside it). Radix dialog underneath, so
 * focus is trapped, Escape closes it and the page behind does not scroll.
 */
export function CalendarPanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in motion-reduce:animate-none" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-[60] flex max-h-[92dvh] flex-col rounded-t-2xl border-t bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom motion-reduce:animate-none md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-none md:border-l md:border-t-0 md:data-[state=open]:slide-in-from-right"
        >
          <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-muted-foreground/30 md:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3 md:pt-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className={description ? 'mt-0.5 text-sm text-muted-foreground' : 'sr-only'}>
                {description ?? title}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Close"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
          {footer ? <div className="border-t px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
