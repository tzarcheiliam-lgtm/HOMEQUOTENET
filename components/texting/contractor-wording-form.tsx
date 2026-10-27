'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveContractorTextingWording, type SmsActionState } from '@/lib/actions/sms';
import { OPENING_PLACEHOLDERS, openingTemplateProblem, renderOpening } from '@/lib/sms/rules';

export function ContractorWordingForm({ contractorId, contractorName, senderName, template, instructions, generalTemplate, max }: {
  contractorId: string; contractorName: string; senderName: string; template: string; instructions: string; generalTemplate: string; max: number;
}) {
  const [state, action, pending] = useActionState<SmsActionState, FormData>(saveContractorTextingWording, undefined);
  const [name, setName] = useState(senderName);
  const [opening, setOpening] = useState(template);
  const problem = openingTemplateProblem(opening);
  const preview = renderOpening(problem ? '' : opening || generalTemplate, { firstName: 'Sam', senderName: name.trim() || contractorName, project: 'kitchen remodel' });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="contractorId" value={contractorId} />
      <div className="space-y-1.5">
        <Label htmlFor="texting_sender_name">Name the texts come from</Label>
        <Input id="texting_sender_name" name="texting_sender_name" value={name} onChange={(e) => setName(e.target.value)} placeholder={contractorName} maxLength={60} className="max-w-xs" />
        <p className="text-xs text-muted-foreground">Blank uses the funnel’s business name (“{contractorName}”).</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="texting_opening_template">First text for this contractor</Label>
        <textarea id="texting_opening_template" name="texting_opening_template" value={opening} onChange={(e) => setOpening(e.target.value)} maxLength={1000} rows={3}
          placeholder="Blank uses the general first text from the Texting page" className="w-full rounded-md border bg-background p-3 text-sm" />
        <p className="text-xs text-muted-foreground">Fill-ins: {OPENING_PLACEHOLDERS.map((p) => <code key={p} className="mx-0.5 rounded bg-muted px-1">{p}</code>)}. Must include <code className="rounded bg-muted px-1">{'{sender}'}</code>.</p>
        {problem ? <p role="alert" className="text-xs text-destructive">{problem}</p> : null}
      </div>
      <div className="rounded-md border bg-muted/40 p-3 text-sm"><p className="text-xs font-medium text-muted-foreground">What a lead named Sam would get (preview)</p><p className="mt-1">{preview}</p></div>
      <div className="space-y-1.5">
        <Label htmlFor="texting_extra_instructions">Extra instructions for this contractor</Label>
        <textarea id="texting_extra_instructions" name="texting_extra_instructions" defaultValue={instructions} maxLength={max} rows={4}
          placeholder="e.g. They only do full remodels over $15k. Mention they offer free 3D design."
          className="w-full rounded-md border bg-background p-3 text-sm" />
        <p className="text-xs text-muted-foreground">Added after the general instructions, only for this contractor’s leads. Same safety rules apply.</p>
      </div>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={pending || !!problem}>{pending ? 'Saving…' : 'Save wording'}</Button>
        <span role="status" className={`text-xs ${state?.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}`}>{state?.ok ? state.message : state?.error}</span></div>
    </form>
  );
}
