'use client';

import { memo } from 'react';
import {
  BaseEdge, EdgeLabelRenderer, Handle, Position, getSmoothStepPath,
  type EdgeProps, type NodeProps,
} from '@xyflow/react';
import { AlertTriangle, Check, Clock, Loader2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NODE_TYPES, describeNode, handlesFor, nodeDisplayName, type RunNodeState } from '@/lib/workflows/graph';
import { CATEGORY_STYLE, NodeIcon } from './node-icons';
import { NODE_WIDTH, type StepEdge, type StepNode } from './flow-model';

const KIND_LABEL: Record<string, string> = { trigger: 'When', action: 'Then', wait: 'Wait', condition: 'If', end: 'End' };

const TONE_DOT: Record<string, string> = {
  default: 'border-slate-400 bg-white text-slate-600',
  good: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  warn: 'border-amber-500 bg-amber-50 text-amber-700',
  bad: 'border-rose-400 bg-rose-50 text-rose-700',
  muted: 'border-zinc-300 bg-zinc-50 text-zinc-500',
};
const TONE_EDGE: Record<string, string> = {
  default: '#94a3b8', good: '#10b981', warn: '#f59e0b', bad: '#fb7185', muted: '#cbd5e1',
};

const RUN_RING: Record<RunNodeState, string> = {
  done: 'ring-2 ring-emerald-500/70',
  current: 'ring-2 ring-primary animate-pulse',
  waiting: 'ring-2 ring-amber-400',
  failed: 'ring-2 ring-rose-500',
  skipped: 'ring-2 ring-zinc-300',
  cancelled: 'ring-2 ring-zinc-400',
};
const RUN_LABEL: Record<RunNodeState, string> = { done: 'Done', current: 'Running', waiting: 'Waiting', failed: 'Failed', skipped: 'Skipped', cancelled: 'Cancelled' };

function RunBadge({ state }: { state: RunNodeState }) {
  const Icon = state === 'done' ? Check : state === 'failed' || state === 'cancelled' ? X : state === 'waiting' ? Clock : state === 'current' ? Loader2 : Check;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
      state === 'done' && 'bg-emerald-100 text-emerald-800', state === 'current' && 'bg-primary/10 text-primary', state === 'waiting' && 'bg-amber-100 text-amber-800',
      state === 'failed' && 'bg-rose-100 text-rose-800', (state === 'skipped' || state === 'cancelled') && 'bg-zinc-100 text-zinc-600')}>
      <Icon className={cn('size-3', state === 'current' && 'animate-spin')} aria-hidden />{RUN_LABEL[state]}
    </span>
  );
}

/** One canvas card. Distinct shapes: trigger (navy cap), action (card + coloured bar), wait (dashed), if/else (tinted), end (dark pill). */
function StepNodeView({ data, selected }: NodeProps<StepNode>) {
  const { node, issues, readOnly, run, connected, onAdd } = data;
  const def = NODE_TYPES[node.type];
  const style = CATEGORY_STYLE[def.category];
  const handles = handlesFor(node.type, node.config);
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.length - errors;
  const multi = handles.length > 1;
  const isEnd = node.type === 'end';

  return (
    <div
      style={{ width: NODE_WIDTH }}
      data-testid={`node-${node.id}`}
      className={cn(
        'group relative rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow',
        node.type === 'wait_duration' || node.type === 'wait_business_hours' || node.type === 'wait_event' ? 'border-dashed border-amber-300 bg-amber-50/40' : '',
        node.type === 'condition' && 'border-indigo-200 bg-indigo-50/40',
        node.type === 'trigger' && 'border-primary/40 bg-primary/[0.03]',
        isEnd && 'rounded-full border-zinc-700 bg-zinc-900 text-zinc-50',
        selected && !run && 'ring-2 ring-primary shadow-md',
        run && RUN_RING[run.state],
        def.availability !== 'ready' && 'opacity-80'
      )}
    >
      {node.type !== 'trigger' && <Handle type="target" position={Position.Top} id="in" className="!size-2.5 !border-2 !border-slate-400 !bg-white" isConnectable={!readOnly} />}

      <div className={cn('flex items-start gap-3 p-3', isEnd && 'items-center px-4 py-2')}>
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', style.chip, isEnd && 'size-7 bg-zinc-700 text-zinc-50')}>
          <NodeIcon type={node.type} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-[10px] font-bold uppercase tracking-wider', isEnd ? 'text-zinc-400' : 'text-muted-foreground')}>{KIND_LABEL[def.kind]}</span>
            {def.availability !== 'ready' && <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">Requires setup</span>}
            {run && <RunBadge state={run.state} />}
          </div>
          <p className="truncate text-sm font-semibold leading-tight">{nodeDisplayName(node)}</p>
          {!isEnd && <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">{describeNode(node)}</p>}
        </div>
        {(errors > 0 || warnings > 0) && !run && (
          <span
            title={issues.map((i) => i.message).join('\n')}
            className={cn('flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold', errors ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800')}
          >
            <AlertTriangle className="size-3" aria-hidden />{errors || warnings}
          </span>
        )}
      </div>

      {/* Outputs. A single output sits at the bottom centre; several are laid out as a labelled row. */}
      {handles.length > 0 && (
        <div className={cn('flex items-end justify-around px-2 pb-1', multi ? 'gap-1 pt-1' : 'pt-0')}>
          {handles.map((h) => {
            const isConnected = connected.includes(h.id);
            const taken = run?.handle === h.id;
            return (
              <div key={h.id} className="relative flex min-w-0 flex-1 flex-col items-center" title={h.label}>
                {multi && (
                  <span className={cn('mb-1 max-w-full truncate rounded px-1 text-[9px] font-semibold leading-tight', taken ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                    {node.type === 'ai_call' ? shortOutcome(h.id) : h.label}
                  </span>
                )}
                <div className="relative h-4 w-full">
                  <Handle
                    type="source"
                    position={Position.Bottom}
                    id={h.id}
                    isConnectable={!readOnly}
                    className={cn('!size-3.5 !border-2', TONE_DOT[h.tone], isConnected && '!bg-slate-700 !border-slate-700', taken && '!bg-primary !border-primary')}
                    style={{ left: '50%', bottom: -8 }}
                  />
                </div>
                {!isConnected && !readOnly && onAdd && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAdd(node.id, h.id); }}
                    aria-label={`Add a step after ${h.label}`}
                    className="nodrag nopan absolute -bottom-9 z-10 flex size-6 items-center justify-center rounded-full border border-dashed border-slate-400 bg-white text-slate-500 shadow-sm transition hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {handles.length > 0 && <div className="h-2" />}
    </div>
  );
}

const SHORT: Record<string, string> = {
  booked: 'Booked', qualified_awaiting_scheduling: 'Qualified', callback_requested: 'Callback', needs_human_review: 'Review',
  no_answer: 'No ans.', wrong_number: 'Wrong #', opted_out: 'Opt-out', failed: 'Failed', timed_out: 'Timeout',
};
const shortOutcome = (id: string) => SHORT[id] ?? id;

export const StepNodeMemo = memo(StepNodeView);

/** Connection with a label chip (for named outputs) and an "insert a step here" button. */
function StepEdgeView({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<StepEdge>) {
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 14 });
  const taken = data?.taken;
  const stroke = data?.dimmed ? '#e2e8f0' : taken ? '#0f172a' : (selected ? '#0f172a' : TONE_EDGE[data?.tone ?? 'default']);
  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke, strokeWidth: taken ? 3 : selected ? 2.5 : 1.75, strokeDasharray: data?.tone === 'muted' && !taken ? '4 4' : undefined }} />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
          className="nodrag nopan absolute flex items-center gap-1"
        >
          {data?.label && (
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm', data.dimmed ? 'border-zinc-200 bg-white text-zinc-300' : TONE_DOT[data.tone])}>{data.label}</span>
          )}
          {!data?.readOnly && data?.onInsert && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); data.onInsert!(id); }}
              aria-label="Insert a step here"
              className="flex size-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 opacity-60 shadow-sm transition hover:border-primary hover:bg-primary hover:text-primary-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary group-hover:opacity-100"
            >
              <Plus className="size-3" aria-hidden />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
export const StepEdgeMemo = memo(StepEdgeView);
