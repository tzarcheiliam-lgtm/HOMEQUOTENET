import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  conditionsMatch,
  evaluateWorkflowConditions,
  eventIdempotencyKey,
  planWorkflow,
  resolveWorkflowPath,
  type Workflow,
  type WorkflowEvaluationContext,
  type WorkflowEvent,
} from '@/lib/workflows';
import { renderWorkflowTemplate } from '@/lib/workflows';

const id = () => randomUUID();
const event: WorkflowEvent<'lead.created'> = {
  id: id(), type: 'lead.created', schemaVersion: 1, idempotencyKey: eventIdempotencyKey('lead.created', `lead:${id()}`),
  occurredAt: '2026-09-25T00:00:00.000Z', contractorId: null, actorType: 'system', actorId: null,
  entityType: 'lead', entityId: id(), leadId: id(), source: 'db:leads', correlationId: null, causationId: null,
  payload: { leadId: id(), status: 'new', qualificationStatus: 'needs_qualification', source: 'website', verticalId: null, subServiceId: null, city: 'Encino', zip: '91436' }, metadata: {},
};
const values: WorkflowEvaluationContext = {
  contractor: null,
  lead: { first_name: ' Ana ', city: 'Encino', tags: ['VIP', 'pool'], estimated_job_value: 25000, created_at: '2026-09-24T00:00:00Z', consent_granted: true },
  assignment: null, appointment: null, estimate: null, event: { payload: event.payload },
};
const resolve = (field: string) => resolveWorkflowPath(values, field);
const match = (operator: string, value?: unknown, field = 'lead.city') => conditionsMatch({ match: 'all', conditions: [{ field, operator, ...(value === undefined ? {} : { value }) } as never] }, resolve);

describe('workflow condition evaluator', () => {
  it('implements every Phase 1 operator', () => {
    expect(match('equals', ' encino ')).toBe(true);
    expect(match('not_equals', 'Burbank')).toBe(true);
    expect(match('contains', 'CIN')).toBe(true);
    expect(match('not_contains', 'pool')).toBe(true);
    expect(match('in', ['burbank', 'ENCINO'])).toBe(true);
    expect(match('not_in', ['burbank'])).toBe(true);
    expect(match('exists')).toBe(true);
    expect(match('not_exists', undefined, 'appointment.status')).toBe(true);
    expect(match('greater_than', 20000, 'lead.estimated_job_value')).toBe(true);
    expect(match('less_than', '2026-09-25T00:00:00Z', 'lead.created_at')).toBe(true);
    expect(match('contains', 'vip', 'lead.tags')).toBe(true);
  });

  it('evaluates nested all/any groups with explanations', () => {
    const result = evaluateWorkflowConditions({ match: 'all', conditions: [
      { field: 'lead.city', operator: 'equals', value: 'Encino' },
      { match: 'any', conditions: [{ field: 'lead.estimated_job_value', operator: 'greater_than', value: 100000 }, { field: 'event.payload.source', operator: 'equals', value: 'website' }] },
    ] }, resolve);
    expect(result.matched).toBe(true);
    expect(result.children?.[1].children).toHaveLength(2);
  });
});

function workflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: id(), contractorId: null, isTemplate: false, templateKey: null, sourceTemplateId: null, enabled: true, version: 3,
    createdBy: null, updatedBy: null, archivedAt: null, createdAt: event.occurredAt, updatedAt: event.occurredAt,
    name: 'Runtime test', description: null, trigger: { type: 'lead.created', config: {} }, conditions: null, exitEvents: [], reentryPolicy: 'once_per_event',
    steps: [{ key: 'stop', position: 0, parentKey: null, branch: null, stepType: 'action', conditions: null, action: { type: 'stop_workflow', config: {} } }],
    ...overrides,
  };
}

describe('workflow planner and dry-run core', () => {
  it('matches enabled non-template workflows and exposes steps without effects', () => {
    expect(planWorkflow(workflow(), event, values)).toMatchObject({ matched: true, reason: 'matched', steps: [{ action: 'stop_workflow', wouldExecute: true }] });
    expect(planWorkflow(workflow({ enabled: false }), event, values).reason).toBe('disabled');
    expect(planWorkflow(workflow({ isTemplate: true }), event, values).reason).toBe('template');
  });

  it('enforces tenant scope and reports unavailable actions', () => {
    expect(planWorkflow(workflow({ contractorId: id() }), event, values).reason).toBe('tenant');
    const sms = workflow({ steps: [{ key: 'sms', position: 0, parentKey: null, branch: null, stepType: 'action', conditions: null, action: { type: 'send_sms', config: { body: 'Hi' } } }] });
    expect(planWorkflow(sms, event, values)).toMatchObject({ matched: true, unavailableActions: ['send_sms'], steps: [{ wouldExecute: false }] });
  });

  it('renders only canonical merge fields', () => {
    expect(renderWorkflowTemplate('Hi {{lead.first_name}} in {{ lead.city }}', values)).toBe('Hi  Ana  in Encino');
  });
});

describe('runtime migration contract', () => {
  const sql = readFileSync('supabase/migrations/0024_workflow_runtime.sql', 'utf8');
  const funnel = readFileSync('supabase/migrations/0019_funnel_builder.sql', 'utf8');
  it('claims with row locks and emits facts through the canonical function', () => {
    expect(sql).toMatch(/for update skip locked/gi);
    expect(sql).toMatch(/perform emit_workflow_event\('lead\.created','lead\.created\|lead:'\|\|new\.id/);
    expect(sql).not.toMatch(/lead\.created\|funnel:/);
  });
  it('removes the obsolete funnel-specific event key', () => {
    expect(funnel).toContain('lead.created|lead:<lead id>');
    expect(funnel).not.toContain('lead.created|funnel:<slug>');
    expect(funnel).not.toMatch(/insert into public\.workflow_events/i);
  });
  it('keeps unavailable action domains out of the runtime migration', () => {
    expect(sql).not.toMatch(/create table public\.(tasks|tags|messages)/i);
    expect(sql).not.toMatch(/twilio|telnyx|sendblue/i);
  });
});
