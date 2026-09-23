'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * Error boundary for the calling workspace. Nothing sensitive is shown:
 * the message is generic and the detail goes to the console only.
 */
export default function CallsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[calls]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-10">
      <EmptyState
        icon={AlertTriangle}
        title="Something went wrong loading the calling workspace"
        description="Your logged calls are safe — every outcome is written before this page renders. Try again, or go back to your list."
        action={
          <div className="flex gap-2">
            <Button onClick={reset}>Try again</Button>
            <Link href="/app/calls" className={buttonVariants({ variant: 'outline' })}>
              Back to call list
            </Link>
          </div>
        }
      />
    </div>
  );
}
