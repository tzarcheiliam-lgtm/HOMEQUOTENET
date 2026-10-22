'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { ActionView, ChatEvent, Msg } from './types';

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export interface ConversationSummary { id: string; title: string; updated_at: string }
export interface Status { available: boolean; enabled: boolean; configured: boolean }

const storageKey = (userId: string) => `hqn-assistant-conversation:${userId}`;
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage may be blocked */ } };

/** Chat state lives in the app layout, so it survives navigation between pages. */
export function useAssistant(userId: string) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [context, setContext] = useState<{ type: 'lead'; id: string; label: string } | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const convRef = useRef<string | null>(null);
  convRef.current = conversationId;

  const patchLast = useCallback((fn: (m: Msg) => Msg) => setMessages(ms => ms.length ? [...ms.slice(0, -1), fn(ms[ms.length - 1])] : ms), []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/status');
      const json = await res.json().catch(() => null) as { available?: boolean; enabled?: boolean; configured?: boolean } | null;
      setStatus({ available: !!json?.available, enabled: json?.enabled !== false, configured: !!json?.configured });
    } catch { setStatus({ available: false, enabled: true, configured: false }); }
  }, []);

  const refreshContext = useCallback(async () => {
    try {
      const res = await fetch(`/api/assistant/context?path=${encodeURIComponent(pathname)}`);
      const json = await res.json().catch(() => null) as { context?: { type: 'lead'; id: string; label: string } | null } | null;
      setContext(json?.context ?? null);
    } catch { setContext(null); }
  }, [pathname]);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`);
      if (!res.ok) { write(storageKey(userId), null); return false; }
      const json = await res.json() as { messages: { id: string; role: 'user' | 'assistant'; content: string; status: string; context?: { blocks?: Msg['blocks'] } }[]; actions: (ActionView & { message_id: string | null })[] };
      setMessages(json.messages.map(m => ({
        id: m.id, role: m.role, text: m.content, status: m.status === 'cancelled' ? 'cancelled' : 'complete',
        blocks: m.role === 'assistant' ? m.context?.blocks ?? [] : [], actions: m.role === 'assistant' ? json.actions.filter(a => a.message_id === m.id) : [],
      })));
      setConversationId(id); write(storageKey(userId), id);
      return true;
    } catch { return false; }
  }, [userId]);

  const loadConversations = useCallback(async () => {
    try { const res = await fetch('/api/assistant/conversations'); const json = await res.json(); setConversations(json.conversations ?? []); } catch { setConversations([]); }
  }, []);

  // Restore the last conversation once.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = read(storageKey(userId));
    if (saved) void loadConversation(saved);
  }, [userId, loadConversation]);

  const send = useCallback(async (text: string, retry?: { clientId: string }) => {
    const message = text.trim();
    if (!message || busy) return;
    const clientId = retry?.clientId ?? uid();
    const assistantId = uid();
    setMessages(ms => {
      const base = retry ? ms.filter(m => !(m.role === 'assistant' && m.status === 'error' && m.error?.retryClientId === clientId)) : [...ms, { id: uid(), role: 'user' as const, text: message, status: 'complete' as const, blocks: [], actions: [], clientId }];
      return [...base, { id: assistantId, role: 'assistant', text: '', status: 'streaming', blocks: [], actions: [], working: 'Thinking' }];
    });
    setBusy(true);
    const ac = new AbortController(); abortRef.current = ac;
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ac.signal,
        body: JSON.stringify({ conversationId: convRef.current ?? undefined, message, clientId, path: pathname }),
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => null) as { message?: string; code?: string } | null;
        patchLast(m => ({ ...m, status: 'error', working: undefined, error: { code: json?.code ?? 'http', message: json?.message ?? 'The assistant could not answer right now.', retryText: message, retryClientId: clientId } }));
        return;
      }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev: ChatEvent; try { ev = JSON.parse(line); } catch { continue; }
          if (ev.type === 'meta') { setConversationId(ev.conversationId); write(storageKey(userId), ev.conversationId); setContext(ev.context); }
          else if (ev.type === 'text') patchLast(m => ({ ...m, text: m.text + ev.delta, working: undefined }));
          else if (ev.type === 'tool') patchLast(m => ({ ...m, working: ev.status === 'running' ? ev.name : undefined }));
          else if (ev.type === 'block') patchLast(m => ({ ...m, blocks: [...m.blocks, ev.block] }));
          else if (ev.type === 'action') patchLast(m => ({ ...m, actions: [...m.actions.filter(a => a.id !== ev.action.id), { id: ev.action.id, kind: ev.action.kind, status: ev.action.status as ActionView['status'], preview: ev.action.preview }] }));
          else if (ev.type === 'done') patchLast(m => ({ ...m, status: ev.cancelled ? 'cancelled' : 'complete', working: undefined }));
          else if (ev.type === 'error') patchLast(m => ({ ...m, status: 'error', working: undefined, error: { code: ev.code, message: ev.message, retryText: message, retryClientId: clientId } }));
        }
      }
      patchLast(m => (m.status === 'streaming' ? { ...m, status: 'complete', working: undefined } : m));
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === 'AbortError';
      patchLast(m => aborted ? { ...m, status: 'cancelled', working: undefined }
        : { ...m, status: 'error', working: undefined, error: { code: 'network', message: 'Connection lost. Your message was kept; try again.', retryText: message, retryClientId: clientId } });
    } finally { setBusy(false); abortRef.current = null; }
  }, [busy, pathname, patchLast, userId]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const newConversation = useCallback(() => { abortRef.current?.abort(); setMessages([]); setConversationId(null); write(storageKey(userId), null); }, [userId]);
  const note = useCallback((text: string) => setMessages(ms => [...ms, { id: uid(), role: 'assistant', text, status: 'complete', blocks: [], actions: [] }]), []);

  return { messages, conversationId, busy, status, context, conversations, send, stop, newConversation, loadStatus, refreshContext, loadConversation, loadConversations, note };
}
