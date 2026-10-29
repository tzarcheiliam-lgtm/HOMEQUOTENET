import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { eventIdempotencyKey, planWorkflow, type Workflow, type WorkflowEvaluationContext, type WorkflowEvent } from '@/lib/workflows';
import { SUPERSEDED_WORKFLOW_TEMPLATES, supersededByNativeBooking } from '@/lib/workflows/native-booking';

/**
 * Calendar bookings (0070) get built-in confirmations and reminders, so the
 * workflows cloned from the old "Appointment Confirmation" templates must not
 * text / email the homeowner a second time. On-site visits (no calendar) and
 * custom workflows are unaffected.
 */
const id = () => randomUUID();

function booked(calendarId: string | null): WorkflowEvent<'appointment.booked'> {
  const leadId = id();
  return {
    id: id(), type: 'appointment.booked', schemaVersion: 1, idempotencyKey: eventIdempotencyKey('appointment.booked', `appointment:${id()}`),
    occurredAt: '2026-10-29T17:00:00.000Z', contractorId: null, actorType: 'contact', actorId: null,
    entityType: 'appointment', entityId: id(), leadId, source: 'db:appointments', correlationId: null, causationId: null,
    payload: { leadId, assignmentId: null, contractorId: null, appointmentId: id(), scheduledAt: '2026-11-03T17:30:00.000Z', ...(calendarId ? { calendarId } : {}) } as never,
    metadata: {},
  };
}

function workflow(templateKey: string | null): Workflow {
  return {
    id: id(), contractorId: null, isTemplate: false, templateKey, sourceTemplateId: null, enabled: true, version: 1,
    createdBy: null, updatedBy: null, archivedAt: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
    name: 'Confirm', description: null, trigger: { type: 'appointment.booked', config: {} }, conditions: null, exitEvents: [], reentryPolicy: 'once_per_event',
    steps: [{ key: 'stop', position: 0, parentKey: null, branch: null, stepType: 'action', conditions: null, action: { type: 'stop_workflow', config: {} } }],
  };
}

const ctx = (e: WorkflowEvent): WorkflowEvaluationContext => ({
  contractor: null, lead: { consent_granted: true }, assignment: null, appointment: null, estimate: null, event: { payload: e.payload as Record<string, unknown> },
});

describe('built-in booking notices vs the old appointment confirmation templates', () => {
  it('skips the superseded templates for calendar bookings only', () => {
    for (const key of SUPERSEDED_WORKFLOW_TEMPLATES) {
      const onCalendar = booked(id());
      expect(planWorkflow(workflow(key), onCalendar, ctx(onCalendar))).toMatchObject({ matched: false, reason: 'trigger_config' });
      const visit = booked(null);
      expect(planWorkflow(workflow(key), visit, ctx(visit)).matched).toBe(true);
    }
    // A custom appointment.booked workflow still runs for calendar bookings.
    const e = booked(id());
    expect(planWorkflow(workflow(null), e, ctx(e)).matched).toBe(true);
    expect(planWorkflow(workflow('no_show_recovery'), e, ctx(e)).matched).toBe(true);
  });

  it('only concerns appointment events with a calendar', () => {
    expect(supersededByNativeBooking('appointment_confirmation', 'appointment.booked', { calendarId: id() })).toBe(true);
    expect(supersededByNativeBooking('appointment_confirmation', 'appointment.rescheduled', { calendarId: id() })).toBe(true);
    expect(supersededByNativeBooking('appointment_confirmation', 'lead.created', { calendarId: id() })).toBe(false);
    expect(supersededByNativeBooking('appointment_confirmation', 'appointment.booked', { calendarId: '' })).toBe(false);
    expect(supersededByNativeBooking(null, 'appointment.booked', { calendarId: id() })).toBe(false);
  });
});
