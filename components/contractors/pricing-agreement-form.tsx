'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createPricingAgreement,
  updatePricingAgreement,
  type FormState,
} from '@/lib/actions/contractors';
import type { PricingAgreement, PricingModel, Vertical } from '@/lib/types';

const MODELS: { value: PricingModel; label: string }[] = [
  { value: 'per_lead', label: 'Per lead' },
  { value: 'per_appointment', label: 'Per booked appointment' },
  { value: 'revenue_share', label: 'Revenue share' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'subscription', label: 'Subscription' },
];

export function PricingAgreementForm({
  contractorId,
  verticals,
  agreement,
  onDone,
}: {
  contractorId: string;
  verticals: Vertical[];
  agreement?: PricingAgreement;
  onDone?: () => void;
}) {
  const isEdit = !!agreement;
  const action = isEdit ? updatePricingAgreement : createPricingAgreement;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, fd) => {
      const result = await action(prev, fd);
      if (result?.success && onDone) onDone();
      return result;
    },
    undefined
  );

  const [model, setModel] = useState<PricingModel>(
    agreement?.model ?? 'per_lead'
  );

  const show = {
    perLead: model === 'per_lead' || model === 'hybrid',
    perAppt: model === 'per_appointment' || model === 'hybrid',
    revShare: model === 'revenue_share' || model === 'hybrid',
    subscription: model === 'subscription',
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="contractor_id" value={contractorId} />
      {agreement && <input type="hidden" name="id" value={agreement.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`model-${agreement?.id ?? 'new'}`}>Pricing model</Label>
          <Select
            id={`model-${agreement?.id ?? 'new'}`}
            name="model"
            value={model}
            onChange={(e) => setModel(e.target.value as PricingModel)}
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`vertical-${agreement?.id ?? 'new'}`}>Vertical</Label>
          <Select
            id={`vertical-${agreement?.id ?? 'new'}`}
            name="vertical_id"
            defaultValue={agreement?.vertical_id ?? ''}
          >
            <option value="">All verticals</option>
            {verticals.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </div>

        {show.perLead && (
          <div className="space-y-1.5">
            <Label htmlFor={`pl-${agreement?.id ?? 'new'}`}>Per-lead amount ($)</Label>
            <Input
              id={`pl-${agreement?.id ?? 'new'}`}
              name="per_lead_amount"
              type="number"
              step="0.01"
              defaultValue={agreement?.per_lead_amount ?? ''}
            />
          </div>
        )}

        {show.perAppt && (
          <div className="space-y-1.5">
            <Label htmlFor={`pa-${agreement?.id ?? 'new'}`}>
              Per-appointment amount ($)
            </Label>
            <Input
              id={`pa-${agreement?.id ?? 'new'}`}
              name="per_appointment_amount"
              type="number"
              step="0.01"
              defaultValue={agreement?.per_appointment_amount ?? ''}
            />
          </div>
        )}

        {show.revShare && (
          <div className="space-y-1.5">
            <Label htmlFor={`rs-${agreement?.id ?? 'new'}`}>
              Revenue share (%)
            </Label>
            <Input
              id={`rs-${agreement?.id ?? 'new'}`}
              name="revenue_share_pct"
              type="number"
              step="0.01"
              defaultValue={agreement?.revenue_share_pct ?? ''}
            />
          </div>
        )}

        {show.subscription && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor={`sa-${agreement?.id ?? 'new'}`}>
                Subscription amount ($)
              </Label>
              <Input
                id={`sa-${agreement?.id ?? 'new'}`}
                name="subscription_amount"
                type="number"
                step="0.01"
                defaultValue={agreement?.subscription_amount ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`sp-${agreement?.id ?? 'new'}`}>Billing period</Label>
              <Select
                id={`sp-${agreement?.id ?? 'new'}`}
                name="subscription_period"
                defaultValue={agreement?.subscription_period ?? 'monthly'}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </Select>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_exclusive"
            defaultChecked={agreement?.is_exclusive ?? false}
            className="size-4 accent-primary"
          />
          Exclusive leads
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            value="on"
            defaultChecked={agreement?.is_active ?? true}
            className="size-4 accent-primary"
          />
          Active
        </label>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`notes-${agreement?.id ?? 'new'}`}>Notes</Label>
        <Textarea
          id={`notes-${agreement?.id ?? 'new'}`}
          name="notes"
          defaultValue={agreement?.notes ?? ''}
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : isEdit ? 'Update agreement' : 'Add agreement'}
      </Button>
    </form>
  );
}
