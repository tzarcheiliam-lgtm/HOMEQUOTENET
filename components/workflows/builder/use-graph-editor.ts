'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  addNodeAfter,
  autoLayout,
  connect as connectNodes,
  duplicateNode,
  insertOnEdge,
  moveNodes,
  removeEdge,
  removeNode,
  setTriggerEvent,
  updateNode,
  updateSettings,
  validateGraph,
  type GraphIssue,
  type GraphNodeType,
  type GraphSettings,
  type WorkflowGraph,
} from '@/lib/workflows/graph';
import type { WorkflowEventType } from '@/lib/workflows';

const HISTORY_LIMIT = 100;
const COALESCE_MS = 900;

/**
 * Editing state for one graph: the current graph, an undo/redo history (snapshots - the pure
 * edit functions never mutate), and live validation. Rapid edits to the same thing (typing in a
 * field, dragging) coalesce into ONE undo step.
 */
export function useGraphEditor(initial: WorkflowGraph, validation: { contractorId: string | null }) {
  const [graph, setGraphState] = useState(initial);
  const [past, setPast] = useState<WorkflowGraph[]>([]);
  const [future, setFuture] = useState<WorkflowGraph[]>([]);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  // Always the freshest graph for the callbacks below (avoids stale closures during fast typing).
  const current = useRef(initial);

  const commit = useCallback((next: WorkflowGraph, coalesceKey?: string) => {
    if (next === current.current) return;
    const now = Date.now();
    const coalesce = !!coalesceKey && lastKey.current?.key === coalesceKey && now - lastKey.current.at < COALESCE_MS;
    lastKey.current = coalesceKey ? { key: coalesceKey, at: now } : null;
    if (!coalesce) setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), current.current]);
    setFuture([]);
    current.current = next;
    setGraphState(next);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [current.current, ...f]);
      current.current = prev;
      setGraphState(prev);
      lastKey.current = null;
      return p.slice(0, -1);
    });
  }, []);
  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const [next, ...rest] = f;
      setPast((p) => [...p, current.current]);
      current.current = next;
      setGraphState(next);
      lastKey.current = null;
      return rest;
    });
  }, []);

  /** Replace everything (e.g. after a conflict reload). Clears history. */
  const reset = useCallback((g: WorkflowGraph) => {
    current.current = g;
    setGraphState(g);
    setPast([]);
    setFuture([]);
    lastKey.current = null;
  }, []);

  const issues: GraphIssue[] = useMemo(() => validateGraph(graph, { contractorId: validation.contractorId, mode: 'edit' }).issues, [graph, validation.contractorId]);

  const api = useMemo(() => ({
    addAfter: (sourceId: string, handle: string, type: GraphNodeType) => {
      const r = addNodeAfter(current.current, sourceId, handle, type);
      commit(r.graph);
      return r.nodeId;
    },
    insertOnEdge: (edgeId: string, type: GraphNodeType) => {
      const r = insertOnEdge(current.current, edgeId, type);
      commit(r.graph);
      return r.nodeId;
    },
    remove: (id: string) => commit(removeNode(current.current, id)),
    removeEdge: (id: string) => commit(removeEdge(current.current, id)),
    duplicate: (id: string) => {
      const r = duplicateNode(current.current, id);
      commit(r.graph);
      return r.nodeId;
    },
    patchNode: (id: string, patch: { name?: string | null; config?: Record<string, unknown> }, coalesceKey?: string) =>
      commit(updateNode(current.current, id, patch), coalesceKey ?? `node:${id}`),
    connect: (c: { source: string; sourceHandle: string; target: string }) => {
      const r = connectNodes(current.current, c);
      if (!r.error) commit(r.graph);
      return r.error ?? null;
    },
    move: (positions: Record<string, { x: number; y: number }>) => commit(moveNodes(current.current, positions), 'move'),
    layout: () => commit(autoLayout(current.current)),
    settings: (patch: Partial<GraphSettings>) => commit(updateSettings(current.current, patch), 'settings'),
    triggerEvent: (event: WorkflowEventType) => commit(setTriggerEvent(current.current, event)),
  }), [commit]);

  return { graph, issues, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0, reset, ...api };
}

export type GraphEditor = ReturnType<typeof useGraphEditor>;
