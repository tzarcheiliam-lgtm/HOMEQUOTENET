'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { ArrowRight, RotateCcw, Sparkles, Square, Trash2, XCircle } from 'lucide-react';
import { archiveGraphAction } from '@/lib/actions/workflow-graph';
import { AI_BUILDS_PER_DAY, AI_BUILD_EXAMPLES, AI_MAX_ANSWER_CHARS, AI_MAX_DESCRIPTION_CHARS } from '@/lib/workflows/ai-builder/config';
import type { ClarifyingQuestion } from '@/lib/workflows/ai-builder/check';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { BuildProgress, ExplainList, NoteList, RemainingBadge, unsupportedText } from './ai-parts';
import { useAiBuild } from './use-ai-build';

/**
 * "Describe a workflow": type what you want, the AI builds an UNPUBLISHED draft in the visual builder.
 * Admins only (the page decides whether to render it; the API re-checks).
 */
export function DescribeWorkflowPanel({ initialRemaining, contractors = [] }: { initialRemaining: number | null; contractors?: { id: string; name: string }[] }) {
  const router = useRouter();
  const ids = { text: useId(), scope: useId(), hint: useId() };
  const [description, setDescription] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [questions, setQuestions] = useState<ClarifyingQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remaining, setRemaining] = useState(initialRemaining);
  const [discarding, setDiscarding] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const { run, stop, reset, running, progress, result } = useAiBuild();

  const outOfBuilds = remaining === 0;
  const canBuild = !running && !outOfBuilds && description.trim().length > 0;

  const build = async (withAnswers: boolean) => {
    if (!description.trim() || running) return;
    const a = withAnswers && questions ? questions.map((q) => ({ question: q.question, answer: (answers[q.id] ?? '').trim() })).filter((x) => x.answer) : undefined;
    const r = await run({ mode: 'create', description: description.trim(), answers: a, contractorId: contractorId || null });
    if (r.remaining !== null && r.remaining !== undefined) setRemaining(r.remaining);
    if (r.outcome === 'needs_answers') { setQuestions(r.questions); setAnswers({}); }
    else setQuestions(null);
    if (r.outcome === 'draft_created') router.refresh();
  };

  const startOver = () => { reset(); setQuestions(null); setAnswers({}); requestAnimationFrame(() => textRef.current?.focus()); };

  const discard = async (workflowId: string) => {
    setDiscarding(true);
    const r = await archiveGraphAction(workflowId);
    setDiscarding(false);
    if (r.ok) { toast('Draft discarded.'); startOver(); router.refresh(); }
    else toast(r.message ?? 'Could not discard the draft.', 'error');
  };

  const showForm = !result || (result.outcome !== 'draft_created');

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.04] via-card to-card" data-testid="ai-describe-panel">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-5" aria-hidden /></span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Describe a workflow</h2>
              <p className="text-sm text-muted-foreground">Say what should happen in plain English. You get an <strong>unpublished draft</strong> to review, test and publish yourself — nothing runs, sends or calls until you do.</p>
            </div>
          </div>
          <RemainingBadge remaining={remaining} total={AI_BUILDS_PER_DAY} />
        </div>

        {showForm && (
          <form onSubmit={(e) => { e.preventDefault(); void build(!!questions); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={ids.text} className="sr-only">What should the workflow do?</Label>
              <Textarea
                id={ids.text}
                ref={textRef}
                value={description}
                maxLength={AI_MAX_DESCRIPTION_CHARS}
                disabled={running}
                onChange={(e) => { setDescription(e.target.value); if (questions) setQuestions(null); }}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void build(!!questions); } }}
                placeholder="e.g. When a new lead comes in, alert the admins, wait 15 minutes, then create a task to call them. If they book within a day, add a note; otherwise mark them contact attempted."
                className="min-h-36 resize-y bg-background text-base lg:min-h-32"
                aria-describedby={ids.hint}
              />
              <div id={ids.hint} className="flex justify-between gap-2 text-xs text-muted-foreground">
                <span>Tip: say what starts it, what happens, how long to wait and who to alert. <kbd className="hidden rounded border px-1 sm:inline">Ctrl</kbd><span className="hidden sm:inline"> + </span><kbd className="hidden rounded border px-1 sm:inline">Enter</kbd><span className="hidden sm:inline"> builds.</span></span>
                <span aria-live="off">{description.length}/{AI_MAX_DESCRIPTION_CHARS}</span>
              </div>
            </div>

            {!running && !questions && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Examples">
                {AI_BUILD_EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => { setDescription(ex.text); setQuestions(null); reset(); textRef.current?.focus(); }}
                    className="min-h-9 rounded-full border bg-background px-3 py-1.5 text-sm transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            )}

            {questions && !running && (
              <fieldset className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3 sm:p-4" data-testid="ai-questions">
                <legend className="px-1 text-sm font-semibold text-sky-950">A quick question before building</legend>
                {questions.map((q, i) => (
                  <div key={q.id} className="space-y-1.5">
                    <Label htmlFor={`${ids.text}-q-${q.id}`} className="text-sky-950">{q.question}</Label>
                    <Input
                      id={`${ids.text}-q-${q.id}`}
                      value={answers[q.id] ?? ''}
                      maxLength={AI_MAX_ANSWER_CHARS}
                      autoFocus={i === 0}
                      placeholder={q.placeholder ?? 'Your answer'}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      className="bg-background"
                    />
                  </div>
                ))}
              </fieldset>
            )}

            <div className="flex flex-wrap items-end gap-3">
              {contractors.length > 0 && (
                <div className="min-w-48 space-y-1">
                  <Label htmlFor={ids.scope} className="text-xs text-muted-foreground">Account</Label>
                  <Select id={ids.scope} value={contractorId} disabled={running} onChange={(e) => setContractorId(e.target.value)}>
                    <option value="">HomeQuote network</option>
                    {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
              )}
              <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                {running && <Button type="button" variant="ghost" onClick={stop} className="gap-1.5"><Square className="size-3.5" aria-hidden /> Stop</Button>}
                <Button type="submit" size="lg" disabled={!canBuild} className="w-full gap-2 sm:w-auto" data-testid="ai-build-button">
                  <Sparkles aria-hidden /> {running ? 'Building…' : questions ? 'Continue building' : 'Build workflow'}
                </Button>
              </div>
            </div>
            {outOfBuilds && <p role="status" className="text-sm text-rose-800">You have used today’s {AI_BUILDS_PER_DAY} AI builds. They free up as earlier builds pass 24 hours. You can still build by hand.</p>}
          </form>
        )}

        {running && (
          <div className="rounded-xl border bg-background p-4 motion-safe:animate-in motion-safe:fade-in" data-testid="ai-progress">
            <BuildProgress progress={progress} withSave />
          </div>
        )}

        {!running && result && result.outcome === 'draft_created' && (
          <div className="space-y-4 rounded-xl border bg-background p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 sm:p-5" data-testid="ai-result" role="region" aria-label="Draft created">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Draft created · not published</p>
                <h3 className="text-lg font-semibold">{result.name}</h3>
              </div>
            </div>
            {result.summary && <p className="text-sm">{result.summary}</p>}
            <div className="rounded-lg border bg-muted/30 p-3">
              <h4 className="mb-2 text-sm font-semibold">The steps</h4>
              <ExplainList lines={result.steps} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <NoteList title="Assumptions" items={result.assumptions} tone="info" />
              <NoteList title="Couldn’t do" items={result.unsupported.map(unsupportedText)} tone="warn" />
            </div>
            <NoteList title="To review in the builder" items={result.warnings} tone="muted" />
            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <Button variant="destructive-outline" onClick={() => void discard(result.workflowId)} disabled={discarding} className="gap-1.5"><Trash2 aria-hidden /> Discard</Button>
                <Button variant="ghost" onClick={() => { setDescription(''); startOver(); }} className="gap-1.5"><RotateCcw aria-hidden /> Build another</Button>
              </div>
              <Button asChild size="lg" className="gap-2" data-testid="ai-open-builder"><Link href={`/app/workflows/${result.workflowId}`}>Open in builder <ArrowRight aria-hidden /></Link></Button>
            </div>
          </div>
        )}

        {!running && result && result.outcome === 'invalid' && (
          <div role="alert" className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950" data-testid="ai-invalid">
            <p className="flex items-center gap-2 font-semibold"><XCircle className="size-4" aria-hidden /> The AI couldn’t produce a valid workflow. Nothing was saved.</p>
            <p className="text-sm">These problems were still there after two fixes. Try rewording, or build it by hand:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">{result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}</ul>
            {result.unsupported.length > 0 && <NoteList title="Couldn’t do" items={result.unsupported.map(unsupportedText)} tone="warn" />}
          </div>
        )}

        {!running && result && (result.outcome === 'error' || result.outcome === 'limit' || result.outcome === 'forbidden' || result.outcome === 'not_configured') && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900" data-testid="ai-error">{result.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
