import { nodeDisplayName, type GraphNode, type WorkflowGraph } from '../graph/model';
import { describeStep } from './explain';

/** What an AI change does to a draft, by step id, shown before anything is applied. Layout is ignored. */
export interface GraphDiff {
  added: { id: string; label: string; detail: string }[];
  removed: { id: string; label: string; detail: string }[];
  changed: { id: string; label: string; before: string; after: string }[];
  connectionsAdded: number;
  connectionsRemoved: number;
  settingsChanged: boolean;
  unchanged: boolean;
}

function stable(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return JSON.stringify(walk(value));
}
const behaviour = (n: GraphNode) => stable({ type: n.type, name: n.name ?? null, config: n.config });
const edgeKey = (e: { source: string; sourceHandle: string; target: string }) => `${e.source}:${e.sourceHandle}->${e.target}`;

export function diffGraphs(before: WorkflowGraph, after: WorkflowGraph): GraphDiff {
  const b = new Map(before.nodes.map((n) => [n.id, n]));
  const a = new Map(after.nodes.map((n) => [n.id, n]));
  const added = after.nodes.filter((n) => !b.has(n.id)).map((n) => ({ id: n.id, label: nodeDisplayName(n), detail: describeStep(n) }));
  const removed = before.nodes.filter((n) => !a.has(n.id)).map((n) => ({ id: n.id, label: nodeDisplayName(n), detail: describeStep(n) }));
  const changed = after.nodes
    .filter((n) => b.has(n.id) && behaviour(b.get(n.id)!) !== behaviour(n))
    .map((n) => ({ id: n.id, label: nodeDisplayName(n), before: describeStep(b.get(n.id)!), after: describeStep(n) }));
  const be = new Set(before.edges.map(edgeKey));
  const ae = new Set(after.edges.map(edgeKey));
  const connectionsAdded = [...ae].filter((k) => !be.has(k)).length;
  const connectionsRemoved = [...be].filter((k) => !ae.has(k)).length;
  const settingsChanged = stable(before.settings) !== stable(after.settings);
  return {
    added, removed, changed, connectionsAdded, connectionsRemoved, settingsChanged,
    unchanged: !added.length && !removed.length && !changed.length && !connectionsAdded && !connectionsRemoved && !settingsChanged,
  };
}
