'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logContactAttempt, type LeadFormState } from '@/lib/actions/leads';
import { useGoal } from '@/components/calls/goal/goal-provider';

/** One-tap outcomes for a homeowner call. */
const QUICK = ['No answer', 'Left voicemail', 'Reached — talked', 'Wrong number'];

// Log a contact attempt (staff). Records an activity and stamps last contact.
// Inside the setter's goal HUD the quick chips log and open the next lead in
// one tap, and every logged attempt bumps the daily count.
export function ContactForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    logContactAttempt,
    undefined
  );
  const [outcome, setOutcome] = useState('');
  const id = useId();
  const goal = useGoal();
  const formRef = useRef<HTMLFormElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const bumpRef = useRef<number | null>(null);

  useEffect(() => {
    if (state?.success) setOutcome('');
    if (state?.error) {
      goal?.revert(bumpRef.current);
      bumpRef.current = null;
    }
  }, [state, goal]);

  const quick = (text: string) => {
    if (pending) return;
    flushSync(() => setOutcome(text));
    formRef.current?.requestSubmit(nextRef.current ?? undefined);
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={() => {
        bumpRef.current = goal?.bump({ key: leadId, outcome: null }) ?? null;
      }}
      className="space-y-2"
    >
      <input type="hidden" name="lead_id" value={leadId} />
      <label htmlFor={`${id}-outcome`} className="block text-sm font-medium">
        Log a contact attempt
      </label>
      {goal ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="One-tap outcomes">
          {QUICK.map((q) => (
            <Button
              key={q}
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => quick(q)}
              className="gap-1 border-primary/25 bg-primary/5 hover:bg-primary/10"
              title={`Log "${q}" and open the next lead`}
            >
              <Zap className="size-3 text-primary" aria-hidden="true" />
              {q}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={`${id}-outcome`}
          name="outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="Outcome, e.g. left voicemail, no answer"
          aria-invalid={state?.error ? true : undefined}
          className="sm:flex-1"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? 'Logging…' : 'Log contact'}
        </Button>
        {goal ? (
          <Button ref={nextRef} type="submit" name="intent" value="save_and_next" disabled={pending}>
            Log &amp; next lead
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <div aria-live="polite">
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && !state.error && <p className="text-sm text-emerald-700">Contact logged.</p>}
      </div>
    </form>
  );
}
