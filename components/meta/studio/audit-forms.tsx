'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Msg } from './ui';
import { applyProposalAction, approveProposal, proposeFromFindingAction, rejectProposal, runAuditAction, type StudioState } from '@/lib/actions/meta-studio';

export function RunAuditForm({ accounts, defaults }: { accounts: { id: string; name: string | null }[]; defaults: { since: string; until: string } }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<StudioState, FormData>(async (p, fd) => {
    const r = await runAuditAction(p, fd);
    if (r?.id) router.push(`/app/meta-ads/audits/${r.id}`);
    return r;
  }, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="a-acct">Ad account</Label>
        <Select id="a-acct" name="account" required><option value="">{accounts.length ? 'Choose…' : 'No accounts imported yet'}</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name ?? a.id}</option>)}</Select></div>
      <div className="space-y-1.5"><Label htmlFor="a-since">From</Label><Input id="a-since" name="since" type="date" defaultValue={defaults.since} required /></div>
      <div className="space-y-1.5"><Label htmlFor="a-until">To</Label><Input id="a-until" name="until" type="date" defaultValue={defaults.until} required /></div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-4"><Button type="submit" disabled={pending || accounts.length === 0}>{pending ? 'Running…' : 'Run audit'}</Button><Msg s={state} /></div>
    </form>
  );
}

export function ProposeButton({ findingId }: { findingId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<StudioState>();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => start(async () => { setMsg(await proposeFromFindingAction(findingId)); router.refresh(); })}>Create a proposal for review</Button>
      <Msg s={msg} />
    </div>
  );
}

export function ProposalActions({ id, status, canApply, gateReasons, needsApproval }: { id: string; status: string; canApply: boolean; gateReasons: string[]; needsApproval: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<StudioState>();
  const run = (fn: () => Promise<StudioState>) => start(async () => { setMsg(await fn()); router.refresh(); });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === 'proposed' && <Button type="button" size="sm" disabled={pending} onClick={() => run(() => approveProposal(id))}>Approve</Button>}
        {status === 'approved' && <Button type="button" size="sm" disabled={pending || !canApply || needsApproval} onClick={() => run(() => applyProposalAction(id))}>Apply in Meta now</Button>}
        {(status === 'proposed' || status === 'approved') && <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(() => rejectProposal(id))}>Reject</Button>}
      </div>
      {status === 'approved' && !canApply && gateReasons.length > 0 && <p className="text-xs text-amber-800">Applying is switched off: {gateReasons.join(' ')}</p>}
      {status === 'approved' && canApply && <p className="text-xs text-muted-foreground">Applying re-reads the object from Meta first. If it was changed in Ads Manager, nothing is written.</p>}
      <Msg s={msg} />
    </div>
  );
}
