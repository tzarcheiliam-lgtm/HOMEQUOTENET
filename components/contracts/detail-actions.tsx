'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ban, BellRing, Copy, Download, History, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { contractFileAction, duplicateContractAction, remindContractAction, resendContractAction, voidContractAction } from '@/lib/actions/contracts';

type Kind = 'original' | 'final' | 'certificate';

export function DownloadButtons({ contractId, completed, finalReady, admin }: { contractId: string; completed: boolean; finalReady: boolean; admin: boolean }) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const go = async (kind: Kind) => {
    setBusy(kind);
    const r = await contractFileAction(contractId, kind);
    setBusy(null);
    if (!r.ok) return toast(r.error, 'error');
    window.location.assign(r.url);
  };
  const icon = (k: Kind) => (busy === k ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />);
  return (
    <div className="flex flex-wrap gap-2">
      {completed && finalReady && <Button size="sm" disabled={!!busy} onClick={() => go('final')}>{icon('final')} Signed PDF</Button>}
      {completed && finalReady && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => go('certificate')}>{icon('certificate')} Certificate</Button>}
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => go('original')}>{icon('original')} {completed ? 'Original' : 'Download PDF'}</Button>
      {completed && !finalReady && admin && <span className="self-center text-xs text-muted-foreground">The signed PDF is still being generated.</span>}
    </div>
  );
}

export function ContractActions({ contractId, versionId, open, canVoid }: { contractId: string; versionId: string | null; open: boolean; canVoid: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => { const r = await duplicateContractAction(contractId); if (!r.ok) return toast(r.error, 'error'); toast('Duplicated as a new draft.'); router.push(`/app/contracts/${r.id}/edit`); })}><Copy className="size-4" /> Duplicate</Button>
        {versionId && <Link href={`/app/documents/${versionId}`} className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent lg:h-8"><History className="size-4" /> Full signing record</Link>}
        {open && canVoid && <Button id="void" size="sm" variant="destructive-outline" disabled={pending} onClick={() => setVoidOpen(!voidOpen)}><Ban className="size-4" /> Void</Button>}
      </div>
      {voidOpen && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm">Voiding cancels every signing link immediately and tells invited signers it was cancelled. A voided agreement cannot be reopened; duplicate it to start a corrected one.</p>
          <label className="sr-only" htmlFor="void-reason">Reason</label>
          <Textarea id="void-reason" rows={2} maxLength={500} placeholder="Reason (kept in the audit record)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(async () => { const r = await voidContractAction(contractId, reason); if (!r.ok) return toast(r.error, 'error'); toast('Agreement voided.'); setVoidOpen(false); router.refresh(); })}>{pending && <Loader2 className="size-4 animate-spin" />} Void now</Button>
            <Button size="sm" variant="ghost" onClick={() => setVoidOpen(false)}>Keep</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SignerButtons({ contractId, recipientId, name, canRemind }: { contractId: string; recipientId: string; name: string; canRemind: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (kind: 'resend' | 'remind') => start(async () => {
    const r = kind === 'resend' ? await resendContractAction(contractId, recipientId) : await remindContractAction(contractId, recipientId);
    if (!r.ok) toast(r.error, 'error');
    else if (!r.result.sent) toast(`Email failed: ${r.result.error}`, 'error');
    else toast(kind === 'resend' ? `Invitation resent to ${name}.` : `Reminder sent to ${name}.`);
    router.refresh();
  });
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run('resend')} aria-label={`Resend invitation to ${name}`}><Send className="size-3.5" /> Resend</Button>
      {canRemind && <Button size="sm" variant="outline" disabled={pending} onClick={() => run('remind')} aria-label={`Remind ${name}`}><BellRing className="size-3.5" /> Remind</Button>}
    </div>
  );
}
