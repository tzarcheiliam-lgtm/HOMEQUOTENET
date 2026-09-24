'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  BUDGET_RANGES,
  QUALIFICATION_STATUSES,
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
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Review decision</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {QUALIFICATION_STATUSES.map((s) => (
            <label
              key={s.value}
              className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
            >
              <input
                type="radio"
                name="qualification_status"
                value={s.value}
                defaultChecked={lead.qualification_status === s.value}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <span className="block font-medium">{s.label}</span>
                <span className="block text-xs text-muted-foreground">{s.help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Budget range</Label>
          <Select name="budget_range" defaultValue={lead.budget_range ?? ''}>
            <option value="">—</option>
            {/* Keep a value that came from a form (e.g. "budget_25_50k") selectable. */}
            {lead.budget_range && !BUDGET_RANGES.includes(lead.budget_range) && (
              <option value={lead.budget_range}>{lead.budget_range}</option>
            )}
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
            {lead.timeline && !TIMELINE_OPTIONS.includes(lead.timeline) && (
              <option value={lead.timeline}>{lead.timeline}</option>
            )}
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
      <div className="space-y-1.5">
        <Label htmlFor="qualification_notes">Qualification notes</Label>
        <Textarea
          id="qualification_notes"
          name="qualification_notes"
          rows={3}
          maxLength={4000}
          defaultValue={lead.qualification_notes ?? ''}
          placeholder="What you confirmed on the call: scope, budget, who decides, best time to reach them"
        />
        <p className="text-xs text-muted-foreground">
          Included in the email when you send this lead.
        </p>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">Saved.</p>}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving…' : 'Save qualification'}
      </Button>
    </form>
  );
}
