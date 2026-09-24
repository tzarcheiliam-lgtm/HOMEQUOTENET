'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  createRecipient,
  updateRecipient,
  type RecipientFormState,
} from '@/lib/actions/lead-distribution';
import type { LeadRecipient } from '@/lib/types';

export function RecipientForm({
  recipient,
  contractors,
}: {
  recipient?: LeadRecipient;
  contractors: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<RecipientFormState, FormData>(
    recipient ? updateRecipient : createRecipient,
    undefined
  );
  const idp = recipient ? `r-${recipient.id}-` : 'new-';

  return (
    <form action={formAction} className="space-y-4">
      {recipient && <input type="hidden" name="id" value={recipient.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}name`}>Name *</Label>
          <Input id={`${idp}name`} name="name" required maxLength={120} defaultValue={recipient?.name} placeholder="Ethan" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}company`}>Company</Label>
          <Input id={`${idp}company`} name="company" maxLength={160} defaultValue={recipient?.company ?? ''} placeholder="Pool Masters LA" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}email`}>Email *</Label>
          <Input id={`${idp}email`} name="email" type="email" required maxLength={254} defaultValue={recipient?.email} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}phone`}>Phone</Label>
          <Input id={`${idp}phone`} name="phone" type="tel" maxLength={40} defaultValue={recipient?.phone ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}kind`}>Type *</Label>
          <Select id={`${idp}kind`} name="kind" required defaultValue={recipient?.kind ?? 'contractor'}>
            <option value="contractor">Contractor</option>
            <option value="team_member">Team member</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idp}contractor`}>Contractor business in HomeQuote</Label>
          <Select id={`${idp}contractor`} name="contractor_id" defaultValue={recipient?.contractor_id ?? ''}>
            <option value="">Not linked</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            When linked, sending a lead to this person also assigns it to that business, so appointments and sales are tracked.
          </p>
        </div>
      </div>
      {recipient && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={recipient.is_active} className="size-4 accent-primary" />
          Active (shows up under Send lead)
        </label>
      )}
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">Saved.</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : recipient ? 'Save changes' : 'Add recipient'}
      </Button>
    </form>
  );
}
