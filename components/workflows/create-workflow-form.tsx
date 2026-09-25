'use client';

import { useActionState } from 'react';
import { createWorkflowAction, type WorkflowActionState } from '@/lib/actions/workflows';
import type { WorkflowTemplate } from '@/lib/workflows';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';

export function CreateWorkflowForm({ templates, contractors }: { templates: readonly WorkflowTemplate[]; contractors: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<WorkflowActionState | undefined, FormData>(createWorkflowAction, undefined);
  return <form action={action} className="space-y-6">
    {state?.message && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">{state.message}</p>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <label className="group cursor-pointer"><input className="peer sr-only" type="radio" name="template_key" value="blank" defaultChecked />
        <Card className="h-full transition peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20"><CardHeader><CardTitle>Start blank</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Build a focused automation one step at a time.</CardContent></Card>
      </label>
      {templates.map(template => <label className="group cursor-pointer" key={template.key}><input className="peer sr-only" type="radio" name="template_key" value={template.key} />
        <Card className="h-full transition peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/20"><CardHeader><CardTitle>{template.definition.name}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{template.definition.description}</CardContent></Card>
      </label>)}
    </div>
    <div className="max-w-md space-y-2"><label className="text-sm font-medium" htmlFor="contractor_id">Account</label><Select id="contractor_id" name="contractor_id" defaultValue=""><option value="">HomeQuote network</option>{contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select><p className="text-xs text-muted-foreground">Ownership cannot be changed after creation.</p></div>
    <Button className="w-full sm:w-auto" disabled={pending}>{pending ? 'Creating…' : 'Create workflow'}</Button>
  </form>;
}
