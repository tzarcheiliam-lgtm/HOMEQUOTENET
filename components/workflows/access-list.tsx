'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setBuilderAccessAction } from '@/lib/actions/workflow-graph';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toaster';

export function AccessList({ rows }: { rows: { id: string; name: string; enabled: boolean; mode: string | null }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const toggle = async (id: string, enabled: boolean) => {
    setBusy(id);
    const r = await setBuilderAccessAction(id, enabled);
    setBusy(null);
    toast(r.message ?? (r.ok ? 'Saved.' : 'Could not save.'), r.ok ? 'success' : 'error');
    router.refresh();
  };
  return (
    <Card><CardContent className="divide-y p-0">
      {rows.map((r) => (
        <label key={r.id} className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
          <span className="min-w-0"><span className="block truncate font-medium">{r.name}</span><span className="block text-xs text-muted-foreground">AI calling: {r.mode ? r.mode.replaceAll('_', ' ') : 'not set up'}</span></span>
          <input type="checkbox" className="size-5" checked={r.enabled} disabled={busy === r.id} onChange={(e) => toggle(r.id, e.target.checked)} aria-label={`Allow ${r.name} to build automations`} />
        </label>
      ))}
    </CardContent></Card>
  );
}
