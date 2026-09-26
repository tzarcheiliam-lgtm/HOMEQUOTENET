'use client';

import { useActionState } from 'react';
import { CreditCard, ExternalLink, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openBillingPortal, startServiceCheckout, type BillingActionState } from '@/lib/actions/billing';

/** Contractor: pay a priced request on Stripe Checkout. */
export function PayButton({ requestId, label = 'Review & pay', size = 'sm' }: { requestId: string; label?: string; size?: 'sm' | 'lg' }) {
  const [state, action, pending] = useActionState<BillingActionState, FormData>(startServiceCheckout, undefined);
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="id" value={requestId} />
      <Button type="submit" size={size} disabled={pending} className={size === 'lg' ? 'w-full justify-center' : undefined}>
        {pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <CreditCard aria-hidden className="size-4" />}
        {label}
      </Button>
      {state && !state.ok && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Contractor: Stripe's billing portal for cards, invoices and cancelling monthly services. */
export function ManageBillingButton() {
  const [state, action, pending] = useActionState<BillingActionState, FormData>(openBillingPortal, undefined);
  return (
    <form action={action} className="space-y-1">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <ExternalLink aria-hidden className="size-4" />}
        Manage billing
      </Button>
      {state && !state.ok && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
