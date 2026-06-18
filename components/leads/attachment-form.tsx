'use client';

import { useActionState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addAttachment, type LeadFormState } from '@/lib/actions/leads';

// Attach a link (e.g. a Drive doc, photo URL) to the lead. File uploads via
// Supabase Storage can be added later; links keep this dependency-free.
export function AttachmentForm({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    addAttachment,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);

  return (
    <form action={formAction} ref={ref} className="flex flex-wrap gap-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <Input name="name" placeholder="Label" className="w-40" />
      <Input name="url" placeholder="https://…" className="flex-1 min-w-48" />
      {state?.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Adding…' : 'Add link'}
      </Button>
    </form>
  );
}
