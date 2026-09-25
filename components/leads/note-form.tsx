'use client';

import { useActionState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { addNote, type LeadFormState } from '@/lib/actions/leads';

export function NoteForm({
  leadId,
  canChooseVisibility = false,
}: {
  leadId: string;
  canChooseVisibility?: boolean;
}) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    addNote,
    undefined
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);

  return (
    <form action={formAction} ref={ref} className="space-y-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <Textarea name="body" placeholder="Add a note…" required />
      {canChooseVisibility && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <select name="visibility" defaultValue="internal" className="h-9 rounded-md border bg-background px-2 text-foreground">
            <option value="internal">HQN internal note</option>
            <option value="contractor">Visible to assigned contractors</option>
          </select>
        </label>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Adding…' : 'Add note'}
      </Button>
    </form>
  );
}
