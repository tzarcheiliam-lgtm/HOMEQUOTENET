'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveState = { kind: 'idle' } | { kind: 'dirty' } | { kind: 'saving' } | { kind: 'saved'; at: Date } | { kind: 'error'; message: string };
type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Debounced autosave with a clear status. Saves are serialized (never two in flight); the latest value always wins.
 * `flush()` saves immediately and resolves with whether everything is persisted.
 */
export function useAutosave<T>({ value, save, delay = 1200, enabled = true }: { value: T; save: (v: T) => Promise<SaveResult>; delay?: number; enabled?: boolean }) {
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const latest = useRef(value);
  const saved = useRef(value);
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });

  const run = useCallback(async (): Promise<boolean> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    while (inFlight.current) await inFlight.current;
    if (Object.is(latest.current, saved.current)) return true;
    const snapshot = latest.current;
    setState({ kind: 'saving' });
    let ok = false;
    const p = (async () => {
      try {
        const r = await saveRef.current(snapshot);
        if (r.ok) { saved.current = snapshot; ok = true; setState(Object.is(latest.current, snapshot) ? { kind: 'saved', at: new Date() } : { kind: 'dirty' }); }
        else setState({ kind: 'error', message: r.error });
      } catch { setState({ kind: 'error', message: 'Could not save. Check your connection.' }); }
    })();
    inFlight.current = p;
    await p;
    inFlight.current = null;
    if (ok && !Object.is(latest.current, saved.current)) return run();
    return ok;
  }, []);

  useEffect(() => {
    latest.current = value;
    if (Object.is(value, saved.current)) return; // nothing changed (initial render, or React re-running the effect)
    if (!enabled) return;
    setState((s) => (s.kind === 'saving' ? s : { kind: 'dirty' }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void run(); }, delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, delay, enabled, run]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (!Object.is(latest.current, saved.current)) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return { state, flush: run };
}

export function SaveIndicator({ state, onRetry, className }: { state: SaveState; onRetry?: () => void; className?: string }) {
  const base = 'inline-flex items-center gap-1.5 text-xs text-muted-foreground';
  return (
    <span role="status" aria-live="polite" className={cn(base, className)} data-save-state={state.kind}>
      {state.kind === 'saving' && <><Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Saving…</>}
      {state.kind === 'saved' && <><Check className="size-3.5 text-emerald-600" aria-hidden="true" /> Saved {state.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</>}
      {state.kind === 'dirty' && <>Unsaved changes…</>}
      {state.kind === 'idle' && <>All changes saved</>}
      {state.kind === 'error' && (
        <span className="inline-flex items-center gap-1.5 text-destructive"><AlertCircle className="size-3.5" aria-hidden="true" /> Not saved: {state.message}
          {onRetry && <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2">Retry</button>}
        </span>
      )}
    </span>
  );
}
