'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toaster';
import { creditMeeting, recordSale, type PayActionState } from '@/lib/actions/setter-pay';
import { formatMoney } from '@/lib/setter/money';

/**
 * Admin-only: did this booked sales meeting sell? "Sold" pays the booking
 * partner their current rate (or the amount typed here) and is stored on the
 * meeting, so later rate changes never rewrite it.
 */
export function SaleOutcomeControl({
  id,
  outcome,
  pay,
  partnerRate,
}: {
  id: string;
  outcome: 'sold' | 'not_sold' | null;
  pay: number | null;
  /** The booking partner's current pay per sale, for the placeholder. */
  partnerRate: number | null;
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
        <Input
          name="amount"
          inputMode="decimal"
          defaultValue={outcome === 'sold' && pay !== null ? String(pay) : ''}
          placeholder={partnerRate !== null ? `${formatMoney(partnerRate)} (rate)` : 'Pay $'}
          aria-label="Setter pay for this sale"
          className="h-9 w-28 tabular-nums lg:h-8"
        />
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
