'use client';

import { detachThisDevice } from '@/lib/notifications/client';

/**
 * Wraps the existing sign-out server action. Before the session ends it
 * detaches this device from the account's push subscriptions (best effort,
 * capped at 2.5s), so a shared or handed-over phone stops receiving the
 * previous user's alerts. Falls through to the normal action either way.
 */
export function SignOutForm({
  action,
  children,
  className,
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={async (e) => {
        const form = e.currentTarget;
        if (form.dataset.detached) return;
        e.preventDefault();
        await detachThisDevice();
        form.dataset.detached = '1';
        form.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
