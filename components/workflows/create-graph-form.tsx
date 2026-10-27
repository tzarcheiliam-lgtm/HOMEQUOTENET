'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { createGraphWorkflowAction } from '@/lib/actions/workflow-graph';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { templateFitsOwner, type GraphTemplate, type TemplateScope } from '@/lib/workflows/graph/templates';
import { SCOPE_LABEL, TemplateGallery, galleryCards } from './template-gallery';

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

  // A contractor owner only sees templates that can run for one contractor; a network-only admin template is hidden.
  const ownerFixed = fixedContractorId !== null || !canPickNetwork;
  const cards = useMemo(
    () => galleryCards(templates.map((t) => t.key)).filter((c) => !ownerFixed || c.scope !== 'network'),
    [templates, ownerFixed]
  );
  const chosen = templates.find((t) => t.key === templateKey);
  const chosenScope: TemplateScope | null = cards.find((c) => c.key === templateKey)?.scope ?? null;
  const owner = fixedContractorId ?? (contractorId || null);
  const fits = !chosenScope || templateFitsOwner({ scope: chosenScope }, owner);

  const pick = (key: string) => {
    setTemplateKey(key);
    setError(null);
    if (fixedContractorId) return;
    const scope = cards.find((c) => c.key === key)?.scope;
    // Point the account at one that fits, so the common case needs no second click.
    if (scope === 'network' && canPickNetwork) setContractorId('');
    if (scope === 'contractor' && !contractorId && contractors[0]) setContractorId(contractors[0].id);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fits) { setError(chosenScope === 'network' ? 'This template is for HomeQuote leads. Choose "HomeQuote network" as the account.' : 'This template is for one contractor. Choose the contractor as the account.'); return; }
    setBusy(true); setError(null);
    const r = await createGraphWorkflowAction({
      name: name.trim() || chosen?.name || 'Untitled automation',
      contractorId: owner,
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
        <TemplateGallery cards={cards} value={templateKey} onChange={pick} />
        {chosen && (
          <div className="rounded-xl border bg-muted/40 p-4 text-sm" aria-live="polite">
            <p className="font-semibold">{chosen.name}</p>
            <p className="mt-1">{chosen.description}</p>
            {chosenScope && <p className="mt-2"><span className="font-semibold">For:</span> {SCOPE_LABEL[chosenScope]}</p>}
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
            <Select id="wf-scope" value={contractorId} onChange={(e) => { setContractorId(e.target.value); setError(null); }} aria-describedby="wf-scope-help">
              {canPickNetwork && <option value="" disabled={chosenScope === 'contractor'}>HomeQuote network</option>}
              {contractors.map((c) => <option key={c.id} value={c.id} disabled={chosenScope === 'network'}>{c.name}</option>)}
            </Select>
            <p id="wf-scope-help" className="text-xs text-muted-foreground">
              {chosenScope === 'network' ? 'This template is for HomeQuote leads only. ' : chosenScope === 'contractor' ? 'This template is for one contractor’s leads. ' : 'Pick HomeQuote network for your own leads, or a contractor to run it only on that contractor’s leads (texts are signed with their name). '}
              Can’t be changed later. AI calls need a contractor (or a contractor-scoped trigger such as “Lead assigned”).
            </p>
          </div>
        )}
      </div>
      <Button className="w-full sm:w-auto" disabled={busy || !fits}>{busy ? 'Creating…' : 'Create draft'}</Button>
    </form>
  );
}
