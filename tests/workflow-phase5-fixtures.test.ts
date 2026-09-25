import { describe, expect, it } from 'vitest';
import {
  WORKFLOW_EVENT_PAYLOAD_SCHEMAS,
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_TRIGGERS,
  workflowCanSeeEvent,
  workflowEventSchema,
} from '@/lib/workflows/events';
import { EMIT_SQL, buildWorkflowEvent, emitArgs, fixtureIds } from './fixtures/workflow-events';

/**
 * Phase 5 preparation: the canonical event fixtures used by end-to-end tests
 * are themselves valid against the Phase 1 contract, and they pin the emitter
 * rules Phase 5 must hold real emitters to. Pure — no DB, no Phase 2/4 code.
 */
describe('workflow event fixtures (Phase 1 contract)', () => {
  it.each(WORKFLOW_EVENT_TYPES)('%s builds a valid canonical envelope', (type) => {
    const e = buildWorkflowEvent(type);
    expect(workflowEventSchema.safeParse(e).success).toBe(true);
    expect(e.idempotencyKey.startsWith(`${type}|`)).toBe(true);
    expect(e.idempotencyKey.split('|')).toHaveLength(2);
    if (WORKFLOW_TRIGGERS[type].contractorScope === 'required') expect(e.contractorId).not.toBeNull();
  });

  it('builds HomeQuote (NULL-tenant) variants only where scope is optional', () => {
    expect(buildWorkflowEvent('lead.created', { network: true }).contractorId).toBeNull();
    expect(buildWorkflowEvent('message.received', { network: true }).contractorId).toBeNull();
    expect(buildWorkflowEvent('appointment.no_show', { network: true }).contractorId).not.toBeNull();
  });

  it('shares ids across a scenario so one lead flows through several events', () => {
    const ids = fixtureIds();
    const created = buildWorkflowEvent('lead.created', { ids });
    const booked = buildWorkflowEvent('appointment.booked', { ids });
    expect(booked.leadId).toBe(created.leadId);
    expect(booked.contractorId).toBe(ids.contractorId);
  });

  it('maps to emit_workflow_event arguments in parameter order', () => {
    const e = buildWorkflowEvent('deal.won');
    expect(EMIT_SQL.match(/\$\d+/g)).toHaveLength(14);
    expect(emitArgs(e)).toHaveLength(14);
    expect(emitArgs(e).slice(0, 2)).toEqual(['deal.won', e.idempotencyKey]);
  });
});

describe('emitter rules Phase 5 must enforce', () => {
  it('nullable payload keys must be present: stripping nulls breaks lead.created', () => {
    // A funnel lead has no city / vertical / sub-service. jsonb_strip_nulls()
    // in an emitter removes those keys and the event can no longer be parsed.
    const { payload } = buildWorkflowEvent('lead.created');
    const stripped = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== null));
    const result = WORKFLOW_EVENT_PAYLOAD_SCHEMAS['lead.created'].safeParse(stripped);
    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((i) => i.path[0]).sort()).toEqual(['city', 'subServiceId', 'verticalId']);
  });

  it('keys identify the fact, not the emitter or attempt', () => {
    const ids = fixtureIds();
    const a = buildWorkflowEvent('lead.created', { ids, overrides: { source: 'db:leads' } });
    const b = buildWorkflowEvent('lead.created', { ids, overrides: { source: 'funnel:pool-masters' } });
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
  });

  it('tenant visibility: contractor workflows never see HomeQuote or other-contractor events', () => {
    const mine = fixtureIds();
    const theirs = fixtureIds();
    const event = buildWorkflowEvent('appointment.no_show', { ids: theirs });
    expect(workflowCanSeeEvent(mine.contractorId, event.contractorId)).toBe(false);
    expect(workflowCanSeeEvent(theirs.contractorId, event.contractorId)).toBe(true);
    expect(workflowCanSeeEvent(null, event.contractorId)).toBe(true);
    // lead.status_changed is network-level: contractor workflows cannot use it.
    expect(workflowCanSeeEvent(mine.contractorId, buildWorkflowEvent('lead.status_changed', { ids: mine }).contractorId)).toBe(false);
  });
});
