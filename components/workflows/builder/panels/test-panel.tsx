'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { AlertTriangle, Clock, FlaskConical, Play, Search, ShieldCheck } from 'lucide-react';
import { dryRunGraphAction, searchLeadsForWorkflowAction, startLiveTestAction } from '@/lib/actions/workflow-graph';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toaster';
import { CALL_OUTCOMES, CALL_OUTCOME_LABELS, type CallOutcome, type DryRunResult, type WorkflowGraph } from '@/lib/workflows/graph';
import { nodeDisplayName } from '@/lib/workflows/graph';

interface LeadChoice { id: string; name: string; city: string | null }

/**
 * Dry run: decisions and rendered content, nothing sent/called/changed (real leads are only READ).
 * Live test: separate and explicit. It runs the saved draft against a chosen lead; email goes ONLY to
 * the recipients ticked here; no call is ever placed (you pick the call result).
 */
export function TestPanel({
  workflowId, graph, isAdmin, recipients, beforeRun, onSelectNode,
}: {
  workflowId: string;
  graph: WorkflowGraph;
  isAdmin: boolean;
  recipients: { id: string; name: string; email: string }[];
  /** Saves the draft first so the test runs what is on screen. */
  beforeRun: () => Promise<boolean>;
  onSelectNode: (id: string) => void;
}) {
  const [lead, setLead] = useState<LeadChoice | null>(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<LeadChoice[]>([]);
  const [callOutcome, setCallOutcome] = useState<CallOutcome>('booked');
  const [optedOut, setOptedOut] = useState(false);
  const [eventWaits, setEventWaits] = useState<Record<string, 'received' | 'timeout'>>({});
  const [result, setResult] = useState<(DryRunResult & { usedSample: boolean }) | null>(null);
  const [issuesText, setIssuesText] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [liveBusy, setLiveBusy] = useState(false);
  const [includeMe, setIncludeMe] = useState(true);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [liveRun, setLiveRun] = useState<string | null>(null);

  const waitNodes = useMemo(() => graph.nodes.filter((n) => n.type === 'wait_event'), [graph.nodes]);
  const hasEmail = graph.nodes.some((n) => n.type === 'send_email');
  const hasCall = graph.nodes.some((n) => n.type === 'ai_call');

  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(async () => {
      const r = await searchLeadsForWorkflowAction(workflowId, q);
      if (r.ok && r.data) setFound(r.data);
    }, 300);
    return () => clearTimeout(t);
  }, [q, workflowId]);

  const runDry = () => start(async () => {
    setIssuesText(null);
    await beforeRun();
    const r = await dryRunGraphAction({ workflowId, leadId: lead?.id ?? null, callOutcome, optedOut, eventWaits });
    if (r.ok && r.data) setResult(r.data);
    else { setResult(null); setIssuesText(r.message ?? 'The dry run could not run.'); }
  });

  const runLive = async () => {
    if (!lead) { toast('Choose a lead to test with.', 'error'); return; }
    if (hasEmail && !includeMe && recipientIds.length === 0) { toast('Choose at least one test recipient.', 'error'); return; }
    if (!window.confirm(`Start a LIVE test with ${lead.name}?\n\n• Emails go only to the test recipients you ticked.\n• No real call is placed.\n• Tasks and notes are labelled [Test].\n• Status changes, assignments and team notifications are skipped.`)) return;
    setLiveBusy(true);
    try {
      await beforeRun();
      const r = await startLiveTestAction({ workflowId, leadId: lead.id, includeMyEmail: includeMe, recipientIds, callOutcome });
      if (r.ok && r.data?.runId) { setLiveRun(r.data.runId); toast('Live test started.'); } else toast(r.message ?? 'Could not start the test.', 'error');
    } finally { setLiveBusy(false); }
  };

  return (
    <div className="space-y-5 p-4">
      <section className="space-y-3">
        <div className="flex items-center gap-2"><FlaskConical className="size-4 text-primary" aria-hidden /><h3 className="text-sm font-semibold">Dry run</h3></div>
        <p className="text-xs text-muted-foreground">See every decision and the exact wording this workflow would use. <strong>Nothing is sent, no one is called, and no record changes.</strong> Waits are fast-forwarded.</p>

        <div className="space-y-1.5">
          <Label htmlFor="test-lead">Test with</Label>
          {lead ? (
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>{lead.name}{lead.city ? ` · ${lead.city}` : ''}</span><button type="button" className="text-xs text-primary underline" onClick={() => { setLead(null); setResult(null); }}>Change</button></div>
          ) : (
            <>
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden /><Input id="test-lead" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a lead by name — or leave blank for sample data" /></div>
              {found.length > 0 && <ul className="max-h-40 overflow-y-auto rounded-md border">{found.map((l) => <li key={l.id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => { setLead(l); setFound([]); setQ(''); }}>{l.name}{l.city ? ` · ${l.city}` : ''}</button></li>)}</ul>}
              <p className="text-xs text-muted-foreground">Using sample data (Sarah Nguyen, Austin).</p>
            </>
          )}
        </div>

        {hasCall && (
          <div className="space-y-1.5">
            <Label htmlFor="test-call">If the AI call happens, the homeowner…</Label>
            <Select id="test-call" value={callOutcome} onChange={(e) => setCallOutcome(e.target.value as CallOutcome)}>
              {CALL_OUTCOMES.map((o) => <option key={o} value={o}>{CALL_OUTCOME_LABELS[o]}</option>)}
            </Select>
          </div>
        )}
        {waitNodes.map((n) => (
          <div key={n.id} className="space-y-1.5">
            <Label htmlFor={`wait-${n.id}`}>{nodeDisplayName(n)}</Label>
            <Select id={`wait-${n.id}`} value={eventWaits[n.id] ?? 'received'} onChange={(e) => setEventWaits({ ...eventWaits, [n.id]: e.target.value as 'received' | 'timeout' })}>
              <option value="received">It happens in time</option>
              <option value="timeout">Nothing happens (timeout)</option>
            </Select>
          </div>
        ))}
        {(hasCall || hasEmail) && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={optedOut} onChange={(e) => setOptedOut(e.target.checked)} />Pretend the homeowner has opted out</label>}

        <Button onClick={runDry} disabled={pending} className="w-full"><Play /> {pending ? 'Running…' : 'Run dry run'}</Button>
        {issuesText && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-800">{issuesText}</p>}
      </section>

      {result && (
        <section aria-label="Dry run result" className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">What would happen</h3><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{result.usedSample ? 'Sample data' : lead?.name}</span></div>
          <ol className="space-y-2">
            {result.steps.map((s, i) => (
              <li key={`${s.nodeId}-${i}`} className="rounded-lg border p-3 text-sm">
                <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => onSelectNode(s.nodeId)}>
                  <span className="font-medium">{i + 1}. {s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.status === 'skipped' ? `Skipped${s.skipReason ? ` (${s.skipReason.replaceAll('_', ' ')})` : ''}` : s.handle && s.handle !== 'next' ? `→ ${s.handle.replaceAll('_', ' ')}` : s.status === 'waiting' ? 'Waits' : 'OK'}</span>
                </button>
                {s.waitUntil && <p className="mt-1 flex items-center gap-1 text-xs text-amber-800"><Clock className="size-3" aria-hidden /> Would wait until {new Date(s.waitUntil).toLocaleString()}</p>}
                {s.preview && <Preview data={s.preview} />}
                {s.warnings.map((w, k) => <p key={k} className="mt-1 flex items-start gap-1 text-xs text-amber-800"><AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />{w}</p>)}
              </li>
            ))}
          </ol>
          <p className="rounded-md bg-muted p-2 text-xs">{result.disposition === 'completed' ? 'The workflow would finish here.' : result.disposition === 'failed' ? `The run would fail: ${result.failure}` : `Ended: ${result.disposition}`}</p>
        </section>
      )}

      <section className="space-y-3 border-t pt-4">
        <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" aria-hidden /><h3 className="text-sm font-semibold">Live test</h3></div>
        <p className="text-xs text-muted-foreground">Runs the saved draft for real, but safely: email goes <strong>only</strong> to the recipients you tick, calls are never placed (you choose the result above), tasks and notes are labelled [Test], and status changes, assignments and team notifications are skipped.</p>
        {hasEmail && (
          <fieldset className="space-y-1.5"><legend className="text-xs font-semibold">Send test emails to</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={includeMe} onChange={(e) => setIncludeMe(e.target.checked)} />My own email address</label>
            {isAdmin && recipients.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={recipientIds.includes(r.id)} onChange={(e) => setRecipientIds(e.target.checked ? [...recipientIds, r.id] : recipientIds.filter((x) => x !== r.id))} />{r.name} <span className="text-xs text-muted-foreground">{r.email}</span></label>
            ))}
          </fieldset>
        )}
        <Button variant="outline" className="w-full" onClick={runLive} disabled={liveBusy || !lead}>{liveBusy ? 'Starting…' : lead ? `Start live test with ${lead.name}` : 'Choose a lead above to enable'}</Button>
        {liveRun && <p className="text-sm"><Link className="font-medium text-primary underline" href={`/app/workflows/runs/${liveRun}`}>Open the test run</Link> to watch it step by step.</p>}
      </section>
    </div>
  );
}

function Preview({ data }: { data: Record<string, unknown> }) {
  const rows = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!rows.length) return null;
  return (
    <dl className="mt-2 space-y-1 rounded-md bg-muted/60 p-2 text-xs">
      {rows.map(([k, v]) => (
        <div key={k}><dt className="font-semibold capitalize text-muted-foreground">{k.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ')}</dt><dd className="whitespace-pre-wrap break-words">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></div>
      ))}
    </dl>
  );
}
