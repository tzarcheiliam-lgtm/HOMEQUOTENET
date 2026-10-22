'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowUp, History, Loader2, MessageSquarePlus, RotateCcw, Sparkles, Square, X } from 'lucide-react';
import { ASSISTANT_GREETING, ASSISTANT_INTRO, ASSISTANT_TITLE } from '@/lib/assistant/config';
import { ActionCard } from './action-card';
import { BlockView } from './blocks';
import { RichText } from './rich-text';
import { useAssistant } from './use-assistant';
import type { Msg } from './types';

const TOOL_LABEL: Record<string, string> = {
  attention_summary: 'Checking what needs attention', search_leads: 'Searching leads', get_lead: 'Reading the lead', list_appointments: 'Checking appointments',
  prepare_document: 'Preparing the document', list_document_templates: 'Looking up approved templates', meta_list_assets: 'Reading your Meta assets', meta_check_tracking: 'Checking what Meta received',
  meta_setup_status: 'Checking tracking status', meta_list_funnels: 'Listing funnels',
};

const META_RETURN: Record<string, string> = {
  denied: 'Meta authorization was cancelled, so nothing was connected.',
  invalid_state: 'That Meta login link expired or did not match your session, so nothing was connected. Please start again.',
  insufficient_permission: 'Meta did not grant the permission needed to read your ad accounts, so nothing was connected.',
  not_configured: 'Meta login is not set up on the server yet. An admin must add the Meta app settings first.',
  forbidden: 'Your account can’t connect Meta. Only HomeQuote admins and company owners can.',
  failed: 'Connecting Meta did not work. Nothing was saved; please try again.',
};

function useVisualViewportHeight(active: boolean) {
  useLayoutEffect(() => {
    if (!active || typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const set = () => document.documentElement.style.setProperty('--hqn-vvh', `${vv.height}px`);
    set(); vv.addEventListener('resize', set); vv.addEventListener('scroll', set);
    return () => { vv.removeEventListener('resize', set); vv.removeEventListener('scroll', set); document.documentElement.style.removeProperty('--hqn-vvh'); };
  }, [active]);
}

function Inner({ userId, capabilities }: { userId: string; capabilities: { documents: boolean; meta: boolean } }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const a = useAssistant(userId);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const handledMeta = useRef(false);
  useVisualViewportHeight(open);

  useEffect(() => {
    document.documentElement.classList.toggle('hqn-assistant-open', open);
    return () => document.documentElement.classList.remove('hqn-assistant-open');
  }, [open]);
  useEffect(() => { if (open) { void a.loadStatus(); void a.refreshContext(); setTimeout(() => inputRef.current?.focus(), 50); } }, [open, pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [a.messages, open, view]);

  // Coming back from Meta's login page: open the panel, say what happened, and continue the setup once.
  useEffect(() => {
    const meta = params.get('meta');
    if (!meta || handledMeta.current) return;
    handledMeta.current = true;
    setOpen(true);
    const next = new URLSearchParams(params.toString()); next.delete('meta');
    router.replace(next.toString() ? `${pathname}?${next}` : pathname);
    if (meta === 'connected') void a.send('I just connected Meta. Continue setting up tracking.');
    else a.note(META_RETURN[meta] ?? META_RETURN.failed);
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => { setOpen(false); setTimeout(() => fabRef.current?.focus(), 0); }, []);
  const submit = () => { const t = draft.trim(); if (!t || a.busy) return; setDraft(''); setView('chat'); void a.send(t); };
  const pick = (kind: string, id: string, label: string) => void a.send(`Use ${label} [${kind} ${id}]`);

  const setupBlocked = a.status && (!a.status.available || !a.status.enabled || !a.status.configured);
  const suggestions = [
    'What needs my attention today?', 'Which leads haven’t been followed up with?', 'What appointments do I have tomorrow?',
    ...(a.context ? [`Brief me on ${a.context.label}`, `Draft a follow-up text for ${a.context.label}`] : []),
    ...(capabilities.documents ? ['Create a proposal'] : []), ...(capabilities.meta ? ['Set up tracking for a funnel'] : []),
  ];

  return (
    <>
      {!open && (
        <button ref={fabRef} type="button" onClick={() => setOpen(true)} aria-label={`Open ${ASSISTANT_TITLE}`} aria-expanded={false} aria-controls="hqn-assistant-panel"
          className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[#0A1B3D] text-white shadow-lg ring-1 ring-white/20 transition hover:scale-105 hover:bg-[#10285a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 bottom-[calc(var(--mnav-h,3.75rem)+env(safe-area-inset-bottom)+1rem)] lg:bottom-6 lg:right-6">
          <Sparkles className="size-6" aria-hidden />
        </button>
      )}
      {open && (
        <aside id="hqn-assistant-panel" role="complementary" aria-label={ASSISTANT_TITLE}
          onKeyDown={e => { if (e.key === 'Escape') close(); }}
          style={{ height: 'var(--hqn-vvh, 100dvh)' }}
          className="fixed inset-x-0 top-0 z-50 flex flex-col bg-[#0A1B3D] text-white shadow-2xl lg:inset-x-auto lg:right-0 lg:w-[26rem] lg:border-l lg:border-white/10 pt-[env(safe-area-inset-top)]">
          <header className="flex items-center gap-1 border-b border-white/10 px-3 py-2.5">
            <Sparkles className="size-4 text-sky-300" aria-hidden />
            <h2 className="flex-1 text-sm font-semibold">{ASSISTANT_TITLE}</h2>
            <button type="button" onClick={() => { a.newConversation(); setView('chat'); }} aria-label="New conversation" title="New conversation" className="rounded-md p-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"><MessageSquarePlus className="size-4" aria-hidden /></button>
            <button type="button" onClick={() => { setView(v => v === 'history' ? 'chat' : 'history'); void a.loadConversations(); }} aria-label="Recent conversations" aria-pressed={view === 'history'} title="Recent conversations" className="rounded-md p-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"><History className="size-4" aria-hidden /></button>
            <button type="button" onClick={close} aria-label="Close assistant" className="rounded-md p-2 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"><X className="size-4" aria-hidden /></button>
          </header>

          {a.context && <p className="border-b border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80" data-testid="assistant-context">Using: <span className="font-medium text-white">Lead · {a.context.label}</span></p>}

          {view === 'history' ? (
            <div className="flex-1 overflow-y-auto p-3">
              <h3 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-white/60">Recent conversations</h3>
              {a.conversations.length === 0 ? <p className="px-1 text-sm text-white/70">No earlier conversations yet.</p> : (
                <ul className="space-y-1.5">{a.conversations.map(c => (
                  <li key={c.id}><button type="button" onClick={async () => { if (await a.loadConversation(c.id)) setView('chat'); }} className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
                    <span className="block truncate text-sm">{c.title}</span><span className="block text-xs text-white/50">{new Date(c.updated_at).toLocaleString()}</span></button></li>
                ))}</ul>
              )}
            </div>
          ) : (
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3" role="log" aria-live="polite" aria-label="Conversation">
              <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2">
                <p className="text-sm font-semibold">{ASSISTANT_GREETING}</p>
                <p className="mt-0.5 text-sm text-white/80">{ASSISTANT_INTRO}</p>
              </div>
              {setupBlocked && (
                <div role="alert" className="rounded-lg border border-amber-300/40 bg-amber-300/10 p-3 text-sm text-amber-100">
                  {!a.status?.available ? 'The assistant isn’t available for your account.' : !a.status.enabled ? 'The assistant is turned off.'
                    : 'The assistant isn’t set up yet. An admin needs to add the Anthropic API key (ANTHROPIC_API_KEY) on the server. You can still look around; nothing is lost.'}
                </div>
              )}
              {a.messages.length === 0 && !setupBlocked && (
                <div className="flex flex-wrap gap-1.5">{suggestions.map(s => (
                  <button key={s} type="button" onClick={() => void a.send(s)} className="rounded-full border border-white/20 px-3 py-1.5 text-left text-xs text-white/90 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">{s}</button>
                ))}</div>
              )}
              {a.messages.map(m => <Bubble key={m.id} m={m} busy={a.busy} onPick={pick} onRetry={() => m.error?.retryText && void a.send(m.error.retryText, { clientId: m.error.retryClientId! })} />)}
            </div>
          )}

          <footer className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <form onSubmit={e => { e.preventDefault(); submit(); }} className="flex items-end gap-2">
              <label htmlFor="hqn-assistant-input" className="sr-only">Message the assistant</label>
              <textarea id="hqn-assistant-input" ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)} rows={1} maxLength={2000} disabled={!!setupBlocked}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
                placeholder={setupBlocked ? 'Assistant unavailable' : 'Ask about your leads, documents or tracking…'}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-base text-white placeholder:text-white/40 outline-none focus:border-sky-300 disabled:opacity-50 sm:text-sm" />
              {a.busy ? (
                <button type="button" onClick={a.stop} aria-label="Stop" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"><Square className="size-4 fill-current" aria-hidden /></button>
              ) : (
                <button type="submit" disabled={!draft.trim() || !!setupBlocked} aria-label="Send" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-400 text-[#0A1B3D] hover:bg-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40"><ArrowUp className="size-5" aria-hidden /></button>
              )}
            </form>
            <p className="mt-1.5 text-[11px] text-white/45">AI can make mistakes. It only sees records you’re allowed to see, and changes need your Confirm.</p>
          </footer>
        </aside>
      )}
    </>
  );
}

function Bubble({ m, busy, onPick, onRetry }: { m: Msg; busy: boolean; onPick: (k: string, id: string, label: string) => void; onRetry: () => void }) {
  if (m.role === 'user') return <div className="ml-auto max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-sky-400 px-3 py-2 text-sm text-[#0A1B3D]">{m.text}</div>;
  return (
    <div className="max-w-[96%]">
      {m.text && <div className="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2"><RichText text={m.text} /></div>}
      {m.blocks.map((b, i) => <BlockView key={i} block={b} onPick={onPick} disabled={busy} />)}
      {m.actions.map(act => <ActionCard key={act.id} initial={act} />)}
      {m.status === 'streaming' && <p className="flex items-center gap-1.5 px-1 py-1 text-xs text-white/60" role="status"><Loader2 className="size-3.5 animate-spin" aria-hidden />{m.working ? TOOL_LABEL[m.working] ?? 'Working' : 'Thinking'}…</p>}
      {m.status === 'cancelled' && <p className="px-1 py-1 text-xs text-white/50">Stopped.</p>}
      {m.status === 'error' && m.error && (
        <div role="alert" className="mt-1 rounded-lg border border-rose-300/40 bg-rose-300/10 p-2.5 text-sm text-rose-100">
          {m.error.message}
          {m.error.retryText && !['provider_auth', 'provider_billing', 'provider_limit', 'limit', 'not_configured'].includes(m.error.code) && (
            <button type="button" onClick={onRetry} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-white underline underline-offset-2"><RotateCcw className="size-3" aria-hidden />Try again</button>
          )}
        </div>
      )}
    </div>
  );
}

/** Mounted once in the signed-in app layout. useSearchParams needs a Suspense boundary. */
export function AssistantRoot(props: { userId: string; capabilities: { documents: boolean; meta: boolean } }) {
  return <Suspense fallback={null}><Inner {...props} /></Suspense>;
}
