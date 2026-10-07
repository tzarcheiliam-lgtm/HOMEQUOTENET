'use client';

import { useActionState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Msg } from './ui';
import { deleteCreative, updateCreative, type StudioState } from '@/lib/actions/meta-studio';

export type CreativeView = {
  id: string; name: string; kind: 'image' | 'video'; status: 'uploaded' | 'processing' | 'ready' | 'rejected'; width: number | null; height: number | null; duration_seconds: number | null;
  bytes: number; tags: string[]; campaign_label: string | null; contractorName: string | null; previewUrl: string | null; thumbUrl: string | null;
  validation: { errors: { code: string; message: string }[]; warnings: { code: string; message: string }[] }; usedBy: number; meta_account_id: string | null;
};

const STATUS = { uploaded: ['muted', 'Uploaded'], processing: ['info', 'Checking'], ready: ['success', 'Ready'], rejected: ['danger', 'Rejected'] } as const;

export function CreativeCard({ c }: { c: CreativeView }) {
  const [saved, save, saving] = useActionState<StudioState, FormData>(updateCreative, undefined);
  const [removed, remove, removing] = useActionState<StudioState, FormData>(deleteCreative, undefined);
  const [variant, label] = STATUS[c.status];
  const mb = (c.bytes / 1024 / 1024).toFixed(1);
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex gap-3">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
          {c.kind === 'image' && c.previewUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.previewUrl} alt={c.name} className="size-full object-cover" />
            : c.thumbUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.thumbUrl} alt={`Frame from ${c.name}`} className="size-full object-cover" />
            : <span className="text-xs text-muted-foreground">{c.kind}</span>}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-medium">{c.name}</p>
          <div className="flex flex-wrap items-center gap-1.5"><Badge variant={variant}>{label}</Badge><Badge variant="outline">{c.kind}</Badge></div>
          <p className="text-xs text-muted-foreground">{c.width && c.height ? `${c.width}×${c.height}` : 'size unknown'}{c.duration_seconds ? ` · ${c.duration_seconds.toFixed(1)}s` : ''} · {mb} MB</p>
          <p className="text-xs text-muted-foreground">{c.contractorName ?? 'HomeQuote network'}{c.campaign_label ? ` · ${c.campaign_label}` : ''}</p>
          {c.tags.length > 0 && <p className="text-xs text-muted-foreground">{c.tags.map((t) => `#${t}`).join(' ')}</p>}
        </div>
      </div>
      {c.kind === 'video' && c.previewUrl && <video src={c.previewUrl} controls preload="none" playsInline className="max-h-56 w-full rounded" />}
      {c.validation.errors.map((e) => <p key={e.code} role="alert" className="text-sm text-destructive">{e.message}</p>)}
      {c.validation.warnings.map((w) => <p key={w.code} className="text-sm text-amber-700">Warning: {w.message}</p>)}
      <form action={save} className="grid gap-2 sm:grid-cols-3">
        <input type="hidden" name="id" value={c.id} />
        <div className="space-y-1"><Label htmlFor={`n-${c.id}`}>Name</Label><Input id={`n-${c.id}`} name="name" defaultValue={c.name} maxLength={120} /></div>
        <div className="space-y-1"><Label htmlFor={`c-${c.id}`}>Campaign</Label><Input id={`c-${c.id}`} name="campaign_label" defaultValue={c.campaign_label ?? ''} maxLength={120} /></div>
        <div className="space-y-1"><Label htmlFor={`t-${c.id}`}>Tags</Label><Input id={`t-${c.id}`} name="tags" defaultValue={c.tags.join(', ')} /></div>
        <div className="flex items-center gap-3 sm:col-span-3"><Button type="submit" size="sm" variant="outline" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</Button><Msg s={saved} /></div>
      </form>
      <form action={remove} className="flex items-center gap-3">
        <input type="hidden" name="id" value={c.id} />
        <Button type="submit" size="sm" variant="ghost" disabled={removing || c.usedBy > 0} title={c.usedBy > 0 ? 'Used by an ad draft' : undefined}>Delete</Button>
        {c.usedBy > 0 && <span className="text-xs text-muted-foreground">Used by {c.usedBy} draft(s)</span>}
        {c.meta_account_id && <span className="text-xs text-muted-foreground">Uploaded to Meta account {c.meta_account_id}</span>}
        <Msg s={removed} />
      </form>
    </div>
  );
}
