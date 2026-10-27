'use client';

import { AlertTriangle, Ban, Check, CircleDashed, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExplainLine } from '@/lib/workflows/ai-builder/explain';
import { AI_MAX_REPAIRS, BUILD_STEP_LABELS, type BuildStep } from '@/lib/workflows/ai-builder/config';
import type { AiProgress } from './use-ai-build';

/** Step-by-step progress instead of a frozen button. Announced politely to screen readers. */
export function BuildProgress({ progress, withSave }: { progress: AiProgress | null; withSave: boolean }) {
  const order: BuildStep[] = ['understanding', 'building', 'checking', ...(progress?.seen.includes('repairing') ? (['repairing'] as BuildStep[]) : []), ...(withSave ? (['saving'] as BuildStep[]) : [])];
  const current = progress?.step ?? 'understanding';
  // "checking" can come back after "repairing": show the furthest point reached.
  const idx = Math.max(order.indexOf(current), progress?.seen.includes('repairing') && current === 'checking' ? order.indexOf('repairing') : -1);
  return (
    <ol className="space-y-2" aria-live="polite" aria-label="Build progress">
      {order.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'active' : 'pending';
        const label = s === 'repairing'
          ? `Fixing ${progress?.problems ? `${progress.problems} problem${progress.problems === 1 ? '' : 's'}` : 'problems'} the checker found (attempt ${Math.min(progress?.attempt ?? 2, AI_MAX_REPAIRS + 1)} of ${AI_MAX_REPAIRS + 1})…`
          : BUILD_STEP_LABELS[s];
        return (
          <li key={s} className={cn('flex items-center gap-2.5 text-sm transition-colors motion-reduce:transition-none', state === 'pending' ? 'text-muted-foreground' : 'text-foreground', state === 'active' && 'font-medium')} aria-current={state === 'active' ? 'step' : undefined}>
            <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border', state === 'done' && 'border-emerald-600 bg-emerald-600 text-white', state === 'active' && 'border-primary text-primary')}>
              {state === 'done' ? <Check className="size-3.5" aria-hidden /> : state === 'active' ? <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden /> : <CircleDashed className="size-3.5" aria-hidden />}
            </span>
            <span>{state === 'done' ? label.replace('…', '') : label}</span>
            <span className="sr-only">{state === 'done' ? '(done)' : state === 'active' ? '(in progress)' : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** The plain-English walk of a graph (lib/workflows/ai-builder/explain.ts). */
export function ExplainList({ lines, className }: { lines: ExplainLine[]; className?: string }) {
  return (
    <ul className={cn('space-y-1 text-sm', className)}>
      {lines.map((l, i) => (
        <li key={i} style={{ paddingLeft: `${Math.min(l.depth, 8) * 0.9}rem` }} className={cn(l.kind === 'trigger' && 'font-semibold', l.kind === 'branch' && 'font-medium text-muted-foreground', l.kind === 'jump' && 'italic text-muted-foreground')}>
          {l.text}
        </li>
      ))}
    </ul>
  );
}

export function NoteList({ title, items, tone }: { title: string; items: string[]; tone: 'info' | 'warn' | 'muted' }) {
  if (!items.length) return null;
  const Icon = tone === 'warn' ? Ban : tone === 'info' ? Info : AlertTriangle;
  return (
    <section className={cn('rounded-lg border p-3', tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-950' : tone === 'info' ? 'border-sky-200 bg-sky-50 text-sky-950' : 'bg-muted/40')}>
      <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold"><Icon className="size-4" aria-hidden /> {title}</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </section>
  );
}

export const unsupportedText = (u: { request: string; instead?: string }) => (u.instead ? `${u.request} — used instead: ${u.instead}` : u.request);

export function RemainingBadge({ remaining, total }: { remaining: number | null; total: number }) {
  if (remaining === null) return null;
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', remaining === 0 ? 'bg-rose-100 text-rose-800' : remaining <= 5 ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground')} data-testid="ai-remaining">
      {remaining} of {total} builds left today
    </span>
  );
}
