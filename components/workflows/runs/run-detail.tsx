'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useSyncExternalStore, useTransition } from 'react';
import { AlertTriangle, Ban, Info, Loader2, RotateCcw } from 'lucide-react';
import type { RunDetail } from '@/lib/data/workflow-graph';
import { cancelGraphRunAction, retryGraphRunAction } from '@/lib/actions/workflow-graph';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { buildRunOverlay, nodeById, nodeDisplayName, type GraphNode } from '@/lib/workflows/graph';
import { GraphCanvas } from '@/components/workflows/builder/graph-canvas';
import { MobileSteps } from '@/components/workflows/builder/mobile-steps';
import { NodeIcon } from '@/components/workflows/builder/node-icons';
import { branchLabel, callOutcomeLabel, describeSkip, describeWait } from './run-explain';
import { RunStatusBadge, SourceBadge, STEP_STATUS_LABEL, STEP_STATUS_STYLE, When, humanize, triggerLabel } from './run-format';

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia('(min-width: 1024px)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
/** null on the server / first paint, so the canvas is never mounted on a phone. */
function useIsDesktop(): boolean | null {
  return useSyncExternalStore(subscribe, () => window.matchMedia('(min-width: 1024px)').matches, () => null as unknown as boolean);
}

const LOG_LEVEL_STYLE: Record<string, string> = {
  error: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  warn: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

const stepId = (nodeId: string) => `run-step-${nodeId}`;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

function Banner({ tone, icon: Icon, title, children }: { tone: 'info' | 'error'; icon: typeof Info; title: string; children?: React.ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'note'} className={cn('flex gap-3 rounded-xl border p-4 text-sm', tone === 'error' ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200' : 'bg-muted/40')}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-0.5 break-words">{children}</div>}
      </div>
    </div>
  );
}

export function RunDetailView({ detail, canManage, isAdmin }: { detail: RunDetail; canManage: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const desktop = useIsDesktop();
  const { run, graph, steps } = detail;
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'cancel' | 'retry' | null>(null);
  const [pending, startTransition] = useTransition();

  const overlay = useMemo(
    () => buildRunOverlay(graph, steps.map((s) => ({ nodeId: s.nodeId, status: s.status, handle: s.handle, skipReason: s.skipReason })), run.status, run.currentStepKey),
    [graph, steps, run.status, run.currentStepKey]
  );

  const select = useCallback((id: string | null) => {
    setSelected(id);
    if (!id || typeof document === 'undefined') return;
    const el = document.getElementById(stepId(id));
    if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }, []);

  const activeNode = run.currentStepKey ? nodeById(graph, run.currentStepKey) : undefined;
  const activeName = activeNode ? nodeDisplayName(activeNode) : run.currentStepKey ? humanize(run.currentStepKey) : null;
  const showActive = !!activeName && ['pending', 'running', 'waiting', 'failed'].includes(run.status);
  const waitText = describeWait(detail);
  const isOpen = ['pending', 'running', 'waiting'].includes(run.status);
  const canCancel = canManage && isOpen;
  const canRetry = canManage && run.status === 'failed';

  const perform = (kind: 'cancel' | 'retry') => {
    startTransition(async () => {
      try {
        const res = kind === 'cancel' ? await cancelGraphRunAction(run.id) : await retryGraphRunAction(run.id);
        toast(res.message ?? (res.ok ? 'Done.' : 'That did not work.'), res.ok ? 'success' : 'error');
      } catch {
        toast('Something went wrong. Please try again.', 'error');
      }
      setDialog(null);
      router.refresh();
    });
  };

  const nameOf = (node: GraphNode | undefined, nodeId: string) => (node ? nodeDisplayName(node) : humanize(nodeId));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${run.workflowName} · v${run.workflowVersion}`}
        description={run.leadName ? `Run for ${run.leadName}` : 'Workflow run'}
        backHref={`/app/workflows/${run.workflowId}/runs`}
        backLabel="Runs"
      >
        {canCancel && <Button variant="outline" onClick={() => setDialog('cancel')}><Ban aria-hidden /> Cancel run</Button>}
        {canRetry && <Button onClick={() => setDialog('retry')}><RotateCcw aria-hidden /> Retry failed step</Button>}
      </PageHeader>

      {run.contactSuppressed && <Banner tone="info" icon={Info} title="The homeowner opted out — no further calls or emails are sent" />}
      {run.lastError && (
        <Banner tone="error" icon={AlertTriangle} title="The last error">
          <span className="font-mono text-xs">{run.lastError.code}</span> — {run.lastError.message}
        </Banner>
      )}
      {run.cancelReason && <Banner tone="info" icon={Info} title="This run was cancelled">{humanize(run.cancelReason)}</Banner>}
      {run.endReason && <Banner tone="info" icon={Info} title="Why this run ended">{humanize(run.endReason)}</Banner>}

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <RunStatusBadge status={run.status} mode={run.mode} />
            <SourceBadge source={run.source} mode={run.mode} />
            {waitText && <span className="text-sm text-muted-foreground">{waitText}</span>}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4">
            <Fact label="Lead">{run.leadId ? <Link href={`/app/leads/${run.leadId}`} className="font-medium hover:underline">{run.leadName ?? 'Lead'}</Link> : (run.leadName ?? '—')}</Fact>
            <Fact label="Contractor">{run.contractorName ?? 'HomeQuote'}</Fact>
            <Fact label="Workflow">{run.workflowName} <span className="tabular-nums text-muted-foreground">v{run.workflowVersion}</span></Fact>
            <Fact label="Trigger">{triggerLabel(run.triggerEvent)}</Fact>
            <Fact label="Mode">{run.mode === 'test' ? 'Test run' : 'Live run'}</Fact>
            <Fact label="Enrolled"><When iso={run.enrolledAt} /></Fact>
            <Fact label="Started"><When iso={run.startedAt} /></Fact>
            <Fact label="Completed"><When iso={run.completedAt} /></Fact>
            {showActive && <Fact label="Active step">{activeName}</Fact>}
          </dl>
        </CardContent>
      </Card>

      {desktop === null && <div className="h-[40dvh] animate-pulse rounded-xl border bg-muted/40" aria-hidden />}
      {desktop === true && (
        <div className="overflow-hidden rounded-xl border bg-slate-50" style={{ height: 'min(560px, calc(100dvh - 12rem))', minHeight: 360 }} data-testid="run-canvas">
          <GraphCanvas graph={graph} selectedNodeId={selected} onSelectNode={select} readOnly overlay={overlay} />
        </div>
      )}
      {desktop === false && (
        <div className="rounded-xl border bg-slate-50" data-testid="run-steps-mobile">
          <MobileSteps graph={graph} issues={[]} selectedNodeId={selected} onSelect={select} readOnly overlay={overlay} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">What happened, step by step</CardTitle></CardHeader>
          <CardContent>
            {!steps.length ? (
              <p className="text-sm text-muted-foreground">This run has not started its first step.</p>
            ) : (
              <ol className="space-y-3">
                {steps.map((s, i) => {
                  const node = nodeById(graph, s.nodeId);
                  const branch = node && node.type !== 'ai_call' && node.type !== 'trigger' ? branchLabel(detail, s) : null;
                  const showBranch = !!branch && (node?.type === 'condition' || node?.type === 'wait_event');
                  const isWait = node?.type?.startsWith('wait_') ?? false;
                  const call = s.callJobId ? detail.calls.find((c) => c.id === s.callJobId) : undefined;
                  return (
                    <li
                      key={s.id}
                      id={stepId(s.nodeId)}
                      className={cn('scroll-mt-24 rounded-xl border p-4', selected === s.nodeId && 'border-primary ring-2 ring-primary/30')}
                      aria-current={selected === s.nodeId ? 'step' : undefined}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">{i + 1}</span>
                          {node && <NodeIcon type={node.type} className="size-4 shrink-0 text-muted-foreground" />}
                          <button type="button" onClick={() => setSelected(s.nodeId)} className="min-w-0 truncate text-left text-sm font-medium hover:underline">{nameOf(node, s.nodeId)}</button>
                        </div>
                        <Badge variant="outline" className={STEP_STATUS_STYLE[s.status] ?? STEP_STATUS_STYLE.cancelled}>{STEP_STATUS_LABEL[s.status] ?? humanize(s.status)}</Badge>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        {s.startedAt ? <>Started <When iso={s.startedAt} /></> : 'Not started'}
                        {s.completedAt && <> · Finished <When iso={s.completedAt} /></>}
                        {s.maxAttempts > 1 && <> · Attempt {Math.max(s.attemptCount, 1)} of {s.maxAttempts}</>}
                      </p>

                      <div className="mt-2 space-y-2 text-sm">
                        {s.skipReason && <p>{describeSkip(s.skipReason)}</p>}

                        {node?.type === 'ai_call' && (s.outcome || s.executionStatus) && (
                          <div className="rounded-lg border bg-muted/30 p-3">
                            <p><span className="text-muted-foreground">Call result:</span> <strong>{s.outcome ? callOutcomeLabel(s.outcome) : 'Not decided yet'}</strong></p>
                            <p><span className="text-muted-foreground">Execution status:</span> {s.executionStatus ? humanize(s.executionStatus).toLowerCase() : 'unknown'}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Execution status is whether the call itself finished. The result is what the conversation produced, so a completed call can still need a person to review it.</p>
                          </div>
                        )}
                        {node?.type === 'ai_call' && s.adopted && <p>Reused the call the automatic form-to-call feature already placed.</p>}
                        {node?.type === 'ai_call' && isAdmin && s.callJobId && (
                          <p><Link href={`/app/ai-calls/${s.callJobId}`} className="font-medium text-primary hover:underline">Open the AI call record</Link></p>
                        )}
                        {node?.type === 'ai_call' && call && <p className="text-xs text-muted-foreground">Call attempts: {call.attempts} of {call.maxAttempts}</p>}

                        {showBranch && <p>Took branch: <strong>{branch}</strong></p>}

                        {isWait && s.status === 'succeeded' && (s.resumeAt ? <p>Waited until <When iso={s.resumeAt} /></p> : <p>Wait finished.</p>)}
                        {isWait && s.status === 'waiting' && s.resumeAt && <p>Waiting until <When iso={s.resumeAt} /></p>}
                        {s.status === 'retry_scheduled' && s.nextRetryAt && <p>Will retry at <When iso={s.nextRetryAt} /></p>}

                        {!s.skipReason && s.reason && node?.type !== 'ai_call' && <p className="text-muted-foreground">Note: {humanize(s.reason)}</p>}

                        {s.error && (
                          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                            <span className="font-medium">Error:</span> <span className="font-mono text-xs">{s.error.code}</span> — {s.error.message}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Related</CardTitle></CardHeader>
            <CardContent className="space-y-5 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Lead</p>
                <p className="mt-1">{run.leadId ? <Link href={`/app/leads/${run.leadId}`} className="font-medium hover:underline">{run.leadName ?? 'Open lead'}</Link> : 'No lead on this run'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Appointments</p>
                {detail.appointments.length ? (
                  <ul className="mt-1 space-y-1">
                    {detail.appointments.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-2">
                        <Link href="/app/appointments" className="hover:underline"><When iso={a.scheduledAt} /></Link>
                        <Badge variant="muted">{humanize(a.status)}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-1 text-muted-foreground">None.</p>}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI calls</p>
                {detail.calls.length ? (
                  <ul className="mt-1 space-y-2">
                    {detail.calls.map((c) => (
                      <li key={c.id}>
                        <p className="flex flex-wrap items-center gap-2">
                          <Badge variant="muted">{humanize(c.status)}</Badge>
                          <span className="tabular-nums text-muted-foreground">attempt {c.attempts} of {c.maxAttempts}</span>
                        </p>
                        <p className="text-xs text-muted-foreground"><When iso={c.createdAt} />{isAdmin && <> · <Link href={`/app/ai-calls/${c.id}`} className="text-primary hover:underline">Open call</Link></>}</p>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-1 text-muted-foreground">None.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isAdmin && (
        <Card className="p-0">
          <CardHeader className="border-b"><CardTitle className="text-base">Activity log</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!detail.logs.length ? (
              <p className="p-5 text-sm text-muted-foreground">No activity has been recorded.</p>
            ) : (
              <ul className="divide-y">
                {detail.logs.map((l) => (
                  <li key={l.id} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[9rem_5rem_12rem_1fr] sm:gap-3">
                    <When iso={l.at} className="text-muted-foreground" />
                    <span><Badge variant="outline" className={LOG_LEVEL_STYLE[l.level]}>{humanize(l.level)}</Badge></span>
                    <span className="font-medium">{humanize(l.code)}</span>
                    <span className="min-w-0 break-words text-muted-foreground">{l.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!open && !pending) setDialog(null); }}>
        <DialogContent>
          {dialog === 'cancel' ? (
            <>
              <DialogTitle>Cancel this run?</DialogTitle>
              <DialogDescription className="mt-2">
                The workflow stops here for this lead and queued calls are cancelled. A call that is already in progress cannot be hung up from here; its result will be recorded but the run will not continue.
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>Retry the failed step?</DialogTitle>
              <DialogDescription className="mt-2">
                Finished steps are not repeated and emails/calls that already succeeded are never sent twice. Only the step that failed is tried again.
              </DialogDescription>
            </>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>Keep as is</Button>
            <Button variant={dialog === 'cancel' ? 'destructive' : 'default'} onClick={() => dialog && perform(dialog)} disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {dialog === 'cancel' ? 'Cancel run' : 'Retry failed step'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
