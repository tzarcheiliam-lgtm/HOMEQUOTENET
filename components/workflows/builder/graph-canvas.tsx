'use client';

import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, applyNodeChanges,
  type Connection, type NodeChange, type OnConnectEnd,
} from '@xyflow/react';
import { checkConnection, NODE_TYPES, type GraphIssue, type RunOverlay, type WorkflowGraph } from '@/lib/workflows/graph';
import { StepEdgeMemo, StepNodeMemo } from './flow-nodes';
import { toFlow, type StepEdge, type StepNode } from './flow-model';

const nodeTypes = { step: StepNodeMemo };
const edgeTypes = { step: StepEdgeMemo };

export interface GraphCanvasProps {
  graph: WorkflowGraph;
  issues?: GraphIssue[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  readOnly?: boolean;
  /** Highlights the path a run took (run history). */
  overlay?: RunOverlay | null;
  onMove?: (positions: Record<string, { x: number; y: number }>) => void;
  /** Returns an error message when the connection is refused. */
  onConnect?: (c: { source: string; sourceHandle: string; target: string }) => string | null;
  onRequestAddAfter?: (nodeId: string, handle: string) => void;
  onRequestInsertOnEdge?: (edgeId: string) => void;
  onDeleteNodes?: (ids: string[]) => void;
  onDeleteEdges?: (ids: string[]) => void;
  onNotice?: (message: string) => void;
  className?: string;
}

/** Keeps the previous reference while the value is structurally unchanged, so callers can pass fresh-but-equal objects without causing re-renders. */
function useStable<T>(value: T, serialize: (v: T) => string): T {
  const ref = useRef({ key: serialize(value), value });
  const key = serialize(value);
  if (key !== ref.current.key) ref.current = { key, value };
  return ref.current.value;
}
const EMPTY_ISSUES: GraphIssue[] = [];

function Canvas(props: GraphCanvasProps) {
  const { graph, selectedNodeId, onSelectNode, readOnly = false } = props;
  const issues = useStable(props.issues ?? EMPTY_ISSUES, (v) => JSON.stringify(v));
  const overlay = useStable(props.overlay ?? null, (v) => (v ? JSON.stringify([v.nodes, [...v.edges]]) : ''));
  const flow = useMemo(
    () => toFlow(graph, { issues, readOnly, selectedNodeId, overlay, onAdd: props.onRequestAddAfter, onInsert: props.onRequestInsertOnEdge }),
    [graph, issues, readOnly, selectedNodeId, overlay, props.onRequestAddAfter, props.onRequestInsertOnEdge]
  );
  // React Flow owns transient state (positions while dragging); the graph stays the source of truth.
  const [nodes, setNodes] = useState<StepNode[]>(flow.nodes);
  useEffect(() => setNodes(flow.nodes), [flow.nodes]);

  const onNodesChange = useCallback((changes: NodeChange<StepNode>[]) => {
    // Deletions are routed through the editor (so they land in undo history and bridge neighbours).
    setNodes((current) => applyNodeChanges(changes.filter((c) => c.type !== 'remove'), current));
  }, []);

  const isValidConnection = useCallback(
    (c: { source: string; target: string; sourceHandle?: string | null }) =>
      !!c.sourceHandle && checkConnection(graph, { source: c.source, sourceHandle: c.sourceHandle, target: c.target }).ok,
    [graph]
  );
  const onConnect = useCallback((c: Connection) => {
    if (!c.sourceHandle || !props.onConnect) return;
    const err = props.onConnect({ source: c.source, sourceHandle: c.sourceHandle, target: c.target });
    if (err) props.onNotice?.(err);
  }, [props]);
  const onConnectEnd: OnConnectEnd = useCallback((_e, state) => {
    // Dropped on a step but refused: say why instead of silently doing nothing.
    if (state.toNode && state.isValid === false && state.fromHandle?.id) {
      const check = checkConnection(graph, { source: state.fromNode.id, sourceHandle: state.fromHandle.id, target: state.toNode.id });
      if (!check.ok && check.reason) props.onNotice?.(check.reason);
    }
  }, [graph, props]);

  return (
    <div className={props.className ?? 'h-full w-full'} data-testid="workflow-canvas">
      <ReactFlow<StepNode, StepEdge>
        nodes={nodes}
        edges={flow.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_e, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
        onNodeDragStop={(_e, _node, dragged) => {
          if (readOnly || !props.onMove) return;
          props.onMove(Object.fromEntries(dragged.map((n) => [n.id, { x: Math.round(n.position.x), y: Math.round(n.position.y) }])));
        }}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onBeforeDelete={async ({ nodes: n, edges: e }) => {
          // The trigger can never be deleted; everything else is applied by the editor, not by React Flow.
          const nodeIds = n.filter((x) => (x as StepNode).data.node.type !== 'trigger').map((x) => x.id);
          if (!readOnly) { if (nodeIds.length) props.onDeleteNodes?.(nodeIds); const edgeIds = e.filter((x) => !nodeIds.includes(x.source) && !nodeIds.includes(x.target)).map((x) => x.id); if (edgeIds.length) props.onDeleteEdges?.(edgeIds); }
          return false;
        }}
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.6, maxZoom: 1 }}
        minZoom={0.15}
        maxZoom={1.75}
        snapToGrid
        snapGrid={[16, 16]}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: false }}
        aria-label="Workflow canvas"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#cbd5e1" />
        <Controls showInteractive={false} position="bottom-left" aria-label="Canvas zoom controls" />
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          ariaLabel="Workflow overview"
          nodeColor={(n) => {
            const t = (n as StepNode).data.node.type;
            const c = NODE_TYPES[t].category;
            return c === 'start' ? '#0f172a' : c === 'contact' ? '#0ea5e9' : c === 'timing' ? '#f59e0b' : c === 'logic' ? '#6366f1' : c === 'finish' ? '#3f3f46' : '#94a3b8';
          }}
          maskColor="rgba(241,245,249,0.7)"
          className="!hidden sm:!block !rounded-lg !border !border-slate-200"
        />
      </ReactFlow>
    </div>
  );
}

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
