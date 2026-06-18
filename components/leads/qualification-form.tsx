'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  BUDGET_RANGES,
  TIMELINE_OPTIONS,
  URGENCY_OPTIONS,
} from '@/lib/leads/constants';
import { updateQualification, type LeadFormState } from '@/lib/actions/leads';
import type { Lead } from '@/lib/types';

export function QualificationForm({ lead }: { lead: Lead }) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    updateQualification,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lead_id" value={lead.id} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Budget range</Label>
          <Select name="budget_range" defaultValue={lead.budget_range ?? ''}>
            <option value="">—</option>
            {BUDGET_RANGES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Timeline</Label>
          <Select name="timeline" defaultValue={lead.timeline ?? ''}>
            <option value="">—</option>
            {TIMELINE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Urgency</Label>
          <Select name="urgency" defaultValue={lead.urgency ?? ''}>
            <option value="">—</option>
            {URGENCY_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="qualified"
          defaultChecked={lead.qualified}
          className="size-4 accent-primary"
        />
        Qualified
      </label>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">Saved.</p>}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving…' : 'Save qualification'}
      </Button>
    </form>
  );
}
