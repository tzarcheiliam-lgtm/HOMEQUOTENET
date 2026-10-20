'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import type { ActionView } from './types';

type Phase = 'idle' | 'working';

/**
 * A change the assistant PREPARED. Nothing has happened yet. The result shown after Confirm is whatever the server
 * returned, never an optimistic guess.
 */
export function ActionCard({ initial }: { initial: ActionView }) {
  const [action, setAction] = useState<ActionView>(initial);
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const doc = action.preview.document;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries((doc?.fields ?? []).map(f => [f.key, f.value])));
  const [showText, setShowText] = useState(false);
  const pending = action.status === 'proposed';

  const decide = async (decision: 'confirm' | 'cancel') => {
    setPhase('working'); setMessage(null);
    try {
      const res = await fetch(`/api/assistant/actions/${action.id}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(decision === 'confirm' && doc ? { decision, edits: { values } } : { decision }),
      });
      const json = await res.json().catch(() => null) as { action?: ActionView; error?: string } | null;
      if (!res.ok || !json?.action) { setMessage(json?.error ?? 'That did not go through. Nothing was changed.'); return; }
      setAction(a => ({ ...a, ...json.action! }));
    } catch { setMessage('Could not reach the server. Nothing was changed; try again.'); }
    finally { setPhase('idle'); }
  };

  const tone = action.status === 'executed' ? 'border-emerald-400/50' : action.status === 'failed' ? 'border-rose-400/50' : 'border-sky-300/40';
  return (
    <section aria-label={action.preview.title} className={`my-2 rounded-lg border ${tone} bg-white/5 p-3`}>
      <header className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-white">{action.preview.title}</h4>
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80" role="status">
          {action.status === 'proposed' ? 'Not saved yet' : action.status === 'executing' ? 'Working…' : action.status === 'executed' ? 'Done' : action.status === 'failed' ? 'Failed' : 'Cancelled'}
        </span>
      </header>
      <p className="mt-1 text-xs text-white/60">For <Link href={action.preview.target.href} className="text-sky-300 underline underline-offset-2">{action.preview.target.label}</Link></p>
      <ul className="mt-2 space-y-0.5 text-sm text-white/90">{action.preview.lines.map((l, i) => <li key={i} className="whitespace-pre-wrap break-words">{l}</li>)}</ul>

      {doc && pending && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-white/60">Check and correct the details below. The document wording comes from the approved template and can’t be changed here.</p>
          {doc.fields.map(f => (
            <label key={f.key} className="block text-xs text-white/70">
              {f.label}{f.required ? ' *' : ''}{f.fromLead ? ' (from the lead — please check)' : ''}
              {f.kind === 'longtext'
                ? <textarea value={values[f.key] ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} rows={3} className="mt-0.5 w-full rounded-md border border-white/15 bg-black/20 p-2 text-sm text-white outline-none focus:border-sky-300" />
                : <input value={values[f.key] ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} inputMode={f.kind === 'money' ? 'decimal' : undefined} type={f.kind === 'date' ? 'date' : 'text'}
                    className="mt-0.5 w-full rounded-md border border-white/15 bg-black/20 p-2 text-sm text-white outline-none focus:border-sky-300" />}
            </label>
          ))}
          <button type="button" onClick={() => setShowText(s => !s)} aria-expanded={showText} className="flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200">
            <ChevronDown className={`size-3.5 transition-transform ${showText ? 'rotate-180' : ''}`} aria-hidden /> Document wording (read-only)
          </button>
          {showText && (
            <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border border-white/10 bg-black/20 p-2 text-xs text-white/80">
              {doc.sections.map((s, i) => <div key={i}>{s.title && <p className="font-semibold text-white">{s.title}</p>}<p className="whitespace-pre-wrap">{s.text}</p></div>)}
            </div>
          )}
        </div>
      )}

      {action.preview.warning && pending && (
        <p className="mt-2 flex gap-1.5 rounded-md bg-amber-400/10 p-2 text-xs text-amber-200"><ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />{action.preview.warning}</p>
      )}

      {pending && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={phase === 'working'} onClick={() => decide('confirm')}
            className="inline-flex items-center gap-1.5 rounded-md bg-sky-400 px-3 py-1.5 text-sm font-semibold text-[#0A1B3D] hover:bg-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-60">
            {phase === 'working' && <Loader2 className="size-3.5 animate-spin" aria-hidden />}{action.preview.confirmLabel ?? 'Confirm'}
          </button>
          <button type="button" disabled={phase === 'working'} onClick={() => decide('cancel')} className="rounded-md border border-white/25 px-3 py-1.5 text-sm text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 disabled:opacity-60">Cancel</button>
        </div>
      )}
      {message && <p role="alert" className="mt-2 text-xs text-rose-300">{message}</p>}
      {action.status === 'executed' && action.result && (
        <p className="mt-2 flex gap-1.5 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /><span>{action.result.message} <Link href={action.result.href} className="underline underline-offset-2">View {action.result.label}</Link></span></p>
      )}
      {action.status === 'failed' && <p className="mt-2 flex gap-1.5 text-sm text-rose-300"><XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />{action.error ?? 'This could not be completed. Nothing was changed.'}</p>}
      {action.status === 'cancelled' && <p className="mt-2 text-xs text-white/60">Cancelled. Nothing was changed.</p>}
    </section>
  );
}
