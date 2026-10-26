'use client';

import { useActionState, useState } from 'react';
import { Check, CircleCheck, Copy, LoaderCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { sendPaymentRequest, type SendPaymentState } from '@/lib/actions/payment-requests';

export interface CompanyOption {
  id: string;
  name: string;
  email: string | null;
}

/**
 * Admin: send a Stripe payment for any amount. Creates a single-use payment link
 * (and can email it). Nothing is charged until the customer pays on Stripe.
 */
export function SendPaymentDialog({ companies }: { companies: CompanyOption[] }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0); // a fresh form each time it opens
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSession((n) => n + 1);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Send aria-hidden className="size-4" /> Send payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <PaymentForm key={session} companies={companies} />
      </DialogContent>
    </Dialog>
  );
}

function DollarInput({ id, name, placeholder, required }: { id: string; name: string; placeholder: string; required?: boolean }) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input id={id} name={name} inputMode="decimal" required={required} placeholder={placeholder} className="pl-6 tabular-nums" />
    </div>
  );
}

function PaymentForm({ companies }: { companies: CompanyOption[] }) {
  const [state, action, pending] = useActionState<SendPaymentState, FormData>(sendPaymentRequest, undefined);
  const [interval, setInterval] = useState<'one_time' | 'month'>('one_time');
  const [copied, setCopied] = useState(false);

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <DialogTitle className="flex items-center gap-2">
          <CircleCheck aria-hidden className="size-5 text-emerald-700" /> Payment link ready
        </DialogTitle>
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
        <input readOnly value={state.url} onFocus={(e) => e.currentTarget.select()} aria-label="Payment link" className="w-full rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs" />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                window.prompt('Copy this payment link:', state.url);
              }
            }}
          >
            {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />} {copied ? 'Copied' : 'Copy link'}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Done</Button>
          </DialogClose>
        </div>
        <p className="text-xs text-muted-foreground">The link works for one payment. You can see it under “Payment links” on this page.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1 pr-6">
        <DialogTitle>Send a payment</DialogTitle>
        <DialogDescription>Creates a Stripe payment link for any amount. Nothing is charged until they pay.</DialogDescription>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pr-amount">Amount (USD)</Label>
          <DollarInput id="pr-amount" name="amount" placeholder="2,500" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pr-interval">Billing</Label>
          <Select id="pr-interval" name="interval" value={interval} onChange={(e) => setInterval(e.target.value as 'one_time' | 'month')}>
            <option value="one_time">One-time payment</option>
            <option value="month">Monthly subscription</option>
          </Select>
        </div>
      </div>

      {interval === 'month' && (
        <div className="space-y-1.5">
          <Label htmlFor="pr-setup">One-time setup fee (optional)</Label>
          <DollarInput id="pr-setup" name="setup_fee" placeholder="750" />
          <p className="text-xs text-muted-foreground">Charged once, with the first month.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="pr-desc">What is it for?</Label>
        <Input id="pr-desc" name="description" required maxLength={200} placeholder="Marketing management: October" />
        <p className="text-xs text-muted-foreground">Shown to them at checkout and in the email.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pr-company">Company (optional)</Label>
        <Select id="pr-company" name="contractor_id" defaultValue="">
          <option value="">Not linked to a company</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pr-name">Customer name (optional)</Label>
          <Input id="pr-name" name="customer_name" maxLength={120} autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pr-email">Customer email (optional)</Label>
          <Input id="pr-email" name="customer_email" type="email" autoComplete="off" placeholder="Uses the company’s email if blank" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="notify" className="size-4 accent-slate-900" />
        Email the link to them
      </label>

      {state && !state.ok && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle aria-hidden className="size-4 animate-spin" />} Create payment link
        </Button>
        <p className="text-xs text-muted-foreground">Works once, then stops.</p>
      </div>
    </form>
  );
}
