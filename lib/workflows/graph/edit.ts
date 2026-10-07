import { WORKFLOW_TRIGGERS, type WorkflowEventType } from '../events';
import { checkConnection } from './validate';
import {
  GRAPH_SCHEMA_VERSION,
  NODE_TYPES,
  handlesFor,
  type GraphEdge,
  type GraphNode,
  type GraphNodeType,
  type GraphSettings,
  type WorkflowGraph,
} from './model';

/**
 * Pure graph editing operations used by the canvas, the mobile step list and the
 * tests. Every function returns a NEW graph and never mutates its input, which
 * is what makes undo/redo a simple stack of snapshots.
 */

export const DEFAULT_SETTINGS: GraphSettings = {
  reentry: 'once_per_entity',
  exitEvents: [],
  allowManualEnrollment: false,
  runLifetimeDays: 30,
};

export function defaultConfigFor(type: GraphNodeType): Record<string, unknown> {
  switch (type) {
    case 'trigger':
      return { event: 'lead.assigned', filters: {}, entry: null };
    case 'send_email':
      return { to: { kind: 'lead' }, subject: 'Following up on your project', body: 'Hi {{lead.first_name}},\n\nWe are following up on your {{lead.project_type}} project.\n\n{{contractor.name}}', onError: 'fail_run' };
    case 'send_sms':
      return { body: 'Hi {{lead.first_name}}, thanks for reaching out to {{contractor.name}}. Reply STOP to opt out.', onError: 'fail_run' };
    case 'ai_call':
      return { purpose: 'qualification', contextFields: ['project_type', 'city'], maxAttempts: 1, retryDelayMinutes: 60, resultTimeoutMinutes: 360, analysisGraceMinutes: 30 };
    case 'create_task':
      return { title: 'Follow up with {{lead.first_name}}', dueInMinutes: 60, assignee: { kind: 'unassigned' }, onError: 'fail_run' };
    case 'add_note':
      return { body: 'Automation note for {{lead.first_name}}.', onError: 'fail_run' };
    case 'update_lead_status':
      return { pipeline: 'lead', status: 'contact_attempted', onError: 'fail_run' };
    case 'assign_lead':
      return { strategy: 'round_robin', userIds: [], onError: 'fail_run' };
    case 'send_notification':
      return { audience: 'assigned_contractor', title: 'Lead update', body: 'Open HomeQuote for details.', onError: 'fail_run' };
    case 'wait_duration':
      return { mode: 'duration', amount: 1, unit: 'hours' };
    case 'wait_business_hours':
      return { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, zone: 'lead', timezone: 'America/Los_Angeles', minimumDelayMinutes: 0 };
    case 'wait_event':
      return { event: 'appointment.booked', timeoutMinutes: 1440 };
    case 'condition':
      return { branches: [{ id: 'branch_1', label: 'Branch 1', conditions: { match: 'all', conditions: [{ field: 'lead.status', operator: 'equals', value: 'new' }] } }] };
    case 'end':
      return {};
  }
}

export function emptyGraph(event: WorkflowEventType = 'lead.assigned', settings: Partial<GraphSettings> = {}): WorkflowGraph {
  return {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: [{ id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, config: { event, filters: {}, entry: null } }],
    edges: [],
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
}

export function newNodeId(graph: WorkflowGraph, type: GraphNodeType): string {
  const used = new Set(graph.nodes.map((n) => n.id));
  let i = 1;
  while (used.has(`${type}_${i}`)) i += 1;
  return `${type}_${i}`;
}

export function createNode(graph: WorkflowGraph, type: GraphNodeType, position = { x: 0, y: 0 }): GraphNode {
  return { id: newNodeId(graph, type), type, position, config: defaultConfigFor(type) };
}

const edgeId = (source: string, handle: string, target: string) => `${source}:${handle}->${target}`;
const edge = (source: string, sourceHandle: string, target: string): GraphEdge => ({ id: edgeId(source, sourceHandle, target), source, sourceHandle, target });

export function firstHandle(node: GraphNode): string | null {
  return handlesFor(node.type, node.config)[0]?.id ?? null;
}

/**
 * Add a step "after" an output handle. If that output already leads somewhere,
 * the new step is spliced in between (the old target now follows the new step),
 * so an "Add step" button on a connection never orphans anything.
 */
export function addNodeAfter(graph: WorkflowGraph, sourceId: string, sourceHandle: string, type: GraphNodeType): { graph: WorkflowGraph; nodeId: string } {
  const source = graph.nodes.find((n) => n.id === sourceId);
  if (!source) return { graph, nodeId: '' };
  const node = createNode(graph, type, { x: source.position.x, y: source.position.y + 160 });
  const existing = graph.edges.find((e) => e.source === sourceId && e.sourceHandle === sourceHandle);
  const edges = graph.edges.filter((e) => e !== existing);
  edges.push(edge(sourceId, sourceHandle, node.id));
  if (existing) {
    const out = firstHandle(node);
    if (out && type !== 'end') edges.push(edge(node.id, out, existing.target));
  }
  return autoLayoutIfStacked({ ...graph, nodes: [...graph.nodes, node], edges }, node.id);
}

/** Splice a step into an existing connection. */
export function insertOnEdge(graph: WorkflowGraph, edgeIdValue: string, type: GraphNodeType): { graph: WorkflowGraph; nodeId: string } {
  const e = graph.edges.find((x) => x.id === edgeIdValue);
  if (!e) return { graph, nodeId: '' };
  return addNodeAfter(graph, e.source, e.sourceHandle, type);
}

/** Remove a step. A simple pass-through step is bridged so the flow stays connected. */
export function removeNode(graph: WorkflowGraph, id: string): WorkflowGraph {
  const node = graph.nodes.find((n) => n.id === id);
  if (!node || node.type === 'trigger') return graph;
  const incoming = graph.edges.filter((e) => e.target === id);
  const outgoing = graph.edges.filter((e) => e.source === id);
  const edges = graph.edges.filter((e) => e.source !== id && e.target !== id);
  if (incoming.length === 1 && outgoing.length === 1 && handlesFor(node.type, node.config).length === 1) {
    const from = incoming[0];
    if (!edges.some((e) => e.source === from.source && e.sourceHandle === from.sourceHandle)) {
      edges.push(edge(from.source, from.sourceHandle, outgoing[0].target));
    }
  }
  return { ...graph, nodes: graph.nodes.filter((n) => n.id !== id), edges };
}

export function removeEdge(graph: WorkflowGraph, id: string): WorkflowGraph {
  return { ...graph, edges: graph.edges.filter((e) => e.id !== id) };
}

/** Copy a step (settings included) beside the original, unconnected. */
export function duplicateNode(graph: WorkflowGraph, id: string): { graph: WorkflowGraph; nodeId: string } {
  const node = graph.nodes.find((n) => n.id === id);
  if (!node || node.type === 'trigger') return { graph, nodeId: '' };
  const copy: GraphNode = {
    ...structuredClone(node),
    id: newNodeId(graph, node.type),
    name: node.name ? `${node.name} (copy)` : undefined,
    position: { x: node.position.x + 40, y: node.position.y + 40 },
  };
  if (copy.name === undefined) delete copy.name;
  return { graph: { ...graph, nodes: [...graph.nodes, copy] }, nodeId: copy.id };
}

export function updateNode(graph: WorkflowGraph, id: string, patch: { name?: string | null; config?: Record<string, unknown>; position?: { x: number; y: number } }): WorkflowGraph {
  const nodes = graph.nodes.map((n) => {
    if (n.id !== id) return n;
    const next: GraphNode = { ...n };
    if (patch.config) next.config = patch.config;
    if (patch.position) next.position = patch.position;
    if (patch.name !== undefined) {
      if (patch.name && patch.name.trim()) next.name = patch.name; else delete next.name;
    }
    return next;
  });
  let edges = graph.edges;
  // A config change can remove outputs (e.g. a deleted condition branch): drop their now-dangling edges.
  const node = nodes.find((n) => n.id === id);
  if (node && patch.config) {
    const ids = new Set(handlesFor(node.type, node.config).map((h) => h.id));
    edges = edges.filter((e) => e.source !== id || ids.has(e.sourceHandle));
  }
  return { ...graph, nodes, edges };
}

export function moveNodes(graph: WorkflowGraph, positions: Record<string, { x: number; y: number }>): WorkflowGraph {
  return { ...graph, nodes: graph.nodes.map((n) => (positions[n.id] ? { ...n, position: positions[n.id] } : n)) };
}

export function connect(graph: WorkflowGraph, c: { source: string; sourceHandle: string; target: string }): { graph: WorkflowGraph; error?: string } {
  const check = checkConnection(graph, c);
  if (!check.ok) return { graph, error: check.reason };
  return { graph: { ...graph, edges: [...graph.edges, edge(c.source, c.sourceHandle, c.target)] } };
}

export function updateSettings(graph: WorkflowGraph, patch: Partial<GraphSettings>): WorkflowGraph {
  return { ...graph, settings: { ...graph.settings, ...patch } };
}

/** The trigger event changed: configuration that belonged to the old event no longer applies. */
export function setTriggerEvent(graph: WorkflowGraph, event: WorkflowEventType): WorkflowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => (n.type === 'trigger' ? { ...n, config: { ...n.config, event, filters: {} } } : n)),
  };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const LAYER_GAP = 170;
const COLUMN_GAP = 330;

/** Deterministic top-to-bottom layered layout (no extra dependency). */
export function autoLayout(graph: WorkflowGraph): WorkflowGraph {
  const trigger = graph.nodes.find((n) => n.type === 'trigger');
  const depth = new Map<string, number>();
  const order = new Map<string, number>();
  if (trigger) {
    const queue = [trigger.id];
    depth.set(trigger.id, 0);
    // Longest-path layering over a DAG (cycles are rejected elsewhere, but stay safe).
    for (let guard = 0; queue.length && guard < 5000; guard += 1) {
      const id = queue.shift()!;
      const node = graph.nodes.find((n) => n.id === id)!;
      const handles = handlesFor(node.type, node.config);
      for (const h of handles) {
        const e = graph.edges.find((x) => x.source === id && x.sourceHandle === h.id);
        if (!e) continue;
        const d = (depth.get(id) ?? 0) + 1;
        if ((depth.get(e.target) ?? -1) < d && d < graph.nodes.length + 1) {
          depth.set(e.target, d);
          queue.push(e.target);
        }
      }
    }
  }
  const layers = new Map<number, string[]>();
  const unplaced: string[] = [];
  for (const n of graph.nodes) {
    const d = depth.get(n.id);
    if (d === undefined) { unplaced.push(n.id); continue; }
    layers.set(d, [...(layers.get(d) ?? []), n.id]);
  }
  const positions: Record<string, { x: number; y: number }> = {};
  const maxDepth = Math.max(0, ...layers.keys());
  for (const [d, ids] of [...layers.entries()].sort((a, b) => a[0] - b[0])) {
    // Order within a layer follows each node's parent column so branches fan out without crossing.
    const sorted = [...ids].sort((a, b) => (order.get(a) ?? parentColumn(graph, a, positions)) - (order.get(b) ?? parentColumn(graph, b, positions)));
    sorted.forEach((id, i) => {
      positions[id] = { x: (i - (sorted.length - 1) / 2) * COLUMN_GAP, y: d * LAYER_GAP };
      order.set(id, i);
    });
  }
  unplaced.forEach((id, i) => { positions[id] = { x: (i + 1.5) * COLUMN_GAP + 300, y: 0 + (maxDepth > 0 ? 0 : 0) }; });
  return moveNodes(graph, positions);
}

function parentColumn(graph: WorkflowGraph, id: string, positions: Record<string, { x: number; y: number }>): number {
  const parents = graph.edges.filter((e) => e.target === id).map((e) => positions[e.source]?.x ?? 0);
  return parents.length ? Math.min(...parents) : 0;
}

/** Newly added nodes can land on top of others; re-run layout only when two nodes would overlap. */
function autoLayoutIfStacked(graph: WorkflowGraph, nodeId: string): { graph: WorkflowGraph; nodeId: string } {
  const node = graph.nodes.find((n) => n.id === nodeId)!;
  const overlaps = graph.nodes.some((n) => n.id !== nodeId && Math.abs(n.position.x - node.position.x) < 260 && Math.abs(n.position.y - node.position.y) < 110);
  return { graph: overlaps ? autoLayout(graph) : graph, nodeId };
}

// ---------------------------------------------------------------------------
// Fingerprints (unsaved-change and "differs from published" detection)
// ---------------------------------------------------------------------------
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)]));
  }
  return value;
}
/** Canonical JSON including node positions: equal strings mean the saved draft is up to date. */
export const canonicalGraph = (graph: WorkflowGraph) => JSON.stringify(stable(graph));
/** Canonical JSON ignoring layout: equal strings mean "same behaviour". */
export const semanticGraph = (graph: WorkflowGraph) =>
  JSON.stringify(stable({ ...graph, nodes: [...graph.nodes].map((n) => { const { position, ...rest } = n; void position; return rest; }).sort((a, b) => a.id.localeCompare(b.id)), edges: [...graph.edges].sort((a, b) => a.id.localeCompare(b.id)) }));

/** Plain-language description of a node's configuration, shown on the card. */
export function describeNode(node: GraphNode): string {
  const c = node.config as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  switch (node.type) {
    case 'trigger': return c.event && WORKFLOW_TRIGGERS[c.event as WorkflowEventType] ? WORKFLOW_TRIGGERS[c.event as WorkflowEventType].label : 'Choose a trigger';
    case 'send_email': return c.templateId ? 'Saved template' : c.subject ? `“${String(c.subject).slice(0, 48)}”` : 'Choose what to send';
    case 'ai_call': return `${String(c.purpose ?? 'qualification').replaceAll('_', ' ')} · up to ${c.maxAttempts ?? 1} attempt${(c.maxAttempts ?? 1) > 1 ? 's' : ''}`;
    case 'create_task': return c.title ? String(c.title).slice(0, 56) : 'Add a title';
    case 'add_note': return c.body ? String(c.body).slice(0, 56) : 'Write the note';
    case 'update_lead_status': return `${c.pipeline === 'assignment' ? 'Contractor stage' : 'Lead stage'} → ${String(c.status ?? '').replaceAll('_', ' ')}`;
    case 'assign_lead': return (c.userIds?.length ?? 0) ? `${c.strategy === 'specific' ? 'One person' : `Round robin of ${c.userIds.length}`}` : 'Choose who';
    case 'send_notification': return c.title ? String(c.title).slice(0, 48) : 'Add a title';
    case 'wait_duration': return c.mode === 'before_appointment' ? `${c.hoursBefore ?? '?'} hours before the appointment` : `${c.amount ?? '?'} ${c.unit ?? ''}`;
    case 'wait_business_hours': return `${c.startHour ?? 9}:00–${c.endHour ?? 17}:00, ${(c.days ?? []).length} days/week`;
    case 'wait_event': return `${String(c.event ?? '').replaceAll('_', ' ')} · up to ${c.timeoutMinutes ?? '?'} min`;
    case 'condition': return `${(c.branches ?? []).length} branch${(c.branches ?? []).length === 1 ? '' : 'es'} + else`;
    case 'end': return c.reason ? String(c.reason).slice(0, 48) : 'Workflow ends';
    default: return NODE_TYPES[node.type].description;
  }
}
