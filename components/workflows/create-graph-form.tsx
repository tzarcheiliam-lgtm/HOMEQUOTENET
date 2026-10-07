'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createGraphWorkflowAction } from '@/lib/actions/workflow-graph';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { GraphTemplate } from '@/lib/workflows/graph';

export function CreateGraphForm({
  templates, contractors, fixedContractorId, canPickNetwork,
}: {
  templates: Pick<GraphTemplate, 'key' | 'name' | 'summary' | 'description' | 'requires'>[];
  contractors: { id: string; name: string }[];
  /** A contractor owner always creates for their own company. */
  fixedContractorId: string | null;
  canPickNetwork: boolean;
}) {
  const router = useRouter();
  const [templateKey, setTemplateKey] = useState<string>('blank');
  const [name, setName] = useState('');
  const [contractorId, setContractorId] = useState<string>(fixedContractorId ?? (canPickNetwork ? '' : contractors[0]?.id ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chosen = templates.find((t) => t.key === templateKey);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await createGraphWorkflowAction({
      name: name.trim() || chosen?.name || 'Untitled automation',
      contractorId: fixedContractorId ?? (contractorId || null),
      templateKey: templateKey === 'blank' ? null : templateKey,
    });
    if (r.ok && r.data?.id) router.push(`/app/workflows/${r.data.id}`);
    else { setError(r.message ?? 'Could not create the automation.'); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold">Start from</legend>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[{ key: 'blank', name: 'Start from scratch', summary: 'An empty canvas with just a trigger.', description: '', requires: [] as string[] }, ...templates].map((t) => (
            <label key={t.key} className="cursor-pointer">
              <input className="peer sr-only" type="radio" name="template" value={t.key} checked={templateKey === t.key} onChange={() => setTemplateKey(t.key)} />
              <Card className={cn('h-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary', templateKey === t.key && 'border-primary ring-2 ring-primary/20')}>
                <CardHeader className="pb-2"><CardTitle className="text-base">{t.name}</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground">{t.summary}</CardContent>
              </Card>
            </label>
          ))}
        </div>
        {chosen && (
          <div className="rounded-xl border bg-muted/40 p-4 text-sm">
            <p>{chosen.description}</p>
            {chosen.requires.length > 0 && <><p className="mt-2 font-semibold">Needs</p><ul className="list-disc pl-5 text-muted-foreground">{chosen.requires.map((r) => <li key={r}>{r}</li>)}</ul></>}
            <p className="mt-2 text-xs text-muted-foreground">Creates an <strong>unpublished draft</strong>. It cannot enroll or contact anyone until you review and publish it, and publishing never touches existing leads.</p>
          </div>
        )}
      </fieldset>

      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="wf-name">Name</Label><Input id="wf-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder={chosen?.name ?? 'e.g. New lead follow-up'} /></div>
        {!fixedContractorId && (
          <div className="space-y-1.5">
            <Label htmlFor="wf-scope">Account</Label>
            <Select id="wf-scope" value={contractorId} onChange={(e) => setContractorId(e.target.value)}>
              {canPickNetwork && <option value="">HomeQuote network</option>}
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <p className="text-xs text-muted-foreground">Can’t be changed later. AI calls need a contractor (or a contractor-scoped trigger such as “Lead assigned”).</p>
          </div>
        )}
      </div>
      <Button className="w-full sm:w-auto" disabled={busy}>{busy ? 'Creating…' : 'Create draft'}</Button>
    </form>
  );
}
