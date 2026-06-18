'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { FormState } from '@/lib/actions/contractors';
import type { Contractor } from '@/lib/types';

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function ContractorForm({
  action,
  contractor,
  submitLabel,
}: {
  action: Action;
  contractor?: Contractor;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4 max-w-2xl">
      {contractor && <input type="hidden" name="id" value={contractor.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Business name *</Label>
          <Input id="name" name="name" defaultValue={contractor?.name ?? ''} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact_name">Contact name</Label>
          <Input
            id="contact_name"
            name="contact_name"
            defaultValue={contractor?.contact_name ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={contractor?.status ?? 'active'}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={contractor?.email ?? ''}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={contractor?.phone ?? ''} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="service_areas">Service areas</Label>
          <Input
            id="service_areas"
            name="service_areas"
            placeholder="Comma-separated, e.g. 92101, 92102, La Mesa"
            defaultValue={(contractor?.service_areas ?? []).join(', ')}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" defaultValue={contractor?.notes ?? ''} />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-sm text-emerald-600">Saved.</p>
        )}
      </div>
    </form>
  );
}
