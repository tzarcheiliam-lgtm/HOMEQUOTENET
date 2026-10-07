'use client';

import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GraphIssue, WorkflowGraph } from '@/lib/workflows/graph';
import { nodeDisplayName } from '@/lib/workflows/graph';

/** Everything that would stop publishing (errors) or deserves a second look (warnings), with a jump-to-step link. */
export function IssuesPanel({ issues, graph, onSelectNode, serverIssues }: { issues: GraphIssue[]; graph: WorkflowGraph; onSelectNode: (id: string) => void; serverIssues?: GraphIssue[] | null }) {
  const all = [...issues, ...(serverIssues ?? []).filter((s) => !issues.some((i) => i.code === s.code && i.nodeId === s.nodeId && i.message === s.message))];
  const errors = all.filter((i) => i.severity === 'error');
  const warnings = all.filter((i) => i.severity === 'warning');
  if (!all.length) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-emerald-800"><CheckCircle2 className="size-4" aria-hidden /> No problems found. Use Publish to run the full readiness check.</div>
    );
  }
  const Row = ({ i }: { i: GraphIssue }) => {
    const node = i.nodeId ? graph.nodes.find((n) => n.id === i.nodeId) : null;
    return (
      <li>
        <button type="button" disabled={!node} onClick={() => node && onSelectNode(node.id)} className={cn('flex w-full items-start gap-2 rounded-lg border p-2.5 text-left text-sm transition', node ? 'hover:bg-accent' : 'cursor-default', i.severity === 'error' ? 'border-rose-200 bg-rose-50/60' : 'border-amber-200 bg-amber-50/60')}>
          {i.severity === 'error' ? <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />}
          <span className="min-w-0"><span className="block">{i.message}</span>{node && <span className="block text-xs text-muted-foreground">Step: {nodeDisplayName(node)} — tap to open</span>}</span>
        </button>
      </li>
    );
  };
  return (
    <div className="space-y-3 p-4">
      {errors.length > 0 && <div><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-rose-700">Must fix before publishing ({errors.length})</h3><ul className="space-y-1.5">{errors.map((i, n) => <Row key={`e${n}`} i={i} />)}</ul></div>}
      {warnings.length > 0 && <div><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700">Worth a look ({warnings.length})</h3><ul className="space-y-1.5">{warnings.map((i, n) => <Row key={`w${n}`} i={i} />)}</ul></div>}
    </div>
  );
}
