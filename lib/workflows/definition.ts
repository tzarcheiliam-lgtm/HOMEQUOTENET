import { z } from 'zod';
import { conditionField, conditionFieldsIn, workflowConditionGroupSchema, type WorkflowConditionGroup } from './conditions';
import {
  WORKFLOW_ACTIONS,
  WORKFLOW_ACTION_CONFIG_SCHEMAS,
  mergeFieldsIn,
  workflowActionTypeSchema,
  type WorkflowAction,
  type WorkflowActionType,
} from './actions';
import {
  WORKFLOW_TRIGGERS,
  workflowEventTypeSchema,
  workflowTriggerSchema,
  type WorkflowEventType,
  type WorkflowTrigger,
} from './events';
import { WORKFLOW_REENTRY_POLICIES, type WorkflowReentryPolicy } from './idempotency';

/**
 * Workflow = TRIGGER -> optional CONDITIONS -> ordered STEPS.
 *
 * Steps are flat records forming a tree (mirrors public.workflow_steps):
 * root steps have parentKey/branch null and run in `position` order; a
 * 'branch' step's children carry parentKey = that step and branch 'then' or
 * 'else'. Branching is representable now; the engine rejects it at enable
 * time until a later phase implements it (see validateWorkflowForEnable).
 */

export const STEP_KEY = /^[a-z][a-z0-9_]{0,63}$/;
export const MAX_WORKFLOW_STEPS = 50;

export const WORKFLOW_STEP_TYPES = ['action', 'branch'] as const;
export type WorkflowStepType = (typeof WORKFLOW_STEP_TYPES)[number];

interface StepBase {
  key: string;
  name?: string;
  position: number;
  parentKey: string | null;
  branch: 'then' | 'else' | null;
  /** action: optional guard (skip when false). branch: the branching test. */
  conditions: WorkflowConditionGroup | null;
}
export type WorkflowActionStep = StepBase & { stepType: 'action'; action: WorkflowAction };
export type WorkflowBranchStep = StepBase & { stepType: 'branch'; conditions: WorkflowConditionGroup };
export type WorkflowStep = WorkflowActionStep | WorkflowBranchStep;

const stepBase = {
  key: z.string().regex(STEP_KEY, 'Step keys are lower_snake_case'),
  name: z.string().trim().min(1).max(120).optional(),
  position: z.number().int().min(0),
  parentKey: z.string().regex(STEP_KEY).nullable().default(null),
  branch: z.enum(['then', 'else']).nullable().default(null),
};

const actionSchema = z
  .object({ type: workflowActionTypeSchema, config: z.record(z.unknown()).default({}) })
  .strict()
  .superRefine((action, ctx) => {
    const parsed = WORKFLOW_ACTION_CONFIG_SCHEMAS[action.type].safeParse(action.config);
    if (!parsed.success) for (const i of parsed.error.issues) ctx.addIssue({ ...i, path: ['config', ...i.path] });
  });

export const workflowStepSchema = z.discriminatedUnion('stepType', [
  z.object({ ...stepBase, stepType: z.literal('action'), action: actionSchema, conditions: workflowConditionGroupSchema.nullable().default(null) }).strict(),
  z.object({ ...stepBase, stepType: z.literal('branch'), conditions: workflowConditionGroupSchema }).strict(),
]);

export interface WorkflowDefinition {
  name: string;
  description?: string | null;
  trigger: WorkflowTrigger;
  conditions: WorkflowConditionGroup | null;
  exitEvents: WorkflowEventType[];
  reentryPolicy: WorkflowReentryPolicy;
  steps: WorkflowStep[];
}

export const workflowDefinitionSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(2000).nullable().optional(),
    trigger: workflowTriggerSchema,
    conditions: workflowConditionGroupSchema.nullable().default(null),
    exitEvents: z.array(workflowEventTypeSchema).max(14).default([]),
    reentryPolicy: z.enum(WORKFLOW_REENTRY_POLICIES).default('once_per_event'),
    steps: z.array(workflowStepSchema).min(1).max(MAX_WORKFLOW_STEPS),
  })
  .strict()
  .superRefine((def, ctx) => {
    const byKey = new Map<string, (typeof def.steps)[number]>();
    def.steps.forEach((s, i) => {
      if (byKey.has(s.key)) ctx.addIssue({ code: 'custom', path: ['steps', i, 'key'], message: `Duplicate step key "${s.key}"` });
      byKey.set(s.key, s);
    });
    const slots = new Set<string>();
    def.steps.forEach((s, i) => {
      if ((s.parentKey === null) !== (s.branch === null)) {
        ctx.addIssue({ code: 'custom', path: ['steps', i], message: 'parentKey and branch are set together' });
      }
      if (s.parentKey !== null) {
        const parent = byKey.get(s.parentKey);
        if (!parent || parent.stepType !== 'branch') {
          ctx.addIssue({ code: 'custom', path: ['steps', i, 'parentKey'], message: 'parentKey must name a branch step' });
        }
      }
      const slot = `${s.parentKey ?? ''}/${s.branch ?? ''}/${s.position}`;
      if (slots.has(slot)) ctx.addIssue({ code: 'custom', path: ['steps', i, 'position'], message: 'Two steps share a position' });
      slots.add(slot);
    });
    // Cycle guard for parent chains.
    for (const s of def.steps) {
      const seen = new Set<string>();
      let cur: string | null = s.key;
      while (cur) {
        if (seen.has(cur)) {
          ctx.addIssue({ code: 'custom', path: ['steps'], message: `Step tree has a cycle at "${cur}"` });
          break;
        }
        seen.add(cur);
        cur = byKey.get(cur)?.parentKey ?? null;
      }
    }
    if (def.exitEvents.includes(def.trigger.type)) {
      ctx.addIssue({ code: 'custom', path: ['exitEvents'], message: 'A workflow cannot exit on its own trigger' });
    }
  }) as unknown as z.ZodType<WorkflowDefinition, z.ZodTypeDef, unknown>;

export function parseWorkflowDefinition(input: unknown): WorkflowDefinition {
  return workflowDefinitionSchema.parse(input);
}

/** Root-level steps in execution order. */
export function orderedRootSteps(def: WorkflowDefinition): WorkflowStep[] {
  return def.steps.filter((s) => s.parentKey === null).sort((a, b) => a.position - b.position);
}

export function actionTypesIn(def: WorkflowDefinition): WorkflowActionType[] {
  return def.steps.flatMap((s) => (s.stepType === 'action' ? [s.action.type] : []));
}

// ---------------------------------------------------------------------------
// Enable-time rules: a definition can be SAVED while these fail (drafts,
// templates), but must pass before `enabled = true`.
// ---------------------------------------------------------------------------
export interface EnableIssue {
  code:
    | 'trigger_unavailable'
    | 'action_unavailable'
    | 'field_unavailable'
    | 'branching_not_supported'
    | 'assignment_required'
    | 'network_only_action'
    | 'variable_unavailable';
  message: string;
  stepKey?: string;
}

/**
 * Which merge-field roots a trigger can actually supply at run time. Mirrors
 * loadWorkflowEvaluationContext in runtime.server.ts: the lead is loaded for
 * every event, the appointment only for appointment events, the estimate only
 * for estimate.sent, the contractor only when the workflow or the event
 * belongs to a contractor. homequote.* always comes from server config.
 */
export function mergeRootsForTrigger(type: WorkflowEventType, owner: { contractorId: string | null }): Set<string> {
  const roots = new Set(['homequote', 'lead']);
  if (type.startsWith('appointment.')) roots.add('appointment');
  if (type === 'estimate.sent') roots.add('estimate');
  if (owner.contractorId !== null || WORKFLOW_TRIGGERS[type].contractorScope === 'required') roots.add('contractor');
  return roots;
}

function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsIn);
  return [];
}

export function validateWorkflowForEnable(def: WorkflowDefinition, owner: { contractorId: string | null }): EnableIssue[] {
  const issues: EnableIssue[] = [];
  const trigger = WORKFLOW_TRIGGERS[def.trigger.type];
  if (trigger.availability !== 'ready') {
    issues.push({ code: 'trigger_unavailable', message: `${def.trigger.type} is ${trigger.availability}` });
  }
  const fields = [...conditionFieldsIn(def.conditions), ...def.steps.flatMap((s) => conditionFieldsIn(s.conditions))];
  for (const field of new Set(fields)) {
    const d = conditionField(field);
    if (d && d.availability !== 'ready') issues.push({ code: 'field_unavailable', message: `${field} is ${d.availability}` });
  }
  const assignmentScoped = trigger.contractorScope === 'required';
  for (const s of def.steps) {
    if (s.stepType === 'branch') {
      issues.push({ code: 'branching_not_supported', message: 'Branch steps are not executable yet', stepKey: s.key });
      continue;
    }
    const d = WORKFLOW_ACTIONS[s.action.type];
    if (d.availability !== 'ready') {
      issues.push({ code: 'action_unavailable', message: `${s.action.type} is ${d.availability}`, stepKey: s.key });
    }
    const needsAssignment =
      d.requiresAssignment ||
      (s.action.type === 'change_pipeline_stage' && s.action.config.pipeline === 'assignment');
    if (needsAssignment && !assignmentScoped) {
      issues.push({ code: 'assignment_required', message: `${s.action.type} needs a contractor-scoped trigger`, stepKey: s.key });
    }
    // Variables must be something this trigger can supply; otherwise they
    // would silently render empty in every run.
    const roots = mergeRootsForTrigger(def.trigger.type, owner);
    const triggerLabel = WORKFLOW_TRIGGERS[def.trigger.type].label;
    const fieldsUsed = new Set(stringsIn(s.action.config).flatMap(mergeFieldsIn));
    if (s.action.type === 'wait' && s.action.config.mode === 'relative_to_field') fieldsUsed.add(s.action.config.field);
    for (const field of fieldsUsed) {
      const root = field.split('.')[0];
      if (root !== 'event' && !roots.has(root)) {
        issues.push({
          code: 'variable_unavailable',
          message: `Cannot enable workflow: {{${field}}} is not available for the ${triggerLabel} trigger.`,
          stepKey: s.key,
        });
      }
    }
    // Tenant rule: a contractor's workflow cannot touch HomeQuote's network
    // pipeline or its internal team.
    if (owner.contractorId !== null) {
      if (s.action.type === 'change_pipeline_stage' && s.action.config.pipeline === 'lead') {
        issues.push({ code: 'network_only_action', message: "Contractor workflows change only their own pipeline ('assignment')", stepKey: s.key });
      }
      if (s.action.type === 'notify_team' && s.action.config.audience.kind === 'lead_alert_team') {
        issues.push({ code: 'network_only_action', message: 'Only HomeQuote workflows alert the HomeQuote team', stepKey: s.key });
      }
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Rows <-> definition
// ---------------------------------------------------------------------------
export interface WorkflowRow {
  id: string;
  contractor_id: string | null;
  name: string;
  description: string | null;
  is_template: boolean;
  template_key: string | null;
  source_template_id: string | null;
  trigger_type: WorkflowEventType;
  trigger_config: Record<string, unknown>;
  conditions: WorkflowConditionGroup | null;
  exit_events: WorkflowEventType[];
  reentry_policy: WorkflowReentryPolicy;
  enabled: boolean;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStepRow {
  id: string;
  workflow_id: string;
  key: string;
  position: number;
  parent_step_id: string | null;
  branch: 'then' | 'else' | null;
  step_type: WorkflowStepType;
  action_type: WorkflowActionType | null;
  name: string | null;
  config: Record<string, unknown>;
  conditions: WorkflowConditionGroup | null;
  created_at: string;
  updated_at: string;
}

/** A stored workflow: its definition plus ownership/lifecycle metadata. */
export type Workflow = WorkflowDefinition & {
  id: string;
  contractorId: string | null;
  isTemplate: boolean;
  templateKey: string | null;
  sourceTemplateId: string | null;
  enabled: boolean;
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function workflowFromRows(row: WorkflowRow, stepRows: WorkflowStepRow[]): Workflow {
  const keyById = new Map(stepRows.map((s) => [s.id, s.key]));
  const definition = parseWorkflowDefinition({
    name: row.name,
    description: row.description,
    trigger: { type: row.trigger_type, config: row.trigger_config },
    conditions: row.conditions,
    exitEvents: row.exit_events,
    reentryPolicy: row.reentry_policy,
    steps: stepRows.map((s) => ({
      key: s.key,
      ...(s.name ? { name: s.name } : {}),
      position: s.position,
      parentKey: s.parent_step_id ? keyById.get(s.parent_step_id) ?? null : null,
      branch: s.branch,
      stepType: s.step_type,
      conditions: s.conditions,
      ...(s.step_type === 'action' ? { action: { type: s.action_type, config: s.config } } : {}),
    })),
  });
  return {
    ...definition,
    id: row.id,
    contractorId: row.contractor_id,
    isTemplate: row.is_template,
    templateKey: row.template_key,
    sourceTemplateId: row.source_template_id,
    enabled: row.enabled,
    version: row.version,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** workflow_steps inserts for a definition (ids assigned by the caller for parent links). */
export function stepRowsFor(
  workflowId: string,
  def: WorkflowDefinition,
  newId: () => string
): Omit<WorkflowStepRow, 'created_at' | 'updated_at'>[] {
  const ids = new Map(def.steps.map((s) => [s.key, newId()]));
  return def.steps.map((s) => ({
    id: ids.get(s.key)!,
    workflow_id: workflowId,
    key: s.key,
    position: s.position,
    parent_step_id: s.parentKey ? ids.get(s.parentKey)! : null,
    branch: s.branch,
    step_type: s.stepType,
    action_type: s.stepType === 'action' ? s.action.type : null,
    name: s.name ?? null,
    config: s.stepType === 'action' ? (s.action.config as Record<string, unknown>) : {},
    conditions: s.conditions,
  }));
}
