import { z } from 'zod';
import {
  APPOINTMENT_STATUS_VALUES,
  ASSIGNMENT_STATUS_VALUES,
  LEAD_STATUS_VALUES,
  QUALIFICATION_STATUS_VALUES,
  type Availability,
} from './domain';

/**
 * Condition model: { field, operator, value } leaves combined by all/any
 * groups. Used for workflow entry conditions, per-step guards and (future)
 * branch steps. Evaluation semantics are documented in
 * docs/workflow-automation-architecture.md#conditions and in OPERATOR_SEMANTICS.
 */

export const CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'in',
  'not_in',
  'exists',
  'not_exists',
  'greater_than',
  'less_than',
] as const;
export type WorkflowConditionOperator = (typeof CONDITION_OPERATORS)[number];

export const OPERATOR_SEMANTICS: Record<WorkflowConditionOperator, string> = {
  equals: 'Strict equality after resolving the field. Strings compare case-insensitively and trimmed.',
  not_equals: 'Negation of equals. A missing field is not_equals any value.',
  contains: 'String field: case-insensitive substring. Array field: has an element equal to value.',
  not_contains: 'Negation of contains. A missing field does not contain anything.',
  in: 'Field equals (per equals) at least one element of the value array.',
  not_in: 'Field equals none of the value array. A missing field is not_in any list.',
  exists: 'Field is present and not null/empty-string/empty-array. Takes no value.',
  not_exists: 'Negation of exists. Takes no value.',
  greater_than: 'Numeric comparison, or chronological for ISO date-times. Missing field -> false.',
  less_than: 'Numeric comparison, or chronological for ISO date-times. Missing field -> false.',
};

export type ConditionValueType = 'string' | 'number' | 'boolean' | 'datetime' | 'uuid' | 'string_array';

export interface ConditionFieldDefinition {
  field: string;
  label: string;
  valueType: ConditionValueType;
  /** When set, equals/in values must come from this list. */
  enumValues?: readonly string[];
  /** Where the value is read from in the existing schema. */
  source: string;
  availability: Availability;
}

const f = (d: ConditionFieldDefinition) => d;

/**
 * Known fields. Names use the existing column names (no renaming): "service
 * type" is the lead's vertical / sub-service, "pipeline stage" is leads.status
 * (network pipeline) or lead_assignments.status (per-contractor pipeline).
 */
export const CONDITION_FIELDS = [
  f({ field: 'contractor.id', label: 'Contractor', valueType: 'uuid', source: 'workflow_events.contractor_id', availability: 'ready' }),
  f({ field: 'lead.vertical_id', label: 'Service type (vertical)', valueType: 'uuid', source: 'leads.vertical_id', availability: 'ready' }),
  f({ field: 'lead.sub_service_id', label: 'Service type (sub-service)', valueType: 'uuid', source: 'leads.sub_service_id', availability: 'ready' }),
  f({ field: 'lead.source', label: 'Lead source', valueType: 'string', source: 'leads.source', availability: 'ready' }),
  f({ field: 'lead.platform', label: 'Lead platform', valueType: 'string', source: 'leads.platform', availability: 'ready' }),
  f({ field: 'lead.city', label: 'City', valueType: 'string', source: 'leads.city', availability: 'ready' }),
  f({ field: 'lead.state', label: 'State', valueType: 'string', source: 'leads.state', availability: 'ready' }),
  f({ field: 'lead.zip', label: 'ZIP', valueType: 'string', source: 'leads.zip', availability: 'ready' }),
  f({ field: 'lead.status', label: 'Pipeline stage (lead)', valueType: 'string', enumValues: LEAD_STATUS_VALUES, source: 'leads.status', availability: 'ready' }),
  f({ field: 'lead.qualification_status', label: 'Qualification', valueType: 'string', enumValues: QUALIFICATION_STATUS_VALUES, source: 'leads.qualification_status', availability: 'ready' }),
  f({ field: 'lead.consent_granted', label: 'Contact consent', valueType: 'boolean', source: 'leads.consent_granted', availability: 'ready' }),
  f({ field: 'lead.urgency', label: 'Urgency', valueType: 'string', source: 'leads.urgency', availability: 'ready' }),
  f({ field: 'lead.estimated_job_value', label: 'Estimated job value', valueType: 'number', source: 'leads.estimated_job_value', availability: 'ready' }),
  f({ field: 'lead.created_at', label: 'Lead created', valueType: 'datetime', source: 'leads.created_at', availability: 'ready' }),
  f({ field: 'assignment.status', label: 'Pipeline stage (contractor)', valueType: 'string', enumValues: ASSIGNMENT_STATUS_VALUES, source: 'lead_assignments.status', availability: 'ready' }),
  f({ field: 'appointment.status', label: 'Appointment status', valueType: 'string', enumValues: APPOINTMENT_STATUS_VALUES, source: 'appointments.status', availability: 'ready' }),
  f({ field: 'appointment.scheduled_at', label: 'Appointment time', valueType: 'datetime', source: 'appointments.scheduled_at', availability: 'ready' }),
  f({ field: 'lead.assigned_user_id', label: 'Assigned user', valueType: 'uuid', source: '(none: leads have no owner column yet)', availability: 'needs_domain' }),
  f({ field: 'lead.tags', label: 'Tags', valueType: 'string_array', source: '(none: no tags table yet)', availability: 'needs_domain' }),
] as const satisfies readonly ConditionFieldDefinition[];

export type WorkflowConditionField = (typeof CONDITION_FIELDS)[number]['field'];

/** Event payload values can be tested directly: `event.payload.toStatus`. */
export const EVENT_PAYLOAD_FIELD = /^event\.payload\.[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*){0,4}$/;

const FIELD_BY_NAME = new Map<string, ConditionFieldDefinition>(CONDITION_FIELDS.map((d) => [d.field, d]));
export function conditionField(field: string): ConditionFieldDefinition | undefined {
  return FIELD_BY_NAME.get(field);
}

const scalar = z.union([z.string().max(500), z.number().finite(), z.boolean()]);
export type ConditionScalar = z.infer<typeof scalar>;

export interface WorkflowCondition {
  field: string;
  operator: WorkflowConditionOperator;
  value?: ConditionScalar | ConditionScalar[];
}

export interface WorkflowConditionGroup {
  match: 'all' | 'any';
  conditions: (WorkflowCondition | WorkflowConditionGroup)[];
}

export const MAX_CONDITION_DEPTH = 3;
export const MAX_CONDITION_LEAVES = 50;

const isDateTime = (v: unknown) => typeof v === 'string' && z.string().datetime({ offset: true }).safeParse(v).success;

export const workflowConditionSchema: z.ZodType<WorkflowCondition> = z
  .object({
    field: z.string().min(1).max(120),
    operator: z.enum(CONDITION_OPERATORS),
    value: z.union([scalar, z.array(scalar).min(1).max(100)]).optional(),
  })
  .strict()
  .superRefine((c, ctx) => {
    const def = conditionField(c.field);
    if (!def && !EVENT_PAYLOAD_FIELD.test(c.field)) {
      ctx.addIssue({ code: 'custom', path: ['field'], message: `Unknown condition field "${c.field}"` });
      return;
    }
    const hasValue = c.value !== undefined;
    const isArray = Array.isArray(c.value);
    switch (c.operator) {
      case 'exists':
      case 'not_exists':
        if (hasValue) ctx.addIssue({ code: 'custom', path: ['value'], message: `${c.operator} takes no value` });
        return;
      case 'in':
      case 'not_in':
        if (!isArray) ctx.addIssue({ code: 'custom', path: ['value'], message: `${c.operator} needs a non-empty array` });
        break;
      case 'greater_than':
      case 'less_than':
        if (typeof c.value !== 'number' && !isDateTime(c.value)) {
          ctx.addIssue({ code: 'custom', path: ['value'], message: `${c.operator} needs a number or ISO date-time` });
        }
        if (def && def.valueType !== 'number' && def.valueType !== 'datetime') {
          ctx.addIssue({ code: 'custom', path: ['operator'], message: `${c.field} cannot be compared with ${c.operator}` });
        }
        return;
      case 'contains':
      case 'not_contains':
        if (typeof c.value !== 'string') ctx.addIssue({ code: 'custom', path: ['value'], message: `${c.operator} needs a string` });
        if (def && def.valueType !== 'string' && def.valueType !== 'string_array') {
          ctx.addIssue({ code: 'custom', path: ['operator'], message: `${c.field} does not support ${c.operator}` });
        }
        return;
      default:
        if (!hasValue || isArray) ctx.addIssue({ code: 'custom', path: ['value'], message: `${c.operator} needs a single value` });
    }
    // equals / not_equals / in / not_in: enum-typed fields only accept known values.
    if (def?.enumValues && hasValue) {
      const values = isArray ? (c.value as ConditionScalar[]) : [c.value as ConditionScalar];
      const bad = values.find((v) => typeof v !== 'string' || !def.enumValues!.includes(v));
      if (bad !== undefined) ctx.addIssue({ code: 'custom', path: ['value'], message: `"${String(bad)}" is not a valid ${c.field}` });
    }
    if (def?.valueType === 'boolean' && hasValue) {
      const values = isArray ? (c.value as ConditionScalar[]) : [c.value as ConditionScalar];
      if (values.some((v) => typeof v !== 'boolean')) ctx.addIssue({ code: 'custom', path: ['value'], message: `${c.field} is true/false` });
    }
  });

const isGroup = (n: WorkflowCondition | WorkflowConditionGroup): n is WorkflowConditionGroup => 'match' in n;

export const workflowConditionGroupSchema: z.ZodType<WorkflowConditionGroup> = z
  .lazy(() =>
    z
      .object({
        match: z.enum(['all', 'any']),
        conditions: z.array(z.union([workflowConditionGroupSchema, workflowConditionSchema])).min(1).max(MAX_CONDITION_LEAVES),
      })
      .strict()
  )
  .superRefine((group, ctx) => {
    let leaves = 0;
    const walk = (g: WorkflowConditionGroup, depth: number) => {
      if (depth > MAX_CONDITION_DEPTH) {
        ctx.addIssue({ code: 'custom', message: `Condition groups nest at most ${MAX_CONDITION_DEPTH} deep` });
        return;
      }
      for (const n of g.conditions) {
        if (isGroup(n)) walk(n, depth + 1);
        else leaves += 1;
      }
    };
    walk(group, 1);
    if (leaves > MAX_CONDITION_LEAVES) ctx.addIssue({ code: 'custom', message: `At most ${MAX_CONDITION_LEAVES} conditions` });
  });

/** Every field referenced anywhere in a group (for availability checks). */
export function conditionFieldsIn(group: WorkflowConditionGroup | null | undefined): string[] {
  if (!group) return [];
  return group.conditions.flatMap((n) => (isGroup(n) ? conditionFieldsIn(n) : [n.field]));
}
