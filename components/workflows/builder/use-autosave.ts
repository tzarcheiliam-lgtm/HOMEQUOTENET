'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { saveGraphDraftAction } from '@/lib/actions/workflow-graph';
import { canonicalGraph, type WorkflowGraph } from '@/lib/workflows/graph';

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error' | 'conflict';

interface Snapshot { graph: WorkflowGraph; name: string; description: string }
const key = (s: Snapshot) => `${s.name}\u0000${s.description}\u0000${canonicalGraph(s.graph)}`;

/**
 * Debounced, serialized draft autosave. Exactly one save is in flight at a time; edits made
 * meanwhile are saved right after. A stale revision (another window saved) puts the editor in
 * `conflict` and stops saving rather than overwriting someone else's work.
 */
export function useAutosave(opts: { workflowId: string; initialRevision: number; snapshot: Snapshot; enabled: boolean; delayMs?: number }) {
  const { workflowId, snapshot, enabled, delayMs = 1200 } = opts;
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const revision = useRef(opts.initialRevision);
  const savedKey = useRef(key(snapshot));
  const latest = useRef(snapshot);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);
  latest.current = snapshot;

  const flush = useCallback(async (): Promise<boolean> => {
    if (stopped.current) return false;
    if (inFlight.current) return false;
    const snap = latest.current;
    const k = key(snap);
    if (k === savedKey.current) { setStatus('saved'); return true; }
    inFlight.current = true;
    setStatus('saving');
    try {
      const res = await saveGraphDraftAction({ workflowId, expectedRevision: revision.current, graph: snap.graph, name: snap.name || 'Untitled workflow', description: snap.description || null });
      if (res.ok && res.data) {
        revision.current = res.data.revision;
        savedKey.current = k;
        setSavedAt(new Date());
        setMessage(null);
        // Edits made while saving.
        if (key(latest.current) !== k) { inFlight.current = false; return flush(); }
        setStatus('saved');
        return true;
      }
      if (res.conflict) { stopped.current = true; setStatus('conflict'); setMessage(res.message ?? null); return false; }
      setStatus('error');
      setMessage(res.message ?? 'Could not save.');
      return false;
    } catch {
      setStatus('error');
      setMessage('Could not reach the server. Your changes are kept here and will be retried.');
      return false;
    } finally {
      inFlight.current = false;
    }
  }, [workflowId]);

  useEffect(() => {
    if (!enabled || stopped.current) return;
    if (key(snapshot) === savedKey.current) { if (status !== 'saving') setStatus('saved'); return; }
    if (status !== 'saving') setStatus('unsaved');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, status === 'error' ? 6000 : delayMs);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.graph, snapshot.name, snapshot.description, enabled]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (status === 'unsaved' || status === 'saving' || status === 'error') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status]);

  /** Save now and resolve when the server has the latest edits (used before publish / test). */
  const saveNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    for (let i = 0; i < 20 && inFlight.current; i += 1) await new Promise((r) => setTimeout(r, 150));
    return flush();
  }, [flush]);

  return { status, savedAt, message, saveNow, revision: () => revision.current };
}
