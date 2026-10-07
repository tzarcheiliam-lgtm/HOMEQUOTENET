'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { checkMetaConnection, saveAccountMapping, saveCampaignMapping, saveDeliverySettings, type MetaActionState } from '@/lib/actions/meta-ads';

function Msg({ s }: { s: MetaActionState }) {
  if (s?.error) return <p role="alert" className="text-sm text-destructive">{s.error}</p>;
  if (s?.success) return <p role="status" className="text-sm text-emerald-700">{s.success}</p>;
  return null;
}

export function AccountMappingForm({ account, contractors }: {
  account: { id: string; name: string | null; currency: string | null; timezone_name: string | null; contractor_id: string | null; show_spend_to_contractor: boolean; sync_enabled: boolean; last_sync_error: string | null };
  contractors: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<MetaActionState, FormData>(saveAccountMapping, undefined);
  return (
    <form action={action} className="space-y-3 rounded-lg border p-4">
      <input type="hidden" name="account_id" value={account.id} />
      <div>
        <p className="font-medium">{account.name ?? account.id}</p>
        <p className="text-xs text-muted-foreground">{account.id} · {account.currency ?? '?'} · {account.timezone_name ?? 'timezone unknown'}</p>
        {account.last_sync_error && <p className="mt-1 text-xs text-destructive">Last sync error: {account.last_sync_error}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`c-${account.id}`}>Belongs to</Label>
        <Select id={`c-${account.id}`} name="contractor_id" defaultValue={account.contractor_id ?? ''}>
          <option value="">HomeQuote network (admins only)</option>
          {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_spend_to_contractor" defaultChecked={account.show_spend_to_contractor} className="size-4" /> Show ad spend and costs to that contractor</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sync_enabled" defaultChecked={account.sync_enabled} className="size-4" /> Import this account</label>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button><Msg s={state} /></div>
    </form>
  );
}

export function CampaignMappingForm({ campaign, contractors }: { campaign: { id: string; name: string | null; contractor_id: string | null; account: string | null }; contractors: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<MetaActionState, FormData>(saveCampaignMapping, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 border-b py-2 last:border-0">
      <input type="hidden" name="campaign_id" value={campaign.id} />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{campaign.name ?? campaign.id}</p><p className="text-xs text-muted-foreground">in {campaign.account ?? 'account'}</p></div>
      <Select name="contractor_id" defaultValue={campaign.contractor_id ?? ''} aria-label={`Contractor for ${campaign.name ?? campaign.id}`} className="w-full sm:w-56">
        <option value="">Use the account’s mapping</option>
        {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? '…' : 'Save'}</Button>
      <Msg s={state} />
    </form>
  );
}

export function DeliveryForm({ settings }: { settings: { legacy: boolean; mode: string; test_event_code: string | null; dataset_id: string | null; insights_days: number } }) {
  const [state, action, pending] = useActionState<MetaActionState, FormData>(saveDeliverySettings, undefined);
  const [mode, setMode] = useState(settings.mode);
  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Conversion delivery</legend>
        {[
          ['off', 'Off (default)', 'Nothing is queued or sent to Meta from outcomes.'],
          ['test', 'Test', 'Events go to Events Manager → Test events only (with your test code). They never count in reporting or optimization.'],
          ['live', 'Live', 'Real conversions are sent for outcomes recorded from now on. Nothing historical is sent.'],
        ].map(([v, l, h]) => (
          <label key={v} className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent">
            <input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} className="mt-0.5 size-4 accent-primary" />
            <span><span className="block font-medium">{l}</span><span className="block text-xs text-muted-foreground">{h}</span></span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5"><Label htmlFor="dataset_id">Dataset (Pixel) ID for Instant Form events</Label><Input id="dataset_id" name="dataset_id" inputMode="numeric" defaultValue={settings.dataset_id ?? ''} placeholder="digits only" /></div>
        <div className="space-y-1.5"><Label htmlFor="test_event_code">Test Events code</Label><Input id="test_event_code" name="test_event_code" defaultValue={settings.test_event_code ?? ''} placeholder="TEST12345" /></div>
        <div className="space-y-1.5"><Label htmlFor="insights_days">Days of insights to refresh</Label><Input id="insights_days" name="insights_days" type="number" min={1} max={90} defaultValue={settings.insights_days} /></div>
      </div>
      {mode === 'live' && settings.mode !== 'live' && (
        <div className="space-y-1.5 rounded-md border border-amber-300 bg-amber-50 p-3">
          <Label htmlFor="confirm_live">Type ENABLE LIVE to confirm real conversions will be sent to Meta</Label>
          <Input id="confirm_live" name="confirm_live" autoComplete="off" />
        </div>
      )}
      <div className="rounded-md border bg-muted/40 p-3 text-sm">
        <p className="font-medium">Website “QualifiedLead” — how it is sent right now</p>
        <p className="text-muted-foreground">{settings.legacy
          ? 'The original direct sender is ACTIVE: person-qualified website leads are still sent exactly as before, so deploying this feature caused no gap. Test mode leaves it running (test events never count). Switching to Live retires it and the queue takes over (same event id, so nothing is counted twice).'
          : settings.mode === 'live' ? 'The queue sends it. The original direct sender is retired.'
          : 'NOT being sent: the direct sender is off and the queue is not live. Tick the box below (with delivery Off) to restore the original behavior.'}</p>
        {mode === 'off' && (
          <label className="mt-2 flex items-center gap-2"><input type="checkbox" name="restore_legacy" defaultChecked={settings.legacy} className="size-4" /> Keep the original direct QualifiedLead sender running while the queue is off (rollback)</label>
        )}
      </div>
      <div className="flex items-center gap-3"><Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button><Msg s={state} /></div>
    </form>
  );
}

export function ConnectionCheck() {
  const [state, action, pending] = useActionState<Awaited<ReturnType<typeof checkMetaConnection>> | undefined, FormData>(async () => checkMetaConnection(), undefined);
  return (
    <form action={action} className="space-y-3">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? 'Checking with Meta…' : 'Check connection now'}</Button>
      <Msg s={state} />
      {state?.permissions && (
        <ul className="flex flex-wrap gap-1.5 text-xs">
          {state.permissions.map((p) => <li key={p.permission} className={`rounded border px-2 py-0.5 ${p.status === 'granted' ? '' : 'text-destructive'}`}>{p.permission}: {p.status}</li>)}
        </ul>
      )}
      {state?.expiresAt !== undefined && <p className="text-xs text-muted-foreground">Token expiry: {state.expiresAt ? new Date(state.expiresAt * 1000).toLocaleDateString() : 'does not expire (System User token) or unknown'}</p>}
    </form>
  );
}
