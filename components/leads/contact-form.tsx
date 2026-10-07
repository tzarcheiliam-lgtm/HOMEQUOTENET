'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logContactAttempt, type LeadFormState } from '@/lib/actions/leads';

// Log a contact attempt (staff). Records an activity and stamps last contact.
export function ContactForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    logContactAttempt,
    undefined
  );
  const [outcome, setOutcome] = useState('');
  const id = useId();

  useEffect(() => {
    if (state?.success) setOutcome('');
  }, [state]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <label htmlFor={`${id}-outcome`} className="block text-sm font-medium">
        Log a contact attempt
      </label>
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
      </div>
      <div aria-live="polite">
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.success && !state.error && <p className="text-sm text-emerald-700">Contact logged.</p>}
      </div>
    </form>
  );
}
