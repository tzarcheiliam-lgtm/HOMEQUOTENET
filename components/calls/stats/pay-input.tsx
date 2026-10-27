'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { setPartnerPay, type PayActionState } from '@/lib/actions/setter-pay';

/** Admin inline editor: pay per sold meeting + weekly booking goal (blank = not set). */
export function PayInput({
  userId,
  name,
  payPerSale,
  weeklyGoal,
}: {
  userId: string;
  name: string;
  payPerSale: number | null;
  weeklyGoal: number | null;
}) {
  const [state, action, pending] = useActionState<PayActionState, FormData>(setPartnerPay, undefined);
  useEffect(() => {
    if (state?.ok) toast(`${name}'s pay and booking goal saved`);
    else if (state?.error) toast(state.error, 'error');
  }, [state, name]);
  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="user_id" value={userId} />
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        $/sale
        <Input
          name="pay_per_sale"
          inputMode="decimal"
          defaultValue={payPerSale ?? ''}
          placeholder="—"
          aria-label={`Pay per sold meeting for ${name}`}
          className="h-8 w-20 tabular-nums"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        books/wk
        <Input
          name="weekly_booking_goal"
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          defaultValue={weeklyGoal ?? ''}
          placeholder="—"
          aria-label={`Weekly booking goal for ${name}`}
          className="h-8 w-16 tabular-nums"
        />
      </label>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving…' : 'Set'}
      </Button>
    </form>
  );
}
