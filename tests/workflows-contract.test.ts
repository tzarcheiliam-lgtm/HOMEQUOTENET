import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CONDITION_OPERATORS,
  DEFAULT_RETRY_POLICY,
  RUN_TRANSITIONS,
  WORKFLOW_ACTIONS,
  WORKFLOW_ACTION_CONFIG_SCHEMAS,
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_ACTOR_TYPES,
  WORKFLOW_ENTITY_TYPES,
  WORKFLOW_EVENT_DISPATCH_STATUSES,
  WORKFLOW_EVENT_PAYLOAD_SCHEMAS,
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_LOG_CODES,
  WORKFLOW_LOG_LEVELS,
  WORKFLOW_REENTRY_POLICIES,
  WORKFLOW_RUN_STATUSES,
  WORKFLOW_STEP_RUN_STATUSES,
  WORKFLOW_STEP_TYPES,
  WORKFLOW_TEMPLATES,
  WORKFLOW_TRIGGERS,
  WORKFLOW_TRIGGER_CONFIG_SCHEMAS,
  canTransitionRun,
  canTransitionStepRun,
  cloneTemplate,
  computeWaitUntil,
  eventFromRow,
  eventIdempotencyKey,
  isTerminalRunStatus,
  nextRetryAt,
  parseActionConfig,
  parseWorkflowDefinition,
  runKeys,
  stepRowsFor,
  stepRunIdempotencyKey,
  stepRunUpdateForResult,
  toWorkflowLogRow,
  validateWorkflowForEnable,
  waitConfigurationSchema,
  workflowConditionGroupSchema,
  workflowConditionSchema,
  workflowCanSeeEvent,
  workflowErrorSchema,
  workflowEventSchema,
  workflowFromRows,
  type WorkflowEventRow,
  type WorkflowRow,
  type WorkflowStepRow,
} from '@/lib/workflows';

// ---------------------------------------------------------------------------
// The TS contract and the migration's CHECK constraints must never drift.
// ---------------------------------------------------------------------------
const sql = readFileSync('supabase/migrations/0020_workflow_automation_foundation.sql', 'utf8');
function tableBlock(table: string): string {
  const start = sql.indexOf(`create table if not exists public.${table} (`);
  expect(start, `table ${table}`).toBeGreaterThan(-1);
  return sql.slice(start, sql.indexOf('\n);', start));
}
function checkList(table: string, column: string): string[] {
  const m = tableBlock(table).match(new RegExp(`check \\(${column} in \\(([^)]*)\\)`));
  expect(m, `${table}.${column} check`).not.toBeNull();
  return Array.from(m![1].matchAll(/'([^']+)'/g), (x) => x[1]);
}

describe('migration 0020 mirrors the TypeScript contract', () => {
  it.each([
    ['workflows', 'trigger_type', WORKFLOW_EVENT_TYPES],
    ['workflows', 'reentry_policy', WORKFLOW_REENTRY_POLICIES],
    ['workflow_steps', 'step_type', WORKFLOW_STEP_TYPES],
    ['workflow_steps', 'action_type', WORKFLOW_ACTION_TYPES],
    ['workflow_events', 'type', WORKFLOW_EVENT_TYPES],
    ['workflow_events', 'actor_type', WORKFLOW_ACTOR_TYPES],
    ['workflow_events', 'entity_type', WORKFLOW_ENTITY_TYPES],
    ['workflow_events', 'dispatch_status', WORKFLOW_EVENT_DISPATCH_STATUSES],
    ['workflow_runs', 'entity_type', WORKFLOW_ENTITY_TYPES],
    ['workflow_runs', 'status', WORKFLOW_RUN_STATUSES],
    ['workflow_step_runs', 'step_type', WORKFLOW_STEP_TYPES],
    ['workflow_step_runs', 'action_type', WORKFLOW_ACTION_TYPES],
    ['workflow_step_runs', 'status', WORKFLOW_STEP_RUN_STATUSES],
    ['workflow_logs', 'level', WORKFLOW_LOG_LEVELS],
  ] as const)('%s.%s', (table, column, values) => {
    expect(checkList(table, column)).toEqual([...values]);
  });

  it('every canonical log code satisfies the database code pattern', () => {
    for (const code of WORKFLOW_LOG_CODES) expect(code).toMatch(/^[a-z]+(\.[a-z_]+)+$/);
  });

  it('never grants the event entry point to browser roles', () => {
    expect(sql).toMatch(/revoke all on function public\.emit_workflow_event[\s\S]*?from public, anon, authenticated;/);
    expect(sql).toMatch(/grant execute on function public\.emit_workflow_event[\s\S]*?to service_role;/);
  });

  it('enables RLS on every workflow table and gives runtime tables no write policy', () => {
    for (const t of ['workflows', 'workflow_steps', 'workflow_events', 'workflow_runs', 'workflow_step_runs', 'workflow_logs']) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`));
    }
    for (const t of ['workflow_events', 'workflow_runs', 'workflow_step_runs', 'workflow_logs']) {
      expect(sql).not.toMatch(new RegExp(`on public\\.${t} for (insert|update|delete|all)`));
    }
  });

  it('is additive: no drops of existing objects, no destructive statements', () => {
    const body = sql.replace(/--.*$/gm, '');
    expect(body).not.toMatch(/\bdrop\s+(table|column|type|function)\b/i);
    expect(body).not.toMatch(/\balter\s+table\s+public\.(?!workflow)/i);
    expect(body).not.toMatch(/\b(delete\s+from|truncate)\b/i);
  });
});

// ---------------------------------------------------------------------------
// Triggers / events
// ---------------------------------------------------------------------------
const ids = { lead: randomUUID(), contractor: randomUUID(), other: randomUUID(), assignment: randomUUID(), appt: randomUUID(), user: randomUUID() };

function leadCreated(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    type: 'lead.created',
    schemaVersion: 1,
    idempotencyKey: eventIdempotencyKey('lead.created', `lead:${ids.lead}`),
    occurredAt: '2026-09-24T18:00:00.000Z',
    contractorId: null,
    actorType: 'system',
    actorId: null,
    entityType: 'lead',
    entityId: ids.lead,
    leadId: ids.lead,
    source: 'db:leads',
    correlationId: null,
    causationId: null,
    payload: {
      leadId: ids.lead, status: 'new', qualificationStatus: 'needs_qualification', source: 'website',
      verticalId: null, subServiceId: null, city: 'Encino', zip: '91436', funnelSlug: 'pool-masters',
    },
    metadata: {},
    ...overrides,
  };
}

function noShow(overrides: Record<string, unknown> = {}, payload: Record<string, unknown> = {}) {
  return {
    ...leadCreated(),
    type: 'appointment.no_show',
    idempotencyKey: eventIdempotencyKey('appointment.no_show', `appointment:${ids.appt}:status:no_show:1727200000000000`),
    contractorId: ids.contractor,
    entityType: 'appointment',
    entityId: ids.appt,
    source: 'db:appointments',
    payload: {
      leadId: ids.lead, assignmentId: ids.assignment, contractorId: ids.contractor, appointmentId: ids.appt,
      scheduledAt: '2026-09-30T17:00:00.000Z', fromStatus: 'scheduled', toStatus: 'no_show', ...payload,
    },
    ...overrides,
  };
}

describe('trigger registry', () => {
  it('covers every event type with a definition, payload schema and config schema', () => {
    for (const type of WORKFLOW_EVENT_TYPES) {
      expect(WORKFLOW_TRIGGERS[type].type).toBe(type);
      expect(WORKFLOW_EVENT_PAYLOAD_SCHEMAS[type]).toBeDefined();
      expect(WORKFLOW_TRIGGER_CONFIG_SCHEMAS[type]).toBeDefined();
      expect(WORKFLOW_TRIGGERS[type].entityTypes.length).toBeGreaterThan(0);
    }
    expect(Object.keys(WORKFLOW_TRIGGERS).sort()).toEqual([...WORKFLOW_EVENT_TYPES].sort());
  });

  it('defines exactly one canonical idempotency ref per event type', () => {
    for (const type of WORKFLOW_EVENT_TYPES) expect(WORKFLOW_TRIGGERS[type].idempotencyRef).toMatch(/^[a-z]+:</);
  });

  it('includes every trigger the product brief requires', () => {
    for (const t of ['lead.created', 'lead.status_changed', 'lead.assigned', 'appointment.booked', 'appointment.cancelled',
      'appointment.completed', 'appointment.no_show', 'estimate.sent', 'deal.won', 'deal.lost', 'task.completed', 'message.received']) {
      expect(WORKFLOW_EVENT_TYPES).toContain(t);
    }
  });

  it('scopes contractor-side events to a contractor and marks missing domains honestly', () => {
    for (const t of ['lead.assigned', 'assignment.status_changed', 'appointment.no_show', 'estimate.sent', 'deal.won', 'deal.lost'] as const) {
      expect(WORKFLOW_TRIGGERS[t].contractorScope).toBe('required');
    }
    expect(WORKFLOW_TRIGGERS['task.completed'].availability).toBe('needs_domain');
    expect(WORKFLOW_TRIGGERS['message.received'].availability).toBe('needs_domain');
    expect(WORKFLOW_TRIGGERS['lead.created'].availability).toBe('ready');
  });

  it('validates trigger config against the existing pipeline values', () => {
    const ok = parseWorkflowDefinition({ ...minimalDefinition(), trigger: { type: 'lead.status_changed', config: { toStatuses: ['contact_attempted'] } } });
    expect(ok.trigger).toEqual({ type: 'lead.status_changed', config: { toStatuses: ['contact_attempted'] } });
    expect(() => parseWorkflowDefinition({ ...minimalDefinition(), trigger: { type: 'lead.status_changed', config: { toStatuses: ['no_answer'] } } })).toThrow();
    expect(() => parseWorkflowDefinition({ ...minimalDefinition(), trigger: { type: 'lead.created', config: { anything: 1 } } })).toThrow();
  });
});

describe('event envelope', () => {
  it('accepts a well-formed network event and a contractor-scoped event', () => {
    expect(workflowEventSchema.safeParse(leadCreated()).success).toBe(true);
    expect(workflowEventSchema.safeParse(noShow()).success).toBe(true);
  });

  it('rejects unknown types, bad payloads and extra fields', () => {
    expect(workflowEventSchema.safeParse(leadCreated({ type: 'lead.deleted' })).success).toBe(false);
    expect(workflowEventSchema.safeParse(noShow({}, { toStatus: 'completed' })).success).toBe(false); // app says 'held'
    expect(workflowEventSchema.safeParse(noShow({}, { phone: '+18185550100' })).success).toBe(false);
    expect(workflowEventSchema.safeParse(leadCreated({ extra: true })).success).toBe(false);
    const payload: Record<string, unknown> = { ...leadCreated().payload };
    delete payload.leadId;
    expect(workflowEventSchema.safeParse(leadCreated({ payload })).success).toBe(false);
  });

  it('is tenant-safe: contractor-side events need a contractor, and envelope/payload must agree', () => {
    expect(workflowEventSchema.safeParse(noShow({ contractorId: null })).success).toBe(false);
    expect(workflowEventSchema.safeParse(noShow({ contractorId: ids.other })).success).toBe(false);
    expect(workflowEventSchema.safeParse(noShow({ leadId: randomUUID() })).success).toBe(false);
    expect(workflowEventSchema.safeParse(noShow({ entityType: 'lead' })).success).toBe(false);
  });

  it('is traceable and auditable', () => {
    expect(workflowEventSchema.safeParse(leadCreated({ actorType: 'user', actorId: null })).success).toBe(false);
    expect(workflowEventSchema.safeParse(leadCreated({ actorType: 'user', actorId: ids.user })).success).toBe(true);
    const e = leadCreated();
    expect(workflowEventSchema.safeParse({ ...e, causationId: e.id }).success).toBe(false);
    expect(workflowEventSchema.safeParse(leadCreated({ source: 'Calendly Webhook' })).success).toBe(false);
  });

  it('round-trips a database row into a typed envelope', () => {
    const e = noShow();
    const row: WorkflowEventRow = {
      id: e.id, type: 'appointment.no_show', schema_version: 1, idempotency_key: e.idempotencyKey,
      occurred_at: '2026-09-24 18:00:00+00', recorded_at: '2026-09-24 18:00:01+00', contractor_id: ids.contractor,
      actor_type: 'system', actor_id: null, entity_type: 'appointment', entity_id: ids.appt, lead_id: ids.lead,
      source: 'db:appointments', correlation_id: null, causation_id: null, payload: e.payload, metadata: {},
      dispatch_status: 'pending', dispatch_attempts: 0, available_at: '2026-09-24 18:00:01+00', dispatched_at: null, last_error: null,
    };
    const parsed = eventFromRow(row);
    expect(parsed.type).toBe('appointment.no_show');
    expect(parsed.occurredAt).toBe('2026-09-24T18:00:00.000Z');
    expect(parsed.contractorId).toBe(ids.contractor);
  });

  it('lets network workflows see every event and contractor workflows only their own', () => {
    expect(workflowCanSeeEvent(null, null)).toBe(true);
    expect(workflowCanSeeEvent(null, ids.contractor)).toBe(true);
    expect(workflowCanSeeEvent(ids.contractor, ids.contractor)).toBe(true);
    expect(workflowCanSeeEvent(ids.contractor, ids.other)).toBe(false);
    expect(workflowCanSeeEvent(ids.contractor, null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
describe('action registry', () => {
  it('covers every action type with a definition and a config schema', () => {
    for (const type of WORKFLOW_ACTION_TYPES) {
      expect(WORKFLOW_ACTIONS[type].type).toBe(type);
      expect(WORKFLOW_ACTION_CONFIG_SCHEMAS[type]).toBeDefined();
    }
    expect(Object.keys(WORKFLOW_ACTIONS).sort()).toEqual([...WORKFLOW_ACTION_TYPES].sort());
  });

  it('treats wait and stop_workflow as engine control actions only', () => {
    const control = WORKFLOW_ACTION_TYPES.filter((t) => WORKFLOW_ACTIONS[t].control);
    expect(control.sort()).toEqual(['stop_workflow', 'wait']);
  });

  it('keeps SMS contract-only, consent-gated and provider-free', () => {
    expect(WORKFLOW_ACTIONS.send_sms.availability).toBe('contract_only');
    expect(WORKFLOW_ACTIONS.send_sms.requiresConsent).toBe(true);
    expect(parseActionConfig('send_sms', { body: 'Hi {{lead.first_name}}' }).success).toBe(true);
    expect(parseActionConfig('send_sms', { body: 'Hi', provider: 'twilio' }).success).toBe(false);
    expect(parseActionConfig('send_sms', { body: 'Hi', from: '+18185550100' }).success).toBe(false);
    expect(parseActionConfig('send_sms', { body: 'Hi {{lead.ssn}}' }).success).toBe(false);
    const source = ['actions', 'events', 'definition', 'runs', 'templates'].map((f) => readFileSync(`lib/workflows/${f}.ts`, 'utf8')).join('\n');
    expect(source).not.toMatch(/from ['"](twilio|telnyx|sendblue)/i);
  });

  it('marks actions without a backing table as needs_domain', () => {
    for (const t of ['create_task', 'add_tag', 'remove_tag', 'assign_user'] as const) {
      expect(WORKFLOW_ACTIONS[t].availability).toBe('needs_domain');
    }
  });

  it('validates configs against existing domain values and safe transports', () => {
    expect(parseActionConfig('change_pipeline_stage', { pipeline: 'lead', status: 'qualified' }).success).toBe(true);
    expect(parseActionConfig('change_pipeline_stage', { pipeline: 'assignment', status: 'appointment_held' }).success).toBe(true);
    expect(parseActionConfig('change_pipeline_stage', { pipeline: 'lead', status: 'appointment_held' }).success).toBe(false);
    expect(parseActionConfig('send_webhook', { url: 'http://example.com/hook' }).success).toBe(false);
    expect(parseActionConfig('send_webhook', { url: 'https://example.com/hook', headers: { Authorization: 'x' } }).success).toBe(false);
    expect(parseActionConfig('send_webhook', { url: 'https://example.com/hook' }).success).toBe(true);
    expect(parseActionConfig('assign_user', { strategy: 'specific', userIds: [ids.user, randomUUID()] }).success).toBe(false);
    expect(parseActionConfig('send_email', { to: { kind: 'lead' }, subject: 'Hi', body: 'Hello {{lead.first_name}}' }).success).toBe(true);
  });

  it('defines success, temporary and permanent failure with retry state', () => {
    const now = new Date('2026-09-24T18:00:00Z');
    const temp = { outcome: 'temporary_failure', error: { code: 'provider_timeout', message: 'Timed out', kind: 'temporary', retryable: true } } as const;
    const first = stepRunUpdateForResult(temp, 1, now, DEFAULT_RETRY_POLICY);
    expect(first).toMatchObject({ status: 'retry_scheduled', failureKind: 'temporary' });
    expect(first.status === 'retry_scheduled' && first.nextRetryAt.toISOString()).toBe('2026-09-24T18:01:00.000Z');
    const last = stepRunUpdateForResult(temp, DEFAULT_RETRY_POLICY.maxAttempts, now, DEFAULT_RETRY_POLICY);
    expect(last).toMatchObject({ status: 'failed', failureKind: 'temporary', lastError: { details: { retries_exhausted: true } } });
    const perm = stepRunUpdateForResult(
      { outcome: 'permanent_failure', error: { code: 'invalid_recipient', message: 'Bad number', kind: 'permanent', retryable: false }, provider: { provider: 'sms', statusCode: 400 } },
      1, now, DEFAULT_RETRY_POLICY
    );
    expect(perm).toMatchObject({ status: 'failed', failureKind: 'permanent', provider: { provider: 'sms', statusCode: 400 } });
    expect(stepRunUpdateForResult({ outcome: 'skipped', reason: 'no_consent' }, 1, now, DEFAULT_RETRY_POLICY)).toMatchObject({ status: 'skipped', skipReason: 'no_consent' });
    expect(stepRunUpdateForResult({ outcome: 'success', provider: { provider: 'gmail', providerMessageId: 'abc' } }, 1, now, DEFAULT_RETRY_POLICY)).toMatchObject({ status: 'succeeded' });
  });

  it('backs off exponentially, honours retry-after, and caps delays', () => {
    const now = new Date('2026-09-24T18:00:00Z');
    const secs = (d: Date | null) => (d!.getTime() - now.getTime()) / 1000;
    expect(secs(nextRetryAt(1, now))).toBe(60);
    expect(secs(nextRetryAt(3, now))).toBe(240);
    expect(secs(nextRetryAt(1, now, DEFAULT_RETRY_POLICY, 900))).toBe(900);
    expect(secs(nextRetryAt(2, now, { maxAttempts: 20, baseDelaySeconds: 60, maxDelaySeconds: 100 }, 99999))).toBe(100);
    expect(nextRetryAt(5, now)).toBeNull();
  });

  it('keeps error kind and retryability consistent', () => {
    expect(workflowErrorSchema.safeParse({ code: 'x', message: 'y', kind: 'temporary', retryable: false }).success).toBe(false);
    expect(workflowErrorSchema.safeParse({ code: 'rate_limited', message: 'Slow down', kind: 'temporary', retryable: true }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------
describe('conditions', () => {
  const ok = (c: unknown) => workflowConditionSchema.safeParse(c).success;

  it('supports every operator with the right value shape', () => {
    expect(CONDITION_OPERATORS).toHaveLength(10);
    expect(ok({ field: 'lead.source', operator: 'equals', value: 'meta' })).toBe(true);
    expect(ok({ field: 'lead.source', operator: 'not_equals', value: 'meta' })).toBe(true);
    expect(ok({ field: 'lead.city', operator: 'contains', value: 'angeles' })).toBe(true);
    expect(ok({ field: 'lead.city', operator: 'not_contains', value: 'angeles' })).toBe(true);
    expect(ok({ field: 'lead.status', operator: 'in', value: ['new', 'contact_attempted'] })).toBe(true);
    expect(ok({ field: 'assignment.status', operator: 'not_in', value: ['sold', 'lost'] })).toBe(true);
    expect(ok({ field: 'lead.zip', operator: 'exists' })).toBe(true);
    expect(ok({ field: 'lead.zip', operator: 'not_exists' })).toBe(true);
    expect(ok({ field: 'lead.estimated_job_value', operator: 'greater_than', value: 50000 })).toBe(true);
    expect(ok({ field: 'appointment.scheduled_at', operator: 'less_than', value: '2026-10-01T00:00:00Z' })).toBe(true);
    expect(ok({ field: 'event.payload.toStatus', operator: 'equals', value: 'no_show' })).toBe(true);
  });

  it('rejects malformed conditions', () => {
    expect(ok({ field: 'lead.zip', operator: 'exists', value: 'x' })).toBe(false);
    expect(ok({ field: 'lead.status', operator: 'in', value: 'new' })).toBe(false);
    expect(ok({ field: 'lead.status', operator: 'equals', value: ['new'] })).toBe(false);
    expect(ok({ field: 'lead.status', operator: 'equals', value: 'no_answer' })).toBe(false);
    expect(ok({ field: 'lead.city', operator: 'greater_than', value: 5 })).toBe(false);
    expect(ok({ field: 'lead.estimated_job_value', operator: 'contains', value: '5' })).toBe(false);
    expect(ok({ field: 'lead.consent_granted', operator: 'equals', value: 'yes' })).toBe(false);
    expect(ok({ field: 'lead.password', operator: 'exists' })).toBe(false);
    expect(ok({ field: 'lead.source', operator: 'matches', value: '.*' })).toBe(false);
  });

  it('nests groups up to three levels', () => {
    const leaf = { field: 'lead.source', operator: 'equals', value: 'meta' };
    const nest = (depth: number): unknown => (depth === 1 ? { match: 'all', conditions: [leaf] } : { match: 'any', conditions: [nest(depth - 1)] });
    expect(workflowConditionGroupSchema.safeParse(nest(3)).success).toBe(true);
    expect(workflowConditionGroupSchema.safeParse(nest(4)).success).toBe(false);
    expect(workflowConditionGroupSchema.safeParse({ match: 'all', conditions: [] }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Waits
// ---------------------------------------------------------------------------
describe('wait configuration', () => {
  const now = new Date('2026-03-07T20:00:00Z'); // Sat Mar 7, 12:00 PST
  const at = (c: unknown, anchors = {}) => {
    const r = computeWaitUntil(c as never, now, anchors);
    return r.kind === 'resume_at' ? r.resumeAt.toISOString() : r;
  };

  it('computes durations', () => {
    expect(at({ mode: 'duration', amount: 5, unit: 'minutes' })).toBe('2026-03-07T20:05:00.000Z');
    expect(at({ mode: 'duration', amount: 2, unit: 'hours' })).toBe('2026-03-07T22:00:00.000Z');
    expect(at({ mode: 'duration', amount: 1, unit: 'days' })).toBe('2026-03-08T20:00:00.000Z');
  });

  it('waits until next day at 10 AM local time, across a DST change', () => {
    // DST starts Sun Mar 8 2026 in Los Angeles: 10:00 PDT = 17:00Z.
    expect(at({ mode: 'until_time_of_day', time: '10:00', dayOffset: 1, timezone: 'America/Los_Angeles' })).toBe('2026-03-08T17:00:00.000Z');
    // dayOffset 0 and 10:00 already passed today -> tomorrow.
    expect(at({ mode: 'until_time_of_day', time: '10:00', timezone: 'America/Los_Angeles' })).toBe('2026-03-08T17:00:00.000Z');
    // dayOffset 0 and 15:00 still ahead today (PST, UTC-8) -> today.
    expect(at({ mode: 'until_time_of_day', time: '15:00', timezone: 'America/Los_Angeles' })).toBe('2026-03-07T23:00:00.000Z');
  });

  it('waits relative to an entity date-time', () => {
    expect(at({ mode: 'relative_to_field', field: 'appointment.scheduled_at', offsetMinutes: -1440 }, { 'appointment.scheduled_at': '2026-03-10T17:00:00Z' }))
      .toBe('2026-03-09T17:00:00.000Z');
    expect(at({ mode: 'relative_to_field', field: 'appointment.scheduled_at', offsetMinutes: -1440, ifPast: 'skip' }, { 'appointment.scheduled_at': '2026-03-08T01:00:00Z' }))
      .toEqual({ kind: 'skip', reason: 'anchor_past' });
    expect(at({ mode: 'relative_to_field', field: 'appointment.scheduled_at', offsetMinutes: -60 }, { 'appointment.scheduled_at': '2026-03-07T20:30:00Z' }))
      .toEqual({ kind: 'continue' });
    expect(at({ mode: 'relative_to_field', field: 'appointment.scheduled_at', offsetMinutes: -60 })).toEqual({ kind: 'skip', reason: 'anchor_missing' });
  });

  it('rejects invalid waits', () => {
    const bad = (c: unknown) => waitConfigurationSchema.safeParse(c).success;
    expect(bad({ mode: 'duration', amount: 91, unit: 'days' })).toBe(false);
    expect(bad({ mode: 'duration', amount: 0, unit: 'minutes' })).toBe(false);
    expect(bad({ mode: 'duration', amount: 1.5, unit: 'hours' })).toBe(false);
    expect(bad({ mode: 'duration', amount: 1, unit: 'weeks' })).toBe(false);
    expect(bad({ mode: 'until_time_of_day', time: '25:00' })).toBe(false);
    expect(bad({ mode: 'until_time_of_day', time: '10:00', timezone: 'Mars/Olympus' })).toBe(false);
    expect(bad({ mode: 'relative_to_field', field: 'lead.city', offsetMinutes: 5 })).toBe(false);
    expect(bad({ mode: 'setTimeout', ms: 5000 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Runs + idempotency
// ---------------------------------------------------------------------------
describe('run state machine', () => {
  it('has exactly the documented run and step states', () => {
    expect([...WORKFLOW_RUN_STATUSES]).toEqual(['pending', 'running', 'waiting', 'completed', 'failed', 'cancelled']);
    expect(Object.keys(RUN_TRANSITIONS)).toEqual([...WORKFLOW_RUN_STATUSES]);
  });

  it('allows only legal transitions and freezes terminal states', () => {
    expect(canTransitionRun('pending', 'running')).toBe(true);
    expect(canTransitionRun('running', 'waiting')).toBe(true);
    expect(canTransitionRun('waiting', 'running')).toBe(true);
    expect(canTransitionRun('waiting', 'completed')).toBe(false);
    expect(canTransitionRun('pending', 'completed')).toBe(false);
    for (const s of ['completed', 'failed', 'cancelled'] as const) {
      expect(isTerminalRunStatus(s)).toBe(true);
      for (const to of WORKFLOW_RUN_STATUSES) expect(canTransitionRun(s, to)).toBe(false);
    }
    expect(canTransitionStepRun('running', 'retry_scheduled')).toBe(true);
    expect(canTransitionStepRun('retry_scheduled', 'running')).toBe(true);
    expect(canTransitionStepRun('succeeded', 'running')).toBe(false);
    expect(canTransitionStepRun('pending', 'succeeded')).toBe(false);
  });
});

describe('idempotency keys', () => {
  it('derives event keys deterministically from the fact, never the attempt', () => {
    const a = eventIdempotencyKey('appointment.booked', 'booking:calendly:https://api.calendly.com/invitees/abc');
    expect(a).toBe('appointment.booked|booking:calendly:https://api.calendly.com/invitees/abc');
    // The key names the fact, not the emitter: a funnel function and a table
    // trigger reporting the same new lead produce the same key -> one event.
    const fromFunnel = eventIdempotencyKey('lead.created', `lead:${ids.lead}`);
    const fromTrigger = eventIdempotencyKey('lead.created', `lead:${ids.lead}`);
    expect(fromFunnel).toBe(fromTrigger);
    expect(() => eventIdempotencyKey('lead.created', '  ')).toThrow();
    expect(() => eventIdempotencyKey('lead.created', ids.lead)).toThrow(); // no namespace
    expect(() => eventIdempotencyKey('lead.created', 'lead:a|b')).toThrow();
    expect(() => eventIdempotencyKey('lead.created', `lead:${'x'.repeat(400)}`)).toThrow();
  });

  it('maps reentry policies onto dedupe and concurrency keys', () => {
    expect(runKeys('once_per_event', 'lead', ids.lead)).toEqual({ dedupeKey: null, concurrencyKey: null });
    expect(runKeys('once_per_entity', 'lead', ids.lead)).toEqual({ dedupeKey: `lead:${ids.lead}`, concurrencyKey: null });
    expect(runKeys('one_active_per_entity', 'lead', ids.lead)).toEqual({ dedupeKey: null, concurrencyKey: `lead:${ids.lead}` });
    expect(stepRunIdempotencyKey('run-1', 'welcome_sms')).toBe('run-1:welcome_sms:0');
  });
});

// ---------------------------------------------------------------------------
// Definitions + templates
// ---------------------------------------------------------------------------
function minimalDefinition() {
  return {
    name: 'Test',
    trigger: { type: 'lead.created', config: {} },
    steps: [{ key: 'wait_a_bit', position: 0, stepType: 'action', action: { type: 'wait', config: { mode: 'duration', amount: 5, unit: 'minutes' } } }],
  };
}

describe('workflow definitions', () => {
  it('applies defaults and validates step structure', () => {
    const def = parseWorkflowDefinition(minimalDefinition());
    expect(def).toMatchObject({ conditions: null, exitEvents: [], reentryPolicy: 'once_per_event' });
    const dup = { ...minimalDefinition(), steps: [...minimalDefinition().steps, { ...minimalDefinition().steps[0], position: 1 }] };
    expect(() => parseWorkflowDefinition(dup)).toThrow(/Duplicate step key/);
    const samePos = { ...minimalDefinition(), steps: [...minimalDefinition().steps, { ...minimalDefinition().steps[0], key: 'other' }] };
    expect(() => parseWorkflowDefinition(samePos)).toThrow(/share a position/);
    expect(() => parseWorkflowDefinition({ ...minimalDefinition(), steps: [] })).toThrow();
    expect(() => parseWorkflowDefinition({ ...minimalDefinition(), exitEvents: ['lead.created'] })).toThrow(/own trigger/);
    const orphan = { ...minimalDefinition(), steps: [{ ...minimalDefinition().steps[0], parentKey: 'missing', branch: 'then' }] };
    expect(() => parseWorkflowDefinition(orphan)).toThrow(/branch step/);
  });

  it('can represent branching but will not enable it yet', () => {
    const def = parseWorkflowDefinition({
      ...minimalDefinition(),
      steps: [
        { key: 'is_meta', position: 0, stepType: 'branch', conditions: { match: 'all', conditions: [{ field: 'lead.source', operator: 'equals', value: 'meta' }] } },
        { key: 'then_wait', position: 0, parentKey: 'is_meta', branch: 'then', stepType: 'action', action: { type: 'wait', config: { mode: 'duration', amount: 1, unit: 'hours' } } },
        { key: 'else_stop', position: 0, parentKey: 'is_meta', branch: 'else', stepType: 'action', action: { type: 'stop_workflow', config: {} } },
      ],
    });
    expect(validateWorkflowForEnable(def, { contractorId: null }).map((i) => i.code)).toEqual(['branching_not_supported']);
  });

  it('blocks enabling unavailable features and cross-tenant actions', () => {
    const def = parseWorkflowDefinition({
      name: 'Contractor stage mover',
      trigger: { type: 'lead.created', config: {} },
      conditions: { match: 'all', conditions: [{ field: 'lead.tags', operator: 'contains', value: 'vip' }] },
      steps: [
        { key: 'network_stage', position: 0, stepType: 'action', action: { type: 'change_pipeline_stage', config: { pipeline: 'lead', status: 'qualified' } } },
        { key: 'own_stage', position: 1, stepType: 'action', action: { type: 'change_pipeline_stage', config: { pipeline: 'assignment', status: 'contacted' } } },
        { key: 'alert_hq', position: 2, stepType: 'action', action: { type: 'notify_team', config: { audience: { kind: 'lead_alert_team' }, subject: 'x', message: 'y' } } },
        { key: 'tag', position: 3, stepType: 'action', action: { type: 'add_tag', config: { tag: 'vip' } } },
      ],
    });
    const codes = validateWorkflowForEnable(def, { contractorId: ids.contractor }).map((i) => `${i.code}:${i.stepKey ?? ''}`);
    expect(codes).toEqual(expect.arrayContaining([
      'field_unavailable:', 'network_only_action:network_stage', 'assignment_required:own_stage',
      'network_only_action:alert_hq', 'action_unavailable:tag',
    ]));
    // The same definition owned by HomeQuote may use the network pipeline and team alert.
    const hq = validateWorkflowForEnable(def, { contractorId: null }).map((i) => i.code);
    expect(hq).not.toContain('network_only_action');
  });

  it('round-trips through database rows', () => {
    const def = parseWorkflowDefinition(WORKFLOW_TEMPLATES[1].definition);
    let n = 0;
    const steps = stepRowsFor('wf-1', def, () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`)
      .map((s) => ({ ...s, created_at: '', updated_at: '' })) as WorkflowStepRow[];
    const row: WorkflowRow = {
      id: 'wf-1', contractor_id: null, name: def.name, description: def.description ?? null, is_template: false,
      template_key: 'no_answer_follow_up', source_template_id: null, trigger_type: def.trigger.type,
      trigger_config: def.trigger.config as Record<string, unknown>, conditions: def.conditions, exit_events: def.exitEvents,
      reentry_policy: def.reentryPolicy, enabled: false, version: 1, created_by: null, updated_by: null, archived_at: null,
      created_at: '', updated_at: '',
    };
    const wf = workflowFromRows(row, steps);
    expect(wf.steps).toEqual(def.steps);
    expect(wf.trigger).toEqual(def.trigger);
  });
});

describe('prebuilt templates', () => {
  it('ships the five required templates, all valid, uniquely keyed', () => {
    expect(WORKFLOW_TEMPLATES.map((t) => t.definition.name)).toEqual([
      'New Lead Intake', 'No Answer Follow-Up', 'Appointment Confirmation', 'No-Show Recovery', 'Estimate Follow-Up',
    ]);
    expect(new Set(WORKFLOW_TEMPLATES.map((t) => t.key)).size).toBe(5);
    for (const t of WORKFLOW_TEMPLATES) {
      expect(t.key).toMatch(/^[a-z][a-z0-9_]{0,63}$/);
      expect(() => parseWorkflowDefinition(t.definition)).not.toThrow();
    }
  });

  it('only uses real triggers/actions and gates SMS templates until a provider exists', () => {
    for (const t of WORKFLOW_TEMPLATES) {
      const codes = validateWorkflowForEnable(t.definition, { contractorId: null }).map((i) => i.code);
      const usesSms = t.definition.steps.some((s) => s.stepType === 'action' && s.action.type === 'send_sms');
      expect(codes.filter((c) => c !== 'action_unavailable')).toEqual([]);
      expect(codes.includes('action_unavailable')).toBe(usesSms);
    }
  });

  it('never double-alerts the HomeQuote team on intake', () => {
    const intake = WORKFLOW_TEMPLATES.find((t) => t.key === 'new_lead_intake')!;
    expect(intake.definition.steps.some((s) => s.stepType === 'action' && s.action.type === 'notify_team')).toBe(false);
  });

  it('clones into a disabled workflow with lineage, without mutating the template', () => {
    const t = WORKFLOW_TEMPLATES[4];
    const { definition, row } = cloneTemplate(t, { contractorId: ids.contractor, createdBy: ids.user, name: 'Pool Masters estimate follow-up' });
    expect(row).toMatchObject({ contractor_id: ids.contractor, is_template: false, template_key: 'estimate_follow_up', enabled: false, version: 1 });
    expect(definition.name).toBe('Pool Masters estimate follow-up');
    expect(t.definition.name).toBe('Estimate Follow-Up');
  });
});

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
describe('log format', () => {
  it('builds a log row and refuses personal data or secrets', () => {
    const runId = randomUUID();
    expect(toWorkflowLogRow({ level: 'info', code: 'step.succeeded', message: 'Sent', runId, data: { step_key: 'welcome_sms', provider_message_id: 'abc' } }))
      .toMatchObject({ run_id: runId, code: 'step.succeeded', data: { step_key: 'welcome_sms' } });
    for (const data of [{ email: 'a@b.co' }, { toPhoneNumber: '+1' }, { nested: { refresh_token: 'x' } }, { body: 'hi' }, { name: 'Pat' }]) {
      expect(() => toWorkflowLogRow({ level: 'info', code: 'step.succeeded', message: 'x', runId, data })).toThrow();
    }
    expect(() => toWorkflowLogRow({ level: 'info', code: 'step.succeeded', message: 'orphan' })).toThrow();
    expect(() => toWorkflowLogRow({ level: 'info', code: 'step.exploded' as never, message: 'x', runId })).toThrow();
  });
});
