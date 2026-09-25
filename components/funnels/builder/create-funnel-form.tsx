'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createFunnelAction, type BuilderActionState } from '@/lib/actions/funnel-builder';
import type { FunnelTemplate } from '@/lib/data/funnel-builder';

export function CreateFunnelForm({ templates, contractors }: {
  templates: FunnelTemplate[]; contractors: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<BuilderActionState, FormData>(createFunnelAction, undefined);
  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <Label htmlFor="clientName" className="mb-1 block">Client name</Label>
        <Input id="clientName" name="clientName" required placeholder="e.g. Pool Masters LA" />
      </div>
      <div>
        <Label htmlFor="industry" className="mb-1 block">Industry</Label>
        <Input id="industry" name="industry" required placeholder="e.g. Pool remodeling" />
      </div>
      <div>
        <Label htmlFor="templateId" className="mb-1 block">Start from</Label>
        <Select id="templateId" name="templateId" defaultValue="">
          <option value="">Blank funnel</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.category} — {t.name}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="contractorId" className="mb-1 block">Contractor</Label>
        <Select id="contractorId" name="contractorId" defaultValue="house">
          <option value="house">HomeQuote (house lead, unassigned)</option>
          {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create funnel'}</Button>
    </form>
  );
}
