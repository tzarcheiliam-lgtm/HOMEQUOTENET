import { randomUUID } from 'node:crypto';
import { WORKFLOW_TRIGGERS, parseWorkflowEvent, type WorkflowEvent, type WorkflowEventType } from '@/lib/workflows/events';
import { eventIdempotencyKey } from '@/lib/workflows/idempotency';

/**
 * Canonical workflow event fixtures for Phase 5 end-to-end and integration
 * tests. Built ONLY from the Phase 1 contract (lib/workflows/events.ts), so
 * they stay valid regardless of how the Phase 2 runtime or Phase 4 UI evolve.
 *
 * Each fixture is exactly what a correct emitter must produce: full payload
 * (nullable keys present, never stripped), canonical idempotency ref, tenant
 * scoping per WORKFLOW_TRIGGERS[type].contractorScope. Use them to:
 *  - seed workflow_events via emit_workflow_event() in rolled-back DB tests;
 *  - assert real emitters produce the same shape (conformance);
 *  - drive dry runs.
 */

export interface FixtureIds {
  leadId: string;
  contractorId: string;
  assignmentId: string;
  appointmentId: string;
  estimateId: string;
  saleId: string;
  messageId: string;
  taskId: string;
}

export function fixtureIds(overrides: Partial<FixtureIds> = {}): FixtureIds {
  return {
    leadId: randomUUID(),
    contractorId: randomUUID(),
    assignmentId: randomUUID(),
    appointmentId: randomUUID(),
    estimateId: randomUUID(),
    saleId: randomUUID(),
    messageId: randomUUID(),
    taskId: randomUUID(),
    ...overrides,
  };
}

const MICROS = '1790000000000000';

interface Shape {
  entityType: WorkflowEvent['entityType'];
  entityId: string;
  ref: string;
  contractorId: string | null;
  payload: Record<string, unknown>;
}

function shape(type: WorkflowEventType, id: FixtureIds, network: boolean): Shape {
  const scoped = { leadId: id.leadId, assignmentId: id.assignmentId, contractorId: id.contractorId };
  const appt = (to: string) => ({
    entityType: 'appointment' as const, entityId: id.appointmentId, contractorId: id.contractorId,
    ref: `appointment:${id.appointmentId}:status:${to}:${MICROS}`,
    payload: { ...scoped, appointmentId: id.appointmentId, scheduledAt: '2026-10-01T17:00:00.000Z', fromStatus: 'scheduled', toStatus: to },
  });
  switch (type) {
    case 'lead.created':
      return {
        entityType: 'lead', entityId: id.leadId, ref: `lead:${id.leadId}`, contractorId: network ? null : id.contractorId,
        // A funnel lead: no city / vertical / sub-service — keys MUST still be present as null.
        payload: { leadId: id.leadId, status: 'new', qualificationStatus: 'needs_qualification', source: 'website', verticalId: null, subServiceId: null, city: null, zip: '91436', funnelSlug: 'pool-masters' },
      };
    case 'lead.status_changed':
      return { entityType: 'lead', entityId: id.leadId, contractorId: null, ref: `lead:${id.leadId}:status:contact_attempted:${MICROS}`, payload: { leadId: id.leadId, fromStatus: 'new', toStatus: 'contact_attempted' } };
    case 'lead.qualification_changed':
      return { entityType: 'lead', entityId: id.leadId, contractorId: null, ref: `lead:${id.leadId}:qualification:qualified:${MICROS}`, payload: { leadId: id.leadId, fromStatus: 'needs_qualification', toStatus: 'qualified' } };
    case 'lead.assigned':
      return { entityType: 'lead_assignment', entityId: id.assignmentId, contractorId: id.contractorId, ref: `assignment:${id.assignmentId}`, payload: { ...scoped, assignedBy: null } };
    case 'assignment.status_changed':
      return { entityType: 'lead_assignment', entityId: id.assignmentId, contractorId: id.contractorId, ref: `assignment:${id.assignmentId}:status:contacted:${MICROS}`, payload: { ...scoped, fromStatus: 'assigned', toStatus: 'contacted' } };
    case 'appointment.booked':
      return {
        entityType: 'appointment', entityId: id.appointmentId, contractorId: id.contractorId, ref: `appointment:${id.appointmentId}`,
        payload: { ...scoped, appointmentId: id.appointmentId, scheduledAt: '2026-10-01T17:00:00.000Z' },
      };
    case 'appointment.cancelled':
      return appt('cancelled');
    case 'appointment.completed':
      return appt('held');
    case 'appointment.no_show':
      return appt('no_show');
    case 'estimate.sent':
      return { entityType: 'estimate', entityId: id.estimateId, contractorId: id.contractorId, ref: `estimate:${id.estimateId}:sent`, payload: { ...scoped, estimateId: id.estimateId, amount: 42000 } };
    case 'deal.won':
      return { entityType: 'sale', entityId: id.saleId, contractorId: id.contractorId, ref: `sale:${id.saleId}:won`, payload: { ...scoped, saleId: id.saleId, amount: 42000 } };
    case 'deal.lost':
      return { entityType: 'lead_assignment', entityId: id.assignmentId, contractorId: id.contractorId, ref: `assignment:${id.assignmentId}:status:lost:${MICROS}`, payload: { ...scoped, fromStatus: 'estimate_given' } };
    case 'task.completed':
      return { entityType: 'task', entityId: id.taskId, contractorId: null, ref: `task:${id.taskId}:completed:${MICROS}`, payload: { taskId: id.taskId, leadId: id.leadId, completedBy: null } };
    case 'message.received':
      return {
        entityType: 'message', entityId: id.messageId, contractorId: network ? null : id.contractorId, ref: `message:${id.messageId}`,
        payload: { messageId: id.messageId, channel: 'sms', leadId: id.leadId, conversationId: randomUUID(), hasBody: true },
      };
  }
}

/**
 * A valid canonical event of `type`. `network: true` produces the HomeQuote
 * (NULL-tenant) variant for event types whose scope is optional.
 */
export function buildWorkflowEvent<T extends WorkflowEventType>(
  type: T,
  options: { ids?: FixtureIds; network?: boolean; overrides?: Partial<WorkflowEvent> } = {}
): WorkflowEvent<T> {
  const id = options.ids ?? fixtureIds();
  const s = shape(type, id, options.network ?? false);
  const tenant = WORKFLOW_TRIGGERS[type].contractorScope === 'required' ? id.contractorId : s.contractorId;
  const event = {
    id: randomUUID(),
    type,
    schemaVersion: 1 as const,
    idempotencyKey: eventIdempotencyKey(type, s.ref),
    occurredAt: '2026-09-25T17:00:00.000Z',
    contractorId: tenant,
    actorType: type === 'message.received' ? ('contact' as const) : ('system' as const),
    actorId: null,
    entityType: s.entityType,
    entityId: s.entityId,
    leadId: id.leadId,
    source: type === 'message.received' ? 'messaging:mock' : `db:${s.entityType}s`,
    correlationId: null,
    causationId: null,
    payload: s.payload,
    metadata: {},
    ...options.overrides,
  };
  return parseWorkflowEvent(event) as WorkflowEvent<T>;
}

/** Arguments for public.emit_workflow_event(...) in DB tests, in parameter order. */
export function emitArgs(event: WorkflowEvent): unknown[] {
  return [
    event.type, event.idempotencyKey, event.entityType, event.entityId, event.source, event.occurredAt,
    event.contractorId, event.leadId, event.actorType, event.actorId, event.payload, event.metadata,
    event.correlationId, event.causationId,
  ];
}
export const EMIT_SQL =
  'select public.emit_workflow_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) as id';
