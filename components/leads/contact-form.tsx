'use client';

import { useActionState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logContactAttempt, type LeadFormState } from '@/lib/actions/leads';

// Log a contact attempt (staff). Records an activity and stamps last contact.
export function ContactForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    logContactAttempt,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);

  return (
    <form action={formAction} ref={ref} className="flex gap-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <Input
        name="outcome"
        placeholder="Outcome (e.g. left voicemail, no answer)"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Logging…' : 'Log contact'}
      </Button>
    </form>
  );
}
