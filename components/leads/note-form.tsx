'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
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
  // Controlled so a failed save keeps what was typed (React 19 resets
  // uncontrolled fields after every action, success or not).
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState('internal');
  const id = useId();

  useEffect(() => {
    if (state?.success) setBody('');
  }, [state]);

  const error = state?.error;
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <label htmlFor={`${id}-body`} className="block text-sm font-medium">
        Add a note
      </label>
      <Textarea
        id={`${id}-body`}
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What happened, what the homeowner said, what is next"
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
      />
      {canChooseVisibility && (
        <div>
          <label htmlFor={`${id}-vis`} className="mb-1 block text-xs font-medium text-muted-foreground">
            Who can see this note
          </label>
          <Select
            id={`${id}-vis`}
            name="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="internal">HQN internal note</option>
            <option value="contractor">Visible to assigned contractors</option>
          </Select>
        </div>
      )}
      <div aria-live="polite">
        {error && (
          <p id={`${id}-err`} className="text-sm text-destructive">
            {error}
          </p>
        )}
        {state?.success && !error && <p className="text-sm text-emerald-700">Note added.</p>}
      </div>
      <Button type="submit" disabled={pending || !body.trim()} className="w-full sm:w-auto">
        {pending ? 'Adding…' : 'Add note'}
      </Button>
    </form>
  );
}
