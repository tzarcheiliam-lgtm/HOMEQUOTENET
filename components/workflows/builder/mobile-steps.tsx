'use client';

import { Fragment } from 'react';
import { AlertTriangle, ChevronRight, CornerDownRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  NODE_TYPES, describeNode, handlesFor, nodeDisplayName, targetOf,
  type GraphIssue, type GraphNode, type RunOverlay, type WorkflowGraph,
} from '@/lib/workflows/graph';
import { CATEGORY_STYLE, NodeIcon } from './node-icons';

const TONE_BORDER: Record<string, string> = {
  default: 'border-slate-300', good: 'border-emerald-400', warn: 'border-amber-400', bad: 'border-rose-300', muted: 'border-zinc-300',
};
const TONE_TEXT: Record<string, string> = {
  default: 'text-slate-700', good: 'text-emerald-800', warn: 'text-amber-800', bad: 'text-rose-800', muted: 'text-zinc-500',
};
const RUN_TEXT: Record<string, string> = { done: 'Done', current: 'Running', waiting: 'Waiting', failed: 'Failed', skipped: 'Skipped', cancelled: 'Cancelled' };

/**
 * The phone view: the same workflow as a vertical outline. Branches are nested sections
 * ("If: Booked an appointment"), every step is a big tap target that opens a full-screen
 * editor, and "Add step" buttons replace dragging. Nothing here needs precision pointing.
 */
export function MobileSteps({
  graph, issues, selectedNodeId, onSelect, onAdd, readOnly, overlay,
}: {
  graph: WorkflowGraph;
  issues: GraphIssue[];
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
  onAdd?: (nodeId: string, handle: string) => void;
  readOnly?: boolean;
  overlay?: RunOverlay | null;
}) {
  const trigger = graph.nodes.find((n) => n.type === 'trigger');
  const rendered = new Set<string>();

  const card = (node: GraphNode) => {
    const def = NODE_TYPES[node.type];
    const own = issues.filter((i) => i.nodeId === node.id);
    const errors = own.filter((i) => i.severity === 'error').length;
    const run = overlay?.nodes[node.id];
    return (
      <button
        key={node.id}
        type="button"
        id={`step-${node.id}`}
        onClick={() => onSelect(node.id)}
        data-testid={`mobile-step-${node.id}`}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition active:scale-[0.99]',
          node.type.startsWith('wait') && 'border-dashed border-amber-300 bg-amber-50/40',
          node.type === 'condition' && 'border-indigo-200 bg-indigo-50/40',
          node.type === 'end' && 'border-zinc-700 bg-zinc-900 text-zinc-50',
          selectedNodeId === node.id && 'ring-2 ring-primary',
          run?.state === 'done' && 'ring-2 ring-emerald-500/70', run?.state === 'waiting' && 'ring-2 ring-amber-400', run?.state === 'failed' && 'ring-2 ring-rose-500', run?.state === 'current' && 'ring-2 ring-primary',
          def.availability !== 'ready' && 'opacity-80'
        )}
      >
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg', CATEGORY_STYLE[def.category].chip)}><NodeIcon type={node.type} className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold leading-tight">{nodeDisplayName(node)}</span>
          {node.type !== 'end' && <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{describeNode(node)}</span>}
          {(def.availability !== 'ready' || run) && <span className="mt-1 flex gap-1.5 text-xs font-semibold">{def.availability !== 'ready' && <span className="rounded bg-amber-100 px-1.5 text-amber-800">Requires setup</span>}{run && <span className="rounded bg-muted px-1.5 text-foreground">{RUN_TEXT[run.state]}</span>}</span>}
        </span>
        {own.length > 0 && !run && <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold', errors ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800')}><AlertTriangle className="size-3.5" aria-hidden />{own.length}</span>}
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    );
  };

  const AddButton = ({ nodeId, handle, label }: { nodeId: string; handle: string; label: string }) =>
    readOnly || !onAdd ? null : (
      <button type="button" onClick={() => onAdd(nodeId, handle)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-400 text-sm font-medium text-slate-600 active:bg-accent" aria-label={`Add a step ${label}`}>
        <Plus className="size-4" aria-hidden /> Add step
      </button>
    );

  const chainOf = (node: GraphNode): React.ReactElement => {
    if (rendered.has(node.id)) {
      return (
        <a href={`#step-${node.id}`} onClick={(e) => { e.preventDefault(); onSelect(node.id); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed bg-muted/50 px-3 text-sm text-muted-foreground">
          <CornerDownRight className="size-4" aria-hidden /> Continues at “{nodeDisplayName(node)}”
        </a>
      );
    }
    rendered.add(node.id);
    const handles = handlesFor(node.type, node.config);
    const multi = handles.length > 1;
    return (
      <div className="space-y-2">
        {card(node)}
        {handles.length === 1 && (() => {
          const next = targetOf(graph, node.id, handles[0].id);
          return (
            <>
              <div className="ml-5 h-4 border-l-2 border-slate-300" aria-hidden />
              {next ? chainOf(next) : <AddButton nodeId={node.id} handle={handles[0].id} label="here" />}
            </>
          );
        })()}
        {multi && (
          <div className="ml-3 space-y-3 border-l-2 border-slate-200 pl-3">
            {handles.map((h) => {
              const next = targetOf(graph, node.id, h.id);
              const taken = overlay && overlay.nodes[node.id]?.handle === h.id;
              return (
                <section key={h.id} aria-label={h.label} className="space-y-2">
                  <h4 className={cn('inline-flex items-center rounded-full border bg-white px-2.5 py-0.5 text-xs font-semibold', TONE_BORDER[h.tone], TONE_TEXT[h.tone], taken && 'bg-primary text-primary-foreground')}>
                    {node.type === 'condition' && h.id !== 'else' ? 'If: ' : node.type === 'condition' ? '' : node.type === 'ai_call' ? 'Result: ' : ''}{h.label}
                  </h4>
                  {next ? chainOf(next) : <><AddButton nodeId={node.id} handle={h.id} label={`after ${h.label}`} /><p className="px-1 text-xs text-muted-foreground">If this happens, the workflow ends.</p></>}
                </section>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!trigger) return null;
  // Steps that are not connected to the trigger are listed separately so nothing is hidden.
  const chain = chainOf(trigger);
  const orphans = graph.nodes.filter((n) => !rendered.has(n.id));
  return (
    <div className="space-y-2 p-4" data-testid="mobile-steps">
      {chain}
      {orphans.length > 0 && (
        <Fragment>
          <h3 className="pt-4 text-xs font-semibold uppercase tracking-wider text-amber-700">Not connected (these will not run)</h3>
          {orphans.map((n) => <Fragment key={n.id}>{card(n)}</Fragment>)}
        </Fragment>
      )}
    </div>
  );
}
