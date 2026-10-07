import { handlesFor, targetOf, triggerOf, type WorkflowGraph } from './model';

/**
 * How a run travelled through the canvas, for highlighting. Pure and derived ONLY from the
 * run's own pinned graph + its recorded step results, so the picture can never disagree
 * with what actually happened (a later edit of the workflow cannot change it).
 */
export type RunNodeState = 'done' | 'current' | 'waiting' | 'failed' | 'skipped' | 'cancelled';

export interface RunStepFact {
  nodeId: string;
  status: string;
  handle: string | null;
  skipReason?: string | null;
}

export interface RunOverlay {
  nodes: Record<string, { state: RunNodeState; handle: string | null }>;
  /** Edge ids the run actually took. */
  edges: Set<string>;
}

export function buildRunOverlay(graph: WorkflowGraph, steps: RunStepFact[], runStatus: string, currentNodeId: string | null): RunOverlay {
  const byNode = new Map(steps.map((s) => [s.nodeId, s]));
  const overlay: RunOverlay = { nodes: {}, edges: new Set() };
  const trigger = triggerOf(graph);
  if (trigger) overlay.nodes[trigger.node.id] = { state: 'done', handle: 'next' };

  // Walk the path the run really took: trigger, then each finished node's recorded handle.
  let node = trigger ? targetOf(graph, trigger.node.id, 'next') : null;
  let from: { id: string; handle: string } | null = trigger ? { id: trigger.node.id, handle: 'next' } : null;
  const seen = new Set<string>();
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    const edge = from ? graph.edges.find((e) => e.source === from!.id && e.sourceHandle === from!.handle && e.target === node!.id) : null;
    if (edge) overlay.edges.add(edge.id);
    const step = byNode.get(node.id);
    if (!step) break;
    const state: RunNodeState =
      step.status === 'failed' ? 'failed'
      : step.status === 'cancelled' ? 'cancelled'
      : step.status === 'waiting' || step.status === 'retry_scheduled' || step.status === 'running' ? (runStatus === 'cancelled' ? 'cancelled' : 'waiting')
      : step.status === 'skipped' ? 'skipped' : 'done';
    overlay.nodes[node.id] = { state, handle: step.handle };
    if (state === 'failed' || state === 'waiting' || state === 'cancelled') break;
    if (node.type === 'end' || step.handle === null) break;
    const known = handlesFor(node.type, node.config).some((h) => h.id === step.handle);
    if (!known) break;
    from = { id: node.id, handle: step.handle };
    node = targetOf(graph, node.id, step.handle);
  }
  if (currentNodeId && !overlay.nodes[currentNodeId] && (runStatus === 'running' || runStatus === 'pending')) {
    overlay.nodes[currentNodeId] = { state: 'current', handle: null };
  }
  return overlay;
}
