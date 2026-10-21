'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { installQualifiedFunnelsAction } from '@/lib/actions/funnel-builder';
import type { InstallResult } from '@/lib/funnels/presets';

/** Creates the bathroom + kitchen funnels as drafts. Hidden once both exist. */
export function InstallQualifiedFunnels() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<InstallResult | null>(null);
  const run = () => start(async () => { setResult(await installQualifiedFunnelsAction()); router.refresh(); });
  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" disabled={pending} onClick={run}>{pending ? 'Creating…' : 'Add bathroom & kitchen funnels'}</Button>
      {result && (
        <p role="status" className="max-w-sm text-right text-xs text-muted-foreground">
          {result.error ? result.error
            : <>Created as drafts: {result.created.map((c, i) => <span key={c.id}>{i ? ', ' : ''}<Link href={`/app/funnels/${c.id}/builder`} className="underline">{c.label}</Link></span>)}. Review, then publish.</>}
        </p>
      )}
    </div>
  );
}
