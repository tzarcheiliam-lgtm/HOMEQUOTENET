import type { WorkflowEntityType } from './domain';
import type { WorkflowEventType } from './events';

/**
 * Idempotency is layered; each layer is a UNIQUE constraint in the database,
 * so correctness never depends on in-process memory:
 *
 *  1. Event    workflow_events.idempotency_key            (same fact -> same event row, whoever reports it)
 *  2. Run      workflow_runs (workflow_id, trigger_event_id) (same event -> one run per workflow)
 *              + dedupe_key / concurrency_key               (reentry_policy)
 *  3. Step     workflow_step_runs (run_id, step_key, iteration)
 *  4. Effect   workflow_step_runs.idempotency_key, handed to every handler and
 *              used as the outbox/provider unique key     (retry never re-sends)
 */

export const IDEMPOTENCY_KEY_MAX = 300;

/**
 * Event key = `${type}|${ref}`. The key identifies the FACT, never the
 * emitter or the delivery attempt, so the same fact reported by two emitters
 * (a funnel function and a table trigger, a webhook and an embed callback)
 * still collapses into one event. Each event type has exactly one canonical
 * ref format: WORKFLOW_TRIGGERS[type].idempotencyRef. Never put Date.now() or
 * random values in a ref. `source` is recorded on the event, not in the key.
 */
export const EVENT_REF_PATTERN = /^[a-z][a-z_]*:[^|\s]+$/;

export function eventIdempotencyKey(type: WorkflowEventType, ref: string): string {
  const cleanRef = ref.trim();
  if (!EVENT_REF_PATTERN.test(cleanRef)) {
    throw new Error('Idempotency ref looks like "<namespace>:<id>", e.g. "lead:<uuid>", with no "|" or spaces');
  }
  const key = `${type}|${cleanRef}`;
  if (key.length > IDEMPOTENCY_KEY_MAX) {
    throw new Error(`Idempotency key exceeds ${IDEMPOTENCY_KEY_MAX} chars; hash the ref upstream`);
  }
  return key;
}

export const WORKFLOW_REENTRY_POLICIES = ['once_per_event', 'once_per_entity', 'one_active_per_entity'] as const;
export type WorkflowReentryPolicy = (typeof WORKFLOW_REENTRY_POLICIES)[number];

/**
 * Column values a new run gets for a reentry policy.
 *  - once_per_event:        only layer 2 applies (default)
 *  - once_per_entity:       dedupe_key -> never twice for this entity, ever
 *  - one_active_per_entity: concurrency_key -> at most one pending/running/waiting run per entity
 */
export function runKeys(
  policy: WorkflowReentryPolicy,
  entityType: WorkflowEntityType,
  entityId: string
): { dedupeKey: string | null; concurrencyKey: string | null } {
  const key = `${entityType}:${entityId}`;
  switch (policy) {
    case 'once_per_event':
      return { dedupeKey: null, concurrencyKey: null };
    case 'once_per_entity':
      return { dedupeKey: key, concurrencyKey: null };
    case 'one_active_per_entity':
      return { dedupeKey: null, concurrencyKey: key };
  }
}

export function stepRunIdempotencyKey(runId: string, stepKey: string, iteration = 0): string {
  return `${runId}:${stepKey}:${iteration}`;
}
