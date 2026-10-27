'use client';

import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openQuickEmail } from '@/lib/calls/quick-email-events';

/** Opens the quick email sheet with the follow-up for the prospect's current outcome. */
export function EmailButton({ className }: { className?: string }) {
  return (
    <Button type="button" size="lg" variant="outline" className={className} onClick={() => openQuickEmail()}>
      <Mail className="size-4" aria-hidden="true" />
      Email
    </Button>
  );
}
