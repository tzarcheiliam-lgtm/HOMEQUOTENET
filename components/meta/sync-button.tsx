'use client';

import { useActionState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { syncMetaNow, type MetaActionState } from '@/lib/actions/meta-ads';

export function SyncButton() {
  const [state, action, pending] = useActionState<MetaActionState, FormData>(async () => syncMetaNow(), undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <RefreshCw className={`size-4 ${pending ? 'animate-spin' : ''}`} aria-hidden="true" />
        {pending ? 'Syncing…' : 'Sync now'}
      </Button>
      {state?.error && <p role="alert" className="max-w-xs text-right text-xs text-destructive">{state.error}</p>}
      {state?.success && <p role="status" className="max-w-xs text-right text-xs text-emerald-700">{state.success}</p>}
    </form>
  );
}
