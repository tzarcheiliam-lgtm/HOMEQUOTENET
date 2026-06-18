'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { setContractorVerticals, type FormState } from '@/lib/actions/contractors';
import type { Vertical } from '@/lib/types';

export function VerticalsForm({
  contractorId,
  allVerticals,
  selectedIds,
}: {
  contractorId: string;
  allVerticals: Vertical[];
  selectedIds: string[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    setContractorVerticals,
    undefined
  );
  const selected = new Set(selectedIds);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="contractor_id" value={contractorId} />
      <div className="flex flex-wrap gap-3">
        {allVerticals.map((v) => (
          <label
            key={v.id}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              name="vertical_ids"
              value={v.id}
              defaultChecked={selected.has(v.id)}
              className="size-4 accent-primary"
            />
            {v.name}
          </label>
        ))}
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">Saved.</p>}

      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Save verticals'}
      </Button>
    </form>
  );
}
