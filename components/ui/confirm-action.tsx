'use client';

import { AlertDialog } from 'radix-ui';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A button that opens a confirmation dialog before running a (void) server
 * action. Use for destructive operations: suspend, disable, delete, reset.
 */
export function ConfirmAction({
  action,
  fields = {},
  triggerLabel,
  triggerVariant = 'outline',
  triggerSize = 'sm',
  triggerClassName,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
}: {
  action: (formData: FormData) => Promise<void>;
  fields?: Record<string, string>;
  triggerLabel: React.ReactNode;
  triggerVariant?: React.ComponentProps<typeof Button>['variant'];
  triggerSize?: React.ComponentProps<typeof Button>['size'];
  triggerClassName?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={triggerClassName}>
          {triggerLabel}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-lg">
          <AlertDialog.Title className="text-lg font-semibold">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-sm text-muted-foreground">
            {description}
          </AlertDialog.Description>
          <form action={action} className="mt-6 flex justify-end gap-2">
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action
              type="submit"
              className={cn(
                buttonVariants({
                  variant: destructive ? 'destructive' : 'default',
                })
              )}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </form>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
