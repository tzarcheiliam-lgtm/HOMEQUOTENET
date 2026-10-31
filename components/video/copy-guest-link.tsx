'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Copies the guest's join link (to paste in a text or email). */
export function CopyGuestLink({ url, compact = false, tone = 'dark', className }: { url: string; compact?: boolean; tone?: 'dark' | 'light'; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy the guest link:', url);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
        tone === 'light'
          ? 'h-9 border-input bg-background text-foreground hover:bg-accent'
          : compact ? 'border-white/20 bg-black/60 text-white hover:bg-black/80' : 'border-white/30 text-white hover:bg-white/10',
        className
      )}
      aria-live="polite"
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy guest link'}
    </button>
  );
}
