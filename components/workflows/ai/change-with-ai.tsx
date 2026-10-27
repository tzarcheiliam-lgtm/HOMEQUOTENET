'use client';

import { useId, useState } from 'react';
import { Check, ChevronDown, Minus, Pencil, Plus, Sparkles, Square, X } from 'lucide-react';
import { AI_BUILDS_PER_DAY, AI_MAX_ANSWER_CHARS, AI_MAX_DESCRIPTION_CHARS } from '@/lib/workflows/ai-builder/config';
import type { ClarifyingQuestion } from '@/lib/workflows/ai-builder/check';
import { explainGraph } from '@/lib/workflows/ai-builder/explain';
import { semanticGraph, type WorkflowGraph } from '@/lib/workflows/graph';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { BuildProgress, ExplainList, NoteList, RemainingBadge, unsupportedText } from './ai-parts';
import { useAiBuild } from './use-ai-build';

/**
 * Compact "Change with AI" box in the visual builder (admins only). The current draft is saved first, the
 * model returns the full updated graph, and the admin sees exactly which steps are added, removed or changed
 * before anything is applied. Applying goes through the editor (so Undo works) and the normal autosave,
 * which carries the draft's optimistic revision.
 */
export function ChangeWithAi({
  workflowId, graph, flushSave, getRevision, onApply, initialRemaining,
}: {
  workflowId: string;
  graph: WorkflowGraph;
  flushSave: () => Promise<boolean>;
  getRevision: () => number;
  onApply: (graph: WorkflowGraph) => void;
  initialRemaining: number | null;
}) {
  const ids = { text: useId(), explain: useId() };
  const [open, setOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<ClarifyingQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(initialRemaining);
  const [base, setBase] = useState<string | null>(null);
  const { run, stop, reset, running, progress, result } = useAiBuild();

  const submit = async () => {
    if (!description.trim() || running) return;
    const saved = await flushSave();
    if (!saved) { toast('Save your changes first (the draft could not be saved).', 'error'); return; }
    setBase(semanticGraph(graph));
    const a = questions ? questions.map((q) => ({ question: q.question, answer: (answers[q.id] ?? '').trim() })).filter((x) => x.answer) : undefined;
    const r = await run({ mode: 'change', description: description.trim(), answers: a, workflowId, expectedRevision: getRevision() });
    if (r.remaining !== null && r.remaining !== undefined) setRemaining(r.remaining);
    if (r.outcome === 'needs_answers') { setQuestions(r.questions); setAnswers({}); } else setQuestions(null);
  };

  const apply = () => {
    if (!result || result.outcome !== 'change_proposed') return;
    // The proposal was made against the draft as saved at that moment; refuse if it changed since.
    if (base !== semanticGraph(graph) || getRevision() !== result.baseRevision) {
      toast('The draft changed after the AI looked at it. Ask again so nothing you did is lost.', 'error');
      return;
    }
    onApply(result.graph);
    toast('Change applied to the draft. Use Undo to revert it. Nothing is published.');
    reset(); setDescription(''); setOpen(false);
  };

  const proposal = !running && result?.outcome === 'change_proposed' ? result : null;

  return (
    <div className="rounded-xl border bg-card" data-testid="ai-change-box">
      <div className="flex flex-wrap items-center gap-2 p-2.5">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={ids.text} className="inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:h-9">
          <Sparkles className="size-4 text-primary" aria-hidden /> Change with AI
          <ChevronDown className={cn('size-4 transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden />
        </button>
        <button type="button" onClick={() => setExplainOpen((o) => !o)} aria-expanded={explainOpen} aria-controls={ids.explain} className="inline-flex h-10 items-center rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:h-9">
          Explain this workflow
        </button>
        <span className="ml-auto"><RemainingBadge remaining={remaining} total={AI_BUILDS_PER_DAY} /></span>
      </div>

      {explainOpen && (
        <div id={ids.explain} className="border-t p-3 sm:p-4">
          <ExplainList lines={explainGraph(graph)} />
        </div>
      )}

      {open && (
        <div className="space-y-3 border-t p-3 sm:p-4">
          {!proposal && (
            <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-2">
              <Label htmlFor={ids.text} className="sr-only">Describe the change</Label>
              <Textarea
                id={ids.text}
                value={description}
                maxLength={AI_MAX_DESCRIPTION_CHARS}
                disabled={running}
                onChange={(e) => { setDescription(e.target.value); if (questions) setQuestions(null); }}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void submit(); } }}
                placeholder="e.g. Wait 2 days instead of 1 before the follow-up, and alert the admins if the appointment is cancelled."
                className="min-h-20 bg-background lg:min-h-16"
              />
              {questions && !running && (
                <fieldset className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
                  <legend className="px-1 text-sm font-semibold text-sky-950">A quick question</legend>
                  {questions.map((q, i) => (
                    <div key={q.id} className="space-y-1">
                      <Label htmlFor={`${ids.text}-${q.id}`} className="text-sky-950">{q.question}</Label>
                      <Input id={`${ids.text}-${q.id}`} autoFocus={i === 0} maxLength={AI_MAX_ANSWER_CHARS} value={answers[q.id] ?? ''} placeholder={q.placeholder ?? 'Your answer'} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} className="bg-background" />
                    </div>
                  ))}
                </fieldset>
              )}
              <div className="flex items-center justify-end gap-2">
                {running && <Button type="button" variant="ghost" size="sm" onClick={stop} className="gap-1.5"><Square className="size-3.5" aria-hidden /> Stop</Button>}
                <Button type="submit" size="sm" disabled={running || !description.trim() || remaining === 0} className="gap-1.5" data-testid="ai-change-button">
                  <Sparkles aria-hidden /> {running ? 'Working…' : questions ? 'Continue' : 'Propose change'}
                </Button>
              </div>
            </form>
          )}

          {running && <div className="rounded-lg border bg-background p-3"><BuildProgress progress={progress} withSave={false} /></div>}

          {proposal && (
            <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in" role="region" aria-label="Proposed change" data-testid="ai-change-proposal">
              {proposal.summary && <p className="text-sm">{proposal.summary}</p>}
              {proposal.diff.unchanged ? (
                <p className="rounded-lg border bg-muted/40 p-3 text-sm">The AI did not change anything.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {proposal.diff.added.map((n) => <li key={`a-${n.id}`} className="flex gap-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-emerald-950"><Plus className="mt-0.5 size-4 shrink-0" aria-hidden /><span><span className="sr-only">Added: </span>{n.detail}</span></li>)}
                  {proposal.diff.removed.map((n) => <li key={`r-${n.id}`} className="flex gap-2 rounded-md bg-rose-50 px-2.5 py-1.5 text-rose-950"><Minus className="mt-0.5 size-4 shrink-0" aria-hidden /><span><span className="sr-only">Removed: </span><span className="line-through decoration-rose-400">{n.detail}</span></span></li>)}
                  {proposal.diff.changed.map((n) => <li key={`c-${n.id}`} className="flex gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-amber-950"><Pencil className="mt-0.5 size-4 shrink-0" aria-hidden /><span><span className="sr-only">Changed: </span><span className="text-amber-800/80 line-through">{n.before}</span> → {n.after}</span></li>)}
                  {(proposal.diff.connectionsAdded > 0 || proposal.diff.connectionsRemoved > 0) && <li className="px-2.5 text-xs text-muted-foreground">{proposal.diff.connectionsAdded} connection{proposal.diff.connectionsAdded === 1 ? '' : 's'} added, {proposal.diff.connectionsRemoved} removed.</li>}
                  {proposal.diff.settingsChanged && <li className="px-2.5 text-xs text-muted-foreground">Workflow settings changed.</li>}
                </ul>
              )}
              <div className="grid gap-2 md:grid-cols-2">
                <NoteList title="Assumptions" items={proposal.assumptions} tone="info" />
                <NoteList title="Couldn’t do" items={proposal.unsupported.map(unsupportedText)} tone="warn" />
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                <Button variant="ghost" size="sm" onClick={() => reset()} className="gap-1.5"><X aria-hidden /> Discard</Button>
                <Button size="sm" onClick={apply} disabled={proposal.diff.unchanged} className="gap-1.5" data-testid="ai-apply-change"><Check aria-hidden /> Apply to draft</Button>
              </div>
            </div>
          )}

          {!running && result?.outcome === 'invalid' && (
            <div role="alert" className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">
              <p className="font-semibold">The AI couldn’t produce a valid change. Your draft is untouched.</p>
              <ul className="list-disc pl-5">{result.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
          {!running && result && (result.outcome === 'error' || result.outcome === 'limit' || result.outcome === 'forbidden' || result.outcome === 'not_configured') && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
