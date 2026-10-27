'use client';

import { useCallback, useRef, useState } from 'react';
import type { BuildEvent, BuildResult } from '@/lib/workflows/ai-builder/build.server';
import type { BuildStep } from '@/lib/workflows/ai-builder/config';

export type AiBuildRequest =
  | { mode: 'create'; description: string; answers?: { question: string; answer: string }[]; contractorId?: string | null }
  | { mode: 'change'; description: string; answers?: { question: string; answer: string }[]; workflowId: string; expectedRevision: number };

export interface AiProgress { step: BuildStep; attempt: number; problems: number | null; seen: BuildStep[] }

/** Talks to POST /api/workflows/ai-build and turns its NDJSON stream into React state. */
export function useAiBuild() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<AiProgress | null>(null);
  const [result, setResult] = useState<BuildResult | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (req: AiBuildRequest): Promise<BuildResult> => {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setRunning(true);
    setResult(null);
    setProgress({ step: 'understanding', attempt: 0, problems: null, seen: ['understanding'] });
    const done = (r: BuildResult) => { setResult(r); setRunning(false); return r; };
    try {
      const res = await fetch('/api/workflows/ai-build', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req), signal: ctl.signal });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { message?: string; code?: string } | null;
        return done({ ok: false, outcome: res.status === 403 ? 'forbidden' : 'error', message: body?.message ?? 'Could not reach the AI builder. Try again.', remaining: null });
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let final: BuildResult | null = null;
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          let msg: BuildEvent | { type: 'result'; result: BuildResult };
          try { msg = JSON.parse(line); } catch { continue; }
          if (msg.type === 'result') final = msg.result;
          else if (msg.type === 'step') {
            const e = msg;
            setProgress((p) => ({
              step: e.step,
              attempt: e.attempt ?? p?.attempt ?? 0,
              problems: e.problems ?? (e.step === 'checking' ? null : p?.problems ?? null),
              seen: p?.seen.includes(e.step) ? p.seen : [...(p?.seen ?? []), e.step],
            }));
          }
        }
      }
      return done(final ?? { ok: false, outcome: 'error', message: 'The connection closed before the AI builder finished. Try again.', remaining: null });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return done({ ok: false, outcome: 'error', message: 'Stopped.', remaining: null });
      return done({ ok: false, outcome: 'error', message: 'Could not reach the AI builder. Check your connection and try again.', remaining: null });
    }
  }, []);

  const stop = useCallback(() => abort.current?.abort(), []);
  const reset = useCallback(() => { setResult(null); setProgress(null); }, []);
  return { run, stop, reset, running, progress, result };
}
