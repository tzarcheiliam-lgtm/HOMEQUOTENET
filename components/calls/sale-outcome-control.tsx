'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toaster';
import { creditMeeting, recordSale, type PayActionState } from '@/lib/actions/setter-pay';
import { formatMoney } from '@/lib/setter/money';

/**
 * Admin-only: did this booked sales meeting sell? "Sold" takes the contractor's
 * monthly payment; the booking setter earns 15% of the first month then 10%
 * monthly ($2,500+), or 10% then 7% (under), until the contractor cancels.
 */
export function SaleOutcomeControl({
  id,
  outcome,
  monthlyFee = null,
  churned = false,
}: {
  id: string;
  outcome: 'sold' | 'not_sold' | null;
  pay?: number | null;
  partnerRate?: number | null;
  /** What the sold contractor pays HomeQuote per month (the commission base). */
  monthlyFee?: number | null;
  /** The sold contractor has cancelled: recurring commission stopped. */
  churned?: boolean;
}) {
  const [state, action, pending] = useActionState<PayActionState, FormData>(recordSale, undefined);
  const [choice, setChoice] = useState<string>(outcome ?? 'undecided');
  useEffect(() => {
    if (state?.ok) toast('Sale outcome saved');
    else if (state?.error) toast(state.error, 'error');
  }, [state]);
  return (
    <form action={action} className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
      <input type="hidden" name="id" value={id} />
      <Select
        name="outcome"
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        aria-label="Sale outcome"
        className="min-w-0 flex-1 lg:h-8 lg:w-auto lg:flex-none"
      >
        <option value="undecided">Not decided</option>
        <option value="sold">Sold 💰</option>
        <option value="not_sold">Not sold</option>
      </Select>
      {choice === 'sold' ? (
        <>
          <Input
            name="amount"
            inputMode="decimal"
            defaultValue={monthlyFee !== null ? String(monthlyFee) : ''}
            placeholder="Monthly $"
            aria-label="Contractor's monthly payment"
            title="What the contractor pays per month. $2,500+: setter gets 15% first month then 10% monthly. Under $2,500: 10% then 7%."
            className="h-9 w-28 tabular-nums lg:h-8"
          />
          <Select name="churned" defaultValue={churned ? '1' : '0'} aria-label="Contractor status" className="h-9 w-auto lg:h-8">
            <option value="0">Still paying</option>
            <option value="1">Cancelled</option>
          </Select>
        </>
      ) : null}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}

/** Admin-only: who gets credit (and pay) for this meeting. */
export function CreditControl({
  id,
  partnerId,
  partners,
}: {
  id: string;
  partnerId: string | null;
  partners: { id: string; name: string }[];
}) {
  return (
    <form action={creditMeeting} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <Select name="partner_id" defaultValue={partnerId ?? ''} aria-label="Credit this meeting to" className="h-8 w-36 text-xs">
        {partnerId ? null : <option value="">Nobody</option>}
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" variant="ghost" className="h-8 px-2 text-xs">
        Credit
      </Button>
    </form>
  );
}

/** What a partner sees on their own meeting. */
export function SaleBadge({ outcome, pay }: { outcome: 'sold' | 'not_sold' | null | undefined; pay: number | null }) {
  if (outcome === 'sold') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
        Sold · {formatMoney(pay ?? 0)}
      </span>
    );
  }
  if (outcome === 'not_sold') {
    return <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Not sold</span>;
  }
  return null;
}
