'use client';

import { useActionState, useState } from 'react';
import { CircleCheck, LoaderCircle, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { setServiceRequestPrice, type BillingActionState } from '@/lib/actions/billing';
import type { PriceInterval } from '@/lib/billing/pricing';

const dollars = (cents: number | null) => (cents === null ? '' : (cents / 100).toFixed(cents % 100 ? 2 : 0));

interface PriceProps {
  requestId: string;
  companyName: string;
  serviceName: string;
  /** The catalog price shown to contractors, as a reminder. */
  suggested: string;
  current: {
    price_cents: number | null;
    price_interval: PriceInterval | null;
    setup_fee_cents: number | null;
    price_description: string | null;
  };
}

/**
 * Admin: write the price for one request. Saving makes "Review & pay" appear
 * in the contractor's portal; nothing is charged until they pay on Stripe.
 */
export function SetPriceDialog(props: PriceProps) {
  const [open, setOpen] = useState(false);
  // A fresh form each time it opens, so a finished "Price sent" state doesn't linger.
  const [session, setSession] = useState(0);
  const hasPrice = props.current.price_cents !== null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSession((n) => n + 1);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={hasPrice ? 'outline' : 'default'} size="sm" className="h-7">
          <Tag aria-hidden className="size-3.5" /> {hasPrice ? 'Change price' : 'Set price'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <PriceForm key={session} {...props} />
      </DialogContent>
    </Dialog>
  );
}

function DollarInput({ id, name, placeholder, defaultValue, required }: { id: string; name: string; placeholder: string; defaultValue: string; required?: boolean }) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input id={id} name={name} inputMode="decimal" required={required} placeholder={placeholder} defaultValue={defaultValue} className="pl-6 tabular-nums" />
    </div>
  );
}

function PriceForm({ requestId, companyName, serviceName, suggested, current }: PriceProps) {
  const [state, action, pending] = useActionState<BillingActionState, FormData>(setServiceRequestPrice, undefined);
  const [interval, setInterval] = useState<PriceInterval>(current.price_interval ?? 'one_time');

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <DialogTitle className="flex items-center gap-2">
          <CircleCheck aria-hidden className="size-5 text-emerald-600" /> Price sent
        </DialogTitle>
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
        <DialogClose asChild>
          <Button variant="outline">Done</Button>
        </DialogClose>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={requestId} />
      <div className="space-y-1 pr-6">
        <DialogTitle>Set price</DialogTitle>
        <DialogDescription>
          {serviceName} for {companyName}. Listed price: {suggested}.
        </DialogDescription>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`price-${requestId}`}>Price (USD)</Label>
          <DollarInput id={`price-${requestId}`} name="price" placeholder="499" defaultValue={dollars(current.price_cents)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`interval-${requestId}`}>Billing</Label>
          <Select
            id={`interval-${requestId}`}
            name="interval"
            value={interval}
            onChange={(e) => setInterval(e.target.value as PriceInterval)}
          >
            <option value="one_time">One-time payment</option>
            <option value="month">Monthly subscription</option>
          </Select>
        </div>
      </div>

      {interval === 'month' && (
        <div className="space-y-1.5">
          <Label htmlFor={`setup-${requestId}`}>One-time setup fee (optional)</Label>
          <DollarInput id={`setup-${requestId}`} name="setup_fee" placeholder="500" defaultValue={dollars(current.setup_fee_cents)} />
          <p className="text-xs text-muted-foreground">Charged once, with the first month.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`desc-${requestId}`}>What’s included (optional)</Label>
        <Textarea
          id={`desc-${requestId}`}
          name="description"
          maxLength={500}
          rows={2}
          placeholder="Shown to the contractor at checkout"
          defaultValue={current.price_description ?? ''}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="notify" defaultChecked className="size-4 accent-slate-900" />
        Email the contractor that their price is ready
      </label>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />} Send price
        </Button>
        <p className="text-xs text-muted-foreground">Nothing is charged until the contractor pays on Stripe.</p>
      </div>
    </form>
  );
}
