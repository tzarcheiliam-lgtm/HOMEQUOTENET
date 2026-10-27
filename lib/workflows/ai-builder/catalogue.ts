import { CONDITION_FIELDS, CONDITION_OPERATORS, MAX_CONDITION_DEPTH, MAX_CONDITION_LEAVES, OPERATOR_SEMANTICS } from '../conditions';
import { mergeRootsForTrigger } from '../definition';
import { WORKFLOW_EVENT_TYPES, WORKFLOW_TRIGGERS, WORKFLOW_TRIGGER_CONFIG_SCHEMAS, type WorkflowEventType } from '../events';
import { defaultConfigFor } from '../graph/edit';
import {
  CALL_CONTEXT_FIELDS,
  CALL_PURPOSE_TEXT,
  CALL_PURPOSES,
  DEFAULT_RUN_LIFETIME_DAYS,
  GRAPH_NODE_TYPES,
  GRAPH_VARIABLES,
  MAX_GRAPH_EDGES,
  MAX_GRAPH_NODES,
  MAX_RUN_LIFETIME_DAYS,
  NODE_CONFIG_SCHEMAS,
  NODE_TYPES,
  WAIT_EVENT_TYPES,
  WORKFLOW_SETTABLE_ASSIGNMENT_STATUSES,
  WORKFLOW_SETTABLE_LEAD_STATUSES,
  graphEdgeSchema,
  graphNodeSchema,
  graphSettingsSchema,
  handlesFor,
  type GraphNodeType,
} from '../graph/model';
import { requiresId, zodToJsonSchema, type JsonSchema } from './zod-json';

/**
 * The AI builder's catalogue: what the model may use, generated at RUNTIME from the same registries the
 * validator and engine read (node types + availability, config schemas, triggers + filters, merge fields,
 * condition fields, settable statuses, limits). Nothing here is a hand-written list, so when a node type or
 * trigger becomes ready (or stops being ready) the builder follows automatically.
 */

export const BUILD_TOOL_NAME = 'build_workflow';
export const MAX_CLARIFYING_QUESTIONS = 2;

export interface CatalogueNodeType {
  type: GraphNodeType;
  label: string;
  description: string;
  outputs: string;
  notes: string[];
  config: JsonSchema;
  example: Record<string, unknown> | null;
}

export interface Catalogue {
  /** Node types the model may use: availability 'ready' and fillable without a real record id. */
  nodeTypes: CatalogueNodeType[];
  /** Node types it may NOT use, with the reason (shown to the model so it can say "Couldn't do"). */
  unavailableNodeTypes: { type: GraphNodeType; label: string; reason: string }[];
  readyEvents: WorkflowEventType[];
  unavailableEvents: { event: WorkflowEventType; label: string; reason: string }[];
  readyWaitEvents: WorkflowEventType[];
  readyConditionFields: string[];
  tool: { name: string; description: string; input_schema: JsonSchema };
  text: string;
}

const isReadyEvent = (e: WorkflowEventType) => WORKFLOW_TRIGGERS[e].availability === 'ready';

const outputsOf = (type: GraphNodeType): string => {
  if (type === 'end') return 'none (finishes the run)';
  if (type === 'condition') return 'one output per branch, named by the branch id, plus "else"';
  return handlesFor(type, defaultConfigFor(type)).map((h) => `"${h.id}" (${h.label})`).join(', ');
};

function nodeNotes(type: GraphNodeType): string[] {
  const d = NODE_TYPES[type];
  const notes: string[] = [];
  if (d.contactsHomeowner) notes.push('contacts the homeowner (the engine skips it automatically after an opt-out or without consent)');
  if (d.requiresContractor) notes.push('needs a contractor: the workflow must be scoped to a contractor, OR the trigger must be contractor-scoped');
  if (d.requiresAssignment) notes.push('needs a contractor-side lead record (an assignment/appointment/estimate trigger, or a contractor-scoped workflow)');
  if (type === 'wait_event') notes.push('waits for one event on this lead, or the timeout; outputs "received" and "timed_out"');
  if (type === 'ai_call') notes.push(`purposes: ${CALL_PURPOSES.map((p) => `${p} (${CALL_PURPOSE_TEXT[p].label})`).join('; ')}; contextFields: ${CALL_CONTEXT_FIELDS.map((f) => f.key).join(', ')}`);
  if (type === 'send_notification') notes.push('internal team alert only; never includes homeowner details. Use audience "admins" to alert HomeQuote admins');
  if (type === 'condition') notes.push('branches are checked in order; first match wins, otherwise "else". Branch ids are lowercase snake_case and never "else"');
  return notes;
}

function patchEnum(schema: JsonSchema, path: string[], allowed: readonly string[]) {
  let cur: JsonSchema | undefined = schema;
  for (const p of path) cur = (cur?.properties as Record<string, JsonSchema> | undefined)?.[p] ?? (p === 'items' ? (cur?.items as JsonSchema) : undefined);
  if (cur && Array.isArray(cur.enum)) cur.enum = (cur.enum as string[]).filter((v) => allowed.includes(v));
}

const json = (v: unknown) => JSON.stringify(v);

export function buildCatalogue(): Catalogue {
  const readyEvents = WORKFLOW_EVENT_TYPES.filter(isReadyEvent);
  const unavailableEvents = WORKFLOW_EVENT_TYPES.filter((e) => !isReadyEvent(e)).map((e) => ({ event: e, label: WORKFLOW_TRIGGERS[e].label, reason: WORKFLOW_TRIGGERS[e].description }));
  const readyWaitEvents = (WAIT_EVENT_TYPES as readonly WorkflowEventType[]).filter(isReadyEvent);
  const readyFields = CONDITION_FIELDS.filter((f) => f.availability === 'ready');

  const nodeTypes: CatalogueNodeType[] = [];
  const unavailableNodeTypes: Catalogue['unavailableNodeTypes'] = [];
  for (const type of GRAPH_NODE_TYPES) {
    const d = NODE_TYPES[type];
    const config = zodToJsonSchema(NODE_CONFIG_SCHEMAS[type]);
    if (d.availability !== 'ready') {
      unavailableNodeTypes.push({ type, label: d.label, reason: d.setupNote ?? 'Not available yet.' });
      continue;
    }
    if (requiresId(config)) {
      unavailableNodeTypes.push({ type, label: d.label, reason: 'Needs the admin to pick specific people or records in the builder, so it cannot be added automatically.' });
      continue;
    }
    if (type === 'trigger') patchEnum(config, ['event'], readyEvents);
    if (type === 'wait_event') patchEnum(config, ['event'], readyWaitEvents);
    const example = defaultConfigFor(type);
    nodeTypes.push({
      type, label: d.label, description: d.description, outputs: outputsOf(type), notes: nodeNotes(type), config,
      example: NODE_CONFIG_SCHEMAS[type].safeParse(example).success ? example : null,
    });
  }

  const nodeShape = zodToJsonSchema(graphNodeSchema).properties as Record<string, JsonSchema>;
  const edgeShape = zodToJsonSchema(graphEdgeSchema).properties as Record<string, JsonSchema>;
  const settings = zodToJsonSchema(graphSettingsSchema);
  patchEnum(settings, ['exitEvents', 'items'], readyEvents);

  const input_schema: JsonSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 120, description: 'Short workflow name, e.g. "Meta kitchen lead: speed to lead".' },
      summary: { type: 'string', maxLength: 1200, description: 'Plain-English summary of what the workflow does, 1-3 sentences.' },
      assumptions: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 300 }, description: 'Choices you made that the admin did not state.' },
      unsupported: {
        type: 'array', maxItems: 12,
        items: {
          type: 'object', additionalProperties: false, required: ['request'],
          properties: { request: { type: 'string', maxLength: 300, description: 'What was asked that the engine cannot do.' }, instead: { type: 'string', maxLength: 300, description: 'The closest thing you used instead, if any.' } },
        },
      },
      clarifyingQuestions: {
        type: 'array', maxItems: MAX_CLARIFYING_QUESTIONS,
        description: 'Only when something ESSENTIAL is missing. When you ask, leave out "workflow".',
        items: {
          type: 'object', additionalProperties: false, required: ['id', 'question'],
          properties: { id: { type: 'string', pattern: '^[a-z][a-z0-9_]{0,31}$' }, question: { type: 'string', maxLength: 200 }, placeholder: { type: 'string', maxLength: 80 } },
        },
      },
      workflow: {
        type: 'object', additionalProperties: false, required: ['nodes', 'edges'],
        properties: {
          nodes: {
            type: 'array', minItems: 1, maxItems: MAX_GRAPH_NODES,
            items: {
              anyOf: nodeTypes.map((n) => ({
                type: 'object', additionalProperties: false, required: ['id', 'type', 'config'],
                properties: { id: nodeShape.id, type: { const: n.type }, name: nodeShape.name, config: n.config },
              })),
            },
          },
          edges: {
            type: 'array', maxItems: MAX_GRAPH_EDGES,
            items: { type: 'object', additionalProperties: false, required: ['source', 'sourceHandle', 'target'], properties: { source: edgeShape.source, sourceHandle: edgeShape.sourceHandle, target: edgeShape.target } },
          },
          settings,
        },
      },
    },
    required: ['summary', 'assumptions', 'unsupported', 'clarifyingQuestions'],
    additionalProperties: false,
  };

  const lines: string[] = [];
  lines.push('# Catalogue (generated from the engine; this is everything that exists)');
  lines.push('');
  lines.push('## Step types you may use');
  for (const n of nodeTypes) {
    lines.push(`- ${n.type} — ${n.label}: ${n.description} Outputs: ${n.outputs}.${n.notes.length ? ` Notes: ${n.notes.join('; ')}.` : ''}${n.example ? ` Example config: ${json(n.example)}` : ''}`);
  }
  lines.push('');
  lines.push('## Step types that are NOT available (never use them; list the request under "unsupported")');
  for (const n of unavailableNodeTypes) lines.push(`- ${n.type} — ${n.label}: ${n.reason}`);
  lines.push('- Anything else (webhooks, custom code, HTTP calls, spreadsheets, loops back to an earlier step) does not exist.');
  lines.push('');
  lines.push('## Triggers (trigger.config.event) you may use');
  for (const e of readyEvents) {
    const t = WORKFLOW_TRIGGERS[e];
    const filters = zodToJsonSchema(WORKFLOW_TRIGGER_CONFIG_SCHEMAS[e]);
    const filterProps = Object.keys((filters.properties as object | undefined) ?? {});
    const network = [...mergeRootsForTrigger(e, { contractorId: null })].join(', ');
    lines.push(`- ${e} — ${t.label}: ${t.description} Contractor scope: ${t.contractorScope}. Merge-field groups available (network workflow): ${network}.${filterProps.length ? ` filters: ${json(filters)}` : ' filters: {} (none)'}`);
  }
  if (unavailableEvents.length) {
    lines.push('Triggers that are NOT available: ' + unavailableEvents.map((u) => `${u.event} (${u.label}: ${u.reason})`).join('; '));
  }
  lines.push('');
  lines.push(`## Events a wait_event step can wait for: ${readyWaitEvents.join(', ')}`);
  lines.push('');
  lines.push('## Merge fields for message text, written {{field}}. Use only these, and only groups the trigger provides ("contractor" needs a contractor-scoped workflow or trigger; "appointment" needs an appointment trigger; "estimate" needs an estimate trigger)');
  for (const v of GRAPH_VARIABLES) lines.push(`- {{${v.field}}} — ${v.label} (e.g. ${v.example})`);
  lines.push('');
  lines.push('## Condition fields (condition branches and trigger.config.entry). Use only these, or event.payload.<key> for a key the trigger event carries');
  for (const f of readyFields) {
    lines.push(`- ${f.field} — ${f.label}, ${f.valueType}${f.enumValues ? `, one of ${json(f.enumValues)}` : ''}${f.graphOnly ? ' (has a value only after the matching step ran)' : ''}${f.valueType === 'uuid' ? ' (needs a real id: do not use)' : ''}`);
  }
  lines.push(`Operators: ${CONDITION_OPERATORS.map((o) => `${o} (${OPERATOR_SEMANTICS[o]})`).join(' ')}`);
  lines.push(`Condition group shape: {"match":"all"|"any","conditions":[{"field":..,"operator":..,"value":..} or a nested group]}; at most ${MAX_CONDITION_DEPTH} levels and ${MAX_CONDITION_LEAVES} conditions.`);
  lines.push('');
  lines.push(`## Statuses a workflow may set: lead pipeline ${json(WORKFLOW_SETTABLE_LEAD_STATUSES)}; contractor pipeline ${json(WORKFLOW_SETTABLE_ASSIGNMENT_STATUSES)}. Nothing else (won/sold cannot be set).`);
  lines.push('');
  lines.push(`## Limits: at most ${MAX_GRAPH_NODES} steps and ${MAX_GRAPH_EDGES} connections; exactly one trigger; no cycles; each output connects to at most one step; a run lives ${DEFAULT_RUN_LIFETIME_DAYS} days by default (max ${MAX_RUN_LIFETIME_DAYS}).`);
  lines.push(`## Settings (workflow.settings, optional): ${json(settings)}`);

  return {
    nodeTypes,
    unavailableNodeTypes,
    readyEvents,
    unavailableEvents,
    readyWaitEvents,
    readyConditionFields: readyFields.map((f) => f.field),
    tool: {
      name: BUILD_TOOL_NAME,
      description: 'Return the draft workflow (or up to two clarifying questions) for the visual builder. This is the only way to answer. It saves nothing by itself and never publishes, sends or calls.',
      input_schema,
    },
    text: lines.join('\n'),
  };
}
