'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCodeForDisplay } from '@/lib/signing/access-code';

export interface ShownCode { recipientId: string; name: string; email: string; code: string }

/**
 * Shows each signer's access code ONCE. Codes are stored only as a hash, so they cannot be shown again;
 * a lost code is replaced with “New code”. Share them by phone or text, never in the signing email.
 */
export function AccessCodesPanel({ codes, title = 'Access codes: share these separately' }: { codes: ShownCode[]; title?: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!codes.length) return null;
  const copy = async (c: ShownCode) => {
    try { await navigator.clipboard.writeText(c.code); setCopied(c.recipientId); setTimeout(() => setCopied(null), 1500); } catch { /* the code is visible to copy by hand */ }
  };
  return (
    <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="region" aria-label="Access codes">
      <p className="flex items-center gap-2 font-medium"><KeyRound className="size-4" /> {title}</p>
      <p className="text-xs">Give each signer their code by phone or text. It is <strong>not</strong> in the email, and it is shown only now: if you lose it, use “New code”.</p>
      <ul className="space-y-1.5">
        {codes.map((c) => (
          <li key={c.recipientId} className="flex flex-wrap items-center gap-3 rounded bg-white/70 px-2 py-1.5">
            <span className="min-w-0 flex-1 truncate">{c.name} <span className="text-xs text-muted-foreground">· {c.email}</span></span>
            <code className="rounded bg-white px-2 py-0.5 text-base font-semibold tracking-widest">{formatCodeForDisplay(c.code)}</code>
            <Button type="button" size="sm" variant="outline" onClick={() => copy(c)} aria-label={`Copy code for ${c.name}`}>{copied === c.recipientId ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
