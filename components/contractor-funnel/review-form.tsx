'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { updateContractorSubmissionReview, type ReviewState } from '@/lib/actions/contractor-submissions';
import { REVIEW_STATUSES } from '@/lib/contractor-funnel/labels';

export function ContractorReviewForm({ id, status, notes }: { id: string; status: string; notes: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(updateContractorSubmissionReview, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="review_status" className="mb-1 block text-xs text-muted-foreground">Status</label>
        <select id="review_status" name="review_status" defaultValue={status} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
          {REVIEW_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="review_notes" className="mb-1 block text-xs text-muted-foreground">Notes</label>
        <textarea id="review_notes" name="review_notes" rows={4} defaultValue={notes} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
      {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p role="status" className="text-sm text-muted-foreground">{state.success}</p>}
    </form>
  );
}
