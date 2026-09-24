'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Catches errors thrown by server actions / pages in the app (e.g. the
// last-admin safeguard) and shows the message instead of a raw crash.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6 text-center">
          <h1 className="text-lg font-semibold">Action not allowed</h1>
          <p className="text-sm text-muted-foreground">
            {error?.message || 'Something went wrong.'}
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={reset} variant="outline">
              Try again
            </Button>
            <Button asChild>
              <Link href="/app">Back to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
