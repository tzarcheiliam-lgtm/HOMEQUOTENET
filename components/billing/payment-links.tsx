'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cancelPaymentRequest } from '@/lib/actions/payment-requests';

export interface PaymentLinkRow {
  id: string;
  created_at: string;
  description: string;
  who: string;
  amountText: string;
  status: 'sent' | 'paid' | 'canceled';
  url: string | null;
  emailed: boolean;
}

const LABEL = { sent: 'Awaiting payment', paid: 'Paid', canceled: 'Canceled' } as const;
const VARIANT = { sent: 'warning', paid: 'success', canceled: 'muted' } as const;
const date = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
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
      {copied ? <Check aria-hidden className="size-3.5" /> : <Link2 aria-hidden className="size-3.5" />} {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}

/** Admin: payment links sent from this page, with their status. */
export function PaymentLinks({ rows }: { rows: PaymentLinkRow[] }) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{r.description}</p>
            <p className="truncate text-sm text-muted-foreground">
              {r.who || 'No customer'} · {r.amountText} · {date(r.created_at)}
              {r.emailed ? ' · emailed' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={VARIANT[r.status]}>{LABEL[r.status]}</Badge>
            {r.status === 'sent' && r.url && <CopyButton url={r.url} />}
            {r.status === 'sent' && (
              <form action={cancelPaymentRequest}>
                <input type="hidden" name="id" value={r.id} />
                <Button type="submit" variant="ghost" size="sm">
                  Cancel
                </Button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
