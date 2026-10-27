'use client';

import { useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { setDailyCallGoal, type GoalActionState } from '@/lib/actions/call-goals';
import { MAX_DAILY_GOAL, MIN_DAILY_GOAL } from '@/lib/calls/goals';

/** Inline "daily goal" editor for administrators (team board, user page). */
export function GoalInput({ userId, goal, name }: { userId: string; goal: number; name: string }) {
  const [state, action, pending] = useActionState<GoalActionState, FormData>(setDailyCallGoal, undefined);
  useEffect(() => {
    if (state?.ok) toast(`${name}'s goal saved`);
    else if (state?.error) toast(state.error, 'error');
  }, [state, name]);
  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="user_id" value={userId} />
      <Input
        name="daily_call_goal"
        type="number"
        inputMode="numeric"
        min={MIN_DAILY_GOAL}
        max={MAX_DAILY_GOAL}
        defaultValue={goal}
        aria-label={`Daily call goal for ${name}`}
        className="h-8 w-20 tabular-nums"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving…' : 'Set'}
      </Button>
    </form>
  );
}
