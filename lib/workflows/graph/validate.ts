import { conditionField, conditionFieldsIn } from '../conditions';
import { mergeRootsForTrigger } from '../definition';
import { WORKFLOW_TRIGGERS, type WorkflowEventType } from '../events';
import {
  MAX_GRAPH_EDGES,
  MAX_GRAPH_NODES,
  NODE_CONFIG_SCHEMAS,
  NODE_TYPES,
  graphNodeTypeSchema,
  handlesFor,
  mergeTokensIn,
  nodeDisplayName,
  workflowGraphSchema,
  type GraphNode,
  type WorkflowGraph,
} from './model';

export type IssueSeverity = 'error' | 'warning';
export interface GraphIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
  /** Config field the issue is about, when there is one (drives inline hints in the side panel). */
  field?: string;
}

/** Facts about integrations, supplied by the server at publish time (never trusted from the browser). */
export interface IntegrationReadiness {
  sms: boolean;
  /** null when AI calling is not configured for this workflow's contractor, or there is no single contractor. */
  calling: null | {
    contractorMode: 'off' | 'manual_only' | 'automatic' | 'workflow_only' | null;
    agentConfigured: boolean;
    phoneConfigured: boolean;
    globalEnabled: boolean;
    adminEnabled: boolean;
  };
  /** Active email_templates ids; undefined = not checked. */
  activeEmailTemplateIds?: ReadonlySet<string>;
}

export interface ValidationContext {
  /** The workflow's owner: a contractor id, or null for a HomeQuote network workflow. */
  contractorId: string | null;
  /** 'edit' is lenient about an empty flow; 'publish' is the full gate. */
  mode: 'edit' | 'publish';
  integrations?: IntegrationReadiness;
}

const err = (code: string, message: string, rest: Partial<GraphIssue> = {}): GraphIssue => ({ severity: 'error', code, message, ...rest });
const warn = (code: string, message: string, rest: Partial<GraphIssue> = {}): GraphIssue => ({ severity: 'warning', code, message, ...rest });

/** Outgoing adjacency over every edge whose endpoints exist. */
function adjacency(graph: WorkflowGraph): Map<string, string[]> {
  const ids = new Set(graph.nodes.map((n) => n.id));
  const adj = new Map<string, string[]>(graph.nodes.map((n) => [n.id, []]));
  for (const e of graph.edges) if (ids.has(e.source) && ids.has(e.target)) adj.get(e.source)!.push(e.target);
  return adj;
}

export function reachableFrom(graph: WorkflowGraph, startId: string): Set<string> {
  const adj = adjacency(graph);
  const seen = new Set<string>();
  const stack = [startId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adj.get(id) ?? []) stack.push(next);
  }
  return seen;
}

/** Nodes that can run BEFORE `nodeId` (every ancestor along any path from the trigger). */
export function ancestorsOf(graph: WorkflowGraph, nodeId: string): Set<string> {
  const rev = new Map<string, string[]>(graph.nodes.map((n) => [n.id, []]));
  for (const e of graph.edges) rev.get(e.target)?.push(e.source);
  const seen = new Set<string>();
  const stack = [...(rev.get(nodeId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const p of rev.get(id) ?? []) stack.push(p);
  }
  return seen;
}

export function findCycle(graph: WorkflowGraph): string[] | null {
  const adj = adjacency(graph);
  const state = new Map<string, 0 | 1 | 2>();
  const path: string[] = [];
  const visit = (id: string): string[] | null => {
    state.set(id, 1);
    path.push(id);
    for (const next of adj.get(id) ?? []) {
      if (state.get(next) === 1) return [...path.slice(path.indexOf(next)), next];
      if (!state.get(next)) {
        const hit = visit(next);
        if (hit) return hit;
      }
    }
    path.pop();
    state.set(id, 2);
    return null;
  };
  for (const n of graph.nodes) if (!state.get(n.id)) { const hit = visit(n.id); if (hit) return hit; }
  return null;
}

export interface ConnectionCheck { ok: boolean; reason?: string }

/** Used by the canvas to refuse a connection BEFORE it is drawn. */
export function checkConnection(
  graph: WorkflowGraph,
  c: { source: string; sourceHandle: string; target: string }
): ConnectionCheck {
  const source = graph.nodes.find((n) => n.id === c.source);
  const target = graph.nodes.find((n) => n.id === c.target);
  if (!source || !target) return { ok: false, reason: 'That step no longer exists.' };
  if (c.source === c.target) return { ok: false, reason: 'A step cannot connect to itself.' };
  if (target.type === 'trigger') return { ok: false, reason: 'Nothing can lead into the trigger.' };
  if (!handlesFor(source.type, source.config).some((h) => h.id === c.sourceHandle)) {
    return { ok: false, reason: 'That output does not exist on this step.' };
  }
  if (graph.edges.some((e) => e.source === c.source && e.sourceHandle === c.sourceHandle)) {
    return { ok: false, reason: 'This output already leads somewhere. Remove that connection first, so the path is never ambiguous.' };
  }
  if (reachableFrom(graph, c.target).has(c.source)) {
    return { ok: false, reason: 'That would create a loop. Workflows cannot loop back; use a bounded retry setting instead.' };
  }
  return { ok: true };
}

function usesVariable(node: GraphNode): { field: string; configField: string }[] {
  const out: { field: string; configField: string }[] = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === 'string') for (const f of mergeTokensIn(value)) out.push({ field: f, configField: path });
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}.${i}`));
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
  };
  if (node.type !== 'condition' && node.type !== 'trigger') walk(node.config, '');
  return out;
}

export function validateGraph(input: unknown, ctx: ValidationContext): { issues: GraphIssue[]; errors: number; warnings: number; graph: WorkflowGraph | null } {
  const issues: GraphIssue[] = [];
  const shape = workflowGraphSchema.safeParse(input);
  if (!shape.success) {
    for (const i of shape.error.issues) issues.push(err('invalid_graph', `${i.path.join('.') || 'workflow'}: ${i.message}`));
    return { issues, errors: issues.length, warnings: 0, graph: null };
  }
  const graph = shape.data as WorkflowGraph;
  if (graph.nodes.length > MAX_GRAPH_NODES) issues.push(err('too_many_nodes', `A workflow can have at most ${MAX_GRAPH_NODES} steps.`));
  if (graph.edges.length > MAX_GRAPH_EDGES) issues.push(err('too_many_edges', `A workflow can have at most ${MAX_GRAPH_EDGES} connections.`));

  // --- identity ---------------------------------------------------------------
  const seenIds = new Set<string>();
  for (const n of graph.nodes) {
    if (seenIds.has(n.id)) issues.push(err('duplicate_node', `Two steps share the id "${n.id}".`, { nodeId: n.id }));
    seenIds.add(n.id);
    if (!graphNodeTypeSchema.safeParse(n.type).success) issues.push(err('unknown_node_type', `Unknown step type "${n.type}".`, { nodeId: n.id }));
  }
  const triggers = graph.nodes.filter((n) => n.type === 'trigger');
  if (triggers.length === 0) issues.push(err('no_trigger', 'Add a trigger so the workflow knows when to start.'));
  if (triggers.length > 1) issues.push(err('multiple_triggers', 'A workflow has exactly one trigger.', { nodeId: triggers[1].id }));
  const trigger = triggers[0];

  // --- edges ------------------------------------------------------------------
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const handleUse = new Map<string, number>();
  const pairs = new Set<string>();
  for (const e of graph.edges) {
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    if (!s || !t) { issues.push(err('edge_unknown_node', 'A connection points at a step that no longer exists.', { edgeId: e.id })); continue; }
    if (e.source === e.target) issues.push(err('edge_self_loop', 'A step cannot connect to itself.', { edgeId: e.id, nodeId: e.source }));
    if (t.type === 'trigger') issues.push(err('trigger_incoming', 'Nothing can lead into the trigger.', { edgeId: e.id, nodeId: e.target }));
    if (!handlesFor(s.type, s.config).some((h) => h.id === e.sourceHandle)) {
      issues.push(err('edge_unknown_handle', `"${nodeDisplayName(s)}" has no output called "${e.sourceHandle}".`, { edgeId: e.id, nodeId: e.source }));
    }
    const key = `${e.source}:${e.sourceHandle}`;
    handleUse.set(key, (handleUse.get(key) ?? 0) + 1);
    if (handleUse.get(key) === 2) issues.push(err('ambiguous_connection', `"${nodeDisplayName(s)}" sends the same output to more than one step. Each output can lead to only one step.`, { edgeId: e.id, nodeId: e.source }));
    const pair = `${key}>${e.target}`;
    if (pairs.has(pair)) issues.push(err('duplicate_edge', 'The same connection is drawn twice.', { edgeId: e.id }));
    pairs.add(pair);
  }
  const cycle = findCycle(graph);
  if (cycle) {
    const names = cycle.map((id) => nodeDisplayName(byId.get(id)!)).join(' → ');
    issues.push(err('cycle', `This workflow loops back on itself (${names}). Loops are not supported.`, { nodeId: cycle[0] }));
  }

  // --- reachability -------------------------------------------------------------
  if (trigger) {
    const reach = reachableFrom(graph, trigger.id);
    for (const n of graph.nodes) {
      if (n.type !== 'trigger' && !reach.has(n.id)) {
        issues.push(err('unreachable_node', `"${nodeDisplayName(n)}" is not connected to the trigger, so it will never run.`, { nodeId: n.id }));
      }
    }
    if (ctx.mode === 'publish' && !graph.nodes.some((n) => n.type !== 'trigger')) {
      issues.push(err('empty_workflow', 'Add at least one step after the trigger.', { nodeId: trigger.id }));
    }
  }

  // --- per-node configuration --------------------------------------------------
  const triggerEvent: WorkflowEventType | null = (() => {
    if (!trigger) return null;
    const p = NODE_CONFIG_SCHEMAS.trigger.safeParse(trigger.config);
    return p.success ? (p.data.event as WorkflowEventType) : null;
  })();
  const triggerDef = triggerEvent ? WORKFLOW_TRIGGERS[triggerEvent] : null;
  const roots = triggerEvent ? mergeRootsForTrigger(triggerEvent, { contractorId: ctx.contractorId }) : new Set<string>();
  const hasContractor = ctx.contractorId !== null || triggerDef?.contractorScope === 'required';
  const integrations = ctx.integrations;

  for (const n of graph.nodes) {
    const typeDef = NODE_TYPES[n.type];
    if (!typeDef) continue;
    const label = nodeDisplayName(n);
    const parsed = NODE_CONFIG_SCHEMAS[n.type].safeParse(n.config);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      issues.push(err('invalid_config', `${label}: ${first.message}${first.path.length ? ` (${first.path.join('.')})` : ''}`, { nodeId: n.id, field: first.path.join('.') || undefined }));
      for (const extra of parsed.error.issues.slice(1, 4)) {
        issues.push(err('invalid_config', `${label}: ${extra.message}${extra.path.length ? ` (${extra.path.join('.')})` : ''}`, { nodeId: n.id, field: extra.path.join('.') || undefined }));
      }
    }
    if (typeDef.availability !== 'ready') {
      issues.push(err('setup_required', `${label}: ${typeDef.setupNote ?? 'This step needs setup before it can run.'}`, { nodeId: n.id }));
    }
    if (typeDef.requiresContractor && !hasContractor) {
      issues.push(err('needs_contractor', `${label} needs a contractor. Scope this workflow to a contractor, or start it from "Lead assigned to contractor".`, { nodeId: n.id }));
    }
    if (typeDef.requiresAssignment && triggerDef && triggerDef.contractorScope !== 'required' && ctx.contractorId === null) {
      issues.push(err('needs_assignment', `${label} needs a contractor-side lead record. Start the workflow from an assignment, appointment or estimate trigger.`, { nodeId: n.id }));
    }
    if (n.type === 'wait_duration' && parsed.success && (parsed.data as { mode: string }).mode === 'before_appointment' && !roots.has('appointment')) {
      issues.push(err('variable_unavailable', `${label}: "before the appointment" needs an appointment, which "${triggerDef?.label ?? 'this trigger'}" does not provide.`, { nodeId: n.id, field: 'mode' }));
    }

    // variables must be supplied by the trigger, otherwise they silently render empty
    for (const u of usesVariable(n)) {
      const root = u.field.split('.')[0];
      if (!roots.has(root)) {
        issues.push(err('variable_unavailable', `${label}: {{${u.field}}} is not available when the workflow starts from "${triggerDef?.label ?? 'this trigger'}".`, { nodeId: n.id, field: u.configField }));
      }
    }

    // tenant restrictions for contractor-owned workflows
    if (ctx.contractorId !== null && parsed.success) {
      const c = parsed.data as Record<string, unknown>;
      if (n.type === 'update_lead_status' && c.pipeline === 'lead') {
        issues.push(err('network_only', `${label}: contractor workflows can change only their own pipeline stage.`, { nodeId: n.id, field: 'pipeline' }));
      }
      if (n.type === 'send_notification' && c.audience !== 'assigned_contractor') {
        issues.push(err('network_only', `${label}: contractor workflows can notify only their own team.`, { nodeId: n.id, field: 'audience' }));
      }
      if (n.type === 'send_email' && (c.to as { kind?: string } | undefined)?.kind === 'recipients') {
        issues.push(err('network_only', `${label}: contractor workflows can email the homeowner only.`, { nodeId: n.id, field: 'to' }));
      }
    }

    // condition fields
    if (n.type === 'condition' && parsed.success) {
      const call = ancestorsOf(graph, n.id);
      const hasCallAncestor = [...call].some((id) => byId.get(id)?.type === 'ai_call');
      for (const b of (parsed.data as { branches: { id: string; label: string; conditions: Parameters<typeof conditionFieldsIn>[0] }[] }).branches) {
        for (const f of new Set(conditionFieldsIn(b.conditions))) {
          const d = conditionField(f);
          if (d && d.availability !== 'ready') issues.push(err('field_unavailable', `${label}: "${d.label}" is not available yet.`, { nodeId: n.id, field: `branches.${b.id}` }));
          if (f.startsWith('call.') && !hasCallAncestor) {
            issues.push(warn('call_field_without_call', `${label}: "${d?.label ?? f}" only has a value after a "Call homeowner" step.`, { nodeId: n.id, field: `branches.${b.id}` }));
          }
        }
      }
    }

    // unconnected outputs end the run there: tell the builder
    if (n.type !== 'end') {
      const open = handlesFor(n.type, n.config).filter((h) => !graph.edges.some((e) => e.source === n.id && e.sourceHandle === h.id));
      if (open.length && (n.type !== 'trigger' || graph.nodes.length > 1)) {
        const all = open.length === handlesFor(n.type, n.config).length;
        issues.push(warn('unconnected_outputs',
          n.type === 'ai_call' && !all
            ? `${label}: if the call ends as ${open.map((h) => `"${h.label}"`).join(', ')}, the workflow simply ends.`
            : `${label}: nothing happens after ${all ? 'this step' : open.map((h) => `"${h.label}"`).join(', ')}, so the workflow ends there.`,
          { nodeId: n.id }));
      }
    }

    // integration readiness (publish gate)
    if (ctx.mode === 'publish' && integrations) {
      if (n.type === 'send_sms' && !integrations.sms) {
        // setup_required above already blocks; kept so a future connected provider is checked per account.
      }
      if (n.type === 'send_email' && parsed.success) {
        const tid = (parsed.data as { templateId?: string }).templateId;
        if (tid && integrations.activeEmailTemplateIds && !integrations.activeEmailTemplateIds.has(tid)) {
          issues.push(err('email_template_missing', `${label}: the saved email template is missing or switched off.`, { nodeId: n.id, field: 'templateId' }));
        }
      }
      if (n.type === 'ai_call') {
        const c = integrations.calling;
        if (!c) {
          issues.push(ctx.contractorId
            ? err('calling_not_ready', `${label}: AI calling is not set up for this contractor (Admin → AI Agent Calls).`, { nodeId: n.id })
            : warn('calling_checked_at_run', `${label}: AI calling readiness is checked for each contractor when the workflow runs.`, { nodeId: n.id }));
        } else {
          if (c.contractorMode === null || c.contractorMode === 'off' || c.contractorMode === 'manual_only') {
            issues.push(err('calling_mode', `${label}: this contractor's AI calling mode is "${c.contractorMode ?? 'off'}". Set it to "Workflow only" or "Automatic" first.`, { nodeId: n.id }));
          }
          if (!c.agentConfigured || !c.phoneConfigured) {
            issues.push(err('calling_agent', `${label}: this contractor has no Fish agent / phone number configured.`, { nodeId: n.id }));
          }
          if (!c.globalEnabled || !c.adminEnabled) {
            issues.push(warn('calling_switched_off', `${label}: AI calling is switched off right now. Calls will not be placed until it is turned on, and queued calls expire after 48 hours.`, { nodeId: n.id }));
          }
          if (c.contractorMode === 'automatic' && triggerEvent === 'lead.assigned') {
            issues.push(warn('calling_overlap', `${label}: this contractor also has the automatic form-to-call feature on. The workflow will reuse that call instead of placing a second one.`, { nodeId: n.id }));
          }
        }
      }
    }
  }

  // loop hazards between call events and call nodes
  if ((triggerEvent === 'ai_call.failed' || triggerEvent === 'ai_call.completed') && graph.nodes.some((n) => n.type === 'ai_call')) {
    issues.push(warn('call_event_loop', 'This workflow starts from an AI call result and also places an AI call. Calls it places never re-trigger it, but double-check the branches.', { nodeId: trigger?.id }));
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  return { issues, errors, warnings: issues.length - errors, graph };
}

export const hasBlockingIssues = (issues: GraphIssue[]) => issues.some((i) => i.severity === 'error');
