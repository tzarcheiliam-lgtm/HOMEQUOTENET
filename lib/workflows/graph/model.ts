import { z } from 'zod';
import { workflowConditionGroupSchema, type WorkflowConditionGroup } from '../conditions';
import { LEAD_STATUS_VALUES, uuidSchema } from '../domain';
import { WORKFLOW_EVENT_TYPES, WORKFLOW_TRIGGER_CONFIG_SCHEMAS, type WorkflowEventType } from '../events';
import { WORKFLOW_REENTRY_POLICIES } from '../idempotency';
import { isValidTimeZone, DEFAULT_WORKFLOW_TIMEZONE } from '../wait';
import { CALL_OUTCOMES, CALL_OUTCOME_LABELS, type CallOutcome } from './call-outcomes';

/**
 * Visual workflow graph (schemaVersion 2).
 *
 * A graph is a controlled structure, not free-form boxes and lines:
 *   - exactly ONE trigger node, no incoming edges;
 *   - every connection leaves a NAMED output handle (`next`, a condition branch id,
 *     an AI-call outcome...) and each handle has AT MOST ONE outgoing edge, so the
 *     engine never has to guess where a branch goes;
 *   - no cycles (loops are expressed with bounded retry settings, not back-edges);
 *   - an unconnected handle ends the run there (flagged as a warning).
 * The same validator (validate.ts) gates the editor, publishing and the executor.
 */

export const GRAPH_SCHEMA_VERSION = 2;
export const MAX_GRAPH_NODES = 60;
export const MAX_GRAPH_EDGES = 120;
/** A run may visit at most this many nodes in total (defence in depth against runaway graphs). */
export const MAX_NODE_VISITS = 100;
/** Default and maximum total lifetime of one run, in days. */
export const DEFAULT_RUN_LIFETIME_DAYS = 30;
export const MAX_RUN_LIFETIME_DAYS = 90;

export const NODE_ID = /^[a-z][a-z0-9_]{0,63}$/;
export const HANDLE_ID = /^[a-z][a-z0-9_]{0,63}$/;

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------
export const GRAPH_NODE_TYPES = [
  'trigger',
  'send_email',
  'send_sms',
  'ai_call',
  'create_task',
  'add_note',
  'update_lead_status',
  'assign_lead',
  'send_notification',
  'wait_duration',
  'wait_business_hours',
  'wait_event',
  'condition',
  'end',
] as const;
export type GraphNodeType = (typeof GRAPH_NODE_TYPES)[number];
export const graphNodeTypeSchema = z.enum(GRAPH_NODE_TYPES);

export type NodeKind = 'trigger' | 'action' | 'wait' | 'condition' | 'end';
export type NodeCategory = 'start' | 'contact' | 'records' | 'timing' | 'logic' | 'finish';
export const NODE_CATEGORY_LABELS: Record<NodeCategory, string> = {
  start: 'Start',
  contact: 'Contact the homeowner',
  records: 'Update records & team',
  timing: 'Wait',
  logic: 'Decide',
  finish: 'Finish',
};

/** `ready`: executable today. `setup_required`: shape final, provider not connected, cannot be published. */
export type NodeAvailability = 'ready' | 'setup_required';

export interface HandleDef {
  id: string;
  label: string;
  /** Visual tone only. */
  tone: 'default' | 'good' | 'warn' | 'bad' | 'muted';
}

// ---------------------------------------------------------------------------
// Merge fields (variables). Only verified fields; unknown ones are validation errors.
// ---------------------------------------------------------------------------
export interface GraphVariable {
  field: string;
  label: string;
  group: 'Homeowner' | 'Project' | 'Appointment' | 'Estimate' | 'Contractor' | 'HomeQuote';
  example: string;
  /** Where the value really comes from (shown in the picker so nothing is invented). */
  source: string;
}

export const GRAPH_VARIABLES: readonly GraphVariable[] = [
  { field: 'lead.first_name', label: 'Homeowner first name', group: 'Homeowner', example: 'Sarah', source: 'leads.first_name' },
  { field: 'lead.last_name', label: 'Homeowner last name', group: 'Homeowner', example: 'Nguyen', source: 'leads.last_name' },
  { field: 'lead.full_name', label: 'Homeowner full name', group: 'Homeowner', example: 'Sarah Nguyen', source: 'leads.first_name + last_name' },
  { field: 'lead.city', label: 'City', group: 'Homeowner', example: 'Austin', source: 'leads.city' },
  { field: 'lead.zip', label: 'ZIP code', group: 'Homeowner', example: '78701', source: 'leads.zip' },
  { field: 'lead.project_type', label: 'Project type', group: 'Project', example: 'Pool installation', source: 'sub_services.name / verticals.name' },
  { field: 'appointment.scheduled_at', label: 'Appointment time', group: 'Appointment', example: 'Friday, October 9 at 2:00 PM', source: 'appointments.scheduled_at' },
  { field: 'appointment.location', label: 'Appointment location', group: 'Appointment', example: '123 Main St, Austin', source: 'appointments.location' },
  { field: 'estimate.amount', label: 'Estimate amount', group: 'Estimate', example: '$42,000', source: 'estimates.amount' },
  { field: 'contractor.name', label: 'Contractor name', group: 'Contractor', example: 'Blue Wave Pools', source: 'contractors.name' },
  { field: 'homequote.phone', label: 'HomeQuote phone', group: 'HomeQuote', example: '(555) 010-0100', source: 'server configuration' },
  { field: 'homequote.site_url', label: 'HomeQuote website', group: 'HomeQuote', example: 'https://homequote.net', source: 'server configuration' },
];
export const GRAPH_MERGE_FIELDS = GRAPH_VARIABLES.map((v) => v.field);

const MERGE_TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g;
export const mergeTokensIn = (text: string): string[] => Array.from(text.matchAll(MERGE_TOKEN), (m) => m[1]);

const templated = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .superRefine((text, ctx) => {
      for (const field of mergeTokensIn(text)) {
        if (!GRAPH_MERGE_FIELDS.includes(field)) ctx.addIssue({ code: 'custom', message: `Unknown variable {{${field}}}` });
      }
    });

// ---------------------------------------------------------------------------
// Per-type configuration schemas
// ---------------------------------------------------------------------------
const onError = z.enum(['fail_run', 'continue']).default('fail_run');

export const WAIT_EVENT_TYPES = [
  'appointment.booked',
  'appointment.cancelled',
  'appointment.rescheduled',
  'appointment.completed',
  'estimate.accepted',
  'deal.won',
  'deal.lost',
  'lead.status_changed',
  'ai_call.completed',
] as const satisfies readonly WorkflowEventType[];

/** Statuses a workflow may set. Won/sold and distribution statuses are deliberately excluded. */
export const WORKFLOW_SETTABLE_LEAD_STATUSES = ['contact_attempted', 'qualified', 'appointment_set', 'estimate_sent', 'lost', 'cancelled'] as const;
export const WORKFLOW_SETTABLE_ASSIGNMENT_STATUSES = ['contacted', 'no_answer', 'qualified', 'appointment_set', 'lost', 'not_qualified'] as const;

export const CALL_PURPOSES = [
  'qualification',
  'appointment_confirmation',
  'appointment_reminder',
  'reschedule_follow_up',
  'estimate_follow_up',
  'missed_call_follow_up',
] as const;
export type CallPurpose = (typeof CALL_PURPOSES)[number];
/** Trusted wording handed to the agent as `call_purpose`. Never user-typed. */
export const CALL_PURPOSE_TEXT: Record<CallPurpose, { label: string; agent: string }> = {
  qualification: { label: 'Qualify a new lead', agent: 'Qualify the new lead and offer to book an estimate appointment' },
  appointment_confirmation: { label: 'Confirm an appointment', agent: 'Confirm the booked appointment' },
  appointment_reminder: { label: 'Appointment reminder', agent: 'Remind the homeowner about their upcoming appointment' },
  reschedule_follow_up: { label: 'Reschedule follow-up', agent: 'Help the homeowner choose a new appointment time' },
  estimate_follow_up: { label: 'Estimate follow-up', agent: 'Ask whether the homeowner has questions about the estimate they received' },
  missed_call_follow_up: { label: 'Missed-call follow-up', agent: 'Follow up on an earlier missed call' },
};

/** The ONLY lead/appointment facts an AI call may receive. Free text typed by a homeowner is never sent. */
export const CALL_CONTEXT_FIELDS = [
  { key: 'project_type', label: 'Project type', variable: 'lead.project_type' },
  { key: 'city', label: 'City', variable: 'lead.city' },
  { key: 'appointment_time', label: 'Appointment time', variable: 'appointment.scheduled_at' },
  { key: 'estimate_amount', label: 'Estimate amount', variable: 'estimate.amount' },
] as const;
export type CallContextKey = (typeof CALL_CONTEXT_FIELDS)[number]['key'];

const triggerConfig = z
  .object({
    event: z.enum(WORKFLOW_EVENT_TYPES),
    filters: z.record(z.unknown()).default({}),
    entry: workflowConditionGroupSchema.nullable().default(null),
  })
  .strict()
  .superRefine((c, ctx) => {
    const parsed = WORKFLOW_TRIGGER_CONFIG_SCHEMAS[c.event].safeParse(c.filters);
    if (!parsed.success) for (const i of parsed.error.issues) ctx.addIssue({ ...i, path: ['filters', ...i.path] });
  });

export const NODE_CONFIG_SCHEMAS = {
  trigger: triggerConfig,
  send_email: z
    .object({
      to: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('lead') }).strict(),
        z.object({ kind: z.literal('recipients'), recipientIds: z.array(uuidSchema).min(1).max(20) }).strict(),
      ]),
      templateId: uuidSchema.optional(),
      subject: templated(200).optional(),
      body: templated(10_000).optional(),
      onError,
    })
    .strict()
    .refine((c) => !!c.templateId || (!!c.subject && !!c.body), 'Choose a saved template or enter a subject and message'),
  send_sms: z.object({ body: templated(1600), onError }).strict(),
  ai_call: z
    .object({
      purpose: z.enum(CALL_PURPOSES),
      /** Optional admin-written note appended to the trusted purpose text (sanitized, 200 chars). */
      note: z.string().trim().max(200).optional(),
      contextFields: z.array(z.enum(['project_type', 'city', 'appointment_time', 'estimate_amount'])).max(4).default([]),
      /** Total dial attempts for THIS node (1 = no redial). The global cap in AI-call settings still applies. */
      maxAttempts: z.number().int().min(1).max(3).default(1),
      retryDelayMinutes: z.number().int().min(15).max(1440).default(60),
      /** Optional narrowing of the global calling window (never widens it). */
      windowStartHour: z.number().int().min(0).max(23).optional(),
      windowEndHour: z.number().int().min(1).max(24).optional(),
      /** How long to wait for a final result before taking the "No result in time" path. */
      resultTimeoutMinutes: z.number().int().min(30).max(4320).default(360),
      /** After the call ends, how long to wait for the post-call analysis before sending it to human review. */
      analysisGraceMinutes: z.number().int().min(5).max(240).default(30),
    })
    .strict()
    .superRefine((c, ctx) => {
      if (c.windowStartHour !== undefined && c.windowEndHour !== undefined && c.windowStartHour >= c.windowEndHour) {
        ctx.addIssue({ code: 'custom', path: ['windowEndHour'], message: 'The calling window must end after it starts' });
      }
    }),
  create_task: z
    .object({
      title: templated(200),
      description: templated(2000).optional(),
      dueInMinutes: z.number().int().min(0).max(129_600).optional(),
      assignee: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('unassigned') }).strict(),
        z.object({ kind: z.literal('assigned_user') }).strict(),
        z.object({ kind: z.literal('user'), userId: uuidSchema }).strict(),
      ]).default({ kind: 'unassigned' }),
      onError,
    })
    .strict(),
  add_note: z.object({ body: templated(2000), onError }).strict(),
  update_lead_status: z
    .discriminatedUnion('pipeline', [
      z.object({ pipeline: z.literal('lead'), status: z.enum(WORKFLOW_SETTABLE_LEAD_STATUSES), onError }).strict(),
      z.object({ pipeline: z.literal('assignment'), status: z.enum(WORKFLOW_SETTABLE_ASSIGNMENT_STATUSES), onError }).strict(),
    ]),
  assign_lead: z
    .object({
      strategy: z.enum(['specific', 'round_robin']),
      userIds: z.array(uuidSchema).min(1).max(25),
      onError,
    })
    .strict()
    .refine((c) => c.strategy !== 'specific' || c.userIds.length === 1, 'A specific assignment names exactly one person'),
  send_notification: z
    .object({
      audience: z.enum(['admins', 'assigned_setter', 'assigned_caller', 'assigned_contractor', 'specific_user']),
      userId: uuidSchema.optional(),
      title: z.string().trim().min(1).max(100),
      body: z.string().trim().max(200).default(''),
      onError,
    })
    .strict()
    .refine((c) => c.audience !== 'specific_user' || !!c.userId, 'Choose the team member to notify'),
  wait_duration: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('duration'), amount: z.number().int().positive(), unit: z.enum(['minutes', 'hours', 'days']) }).strict(),
    z
      .object({
        mode: z.literal('before_appointment'),
        hoursBefore: z.number().int().min(1).max(720),
        /** When the moment has already passed: carry on right away, or end the workflow. */
        ifPast: z.enum(['continue', 'end']).default('end'),
      })
      .strict(),
  ]).refine((c) => c.mode !== 'duration' || c.amount * { minutes: 60_000, hours: 3_600_000, days: 86_400_000 }[c.unit] <= 90 * 86_400_000, 'A single wait is at most 90 days'),
  wait_business_hours: z
    .object({
      /** 0 = Sunday ... 6 = Saturday. */
      days: z.array(z.number().int().min(0).max(6)).min(1).max(7).default([1, 2, 3, 4, 5]),
      startHour: z.number().int().min(0).max(23).default(9),
      endHour: z.number().int().min(1).max(24).default(17),
      /** `lead` = the homeowner's local time (from state/ZIP); falls back to `timezone` when unknown. */
      zone: z.enum(['lead', 'fixed']).default('lead'),
      timezone: z.string().min(1).max(64).refine(isValidTimeZone, 'Unknown time zone').default(DEFAULT_WORKFLOW_TIMEZONE),
      /** Always wait at least this long before looking for a window. */
      minimumDelayMinutes: z.number().int().min(0).max(10_080).default(0),
    })
    .strict()
    .refine((c) => c.startHour < c.endHour, 'The window must end after it starts'),
  wait_event: z
    .object({
      event: z.enum(WAIT_EVENT_TYPES),
      toStatuses: z.array(z.enum(LEAD_STATUS_VALUES)).min(1).optional(),
      timeoutMinutes: z.number().int().min(5).max(43_200),
    })
    .strict()
    .refine((c) => c.event === 'lead.status_changed' || !c.toStatuses, 'Status filters apply to "Lead stage changed" only'),
  condition: z
    .object({
      branches: z
        .array(
          z.object({
            id: z.string().regex(HANDLE_ID),
            label: z.string().trim().min(1).max(60),
            conditions: workflowConditionGroupSchema,
          }).strict()
        )
        .min(1)
        .max(5),
    })
    .strict()
    .superRefine((c, ctx) => {
      const seen = new Set<string>();
      c.branches.forEach((b, i) => {
        if (b.id === 'else' || seen.has(b.id)) ctx.addIssue({ code: 'custom', path: ['branches', i, 'id'], message: 'Branch ids are unique and not "else"' });
        seen.add(b.id);
      });
    }),
  end: z.object({ reason: z.string().trim().max(200).optional() }).strict(),
} as const satisfies Record<GraphNodeType, z.ZodTypeAny>;

export type NodeConfigOf<T extends GraphNodeType> = z.input<(typeof NODE_CONFIG_SCHEMAS)[T]>;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export interface NodeTypeDef {
  type: GraphNodeType;
  kind: NodeKind;
  category: NodeCategory;
  /** Plain-language default step name, e.g. "Call homeowner". */
  label: string;
  description: string;
  /** lucide-react icon name. */
  icon: string;
  availability: NodeAvailability;
  setupNote?: string;
  /** Reaches out to the homeowner: suppressed after an opt-out, needs consent. */
  contactsHomeowner: boolean;
  /** Needs a lead on the run. */
  requiresLead: boolean;
  /** Needs a contractor (workflow's own, or the event's). */
  requiresContractor: boolean;
  /** Needs a lead_assignment (contractor-side record). */
  requiresAssignment: boolean;
  /** Retry budget for temporary failures. */
  maxAttempts: number;
  keywords: string[];
}

const def = (d: NodeTypeDef) => d;

export const NODE_TYPES: Record<GraphNodeType, NodeTypeDef> = {
  trigger: def({ type: 'trigger', kind: 'trigger', category: 'start', label: 'When this happens', description: 'The event that enrolls a lead.', icon: 'Zap', availability: 'ready', contactsHomeowner: false, requiresLead: false, requiresContractor: false, requiresAssignment: false, maxAttempts: 1, keywords: ['start', 'trigger', 'event'] }),
  send_email: def({ type: 'send_email', kind: 'action', category: 'contact', label: 'Send email', description: 'Send a saved email template or a custom message through the connected Gmail account.', icon: 'Mail', availability: 'ready', contactsHomeowner: true, requiresLead: true, requiresContractor: false, requiresAssignment: false, maxAttempts: 5, keywords: ['email', 'message', 'template'] }),
  send_sms: def({ type: 'send_sms', kind: 'action', category: 'contact', label: 'Send text message', description: 'Text the homeowner.', icon: 'MessageSquare', availability: 'setup_required', setupNote: 'No SMS provider is connected. Connect one before this step can be used.', contactsHomeowner: true, requiresLead: true, requiresContractor: false, requiresAssignment: false, maxAttempts: 5, keywords: ['sms', 'text'] }),
  ai_call: def({ type: 'ai_call', kind: 'action', category: 'contact', label: 'Call homeowner', description: 'An AI voice agent (Fish Audio) calls the homeowner. The workflow waits for the result and branches on it.', icon: 'PhoneCall', availability: 'ready', contactsHomeowner: true, requiresLead: true, requiresContractor: true, requiresAssignment: false, maxAttempts: 3, keywords: ['call', 'phone', 'ai', 'voice', 'fish', 'qualify'] }),
  create_task: def({ type: 'create_task', kind: 'action', category: 'records', label: 'Create staff task', description: 'Add a follow-up task or reminder for your team.', icon: 'ListTodo', availability: 'ready', contactsHomeowner: false, requiresLead: false, requiresContractor: false, requiresAssignment: false, maxAttempts: 3, keywords: ['task', 'reminder', 'follow up', 'todo'] }),
  add_note: def({ type: 'add_note', kind: 'action', category: 'records', label: 'Add lead note', description: 'Write a note on the lead timeline.', icon: 'StickyNote', availability: 'ready', contactsHomeowner: false, requiresLead: true, requiresContractor: false, requiresAssignment: false, maxAttempts: 3, keywords: ['note', 'timeline', 'log'] }),
  update_lead_status: def({ type: 'update_lead_status', kind: 'action', category: 'records', label: 'Update lead status', description: 'Move the lead to an allowed pipeline stage.', icon: 'ArrowRightLeft', availability: 'ready', contactsHomeowner: false, requiresLead: true, requiresContractor: false, requiresAssignment: false, maxAttempts: 3, keywords: ['status', 'stage', 'pipeline'] }),
  assign_lead: def({ type: 'assign_lead', kind: 'action', category: 'records', label: 'Assign to team member', description: 'Assign the lead to an eligible person on the contractor team.', icon: 'UserCheck', availability: 'ready', contactsHomeowner: false, requiresLead: true, requiresContractor: true, requiresAssignment: true, maxAttempts: 3, keywords: ['assign', 'owner', 'team'] }),
  send_notification: def({ type: 'send_notification', kind: 'action', category: 'records', label: 'Notify team', description: 'Send an internal push / in-app notification. No homeowner details are included.', icon: 'Bell', availability: 'ready', contactsHomeowner: false, requiresLead: false, requiresContractor: false, requiresAssignment: false, maxAttempts: 3, keywords: ['notify', 'alert', 'push', 'internal'] }),
  wait_duration: def({ type: 'wait_duration', kind: 'wait', category: 'timing', label: 'Wait', description: 'Pause for a set amount of time.', icon: 'Timer', availability: 'ready', contactsHomeowner: false, requiresLead: false, requiresContractor: false, requiresAssignment: false, maxAttempts: 1, keywords: ['delay', 'wait', 'pause'] }),
  wait_business_hours: def({ type: 'wait_business_hours', kind: 'wait', category: 'timing', label: 'Wait until next business day', description: 'Pause until the next allowed business-hours window.', icon: 'CalendarClock', availability: 'ready', contactsHomeowner: false, requiresLead: false, requiresContractor: false, requiresAssignment: false, maxAttempts: 1, keywords: ['business hours', 'next day', 'window', 'morning'] }),
  wait_event: def({ type: 'wait_event', kind: 'wait', category: 'timing', label: 'Wait for something to happen', description: 'Pause until an event happens for this lead (or a timeout passes).', icon: 'Hourglass', availability: 'ready', contactsHomeowner: false, requiresLead: true, requiresContractor: false, requiresAssignment: false, maxAttempts: 1, keywords: ['event', 'until', 'timeout', 'appointment', 'estimate'] }),
  condition: def({ type: 'condition', kind: 'condition', category: 'logic', label: 'If / else', description: 'Branch on lead details, estimate or call results. First matching branch wins; otherwise "Else".', icon: 'GitBranch', availability: 'ready', contactsHomeowner: false, requiresLead: false, requiresContractor: false, requiresAssignment: false, maxAttempts: 1, keywords: ['if', 'else', 'branch', 'condition', 'decide'] }),
  end: def({ type: 'end', kind: 'end', category: 'finish', label: 'End workflow', description: 'Finish the run here.', icon: 'Flag', availability: 'ready', contactsHomeowner: false, requiresLead: false, requiresContractor: false, requiresAssignment: false, maxAttempts: 1, keywords: ['end', 'stop', 'finish'] }),
};

export const NODE_TYPE_LIST = GRAPH_NODE_TYPES.map((t) => NODE_TYPES[t]);

/** Output handles a node exposes, given its configuration. */
export function handlesFor(type: GraphNodeType, config: Record<string, unknown> | undefined): HandleDef[] {
  switch (type) {
    case 'end':
      return [];
    case 'wait_event':
      return [
        { id: 'received', label: 'It happened', tone: 'good' },
        { id: 'timed_out', label: 'Timed out', tone: 'warn' },
      ];
    case 'condition': {
      const branches = Array.isArray(config?.branches) ? (config!.branches as { id?: unknown; label?: unknown }[]) : [];
      return [
        ...branches
          .filter((b) => typeof b.id === 'string')
          .map((b) => ({ id: b.id as string, label: typeof b.label === 'string' && b.label ? b.label : (b.id as string), tone: 'default' as const })),
        { id: 'else', label: 'Else', tone: 'muted' },
      ];
    }
    case 'ai_call': {
      const tone = (o: CallOutcome): HandleDef['tone'] =>
        o === 'booked' || o === 'qualified_awaiting_scheduling' ? 'good'
          : o === 'callback_requested' || o === 'needs_human_review' ? 'warn'
          : o === 'no_answer' ? 'muted' : 'bad';
      return CALL_OUTCOMES.map((o) => ({ id: o, label: CALL_OUTCOME_LABELS[o], tone: tone(o) }));
    }
    default:
      return [{ id: 'next', label: 'Next', tone: 'default' }];
  }
}

// ---------------------------------------------------------------------------
// Graph structure
// ---------------------------------------------------------------------------
export interface GraphNode {
  id: string;
  type: GraphNodeType;
  /** Optional user-chosen name; the registry label is used when absent. */
  name?: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}
export interface GraphEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
}

export type ReentryPolicy = (typeof WORKFLOW_REENTRY_POLICIES)[number];
export interface GraphSettings {
  /** once_per_event = every qualifying event; once_per_entity = once per lead, ever; one_active_per_entity = never two active runs for one lead. */
  reentry: ReentryPolicy;
  /** Events that cancel an active run for the same lead. */
  exitEvents: WorkflowEventType[];
  /** Allow authorized users to enroll a lead by hand (in addition to the trigger). */
  allowManualEnrollment: boolean;
  /** A run that is still going after this many days is stopped. */
  runLifetimeDays: number;
}
export interface WorkflowGraph {
  schemaVersion: 2;
  nodes: GraphNode[];
  edges: GraphEdge[];
  settings: GraphSettings;
}

export const graphNodeSchema = z
  .object({
    id: z.string().regex(NODE_ID),
    type: graphNodeTypeSchema,
    name: z.string().trim().min(1).max(120).optional(),
    position: z.object({ x: z.number().finite(), y: z.number().finite() }).strict(),
    config: z.record(z.unknown()).default({}),
  })
  .strict();
export const graphEdgeSchema = z
  .object({
    id: z.string().min(1).max(160),
    source: z.string().regex(NODE_ID),
    sourceHandle: z.string().regex(HANDLE_ID),
    target: z.string().regex(NODE_ID),
  })
  .strict();
export const graphSettingsSchema = z
  .object({
    reentry: z.enum(WORKFLOW_REENTRY_POLICIES).default('once_per_entity'),
    exitEvents: z.array(z.enum(WORKFLOW_EVENT_TYPES)).max(24).default([]),
    allowManualEnrollment: z.boolean().default(false),
    runLifetimeDays: z.number().int().min(1).max(MAX_RUN_LIFETIME_DAYS).default(DEFAULT_RUN_LIFETIME_DAYS),
  })
  .strict();
/** Structural shape only (sizes, ids, enums). Semantic rules live in validateGraph(). */
export const workflowGraphSchema = z
  .object({
    schemaVersion: z.literal(2),
    nodes: z.array(graphNodeSchema).max(MAX_GRAPH_NODES),
    edges: z.array(graphEdgeSchema).max(MAX_GRAPH_EDGES),
    settings: graphSettingsSchema,
  })
  .strict();

export function parseWorkflowGraph(input: unknown): WorkflowGraph {
  return workflowGraphSchema.parse(input) as WorkflowGraph;
}

export const nodeDisplayName = (n: Pick<GraphNode, 'type' | 'name'>) => n.name?.trim() || NODE_TYPES[n.type].label;

export interface TriggerFacts {
  event: WorkflowEventType;
  filters: Record<string, unknown>;
  entry: WorkflowConditionGroup | null;
}
export function triggerOf(graph: WorkflowGraph): { node: GraphNode; config: TriggerFacts } | null {
  const node = graph.nodes.find((n) => n.type === 'trigger');
  if (!node) return null;
  const parsed = NODE_CONFIG_SCHEMAS.trigger.safeParse(node.config);
  return parsed.success ? { node, config: parsed.data as TriggerFacts } : null;
}

export function edgesFrom(graph: WorkflowGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter((e) => e.source === nodeId);
}
export function nodeById(graph: WorkflowGraph, id: string): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}
/** The node an output handle leads to, or null when the handle is unconnected. */
export function targetOf(graph: WorkflowGraph, nodeId: string, handle: string): GraphNode | null {
  const edge = graph.edges.find((e) => e.source === nodeId && e.sourceHandle === handle);
  return edge ? nodeById(graph, edge.target) ?? null : null;
}
