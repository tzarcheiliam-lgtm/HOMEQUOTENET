import type { Edge, Node } from '@xyflow/react';
import { handlesFor, type GraphIssue, type GraphNode, type RunNodeState, type RunOverlay, type WorkflowGraph } from '@/lib/workflows/graph';

export const NODE_WIDTH = 288;

export interface StepNodeData extends Record<string, unknown> {
  node: GraphNode;
  issues: GraphIssue[];
  readOnly: boolean;
  run?: { state: RunNodeState; handle: string | null };
  /** Output handle ids that already lead somewhere. */
  connected: string[];
  onAdd?: (nodeId: string, handle: string) => void;
}
export interface StepEdgeData extends Record<string, unknown> {
  label: string | null;
  tone: 'default' | 'good' | 'warn' | 'bad' | 'muted';
  readOnly: boolean;
  /** run overlay: `taken` = the run went this way; `dimmed` = the run did not. */
  taken?: boolean;
  dimmed?: boolean;
  onInsert?: (edgeId: string) => void;
}
export type StepNode = Node<StepNodeData, 'step'>;
export type StepEdge = Edge<StepEdgeData, 'step'>;

export function toFlow(
  graph: WorkflowGraph,
  opts: {
    issues: GraphIssue[];
    readOnly: boolean;
    selectedNodeId: string | null;
    overlay?: RunOverlay | null;
    onAdd?: (nodeId: string, handle: string) => void;
    onInsert?: (edgeId: string) => void;
  }
): { nodes: StepNode[]; edges: StepEdge[] } {
  const nodes: StepNode[] = graph.nodes.map((node) => ({
    id: node.id,
    type: 'step',
    position: node.position,
    selected: node.id === opts.selectedNodeId,
    draggable: !opts.readOnly,
    deletable: node.type !== 'trigger' && !opts.readOnly,
    data: {
      node,
      issues: opts.issues.filter((i) => i.nodeId === node.id),
      readOnly: opts.readOnly,
      run: opts.overlay?.nodes[node.id],
      connected: graph.edges.filter((e) => e.source === node.id).map((e) => e.sourceHandle),
      onAdd: opts.onAdd,
    },
  }));
  const edges: StepEdge[] = graph.edges.map((e) => {
    const source = graph.nodes.find((n) => n.id === e.source);
    const handle = source ? handlesFor(source.type, source.config).find((h) => h.id === e.sourceHandle) : undefined;
    const taken = opts.overlay ? opts.overlay.edges.has(e.id) : undefined;
    return {
      id: e.id,
      type: 'step',
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: e.target,
      deletable: !opts.readOnly,
      data: {
        label: handle && handle.id !== 'next' ? handle.label : null,
        tone: handle?.tone ?? 'default',
        readOnly: opts.readOnly,
        taken,
        dimmed: opts.overlay ? !taken : false,
        onInsert: opts.onInsert,
      },
    };
  });
  return { nodes, edges };
}
