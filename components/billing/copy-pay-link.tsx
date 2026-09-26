'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Admin: copy a request's payment link to text or email it to the contractor. */
export function CopyPayLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt('Copy this payment link:', url);
        }
      }}
    >
      {copied ? <Check aria-hidden className="size-3.5" /> : <Link2 aria-hidden className="size-3.5" />}
      {copied ? 'Copied' : 'Copy pay link'}
    </Button>
  );
}
