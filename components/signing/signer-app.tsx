/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Check, CheckCircle2, Clock, Download, FileText, Loader2, Lock, PenLine, ShieldCheck, XCircle, KeyRound } from 'lucide-react';
import { PdfPageView, usePdf } from '@/components/signing/pdf-view';
import { SCRIPT_FONT, SignaturePad, type SignatureValue } from '@/components/signing/signature-pad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SIGNATURE_STATEMENT } from '@/lib/signing/constants';

interface SField { id: string; type: 'signature' | 'initials' | 'name' | 'date' | 'text' | 'checkbox'; page: number; x: number; y: number; w: number; h: number; required: boolean; label: string | null; group_key: string | null; date_format: string | null; mine: boolean; locked: boolean; prefill_value: string | null; done: { value: string | null; image_png: string | null; typed_text: string | null } | null }
interface Session {
  state: 'ok'; documentTitle: string; subject: string | null; message: string | null; sender: { business: string | null; name: string | null; email: string | null };
  expiresAt: string; pages: { w: number; h: number; rotation: number }[]; signingOrder: string; me: { id: string; name: string; email: string; consented: boolean };
  signers: { name: string; order: number; status: string; isMe: boolean }[]; fields: SField[];
  consent: { version: string; text: string[]; identity: string; method: string }; pdfUrl: string;
}
interface CodeRequired { state: 'code_required'; documentTitle?: string | null; sender?: string | null; locked: boolean; hasCode: boolean; remaining: number }
interface Dead { state: 'invalid' | 'signed' | 'declined' | 'voided' | 'expired' | 'not_your_turn'; documentTitle?: string | null; sender?: string | null; version_status?: string }
type Entry = { kind: 'sig'; v: SignatureValue } | { kind: 'text'; v: string } | { kind: 'check'; v: boolean };

/** Secret returned by a correct access-code check; sent with every later signing action (never stored in a URL). */
let accessSession: string | null = null;
const sessionKey = (token: string) => `hqsign:${token.slice(0, 12)}`;

async function api<T = any>(path: string, body: object): Promise<T> {
  const payload = path === '/api/signing/session' && accessSession ? { ...body, session: accessSession } : body;
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' });
  const json = await res.json().catch(() => ({ ok: false, message: 'Unexpected response.' }));
  if (!res.ok || json.ok === false) throw Object.assign(new Error(json.message || 'Something went wrong.'), { code: json.error, fields: json.fields, field_id: json.field_id, remaining: json.remaining });
  return json as T;
}

const fmtDate = (fmt: string | null) => {
  const d = new Date(); const p = (n: number) => String(n).padStart(2, '0');
  if (fmt === 'MM/dd/yyyy') return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()}`;
  if (fmt === 'dd/MM/yyyy') return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (fmt === 'yyyy-MM-dd') return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="border-b bg-slate-900 px-4 py-3 text-white" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className={`mx-auto flex items-center justify-between ${wide ? 'max-w-5xl' : 'max-w-xl'}`}>
          <span className="font-semibold tracking-tight">HomeQuote<span className="opacity-60"> Network</span></span>
          <span className="flex items-center gap-1.5 text-xs opacity-70"><Lock className="size-3" /> Secure signing</span>
        </div>
      </header>
      {children}
      <footer className="mt-auto px-4 py-6 text-center text-[11px] leading-relaxed text-zinc-500">
        Powered by HomeQuote Network · <span>Signatures here are electronic signatures, not certificate-based digital signatures.</span>
      </footer>
    </div>
  );
}

function Message({ icon: Icon, title, children, tone = 'neutral' }: { icon: typeof Clock; title: string; children?: React.ReactNode; tone?: 'neutral' | 'good' | 'bad' }) {
  return (
    <Shell>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <div className="rounded-2xl border bg-white p-6 text-center shadow-sm sm:p-10">
          <span className={`mx-auto mb-4 flex size-12 items-center justify-center rounded-full ${tone === 'good' ? 'bg-emerald-100 text-emerald-700' : tone === 'bad' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'}`}><Icon className="size-6" /></span>
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="mt-2 space-y-3 text-sm text-zinc-600">{children}</div>
        </div>
      </main>
    </Shell>
  );
}

function DownloadPanel({ token, ready }: { token: string; ready: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const go = async (kind: 'final' | 'certificate') => {
    setBusy(kind); setErr(null);
    try { const r = await api<{ url: string }>('/api/signing/download', { action: 'url', token, kind }); window.location.assign(r.url); } catch (e) { setErr((e as Error).message); } finally { setBusy(null); }
  };
  if (!ready) return <p className="text-sm text-zinc-600">The completed document is being prepared. You will also get it by email.</p>;
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={() => go('final')} disabled={!!busy}>{busy === 'final' ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Download signed PDF</Button>
        <Button variant="outline" onClick={() => go('certificate')} disabled={!!busy}>{busy === 'certificate' ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Completion certificate</Button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}

function CodeGate({ info, token, onVerified }: { info: CodeRequired; token: string; onVerified: (session: string | null) => Promise<void> }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(info.remaining);
  const [locked, setLocked] = useState(info.locked);
  const who = info.sender ?? 'the sender';
  if (!info.hasCode) return <Message icon={KeyRound} title="Access code not set up"><p>This request needs an access code, but none has been set up for you yet. Ask {who} to send it again.</p></Message>;
  if (locked) return <Message icon={XCircle} title="Too many incorrect codes" tone="bad"><p>For security this link is locked. Ask {who} for a new access code, then open the link from your email again.</p></Message>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api<{ session: string | null }>('/api/signing/session', { action: 'verify', token, code });
      await onVerified(r.session);
    } catch (ex) {
      const x = ex as Error & { code?: string; remaining?: number };
      if (x.code === 'code_locked') setLocked(true);
      else { setErr(x.message); if (typeof x.remaining === 'number') setRemaining(x.remaining); setBusy(false); }
    }
  };
  return (
    <Shell>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <form onSubmit={submit} className="rounded-2xl border bg-white p-6 shadow-sm sm:p-10">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"><KeyRound className="size-6" /></span>
          <h1 className="text-center text-xl font-semibold">Enter your access code</h1>
          <p className="mt-2 text-center text-sm text-zinc-600">{info.documentTitle ? <><strong>{info.documentTitle}</strong>{info.sender ? ` from ${info.sender}` : ''} needs a 6-digit access code. </> : null}{who} should have given it to you by phone or text. It is not in the email.</p>
          <label htmlFor="access-code" className="sr-only">Access code</label>
          <input id="access-code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={7} value={code} onChange={(e) => setCode(e.target.value)}
            className="mt-6 w-full rounded-lg border px-4 py-3 text-center text-2xl font-semibold tracking-[0.4em] outline-none focus:ring-2 focus:ring-slate-400" placeholder="••••••" />
          {err && <p className="mt-3 text-center text-sm text-red-600" role="alert">{err}{remaining < 5 && remaining > 0 ? ` ${remaining} ${remaining === 1 ? 'try' : 'tries'} left.` : ''}</p>}
          <Button type="submit" className="mt-5 w-full" disabled={busy || code.replace(/\D/g, '').length !== 6}>{busy ? <Loader2 className="size-4 animate-spin" /> : null} Continue</Button>
        </form>
      </main>
    </Shell>
  );
}

export function SignerApp() {
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<'sign' | 'download' | null>(null);
  const [data, setData] = useState<Session | Dead | CodeRequired | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dl, setDl] = useState<{ state: string; documentTitle?: string; sender?: string | null; name?: string; ready?: boolean } | null>(null);

  useEffect(() => {
    const m = /^#(t|d)=([A-Za-z0-9_-]{43})$/.exec(window.location.hash);
    if (!m) { setData({ state: 'invalid' }); return; }
    if (m[1] === 't') { try { accessSession = window.sessionStorage.getItem(sessionKey(m[2])); } catch { accessSession = null; } }
    setToken(m[2]); setMode(m[1] === 't' ? 'sign' : 'download');
  }, []);
  useEffect(() => {
    if (!token || !mode) return;
    let cancelled = false;
    (async () => {
      try {
        if (mode === 'download') { const r = await api('/api/signing/download', { action: 'session', token }); if (!cancelled) setDl(r); }
        else { const r = await api('/api/signing/session', { action: 'open', token }); if (!cancelled) setData(r); }
      } catch (e) { if (!cancelled) setLoadError((e as Error).message); }
    })();
    return () => { cancelled = true; };
  }, [token, mode]);

  if (loadError) return <Message icon={AlertCircle} title="We couldn’t load this page" tone="bad"><p>{loadError}</p><Button onClick={() => window.location.reload()}>Try again</Button></Message>;
  if (mode === 'download') {
    if (!dl) return <Message icon={Loader2} title="Loading…" />;
    if (dl.state !== 'ready') return <Message icon={XCircle} title="This download link isn’t valid" tone="bad"><p>It may have expired. Ask the sender to send the completed document again.</p></Message>;
    return <Message icon={CheckCircle2} title="Your signed document is ready" tone="good"><p><strong>{dl.documentTitle}</strong>{dl.sender ? ` · ${dl.sender}` : ''}</p><DownloadPanel token={token!} ready={!!dl.ready} /></Message>;
  }
  if (!data) return <Message icon={Loader2} title="Opening your document…" />;
  if (data.state === 'code_required') {
    return <CodeGate info={data as CodeRequired} token={token!} onVerified={async (session) => {
      accessSession = session;
      try { if (session) window.sessionStorage.setItem(sessionKey(token!), session); } catch { /* the page still works for this visit */ }
      const r = await api('/api/signing/session', { action: 'open', token });
      setData(r);
    }} />;
  }
  if (data.state !== 'ok') {
    const d = data as Dead;
    const who = d.sender ? ` from ${d.sender}` : '';
    switch (d.state) {
      case 'signed': return <Message icon={CheckCircle2} title="You’ve already signed" tone="good"><p>{d.documentTitle ? <>Thank you. <strong>{d.documentTitle}</strong>{who} has your signature. </> : null}This link can’t be used to sign again.</p>{d.version_status === 'completed' && token ? <DownloadPanel token={token} ready /> : <p>You’ll get an email with the completed document once everyone has signed.</p>}</Message>;
      case 'expired': return <Message icon={Clock} title="This signing link has expired"><p>Links stop working after a set time for security. Contact the sender{d.sender ? ` (${d.sender})` : ''} and ask them to send it again.</p></Message>;
      case 'voided': return <Message icon={XCircle} title="This request was cancelled"><p>The sender{who} cancelled this signing request, or replaced it with a new version. If you were expecting a document, check your email for a newer invitation.</p></Message>;
      case 'declined': return <Message icon={XCircle} title="This request was declined"><p>Signing for this document was declined, so the request is closed.</p></Message>;
      case 'not_your_turn': return <Message icon={Clock} title="It’s not your turn yet"><p>This document is signed in order. You’ll get an email as soon as it’s your turn to sign{d.documentTitle ? ` “${d.documentTitle}”` : ''}.</p></Message>;
      default: return <Message icon={XCircle} title="This link isn’t valid" tone="bad"><p>The link may be incomplete, have been replaced by a newer one, or no longer be active. Use the most recent email you received, or ask the sender to resend it.</p></Message>;
    }
  }
  return <Signing session={data} token={token!} />;
}

function Signing({ session, token }: { session: Session; token: string }) {
  const [consented, setConsented] = useState(session.me.consented);
  if (!consented) return <ConsentGate session={session} token={token} onDone={() => setConsented(true)} />;
  return <Workspace session={session} token={token} />;
}

function ConsentGate({ session, token, onDone }: { session: Session; token: string; onDone: () => void }) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const business = session.sender.business || session.sender.name || 'a HomeQuote Network contractor';
  const go = async () => {
    setBusy(true); setErr(null);
    try { await api('/api/signing/session', { action: 'consent', token }); onDone(); } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <Shell>
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-6">
        <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Signature requested</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{session.documentTitle}</h1>
          <p className="mt-2 text-sm text-zinc-600">Hi {session.me.name}, <strong>{business}</strong> asked you to review and sign this document.</p>
          <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
            <p><strong>Sent by:</strong> {business}{session.sender.email ? ` (${session.sender.email})` : ''} through HomeQuote Network.</p>
            <p className="mt-0.5">The business name comes from the sender’s HomeQuote Network account. Make sure you expected this document before signing.</p>
          </div>
          {session.message && <blockquote className="mt-4 whitespace-pre-wrap border-l-4 border-zinc-200 pl-3 text-sm text-zinc-700">{session.message}</blockquote>}
          {session.signers.length > 1 && (
            <p className="mt-4 text-sm text-zinc-600">Signers: {session.signers.map((s) => `${s.name}${s.isMe ? ' (you)' : ''}`).join(', ')} — {session.signingOrder === 'sequential' ? 'signing in order' : 'in any order'}.</p>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7">
          <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4" /> Agree to sign electronically</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-zinc-700">{session.consent.text.map((t) => <li key={t}>{t}</li>)}</ul>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            <p className="font-medium">How you’re identified</p>
            <p>{session.consent.identity}</p>
            <p className="mt-1">{SIGNATURE_STATEMENT}</p>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 size-5" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> <span>I have read this and agree to sign electronically.</span></label>
          {err && <p className="mt-3 text-sm text-red-600" role="alert">{err}</p>}
          <Button size="lg" className="mt-4 w-full" disabled={!agree || busy} onClick={go}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />} Review document</Button>
          <p className="mt-3 text-center text-xs text-zinc-500">This link expires {new Date(session.expiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.</p>
        </div>
      </main>
    </Shell>
  );
}

function Workspace({ session, token }: { session: Session; token: string }) {
  const { doc, error: pdfError } = usePdf(session.pdfUrl);
  const storeKey = `hq-sign-${token.slice(0, 10)}`;
  const mine = useMemo(() => session.fields.filter((f) => f.mine && !f.locked), [session.fields]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [active, setActive] = useState<SField | null>(null);
  const [saved, setSaved] = useState<{ signature?: SignatureValue; initials?: SignatureValue }>({});
  const [phase, setPhase] = useState<'sign' | 'submitting' | 'done' | 'declining' | 'declined'>('sign');
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<{ completed: boolean; finalized: boolean } | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [attention, setAttention] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // restore an interrupted session (this tab only)
  useEffect(() => { try { const raw = sessionStorage.getItem(storeKey); if (raw) { const p = JSON.parse(raw); setEntries(p.entries ?? {}); setSaved(p.saved ?? {}); } } catch { /* ignore */ } }, [storeKey]);
  useEffect(() => { try { sessionStorage.setItem(storeKey, JSON.stringify({ entries, saved })); } catch { /* ignore */ } }, [entries, saved, storeKey]);

  const isDone = useCallback((f: SField) => {
    if (f.type === 'date') return true;
    const e = entries[f.id];
    if (f.type === 'checkbox') {
      if (f.group_key) { const g = mine.filter((x) => x.group_key === f.group_key); return !g.some((x) => x.required) || g.some((x) => (entries[x.id] as any)?.v === true); }
      return !f.required || (e as any)?.v === true;
    }
    if (!f.required) return true;
    if (!e) return false;
    return e.kind === 'text' ? e.v.trim().length > 0 : true;
  }, [entries, mine]);
  const requiredLeft = mine.filter((f) => !isDone(f));
  const requiredTotal = mine.filter((f) => f.required || (f.group_key && mine.some((x) => x.group_key === f.group_key && x.required))).length;

  const goNext = () => {
    const f = requiredLeft[0]; if (!f) return;
    document.querySelector(`[data-sfield="${f.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setAttention(f.id); setTimeout(() => setAttention(null), 1600);
  };
  const open = (f: SField) => { if (f.mine && !f.locked && f.type !== 'date') setActive(f); };

  const setCheck = (f: SField, v: boolean) => setEntries((e) => {
    const next = { ...e };
    if (v && f.group_key) for (const g of mine) if (g.group_key === f.group_key && g.id !== f.id) next[g.id] = { kind: 'check', v: false };
    next[f.id] = { kind: 'check', v };
    return next;
  });

  const submit = async () => {
    setPhase('submitting'); setError(null);
    const values = mine.filter((f) => f.type !== 'date').map((f) => {
      const e = entries[f.id];
      if (f.type === 'signature' || f.type === 'initials') return e?.kind === 'sig' ? { field_id: f.id, sig_method: e.v.method, typed_text: e.v.typedText, image_png: e.v.png } : null;
      if (f.type === 'checkbox') return { field_id: f.id, value: (e as any)?.v === true ? 'true' : 'false' };
      return e?.kind === 'text' && e.v.trim() ? { field_id: f.id, value: e.v.trim() } : (f.required ? null : { field_id: f.id, value: '' });
    }).filter(Boolean);
    try {
      let r: any;
      for (let attempt = 0; ; attempt++) { // retry only transient network failures; the server is idempotent
        try { r = await api('/api/signing/session', { action: 'submit', token, values, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }); break; }
        catch (e) { if ((e as any).code || attempt >= 2) throw e; await new Promise((res) => setTimeout(res, 800 * (attempt + 1))); }
      }
      try { sessionStorage.removeItem(storeKey); } catch { /* ignore */ }
      setResult({ completed: r.completed, finalized: r.finalized }); setPhase('done');
    } catch (e) {
      setError((e as Error).message); setPhase('sign'); setFinishing(false);
      if ((e as any).field_id) setAttention((e as any).field_id);
    }
  };
  const decline = async () => {
    setError(null);
    try { await api('/api/signing/session', { action: 'decline', token, reason: declineReason }); setPhase('declined'); } catch (e) { setError((e as Error).message); }
  };

  if (phase === 'done' && result) {
    return (
      <Message icon={CheckCircle2} tone="good" title={result.completed ? 'All done — everyone has signed' : 'Thank you — you’ve signed'}>
        <p><strong>{session.documentTitle}</strong></p>
        {result.completed ? <DownloadPanel token={token} ready={result.finalized} /> : <p>{session.signers.length > 1 ? 'The remaining signers have been notified. ' : ''}You’ll get an email with a download link once the document is complete.</p>}
        <p className="text-xs text-zinc-500">You can close this page. This signing link can no longer be used to sign.</p>
      </Message>
    );
  }
  if (phase === 'declined') return <Message icon={XCircle} title="You declined to sign"><p>The sender has been told. Nothing was signed.</p></Message>;

  const page = (n: number) => (
    <div key={n} className="mx-auto w-full max-w-[820px]">
      <PdfPageView doc={doc} pageNumber={n} meta={session.pages[n - 1]}>
        {session.fields.filter((f) => f.page === n).map((f) => {
          const e = entries[f.id];
          const isMine = f.mine && !f.locked;
          const filled = isMine ? isFieldFilled(f, e) : !!f.done || !!f.prefill_value;
          const pending = isMine && !filled && (f.required || f.type === 'checkbox' || f.type === 'signature');
          return (
            <button key={f.id} type="button" data-sfield={f.id} disabled={!isMine || f.type === 'date'} onClick={() => open(f)}
              className={`absolute overflow-hidden rounded-[3px] text-left transition ${isMine ? 'cursor-pointer' : 'cursor-default'} ${attention === f.id ? 'animate-pulse ring-4 ring-amber-400' : ''}`}
              style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%`, minHeight: 24, minWidth: 24, containerType: 'size',
                background: isMine ? (filled ? 'rgba(16,185,129,0.10)' : 'rgba(250,204,21,0.30)') : 'transparent',
                border: isMine ? `1.5px ${filled ? 'solid #10b981' : 'dashed #d97706'}` : f.done || f.prefill_value ? 'none' : '1px dashed #a1a1aa' }}
              aria-label={isMine ? `${f.label || f.type}${f.required ? ' (required)' : ''}${filled ? ', completed' : ''}` : undefined}>
              {renderValue(f, e)}
              {isMine && !filled && f.type !== 'date' && <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 text-[length:clamp(8px,45cqh,12px)] font-semibold text-amber-800">{f.type === 'signature' ? <><PenLine className="size-3" /> Sign</> : f.type === 'initials' ? 'Initial' : f.type === 'checkbox' ? '' : f.label || 'Fill in'}</span>}
              {isMine && f.type === 'date' && <span className="pointer-events-none absolute inset-0 flex items-center px-1 text-[length:clamp(8px,60cqh,14px)] text-zinc-700">{fmtDate(f.date_format)}</span>}
              {!isMine && !f.done && !f.prefill_value && <span className="pointer-events-none absolute inset-0 flex items-center px-1 text-[9px] text-zinc-400">Other signer</span>}
              {pending && f.type === 'checkbox' && <span className="pointer-events-none absolute inset-0 border-2 border-dashed border-amber-500" />}
            </button>
          );
        })}
      </PdfPageView>
      <p className="py-1 text-center text-[11px] text-zinc-500">Page {n} of {session.pages.length}</p>
    </div>
  );

  return (
    <Shell wide>
      <main className="flex-1 px-2 pb-36 pt-3 sm:px-4">
        <div className="mx-auto mb-3 max-w-[820px] px-1">
          <h1 className="text-lg font-semibold">{session.documentTitle}</h1>
          <p className="text-xs text-zinc-600">From {session.sender.business || session.sender.name} · scroll through the whole document, then complete the highlighted fields.</p>
        </div>
        {pdfError && <p className="mx-auto max-w-[820px] rounded bg-red-50 p-3 text-sm text-red-700">{pdfError}</p>}
        <div ref={scroller} className="space-y-3">{session.pages.map((_, i) => page(i + 1))}</div>
      </main>

      {/* sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-[820px] flex-col gap-2 px-3 py-2">
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          {finishing ? (
            <div className="space-y-2">
              <p className="text-sm">By selecting <strong>Finish signing</strong>, you apply your signature and entries to this document, intend them as your signature, and agree they are final. You can’t change them afterwards.</p>
              <div className="flex gap-2"><Button className="flex-1" size="lg" onClick={submit} disabled={phase === 'submitting'}>{phase === 'submitting' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Finish signing</Button><Button variant="outline" size="lg" onClick={() => setFinishing(false)} disabled={phase === 'submitting'}>Back</Button></div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 text-sm"><p className="font-medium">{requiredLeft.length === 0 ? 'Ready to finish' : `${requiredLeft.length} required field${requiredLeft.length > 1 ? 's' : ''} left`}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-200"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${requiredTotal ? Math.round(((requiredTotal - requiredLeft.length) / requiredTotal) * 100) : 100}%` }} /></div></div>
              {requiredLeft.length > 0 ? <Button size="lg" onClick={goNext}>Next field <ArrowRight className="size-4" /></Button> : <Button size="lg" onClick={() => setFinishing(true)}>Review &amp; finish</Button>}
              <Button variant="ghost" size="lg" className="text-zinc-600" onClick={() => setPhase('declining')}>Decline</Button>
            </div>
          )}
        </div>
      </div>

      {active && <FieldSheet field={active} entry={entries[active.id]} saved={saved} name={session.me.name} onClose={() => setActive(null)}
        onSig={(v) => { setEntries((e) => ({ ...e, [active.id]: { kind: 'sig', v } })); setSaved((s) => ({ ...s, [active.type]: v })); setActive(null); }}
        onText={(v) => { setEntries((e) => ({ ...e, [active.id]: { kind: 'text', v } })); setActive(null); }}
        onCheck={(v) => { setCheck(active, v); setActive(null); }}
        onClear={() => { setEntries((e) => { const n = { ...e }; delete n[active.id]; return n; }); setActive(null); }} />}

      {phase === 'declining' && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Decline to sign">
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Decline to sign?</h2>
            <p className="text-sm text-zinc-600">This closes the request for everyone and tells the sender. Nothing you entered is kept.</p>
            <Textarea rows={3} placeholder="Reason (optional)" value={declineReason} maxLength={1000} onChange={(e) => setDeclineReason(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2"><Button variant="destructive" className="flex-1" onClick={decline}>Decline</Button><Button variant="outline" className="flex-1" onClick={() => setPhase('sign')}>Keep signing</Button></div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function isFieldFilled(f: SField, e: Entry | undefined) {
  if (f.type === 'date') return true;
  if (!e) return false;
  if (e.kind === 'check') return e.v;
  if (e.kind === 'text') return e.v.trim().length > 0;
  return true;
}

function renderValue(f: SField, e: Entry | undefined) {
  const img = (png: string) => <img alt="" src={`data:image/png;base64,${png}`} className="pointer-events-none absolute inset-0 size-full object-contain object-left" />;
  if (f.done) {
    if (f.done.image_png) return img(f.done.image_png);
    if (f.type === 'checkbox') return f.done.value === 'true' ? <Check className="pointer-events-none absolute inset-0 m-auto size-[80%] text-zinc-900" strokeWidth={3} /> : null;
    return <span className="pointer-events-none absolute inset-0 flex items-center px-1 text-[length:clamp(7px,62cqh,14px)] text-zinc-900">{f.done.value}</span>;
  }
  if (f.prefill_value) return <span className="pointer-events-none absolute inset-0 flex items-center px-1 text-[length:clamp(7px,62cqh,14px)] text-zinc-900">{f.prefill_value}</span>;
  if (!e) return null;
  if (e.kind === 'sig') return img(e.v.png);
  if (e.kind === 'check') return e.v ? <Check className="pointer-events-none absolute inset-0 m-auto size-[80%] text-zinc-900" strokeWidth={3} /> : null;
  return <span className="pointer-events-none absolute inset-0 flex items-center px-1 text-[length:clamp(7px,62cqh,14px)] text-zinc-900">{e.v}</span>;
}
void SCRIPT_FONT;

function FieldSheet({ field, entry, saved, name, onClose, onSig, onText, onCheck, onClear }: {
  field: SField; entry: Entry | undefined; saved: { signature?: SignatureValue; initials?: SignatureValue }; name: string;
  onClose: () => void; onSig: (v: SignatureValue) => void; onText: (v: string) => void; onCheck: (v: boolean) => void; onClear: () => void;
}) {
  const [sig, setSig] = useState<SignatureValue | null>(null);
  const [text, setText] = useState(entry?.kind === 'text' ? entry.v : '');
  const titleMap = { signature: 'Add your signature', initials: 'Add your initials', name: field.label || 'Printed name', text: field.label || 'Enter text', checkbox: field.label || 'Checkbox', date: 'Date' } as const;
  const initialsDefault = name.split(/\s+/).filter(Boolean).map((p) => p[0]?.toUpperCase()).join('').slice(0, 4);
  const reuse = field.type === 'signature' ? saved.signature : field.type === 'initials' ? saved.initials : undefined;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label={titleMap[field.type]} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{titleMap[field.type]}{field.required ? <span className="text-red-600"> *</span> : null}</h2><button type="button" onClick={onClose} className="rounded p-1 text-zinc-500 hover:bg-zinc-100" aria-label="Close"><XCircle className="size-5" /></button></div>
        {(field.type === 'signature' || field.type === 'initials') && (
          <>
            {reuse && <button type="button" onClick={() => onSig(reuse)} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-zinc-50"><img alt="" src={`data:image/png;base64,${reuse.png}`} className="h-10 max-w-[55%] object-contain" /><span className="ml-auto text-sm font-medium text-blue-700">Use this {field.type === 'signature' ? 'signature' : 'initials'}</span></button>}
            <SignaturePad kind={field.type} defaultText={field.type === 'initials' ? initialsDefault : name} onChange={setSig} />
            <p className="text-xs text-zinc-500">{field.type === 'signature' ? 'By adding your signature you intend it as your electronic signature on this document.' : 'These initials will be placed where the sender asked.'}</p>
            <div className="flex gap-2"><Button size="lg" className="flex-1" disabled={!sig} onClick={() => sig && onSig(sig)}>Apply</Button>{entry && <Button size="lg" variant="outline" onClick={onClear}>Remove</Button>}</div>
          </>
        )}
        {(field.type === 'name' || field.type === 'text') && (
          <>
            {field.type === 'text' && (field.h > 0.05) ? <Textarea rows={3} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} autoFocus /> : <Input value={text} maxLength={field.type === 'name' ? 200 : 1000} onChange={(e) => setText(e.target.value)} autoFocus autoComplete={field.type === 'name' ? 'name' : 'off'} />}
            {field.type === 'name' && !text && <Button type="button" variant="outline" size="sm" onClick={() => setText(name)}>Use “{name}”</Button>}
            <div className="flex gap-2"><Button size="lg" className="flex-1" disabled={!text.trim() && field.required} onClick={() => onText(text)}>Apply</Button>{entry && <Button size="lg" variant="outline" onClick={onClear}>Clear</Button>}</div>
          </>
        )}
        {field.type === 'checkbox' && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700">{field.label || 'Tick this box if it applies to you.'}{field.group_key ? ' (choose one)' : ''}</p>
            <div className="flex gap-2"><Button size="lg" className="flex-1" onClick={() => onCheck(true)}><Check className="size-4" /> Tick</Button><Button size="lg" variant="outline" className="flex-1" onClick={() => onCheck(false)}>Leave empty</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}
