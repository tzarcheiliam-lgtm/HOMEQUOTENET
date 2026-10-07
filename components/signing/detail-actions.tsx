/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, BellRing, Download, FilePlus2, KeyRound, Loader2, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { AccessCodesPanel, type ShownCode } from '@/components/signing/access-codes-panel';
import { REMINDER_DAY_OPTIONS, REMINDER_MAX_OPTIONS } from '@/lib/signing/constants';
import { fileUrlAction, newVersionAction, regenerateCodeAction, remindAction, resendAction, retryFinalizeAction, setRemindersAction, voidAction } from '@/lib/actions/signing';

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

export function SignerActions({ versionId, recipientId, canRemind, name, requireCode = false, codeLocked = false }: { versionId: string; recipientId: string; canRemind: boolean; name: string; requireCode?: boolean; codeLocked?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [shown, setShown] = useState<ShownCode | null>(null);
  const run = (kind: 'resend' | 'remind') => start(async () => {
    setMsg(null);
    const r = kind === 'resend' ? await resendAction(versionId, recipientId) : await remindAction(versionId, recipientId);
    if (!r.ok) setMsg(r.error); else if (!r.result.sent) setMsg(`Email failed: ${r.result.error}`); else setMsg(kind === 'resend' ? 'Invitation sent' : 'Reminder sent');
    router.refresh();
  });
  const newCode = () => start(async () => {
    setMsg(null);
    const r = await regenerateCodeAction(versionId, recipientId);
    if (!r.ok) return setMsg(r.error);
    setShown(r.issued);
    router.refresh();
  });
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run('resend')} aria-label={`Resend invitation to ${name}`}><Send className="size-3.5" /> Resend</Button>
        {canRemind && <Button size="sm" variant="outline" disabled={pending} onClick={() => run('remind')} aria-label={`Remind ${name}`}><BellRing className="size-3.5" /> Remind</Button>}
        {requireCode && <Button size="sm" variant={codeLocked ? 'default' : 'outline'} disabled={pending} onClick={newCode} aria-label={`New access code for ${name}`}><KeyRound className="size-3.5" /> New code</Button>}
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
      {shown && <div className="w-full max-w-md text-left"><AccessCodesPanel codes={[shown]} title="New access code" /></div>}
    </div>
  );
}

/** Change automatic reminders on a draft/open request (operational; the document itself stays locked). */
export function ReminderSettings({ versionId, days, max, status }: { versionId: string; days: number | null; max: number; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [d, setD] = useState<number | null>(days);
  const [m, setM] = useState(max);
  const [msg, setMsg] = useState<string | null>(null);
  if (status !== 'awaiting_signature' && status !== 'partially_signed') return days ? <p className="text-xs text-muted-foreground">Automatic reminders were set to every {days} day{days === 1 ? '' : 's'}, up to {max}.</p> : null;
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <p className="flex items-center gap-1 font-medium"><BellRing className="size-3.5" /> Automatic reminders</p>
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Reminder interval" className="w-auto" value={d ?? ''} onChange={(e) => setD(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Off</option>{REMINDER_DAY_OPTIONS.map((n) => <option key={n} value={n}>Every {n} day{n === 1 ? '' : 's'}</option>)}
        </Select>
        {d !== null && <><span className="text-muted-foreground">at most</span><Select aria-label="Maximum reminders" className="w-20" value={m} onChange={(e) => setM(Number(e.target.value))}>{REMINDER_MAX_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}</Select></>}
        <Button size="sm" variant="outline" disabled={pending || (d === days && m === max)} onClick={() => start(async () => { setMsg(null); const r = await setRemindersAction(versionId, { days: d, max: m }); setMsg(r.ok ? 'Saved' : r.error); router.refresh(); })}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Save</Button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
