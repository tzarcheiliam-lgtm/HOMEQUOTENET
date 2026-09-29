'use client';

import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modal dialog on Radix (focus trap, Escape to close, scroll lock), styled to
 * match ConfirmAction. Use for short, self-contained flows.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in motion-reduce:animate-none" />
      <DialogPrimitive.Content
        className={cn(
          // Phones: a bottom sheet (full width, rounded top, clears the home
          // indicator). sm and up: the centred modal it always was.
          'fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg outline-none max-sm:data-[state=open]:animate-in max-sm:data-[state=open]:slide-in-from-bottom motion-reduce:animate-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6 sm:pb-6',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-md text-muted-foreground sm:right-4 sm:top-4 sm:size-8 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold tracking-tight', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
