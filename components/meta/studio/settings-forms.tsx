'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Msg } from './ui';
import { THRESHOLD_LABELS, type Thresholds } from '@/lib/meta/studio/audit';
import { mapAsset, runDiscovery, saveAccountControls, saveThresholds, setAutomation, setLiveWrites, verifyTracking, type StudioState } from '@/lib/actions/meta-studio';

export function SwitchForm({ kind, on }: { kind: 'writes' | 'automation'; on: boolean }) {
  const [state, action, pending] = useActionState<StudioState, FormData>(kind === 'writes' ? setLiveWrites : setAutomation, undefined);
  const phrase = kind === 'writes' ? 'ENABLE META WRITES' : 'START AUTOMATION';
  return (
    <form action={action} className="space-y-3">
      {on ? (
        <>
          <input type="hidden" name="enabled" value="" />
          <Button type="submit" variant="destructive" size="sm" disabled={pending}>{kind === 'writes' ? 'Turn live writes OFF' : 'Stop HQN automation'}</Button>
        </>
      ) : (
        <>
          <input type="hidden" name="enabled" value="on" />
          <div className="space-y-1.5">
            <Label htmlFor={`confirm-${kind}`}>Type <code className="text-xs">{phrase}</code> to turn this on</Label>
            <Input id={`confirm-${kind}`} name="confirm" autoComplete="off" />
          </div>
          <Button type="submit" size="sm" disabled={pending}>{kind === 'writes' ? 'Turn live writes ON' : 'Release automation stop'}</Button>
        </>
      )}
      <Msg s={state} />
    </form>
  );
}

export function AccountControlsForm({ account }: { account: { id: string; name: string | null; currency: string | null; timezone_name: string | null; writes_enabled: boolean; automation_enabled: boolean; note: string | null } }) {
  const [state, action, pending] = useActionState<StudioState, FormData>(saveAccountControls, undefined);
  return (
    <form action={action} className="space-y-3 rounded-lg border p-4">
      <input type="hidden" name="account_id" value={account.id} />
      <div><p className="font-medium">{account.name ?? account.id}</p><p className="text-xs text-muted-foreground">{account.id} · {account.currency ?? 'currency unknown'} · {account.timezone_name ?? 'timezone unknown'}</p></div>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="writes_enabled" defaultChecked={account.writes_enabled} className="size-4" /> Allow HQN to create paused ads and apply approved changes here</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="automation_enabled" defaultChecked={account.automation_enabled} className="size-4" /> Allow enabled automatic rules to act here</label>
      <div className="space-y-1.5"><Label htmlFor={`n-${account.id}`}>Note (e.g. the spending limit set in Meta)</Label><Input id={`n-${account.id}`} name="note" defaultValue={account.note ?? ''} maxLength={300} /></div>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button><Msg s={state} /></div>
    </form>
  );
}

export function DiscoveryButton() {
  const [state, action, pending] = useActionState<StudioState, FormData>(async () => runDiscovery(), undefined);
  return (
    <form action={action} className="space-y-2">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? 'Reading from Meta…' : 'Discover Pages, datasets, forms and live state'}</Button>
      <Msg s={state} />
    </form>
  );
}

export function VerifyTrackingButton() {
  const [state, action, pending] = useActionState<StudioState, FormData>(async () => verifyTracking(), undefined);
  return (
    <form action={action} className="space-y-2">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>I checked conversion tracking in Events Manager</Button>
      <Msg s={state} />
    </form>
  );
}

export function AssetMapRow({ asset, contractors, label }: { asset: { id: string; name: string | null; meta_id: string; contractor_id: string | null; last_error: string | null }; contractors: { id: string; name: string }[]; label: string }) {
  const [state, action, pending] = useActionState<StudioState, FormData>(mapAsset, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2 border-b py-2 last:border-0">
      <input type="hidden" name="asset_id" value={asset.id} />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{asset.name ?? asset.meta_id}</p><p className="text-xs text-muted-foreground">{label} · {asset.meta_id}</p>{asset.last_error && <p className="text-xs text-destructive">{asset.last_error}</p>}</div>
      <Select name="contractor_id" defaultValue={asset.contractor_id ?? ''} aria-label={`Contractor for ${asset.name ?? asset.meta_id}`} className="w-full sm:w-56">
        <option value="">HomeQuote network (admins only)</option>
        {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? '…' : 'Save'}</Button>
      <Msg s={state} />
    </form>
  );
}

export function ThresholdsForm({ values }: { values: Thresholds }) {
  const [state, action, pending] = useActionState<StudioState, FormData>(saveThresholds, undefined);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted-foreground">These are your numbers. HQN has no built-in benchmarks: a blank field means the related audit check says &ldquo;Not assessed&rdquo; instead of guessing. Saving replaces every value shown.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(THRESHOLD_LABELS) as (keyof Thresholds)[]).map((k) => (
          <div key={k} className="space-y-1.5">
            <Label htmlFor={`t-${k}`}>{THRESHOLD_LABELS[k]}</Label>
            <Input id={`t-${k}`} name={k} type="number" inputMode="decimal" step="any" defaultValue={values[k] ?? ''} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Saving…' : 'Save thresholds'}</Button><Msg s={state} /></div>
    </form>
  );
}
