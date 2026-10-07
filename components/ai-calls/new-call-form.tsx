'use client';

import Link from 'next/link';
import { useActionState, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createManualCall, type ManualCallState } from '@/lib/actions/ai-calling';

type Contractor = { id: string; name: string };
type Lead = { contractor_id: string; id: string; name: string; last4: string };

export function NewCallForm({ contractors, leads, token }: { contractors: Contractor[]; leads: Lead[]; token: string }) {
  const [state, action, pending] = useActionState<ManualCallState, FormData>(createManualCall, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [contractorId, setContractorId] = useState(contractors[0]?.id ?? '');
  const [mode, setMode] = useState<'lead' | 'new'>('lead');
  const [leadId, setLeadId] = useState('');
  const [timing, setTiming] = useState<'now' | 'scheduled'>('now');
  const [local, setLocal] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const myLeads = useMemo(() => leads.filter((l) => l.contractor_id === contractorId), [leads, contractorId]);
  const scheduledIso = timing === 'scheduled' && local ? new Date(local).toISOString() : '';

  function review() {
    const fd = new FormData(formRef.current!);
    const g = (k: string) => String(fd.get(k) ?? '').trim();
    let err: string | null = null;
    if (!contractorId) err = 'Choose a contractor';
    else if (mode === 'lead' && !leadId) err = 'Choose a lead';
    else if (mode === 'new' && (!g('contact_name') || !g('phone') || !g('state'))) err = 'Enter the contact’s name, phone number and state';
    else if (mode === 'new' && (!g('consent_basis') || !g('consent_reference') || !g('consent_date'))) err = 'Record how and when this person agreed to be called';
    else if (timing === 'scheduled' && !local) err = 'Pick a date and time';
    else if (g('purpose').length < 3) err = 'Add a short call purpose';
    setProblem(err);
    if (!err) setStep('review');
  }

  const fd = formRef.current ? new FormData(formRef.current) : null;
  const val = (k: string) => String(fd?.get(k) ?? '');
  const cName = contractors.find((c) => c.id === contractorId)?.name;
  const lead = myLeads.find((l) => l.id === leadId);

  if (state?.placed || (state?.ok && state.jobId)) {
    return (
      <Card><CardContent className="space-y-3 p-6" role="status">
        <h2 className="text-lg font-semibold">{state.placed ? 'Call accepted by the provider' : 'Call scheduled'}</h2>
        {state.placed ? <p className="text-sm">Fish accepted the call{state.sessionId ? <> (session <code className="text-xs">{state.sessionId}</code>)</> : ''}. Status: <b>{state.status}</b>. The final result appears on the call&rsquo;s page as Fish reports it.</p>
          : <p className="text-sm">{state.detail}</p>}
        <div className="flex gap-2"><Link className="text-sm font-medium text-primary hover:underline" href={`/app/ai-calls/${state.jobId}`}>View call</Link><Link className="text-sm text-muted-foreground hover:underline" href="/app/ai-calls">Back to AI Agent Calls</Link></div>
      </CardContent></Card>
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="scheduled_at" value={scheduledIso} />
      {!contractors.length && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">No contractor is ready to place calls. Set a calling mode and the Fish agent and phone number ids for a contractor on the AI Agent Calls page first.</p>}

      <div hidden={step === 'review'} className="space-y-6">
        <Card><CardContent className="space-y-4 p-4 sm:p-6">
          <div className="space-y-1.5"><Label htmlFor="contractor_id">Contractor and agent</Label>
            <Select id="contractor_id" name="contractor_id" value={contractorId} onChange={(e) => { setContractorId(e.target.value); setLeadId(''); }}>
              {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <p className="text-xs text-muted-foreground">The call uses this contractor&rsquo;s configured agent and phone number.</p></div>

          <fieldset className="space-y-3"><legend className="text-sm font-medium">Who to call</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="contact_mode" value="lead" checked={mode === 'lead'} onChange={() => setMode('lead')} className="accent-primary" /> Existing lead</label>
              <label className="flex items-center gap-2"><input type="radio" name="contact_mode" value="new" checked={mode === 'new'} onChange={() => setMode('new')} className="accent-primary" /> New contact</label>
            </div>
            {mode === 'lead' ? (
              <div className="space-y-1.5"><Label htmlFor="lead_id">Lead</Label>
                <Select id="lead_id" name="lead_id" value={leadId} onChange={(e) => setLeadId(e.target.value)}><option value="">Choose a lead…</option>{myLeads.map((l) => <option key={l.id} value={l.id}>{l.name} · ••{l.last4}</option>)}</Select>
                <p className="text-xs text-muted-foreground">Only leads assigned to this contractor. The lead&rsquo;s recorded consent is used; without it the call is blocked.</p></div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5"><Label htmlFor="contact_name">Name</Label><Input id="contact_name" name="contact_name" maxLength={120} /></div>
                  <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" inputMode="tel" placeholder="(310) 555-0123" /></div>
                  <div className="grid grid-cols-2 gap-2"><div className="space-y-1.5"><Label htmlFor="state">State</Label><Input id="state" name="state" maxLength={2} placeholder="CA" className="uppercase" /></div>
                    <div className="space-y-1.5"><Label htmlFor="zip">ZIP</Label><Input id="zip" name="zip" inputMode="numeric" maxLength={5} /></div></div>
                </div>
                <div className="space-y-3 rounded-md border p-3"><p className="text-sm font-medium">Consent to be called (required, stored with the call)</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5"><Label htmlFor="consent_basis">How consent was given</Label>
                      <Select id="consent_basis" name="consent_basis" defaultValue=""><option value="">Choose…</option><option value="written">Written / form</option><option value="verbal">Verbal (recorded)</option><option value="prior_relationship">Existing customer</option><option value="other">Other</option></Select></div>
                    <div className="space-y-1.5"><Label htmlFor="consent_date">Date given</Label><Input id="consent_date" name="consent_date" type="date" /></div>
                    <div className="space-y-1.5"><Label htmlFor="consent_reference">Where it is recorded</Label><Input id="consent_reference" name="consent_reference" maxLength={300} placeholder="e.g. intake form #1042" /></div>
                  </div></div>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-3"><legend className="text-sm font-medium">When</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="timing" value="now" checked={timing === 'now'} onChange={() => setTiming('now')} className="accent-primary" /> Call now</label>
              <label className="flex items-center gap-2"><input type="radio" name="timing" value="scheduled" checked={timing === 'scheduled'} onChange={() => setTiming('scheduled')} className="accent-primary" /> Schedule</label>
            </div>
            {timing === 'scheduled' && <div className="max-w-xs space-y-1.5"><Label htmlFor="local">Date and time (your time zone)</Label><Input id="local" type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} /></div>}
            <p className="text-xs text-muted-foreground">Calling hours are checked in the contact&rsquo;s local time. Outside them the call waits until they open.</p>
          </fieldset>

          <div className="space-y-1.5"><Label htmlFor="purpose">Call purpose</Label><Input id="purpose" name="purpose" maxLength={200} placeholder="e.g. Follow up on pool remodel quote request" /></div>
          <div className="space-y-1.5"><Label htmlFor="context">Context for the agent (optional)</Label><Textarea id="context" name="context" maxLength={1000} rows={3} />
            <p className="text-xs text-muted-foreground">Passed to the agent as plain information about this call. It cannot change the agent&rsquo;s instructions, tools or safety rules.</p></div>
        </CardContent></Card>
        {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
        <Button type="button" size="lg" onClick={review} disabled={!contractors.length}>Review call</Button>
      </div>

      {step === 'review' && (
        <div className="space-y-4">
          <Card><CardContent className="space-y-3 p-4 sm:p-6">
            <h2 className="text-lg font-semibold">Review before placing</h2>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Contractor / agent</dt><dd>{cName}</dd>
              <dt className="text-muted-foreground">Recipient</dt><dd>{mode === 'lead' ? `${lead?.name ?? ''} · ••${lead?.last4 ?? ''} (existing lead)` : `${val('contact_name')} · ${val('phone')} · ${val('state').toUpperCase()}`}</dd>
              {mode === 'new' && <><dt className="text-muted-foreground">Consent</dt><dd>{val('consent_basis').replaceAll('_', ' ')} · {val('consent_date')} · {val('consent_reference')}</dd></>}
              <dt className="text-muted-foreground">Timing</dt><dd>{timing === 'now' ? 'Immediately (if calling hours and all checks allow)' : new Date(local).toLocaleString()}</dd>
              <dt className="text-muted-foreground">Purpose</dt><dd>{val('purpose')}</dd>
              {val('context') && <><dt className="text-muted-foreground">Context</dt><dd className="whitespace-pre-wrap">{val('context')}</dd></>}
            </dl>
            <p className="text-xs text-muted-foreground">Placing a call records you as its initiator. A call is only reported as placed after the provider accepts it.</p>
          </CardContent></Card>
          {state && !state.ok && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{state.error}{state.jobId && <> <Link className="underline" href={`/app/ai-calls/${state.jobId}`}>View call</Link></>}</p>}
          <div className="flex flex-wrap gap-2"><Button type="submit" size="lg" disabled={pending}>{pending ? 'Placing call…' : timing === 'now' ? 'Place call' : 'Schedule call'}</Button>
            <Button type="button" variant="outline" size="lg" onClick={() => setStep('edit')} disabled={pending}>Edit</Button></div>
        </div>
      )}
    </form>
  );
}
