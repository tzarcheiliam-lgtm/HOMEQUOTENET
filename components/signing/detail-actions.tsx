/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, BellRing, Download, FilePlus2, Loader2, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { fileUrlAction, newVersionAction, remindAction, resendAction, retryFinalizeAction, voidAction } from '@/lib/actions/signing';

type Kind = 'original' | 'final' | 'certificate';

export function DownloadButtons({ versionId, finalReady, status }: { versionId: string; finalReady: boolean; status: string }) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const go = async (kind: Kind) => {
    setBusy(kind); setError(null);
    const r = await fileUrlAction(versionId, kind);
    setBusy(null);
    if (!r.ok) return setError(r.error);
    window.location.assign(r.url);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'completed' && finalReady && <Button size="sm" onClick={() => go('final')} disabled={!!busy}>{busy === 'final' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Signed PDF</Button>}
      {status === 'completed' && finalReady && <Button size="sm" variant="outline" onClick={() => go('certificate')} disabled={!!busy}>{busy === 'certificate' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Certificate</Button>}
      <Button size="sm" variant="outline" onClick={() => go('original')} disabled={!!busy}>{busy === 'original' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Original</Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

export function RequestActions({ versionId, status, needsFinalize }: { versionId: string; status: string; needsFinalize: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState('');
  const open = status === 'awaiting_signature' || status === 'partially_signed';
  const run = (fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>, after?: (r: any) => void) =>
    start(async () => { setMessage(null); const r = await fn(); if (!r.ok) setMessage(r.error ?? 'Failed'); else { after?.(r); router.refresh(); } });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {open && <Button size="sm" variant="outline" disabled={pending} onClick={() => setVoidOpen(!voidOpen)}><Ban className="size-4" /> Void request</Button>}
        {status !== 'draft' && <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => newVersionAction(versionId), (r) => router.push(`/app/documents/${r.versionId}`))}><FilePlus2 className="size-4" /> {open ? 'Edit as new version' : 'New version'}</Button>}
        {needsFinalize && <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => retryFinalizeAction(versionId))}><RefreshCw className="size-4" /> Retry creating signed PDF</Button>}
      </div>
      {voidOpen && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm">Voiding cancels every signing link immediately. Signers who were invited are told it was cancelled.</p>
          <Textarea rows={2} placeholder="Reason (optional, shown in the audit record)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          <div className="flex gap-2"><Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => voidAction(versionId, reason), () => setVoidOpen(false))}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Void now</Button><Button size="sm" variant="ghost" onClick={() => setVoidOpen(false)}>Keep</Button></div>
        </div>
      )}
      {open && <p className="text-xs text-muted-foreground">Sent requests are locked. “Edit as new version” cancels this request and opens an editable copy.</p>}
      {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
    </div>
  );
}

export function SignerActions({ versionId, recipientId, canRemind, name }: { versionId: string; recipientId: string; canRemind: boolean; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (kind: 'resend' | 'remind') => start(async () => {
    setMsg(null);
    const r = kind === 'resend' ? await resendAction(versionId, recipientId) : await remindAction(versionId, recipientId);
    if (!r.ok) setMsg(r.error); else if (!r.result.sent) setMsg(`Email failed: ${r.result.error}`); else setMsg(kind === 'resend' ? 'Invitation sent' : 'Reminder sent');
    router.refresh();
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run('resend')} aria-label={`Resend invitation to ${name}`}><Send className="size-3.5" /> Resend</Button>
      {canRemind && <Button size="sm" variant="outline" disabled={pending} onClick={() => run('remind')} aria-label={`Remind ${name}`}><BellRing className="size-3.5" /> Remind</Button>}
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
