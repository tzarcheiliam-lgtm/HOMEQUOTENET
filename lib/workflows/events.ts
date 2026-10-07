import { z } from 'zod';
import {
  appointmentStatusSchema,
  assignmentStatusSchema,
  isoDateTimeSchema,
  leadStatusSchema,
  qualificationStatusSchema,
  uuidSchema,
  workflowEntityTypeSchema,
  type Availability,
  type WorkflowEntityType,
} from './domain';

/**
 * Canonical workflow events. A trigger IS an event type: a workflow's
 * trigger_type is one of WORKFLOW_EVENT_TYPES, and every event arrives as one
 * WorkflowEvent envelope (one row in public.workflow_events).
 *
 * Names follow the existing domain: HomeQuote's "deal" is a lead_assignment
 * (one lead sold to one contractor), appointment "completed" is the
 * appointments.status value 'held'. Nothing in the app is renamed.
 */

export const WORKFLOW_EVENT_TYPES = [
  'lead.created',
  'lead.status_changed',
  'lead.qualification_changed',
  'lead.assigned',
  'assignment.status_changed',
  'appointment.booked',
  'appointment.cancelled',
  'appointment.completed',
  'appointment.no_show',
  'appointment.rescheduled',
  'estimate.sent',
  'estimate.accepted',
  'deal.won',
  'deal.lost',
  'task.completed',
  'message.received',
  // Visual builder (migration 0041): AI call results and explicit enrollment.
  'ai_call.completed',
  'ai_call.failed',
  'workflow.manual_enrollment',
] as const;
export type WorkflowEventType = (typeof WORKFLOW_EVENT_TYPES)[number];
/** Triggers and events share one vocabulary. */
export type WorkflowTriggerType = WorkflowEventType;
export const workflowEventTypeSchema = z.enum(WORKFLOW_EVENT_TYPES);

export const WORKFLOW_ACTOR_TYPES = ['user', 'system', 'integration', 'contact', 'workflow'] as const;
export type WorkflowActorType = (typeof WORKFLOW_ACTOR_TYPES)[number];

// ---------------------------------------------------------------------------
// Payloads (camelCase; ids are uuids of existing rows)
// ---------------------------------------------------------------------------
const nullableUuid = uuidSchema.nullable();
const assignmentScope = { leadId: uuidSchema, assignmentId: uuidSchema, contractorId: uuidSchema };
const appointmentChange = z
  .object({
    ...assignmentScope,
    appointmentId: uuidSchema,
    scheduledAt: isoDateTimeSchema.nullable(),
    fromStatus: appointmentStatusSchema.nullable(),
    toStatus: appointmentStatusSchema,
  })
  .strict();

export const WORKFLOW_EVENT_PAYLOAD_SCHEMAS = {
  'lead.created': z
    .object({
      leadId: uuidSchema,
      status: leadStatusSchema,
      qualificationStatus: qualificationStatusSchema,
      source: z.string().max(100).nullable(),
      verticalId: nullableUuid,
      subServiceId: nullableUuid,
      city: z.string().max(200).nullable(),
      zip: z.string().max(20).nullable(),
      intakeEventId: nullableUuid.optional(),
      funnelSlug: z.string().max(80).optional(),
    })
    .strict(),
  'lead.status_changed': z
    .object({ leadId: uuidSchema, fromStatus: leadStatusSchema.nullable(), toStatus: leadStatusSchema })
    .strict(),
  'lead.qualification_changed': z
    .object({ leadId: uuidSchema, fromStatus: qualificationStatusSchema.nullable(), toStatus: qualificationStatusSchema })
    .strict(),
  'lead.assigned': z
    .object({ ...assignmentScope, assignedBy: nullableUuid.optional(), viaRecipientId: nullableUuid.optional() })
    .strict(),
  'assignment.status_changed': z
    .object({ ...assignmentScope, fromStatus: assignmentStatusSchema.nullable(), toStatus: assignmentStatusSchema })
    .strict(),
  // A funnel booking on a house lead has no assignment/appointment yet.
  'appointment.booked': z
    .object({
      leadId: uuidSchema,
      assignmentId: nullableUuid,
      contractorId: nullableUuid,
      appointmentId: nullableUuid,
      scheduledAt: isoDateTimeSchema.nullable(),
      bookingProvider: z.string().max(40).optional(),
      externalBookingId: z.string().max(500).optional(),
    })
    .strict(),
  'appointment.cancelled': appointmentChange,
  'appointment.completed': appointmentChange,
  'appointment.no_show': appointmentChange,
  'appointment.rescheduled': z
    .object({
      ...assignmentScope,
      appointmentId: uuidSchema,
      scheduledAt: isoDateTimeSchema.nullable(),
      previousScheduledAt: isoDateTimeSchema.nullable(),
    })
    .strict(),
  'estimate.sent': z
    .object({ ...assignmentScope, estimateId: uuidSchema, amount: z.number().nonnegative().nullable() })
    .strict(),
  'estimate.accepted': z
    .object({ ...assignmentScope, estimateId: uuidSchema, amount: z.number().nonnegative().nullable() })
    .strict(),
  'deal.won': z
    .object({ ...assignmentScope, saleId: uuidSchema, amount: z.number().nonnegative() })
    .strict(),
  'deal.lost': z
    .object({ ...assignmentScope, fromStatus: assignmentStatusSchema.nullable(), reason: z.string().max(500).optional() })
    .strict(),
  'task.completed': z
    .object({ taskId: uuidSchema, leadId: nullableUuid, completedBy: nullableUuid })
    .strict(),
  // Execution status only. The qualification result is read from the call record
  // when a workflow needs it (it can arrive after the call ends).
  'ai_call.completed': z
    .object({
      leadId: uuidSchema,
      contractorId: uuidSchema,
      callJobId: uuidSchema,
      executionStatus: z.literal('completed'),
      durationSeconds: z.number().int().nonnegative().nullable().optional(),
      workflowRunId: nullableUuid.optional(),
    })
    .strict(),
  'ai_call.failed': z
    .object({
      leadId: uuidSchema,
      contractorId: uuidSchema,
      callJobId: uuidSchema,
      executionStatus: z.enum(['failed', 'expired', 'no_answer', 'busy']),
      reason: z.string().max(200).nullable().optional(),
      workflowRunId: nullableUuid.optional(),
    })
    .strict(),
  // A person enrolled one lead into one specific workflow. `testRun` marks a live
  // test (explicit test recipients; no real customer contact).
  'workflow.manual_enrollment': z
    .object({
      leadId: uuidSchema,
      workflowId: uuidSchema,
      requestId: uuidSchema,
      enrolledBy: uuidSchema,
      testRun: z.boolean().optional(),
    })
    .strict(),
  // Channel-agnostic: no provider type appears in the contract.
  'message.received': z
    .object({
      messageId: uuidSchema,
      channel: z.enum(['sms', 'email']),
      leadId: nullableUuid,
      conversationId: z.string().max(200).optional(),
      // Body is NOT carried in the event (PII); handlers load it by messageId.
      hasBody: z.boolean(),
    })
    .strict(),
} as const satisfies Record<WorkflowEventType, z.ZodTypeAny>;

export type WorkflowEventPayloadMap = {
  [K in WorkflowEventType]: z.infer<(typeof WORKFLOW_EVENT_PAYLOAD_SCHEMAS)[K]>;
};

// ---------------------------------------------------------------------------
// Trigger registry
// ---------------------------------------------------------------------------
/**
 * contractorScope:
 *  - required: the event is about one contractor's side of a lead
 *    (assignment/appointment/estimate/sale); envelope.contractorId must be set
 *    and equal payload.contractorId.
 *  - optional: lead-level; contractorId set only when the fact is private to
 *    one contractor (e.g. a client-funnel submission), else NULL (HomeQuote).
 */
export interface WorkflowTriggerDefinition<T extends WorkflowEventType = WorkflowEventType> {
  type: T;
  label: string;
  description: string;
  entityTypes: readonly WorkflowEntityType[];
  contractorScope: 'required' | 'optional';
  availability: Availability;
  /** The existing fact that should emit this event (Phase 2 emitter). */
  emittedFrom: string;
  /**
   * The ONE canonical idempotency ref for this event type (see
   * eventIdempotencyKey). `<updatedAtMicros>` is the source row's updated_at
   * in epoch microseconds, so repeated A->B->A->B transitions stay distinct.
   */
  idempotencyRef: string;
}

const t = <T extends WorkflowEventType>(d: WorkflowTriggerDefinition<T>) => d;

export const WORKFLOW_TRIGGERS = {
  'lead.created': t({
    idempotencyRef: 'lead:<leadId>',
    type: 'lead.created', label: 'New lead', entityTypes: ['lead'], contractorScope: 'optional', availability: 'ready',
    description: 'A new lead was saved (any source: funnels, Meta, GHL, Zapier, API, manual).',
    emittedFrom: 'insert on public.leads (dedupe hits are lead_intake_events status=duplicate and do NOT emit)',
  }),
  'lead.status_changed': t({
    idempotencyRef: 'lead:<leadId>:status:<toStatus>:<updatedAtMicros>',
    type: 'lead.status_changed', label: 'Lead stage changed', entityTypes: ['lead'], contractorScope: 'optional', availability: 'ready',
    description: 'The network pipeline stage (leads.status) changed.',
    emittedFrom: 'update of public.leads.status',
  }),
  'lead.qualification_changed': t({
    idempotencyRef: 'lead:<leadId>:qualification:<toStatus>:<updatedAtMicros>',
    type: 'lead.qualification_changed', label: 'Lead qualification changed', entityTypes: ['lead'], contractorScope: 'optional', availability: 'ready',
    description: 'A person changed the review state (leads.qualification_status, migration 0016).',
    emittedFrom: 'update of public.leads.qualification_status',
  }),
  'lead.assigned': t({
    idempotencyRef: 'assignment:<assignmentId>',
    type: 'lead.assigned', label: 'Lead assigned to contractor', entityTypes: ['lead_assignment'], contractorScope: 'required', availability: 'ready',
    description: 'A lead_assignments row was created (Send lead, client funnel, manual assignment).',
    emittedFrom: 'insert on public.lead_assignments',
  }),
  'assignment.status_changed': t({
    idempotencyRef: 'assignment:<assignmentId>:status:<toStatus>:<updatedAtMicros>',
    type: 'assignment.status_changed', label: 'Contractor stage changed', entityTypes: ['lead_assignment'], contractorScope: 'required', availability: 'ready',
    description: "A contractor's per-lead pipeline stage (lead_assignments.status) changed.",
    emittedFrom: 'update of public.lead_assignments.status',
  }),
  'appointment.booked': t({
    idempotencyRef: 'appointment:<appointmentId>, or booking:<provider>:<externalBookingId> when no appointment row exists yet (an appointment later created FROM that booking must not emit again)',
    type: 'appointment.booked', label: 'Appointment booked', entityTypes: ['appointment', 'lead'], contractorScope: 'optional', availability: 'ready',
    description: 'An appointment was created, or a funnel booking (Calendly/GHL) was recorded on a lead with no assignment yet.',
    emittedFrom: 'insert on public.appointments; insert on public.funnel_bookings with appointment_id null',
  }),
  'appointment.cancelled': t({
    idempotencyRef: 'appointment:<appointmentId>:status:cancelled:<updatedAtMicros>',
    type: 'appointment.cancelled', label: 'Appointment cancelled', entityTypes: ['appointment'], contractorScope: 'required', availability: 'ready',
    description: "appointments.status became 'cancelled'.", emittedFrom: 'update of public.appointments.status',
  }),
  'appointment.completed': t({
    idempotencyRef: 'appointment:<appointmentId>:status:held:<updatedAtMicros>',
    type: 'appointment.completed', label: 'Appointment completed', entityTypes: ['appointment'], contractorScope: 'required', availability: 'ready',
    description: "appointments.status became 'held' (the app's word for completed).", emittedFrom: 'update of public.appointments.status',
  }),
  'appointment.no_show': t({
    idempotencyRef: 'appointment:<appointmentId>:status:no_show:<updatedAtMicros>',
    type: 'appointment.no_show', label: 'Appointment no-show', entityTypes: ['appointment'], contractorScope: 'required', availability: 'ready',
    description: "appointments.status became 'no_show'.", emittedFrom: 'update of public.appointments.status',
  }),
  'appointment.rescheduled': t({
    idempotencyRef: 'appointment:<appointmentId>:rescheduled:<newScheduledAtMicros>',
    type: 'appointment.rescheduled', label: 'Appointment rescheduled', entityTypes: ['appointment'], contractorScope: 'required', availability: 'ready',
    description: 'appointments.scheduled_at moved to a different time (migration 0041).', emittedFrom: 'update of public.appointments.scheduled_at',
  }),
  'estimate.sent': t({
    idempotencyRef: 'estimate:<estimateId>:sent',
    type: 'estimate.sent', label: 'Estimate sent', entityTypes: ['estimate'], contractorScope: 'required', availability: 'ready',
    description: "estimates.status became 'sent' (or an estimate was created as sent).", emittedFrom: 'insert/update of public.estimates.status',
  }),
  'estimate.accepted': t({
    idempotencyRef: 'estimate:<estimateId>:accepted',
    type: 'estimate.accepted', label: 'Estimate accepted', entityTypes: ['estimate'], contractorScope: 'required', availability: 'ready',
    description: "estimates.status became 'accepted' (migration 0041).", emittedFrom: 'insert/update of public.estimates.status',
  }),
  'deal.won': t({
    idempotencyRef: 'sale:<saleId>:won',
    type: 'deal.won', label: 'Deal won', entityTypes: ['sale'], contractorScope: 'required', availability: 'ready',
    description: "A sale with sale_status 'won' was recorded on an assignment.", emittedFrom: "insert on public.sales (or sale_status -> 'won')",
  }),
  'deal.lost': t({
    idempotencyRef: 'assignment:<assignmentId>:status:lost:<updatedAtMicros>',
    type: 'deal.lost', label: 'Deal lost', entityTypes: ['lead_assignment'], contractorScope: 'required', availability: 'ready',
    description: "lead_assignments.status became 'lost'.", emittedFrom: 'update of public.lead_assignments.status',
  }),
  'task.completed': t({
    idempotencyRef: 'task:<taskId>:completed:<completedAtMicros>',
    type: 'task.completed', label: 'Task completed', entityTypes: ['task'], contractorScope: 'optional', availability: 'ready',
    description: 'A workflow staff task was marked done (public.workflow_tasks, migration 0041).', emittedFrom: 'update of public.workflow_tasks.status',
  }),
  'message.received': t({
    idempotencyRef: 'message:<messageId>',
    type: 'message.received', label: 'Message received', entityTypes: ['message'], contractorScope: 'optional', availability: 'needs_domain',
    description: 'An inbound SMS/email reply from a lead. HomeQuote has no inbound messaging yet.', emittedFrom: '(none yet)',
  }),
  'ai_call.completed': t({
    idempotencyRef: 'ai_call:<callJobId>:completed',
    type: 'ai_call.completed', label: 'AI call completed', entityTypes: ['lead'], contractorScope: 'required', availability: 'ready',
    description: 'A Fish Audio AI call ended (execution status only; it does not mean the lead qualified).', emittedFrom: "update of public.ai_call_jobs.status -> 'completed'",
  }),
  'ai_call.failed': t({
    idempotencyRef: 'ai_call:<callJobId>:<failed|expired|no_answer|busy>',
    type: 'ai_call.failed', label: 'AI call failed or unanswered', entityTypes: ['lead'], contractorScope: 'required', availability: 'ready',
    description: 'An AI call ended without a conversation: failed, expired, no answer or busy with no redial left.', emittedFrom: 'update of public.ai_call_jobs.status',
  }),
  'workflow.manual_enrollment': t({
    idempotencyRef: 'manual:<workflowId>:<leadId>:<requestId>',
    type: 'workflow.manual_enrollment', label: 'Manual enrollment', entityTypes: ['lead'], contractorScope: 'optional', availability: 'ready',
    description: 'An authorized user enrolled a lead into this workflow by hand (or started a live test).', emittedFrom: 'server action enrollLeadInWorkflowAction',
  }),
} as const satisfies { [K in WorkflowEventType]: WorkflowTriggerDefinition<K> };

// ---------------------------------------------------------------------------
// Trigger config (per workflow): narrow filters on the event itself.
// Anything richer belongs in conditions.
// ---------------------------------------------------------------------------
const statusFilter = <S extends z.ZodTypeAny>(s: S) =>
  z.object({ fromStatuses: z.array(s).min(1).optional(), toStatuses: z.array(s).min(1).optional() }).strict();
const empty = z.object({}).strict();

export const WORKFLOW_TRIGGER_CONFIG_SCHEMAS = {
  'lead.created': empty,
  'lead.status_changed': statusFilter(leadStatusSchema),
  'lead.qualification_changed': statusFilter(qualificationStatusSchema),
  'lead.assigned': empty,
  'assignment.status_changed': statusFilter(assignmentStatusSchema),
  'appointment.booked': empty,
  'appointment.cancelled': empty,
  'appointment.completed': empty,
  'appointment.no_show': empty,
  'appointment.rescheduled': empty,
  'estimate.sent': empty,
  'estimate.accepted': empty,
  'deal.won': empty,
  'deal.lost': empty,
  'task.completed': empty,
  'message.received': z.object({ channels: z.array(z.enum(['sms', 'email'])).min(1).optional() }).strict(),
  'ai_call.completed': empty,
  'ai_call.failed': z.object({ results: z.array(z.enum(['failed', 'expired', 'no_answer', 'busy'])).min(1).optional() }).strict(),
  'workflow.manual_enrollment': empty,
} as const satisfies Record<WorkflowEventType, z.ZodTypeAny>;

export type WorkflowTriggerConfigMap = {
  [K in WorkflowEventType]: z.infer<(typeof WORKFLOW_TRIGGER_CONFIG_SCHEMAS)[K]>;
};

export type WorkflowTrigger = {
  [K in WorkflowTriggerType]: { type: K; config: WorkflowTriggerConfigMap[K] };
}[WorkflowTriggerType];

export const workflowTriggerSchema: z.ZodType<WorkflowTrigger> = z
  .object({ type: workflowEventTypeSchema, config: z.record(z.unknown()).default({}) })
  .strict()
  .transform((trigger, ctx) => {
    const parsed = WORKFLOW_TRIGGER_CONFIG_SCHEMAS[trigger.type].safeParse(trigger.config);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) ctx.addIssue({ ...issue, path: ['config', ...issue.path] });
      return z.NEVER;
    }
    return { type: trigger.type, config: parsed.data } as WorkflowTrigger;
  }) as unknown as z.ZodType<WorkflowTrigger>;

// ---------------------------------------------------------------------------
// Event envelope
// ---------------------------------------------------------------------------
/**
 * The one event shape. Maps 1:1 to public.workflow_events (snake_case there).
 * `contractorId` is HomeQuote's tenant reference (there is no organizations
 * table); NULL means the HomeQuote network side of a lead.
 */
export interface WorkflowEvent<T extends WorkflowEventType = WorkflowEventType> {
  id: string;
  type: T;
  schemaVersion: 1;
  /** `${type}|${ref}` from eventIdempotencyKey() with the type's canonical ref. Unique across all events. */
  idempotencyKey: string;
  occurredAt: string;
  recordedAt?: string;
  contractorId: string | null;
  actorType: WorkflowActorType;
  actorId: string | null;
  entityType: WorkflowEntityType;
  entityId: string;
  leadId: string | null;
  source: string;
  correlationId: string | null;
  causationId: string | null;
  payload: WorkflowEventPayloadMap[T];
  metadata: Record<string, unknown>;
}

export const EVENT_SOURCE_PATTERN = /^[a-z][a-z0-9_]*(:[a-z0-9_.-]+)*$/;

const envelopeBase = z
  .object({
    id: uuidSchema,
    type: workflowEventTypeSchema,
    schemaVersion: z.literal(1),
    idempotencyKey: z.string().min(1).max(300),
    occurredAt: isoDateTimeSchema,
    recordedAt: isoDateTimeSchema.optional(),
    contractorId: uuidSchema.nullable(),
    actorType: z.enum(WORKFLOW_ACTOR_TYPES),
    actorId: uuidSchema.nullable(),
    entityType: workflowEntityTypeSchema,
    entityId: uuidSchema,
    leadId: uuidSchema.nullable(),
    source: z.string().min(1).max(100).regex(EVENT_SOURCE_PATTERN, 'Source looks like "db:leads" or "funnel:calendly"'),
    correlationId: uuidSchema.nullable(),
    causationId: uuidSchema.nullable(),
    payload: z.record(z.unknown()),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export const workflowEventSchema = envelopeBase.superRefine((e, ctx) => {
  const def: WorkflowTriggerDefinition = WORKFLOW_TRIGGERS[e.type];
  const payload = WORKFLOW_EVENT_PAYLOAD_SCHEMAS[e.type].safeParse(e.payload);
  if (!payload.success) {
    for (const issue of payload.error.issues) ctx.addIssue({ ...issue, path: ['payload', ...issue.path] });
    return;
  }
  const p = payload.data as Record<string, unknown>;
  if (!def.entityTypes.includes(e.entityType)) {
    ctx.addIssue({ code: 'custom', path: ['entityType'], message: `${e.type} is about ${def.entityTypes.join(' or ')}` });
  }
  // Tenant safety: the envelope's tenant and the payload's tenant must agree.
  if (def.contractorScope === 'required' && !e.contractorId) {
    ctx.addIssue({ code: 'custom', path: ['contractorId'], message: `${e.type} must be scoped to a contractor` });
  }
  if ('contractorId' in p && p.contractorId != null && p.contractorId !== e.contractorId) {
    ctx.addIssue({ code: 'custom', path: ['contractorId'], message: 'Envelope contractorId does not match payload.contractorId' });
  }
  if ('leadId' in p && p.leadId != null && p.leadId !== e.leadId) {
    ctx.addIssue({ code: 'custom', path: ['leadId'], message: 'Envelope leadId does not match payload.leadId' });
  }
  if (e.actorType === 'user' && !e.actorId) {
    ctx.addIssue({ code: 'custom', path: ['actorId'], message: 'A user-caused event names its actor' });
  }
  if (e.causationId && e.causationId === e.id) {
    ctx.addIssue({ code: 'custom', path: ['causationId'], message: 'An event cannot cause itself' });
  }
});

/** Validates and narrows an unknown value into a typed event envelope. */
export function parseWorkflowEvent(input: unknown): WorkflowEvent {
  return workflowEventSchema.parse(input) as unknown as WorkflowEvent;
}

/** Row shape of public.workflow_events (what the database stores). */
export interface WorkflowEventRow {
  id: string;
  type: WorkflowEventType;
  schema_version: number;
  idempotency_key: string;
  occurred_at: string;
  recorded_at: string;
  contractor_id: string | null;
  actor_type: WorkflowActorType;
  actor_id: string | null;
  entity_type: WorkflowEntityType;
  entity_id: string;
  lead_id: string | null;
  source: string;
  correlation_id: string | null;
  causation_id: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  dispatch_status: WorkflowEventDispatchStatus;
  dispatch_attempts: number;
  available_at: string;
  dispatched_at: string | null;
  last_error: string | null;
}

export const WORKFLOW_EVENT_DISPATCH_STATUSES = ['pending', 'dispatching', 'dispatched', 'failed', 'ignored'] as const;
export type WorkflowEventDispatchStatus = (typeof WORKFLOW_EVENT_DISPATCH_STATUSES)[number];

export function eventFromRow(row: WorkflowEventRow): WorkflowEvent {
  return parseWorkflowEvent({
    id: row.id,
    type: row.type,
    schemaVersion: row.schema_version,
    idempotencyKey: row.idempotency_key,
    occurredAt: new Date(row.occurred_at).toISOString(),
    recordedAt: new Date(row.recorded_at).toISOString(),
    contractorId: row.contractor_id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    leadId: row.lead_id,
    source: row.source,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    payload: row.payload,
    metadata: row.metadata,
  });
}

/**
 * Tenant matching rule used by the dispatcher: a HomeQuote (NULL-contractor)
 * workflow sees every event; a contractor workflow sees only events scoped to
 * that same contractor. Mirrors the guard in trg_workflow_runs_guard.
 */
export function workflowCanSeeEvent(workflowContractorId: string | null, eventContractorId: string | null): boolean {
  return workflowContractorId === null || workflowContractorId === eventContractorId;
}
