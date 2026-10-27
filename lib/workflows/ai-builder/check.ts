import { z } from 'zod';
import { WORKFLOW_TRIGGERS, type WorkflowEventType } from '../events';
import { autoLayout } from '../graph/edit';
import { GRAPH_SCHEMA_VERSION, NODE_TYPES, workflowGraphSchema, type WorkflowGraph } from '../graph/model';
import { validateGraph } from '../graph/validate';
import { MAX_CLARIFYING_QUESTIONS, type Catalogue } from './catalogue';

/**
 * Turns the model's tool input into a WorkflowGraph and checks it with the REAL validators
 * (workflowGraphSchema + validateGraph in 'edit' mode) plus the AI builder's own policy: only steps,
 * triggers and wait events the catalogue offers, no invented record ids, at least one step.
 * Nothing here trusts the model: every field is re-read through a schema.
 */

const text = (max: number) => z.string().trim().max(max);
export const buildToolInputSchema = z.object({
  name: text(120).optional(),
  summary: text(1200).default(''),
  assumptions: z.array(text(300)).max(12).default([]),
  unsupported: z.array(z.object({ request: text(300), instead: text(300).optional() })).max(12).default([]),
  clarifyingQuestions: z.array(z.object({ id: z.string().regex(/^[a-z][a-z0-9_]{0,31}$/), question: text(200).min(1), placeholder: text(80).optional() })).max(6).default([]),
  workflow: z.object({
    nodes: z.array(z.object({ id: z.unknown(), type: z.unknown(), name: z.unknown().optional(), config: z.unknown().optional() }).passthrough()),
    edges: z.array(z.object({ source: z.unknown(), sourceHandle: z.unknown(), target: z.unknown() }).passthrough()).default([]),
    settings: z.record(z.unknown()).optional(),
  }).optional(),
}); // unknown top-level keys are dropped (not strict) so a stray field from the model is ignored, not an error

export type BuildToolInput = z.infer<typeof buildToolInputSchema>;
export interface ClarifyingQuestion { id: string; question: string; placeholder?: string }
export interface UnsupportedItem { request: string; instead?: string }

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
function hasId(value: unknown): boolean {
  if (typeof value === 'string') return UUID.test(value);
  if (Array.isArray(value)) return value.some(hasId);
  if (value && typeof value === 'object') return Object.values(value).some(hasId);
  return false;
}

/** Assemble a graph from the tool input. Positions and edge ids are always ours, never the model's. */
export function assembleGraph(workflow: NonNullable<BuildToolInput['workflow']>): unknown {
  return {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: workflow.nodes.map((n) => ({
      id: n.id, type: n.type, ...(typeof n.name === 'string' && n.name.trim() ? { name: n.name.trim().slice(0, 120) } : {}),
      position: { x: 0, y: 0 }, config: n.config ?? {},
    })),
    edges: workflow.edges.map((e) => ({ id: `${String(e.source)}:${String(e.sourceHandle)}->${String(e.target)}`.slice(0, 160), source: e.source, sourceHandle: e.sourceHandle, target: e.target })),
    settings: workflow.settings ?? {},
  };
}

export interface CheckResult {
  graph: WorkflowGraph | null;
  /** Exact problems, worded for both the model (repair) and the admin. */
  errors: string[];
  warnings: string[];
}

export function checkGraph(candidate: unknown, opts: { contractorId: string | null; catalogue: Catalogue }): CheckResult {
  const errors: string[] = [];
  const shape = workflowGraphSchema.safeParse(candidate);
  const result = validateGraph(candidate, { contractorId: opts.contractorId, mode: 'edit' });
  const where = (nodeId?: string) => (nodeId ? `[step ${nodeId}] ` : '');
  for (const i of result.issues) if (i.severity === 'error') errors.push(`${where(i.nodeId)}${i.message}`);
  const warnings = result.issues.filter((i) => i.severity === 'warning').map((i) => `${where(i.nodeId)}${i.message}`);
  if (!shape.success || !result.graph) return { graph: null, errors: errors.length ? errors : ['The workflow is malformed.'], warnings };

  const graph = shape.data as WorkflowGraph;
  const allowed = new Set(opts.catalogue.nodeTypes.map((n) => n.type));
  for (const n of graph.nodes) {
    if (!allowed.has(n.type)) {
      const why = opts.catalogue.unavailableNodeTypes.find((u) => u.type === n.type)?.reason ?? 'not available';
      errors.push(`[step ${n.id}] "${NODE_TYPES[n.type].label}" cannot be used: ${why} Remove it and list the request under "unsupported".`);
    }
    if (hasId(n.config)) errors.push(`[step ${n.id}] Do not reference specific people, templates or records by id. Use an audience, an unassigned task, or leave it out and mention it in "assumptions".`);
    if (n.type === 'trigger') {
      const ev = (n.config as { event?: string }).event as WorkflowEventType | undefined;
      if (ev && WORKFLOW_TRIGGERS[ev] && !opts.catalogue.readyEvents.includes(ev)) errors.push(`[step ${n.id}] The trigger "${WORKFLOW_TRIGGERS[ev].label}" is not available yet.`);
    }
    if (n.type === 'wait_event') {
      const ev = (n.config as { event?: string }).event as WorkflowEventType | undefined;
      if (ev && !opts.catalogue.readyWaitEvents.includes(ev)) errors.push(`[step ${n.id}] Waiting for "${ev}" is not available.`);
    }
  }
  for (const ev of graph.settings.exitEvents) if (!opts.catalogue.readyEvents.includes(ev)) errors.push(`settings.exitEvents: "${ev}" is not available.`);
  if (!graph.nodes.some((n) => n.type !== 'trigger')) errors.push('Add at least one step after the trigger.');
  const trig = graph.nodes.find((n) => n.type === 'trigger');
  if (trig && graph.settings.exitEvents.includes((trig.config as { event?: WorkflowEventType }).event as WorkflowEventType)) errors.push('settings.exitEvents must not contain the trigger event.');
  return { graph: errors.length ? null : autoLayout(graph), errors, warnings };
}

/** At most MAX_CLARIFYING_QUESTIONS, de-duplicated by id. */
export function clampQuestions(qs: ClarifyingQuestion[]): ClarifyingQuestion[] {
  const seen = new Set<string>();
  return qs.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true))).slice(0, MAX_CLARIFYING_QUESTIONS);
}
