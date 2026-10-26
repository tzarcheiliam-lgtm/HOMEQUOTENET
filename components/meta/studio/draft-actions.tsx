'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Msg } from './ui';
import { cancelDraft, confirmDraftAction, createPausedAction, refreshDraftStatusAction, type StudioState } from '@/lib/actions/meta-studio';

/**
 * Review-page controls. Three separate, explicit steps: (1) confirm exactly what is shown (typed), (2) create the
 * PAUSED objects in Meta, (3) re-read Meta's own status. Nothing here activates an ad.
 */
export function DraftActions({ draftId, status, hasErrors, confirmed, gateReasons }: { draftId: string; status: string; hasErrors: boolean; confirmed: boolean; gateReasons: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState<StudioState>();
  const run = (fn: () => Promise<StudioState>) => start(async () => { const r = await fn(); setMsg(r); router.refresh(); });
  const sent = ['creating', 'created_paused', 'partial'].includes(status);
  const retry = status === 'partial' || status === 'failed';

  return (
    <div className="space-y-4">
      {status !== 'created_paused' && status !== 'cancelled' && (
        <>
          {!confirmed && !sent && (
            <div className="space-y-2">
              <Label htmlFor="confirm-draft">Type <code className="text-xs">CONFIRM</code> to approve exactly the account, budget, schedule and destination shown above</Label>
              <div className="flex flex-wrap gap-2">
                <Input id="confirm-draft" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="max-w-48" />
                <Button type="button" disabled={pending || hasErrors} onClick={() => run(() => confirmDraftAction(draftId, typed))}>Confirm</Button>
              </div>
              {hasErrors && <p className="text-xs text-muted-foreground">Fix the errors above first.</p>}
            </div>
          )}
          {(confirmed || sent) && (
            <div className="space-y-2">
              {gateReasons.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-medium">Creating in Meta is switched off:</p>
                  <ul className="list-disc pl-5">{gateReasons.map((g) => <li key={g}>{g}</li>)}</ul>
                  <p className="mt-1">Your draft and confirmation are saved. Nothing has been sent to Meta.</p>
                </div>
              )}
              <Button type="button" disabled={pending || gateReasons.length > 0 || status === 'creating'} onClick={() => run(() => createPausedAction(draftId))}>
                {retry ? 'Retry: resume creating PAUSED objects in Meta' : 'Create PAUSED objects in Meta'}
              </Button>
              <p className="text-xs text-muted-foreground">Creates the campaign, ad set, creative and ad as <b>paused</b>. Retrying never duplicates: HQN finds and reuses what already exists. Turn the ad on yourself in Ads Manager after Meta shows it is ready.</p>
            </div>
          )}
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {status !== 'draft' && ['created_paused', 'partial'].includes(status) && <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run(() => refreshDraftStatusAction(draftId))}>Refresh Meta status</Button>}
        {['draft', 'ready', 'failed'].includes(status) && <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => run(() => cancelDraft(draftId))}>Cancel draft</Button>}
      </div>
      <Msg s={msg} />
    </div>
  );
}
