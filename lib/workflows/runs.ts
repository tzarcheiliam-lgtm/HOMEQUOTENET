import type { WorkflowEntityType } from './domain';
import type { ProviderMetadata, RetryPolicy, WorkflowActionResult, WorkflowActionType, WorkflowError, WorkflowErrorKind } from './actions';
import { nextRetryAt } from './actions';

/**
 * Run and step-run state machines. The value lists are mirrored by CHECK
 * constraints in migration 0017; terminal states are also enforced there
 * (trg_workflow_runs_guard / trg_workflow_step_runs_guard).
 */

export const WORKFLOW_RUN_STATUSES = ['pending', 'running', 'waiting', 'completed', 'failed', 'cancelled'] as const;
export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number];
export const TERMINAL_RUN_STATUSES = ['completed', 'failed', 'cancelled'] as const satisfies readonly WorkflowRunStatus[];

/**
 *  pending  -> running | cancelled | failed
 *  running  -> waiting | completed | failed | cancelled
 *  waiting  -> running | cancelled
 * A crashed worker leaves a run 'running' with an expired locked_until; the
 * next worker re-claims it without a status change (running -> running).
 */
export const RUN_TRANSITIONS: Record<WorkflowRunStatus, readonly WorkflowRunStatus[]> = {
  pending: ['running', 'cancelled', 'failed'],
  running: ['running', 'waiting', 'completed', 'failed', 'cancelled'],
  waiting: ['running', 'cancelled'],
  completed: [],
  failed: [],
  cancelled: [],
};

export function canTransitionRun(from: WorkflowRunStatus, to: WorkflowRunStatus): boolean {
  return RUN_TRANSITIONS[from].includes(to);
}
export function isTerminalRunStatus(s: WorkflowRunStatus): boolean {
  return (TERMINAL_RUN_STATUSES as readonly string[]).includes(s);
}

export const WORKFLOW_STEP_RUN_STATUSES = [
  'pending',
  'running',
  'waiting',
  'retry_scheduled',
  'succeeded',
  'failed',
  'skipped',
  'cancelled',
] as const;
export type WorkflowStepRunStatus = (typeof WORKFLOW_STEP_RUN_STATUSES)[number];
export const TERMINAL_STEP_RUN_STATUSES = ['succeeded', 'failed', 'skipped', 'cancelled'] as const satisfies readonly WorkflowStepRunStatus[];

export const STEP_RUN_TRANSITIONS: Record<WorkflowStepRunStatus, readonly WorkflowStepRunStatus[]> = {
  pending: ['running', 'skipped', 'cancelled'],
  running: ['running', 'waiting', 'retry_scheduled', 'succeeded', 'failed', 'skipped', 'cancelled'],
  waiting: ['succeeded', 'skipped', 'cancelled'],
  retry_scheduled: ['running', 'cancelled'],
  succeeded: [],
  failed: [],
  skipped: [],
  cancelled: [],
};

export function canTransitionStepRun(from: WorkflowStepRunStatus, to: WorkflowStepRunStatus): boolean {
  return STEP_RUN_TRANSITIONS[from].includes(to);
}
export function isTerminalStepRunStatus(s: WorkflowStepRunStatus): boolean {
  return (TERMINAL_STEP_RUN_STATUSES as readonly string[]).includes(s);
}

/**
 * How a handler's result moves a running step. Temporary failures retry
 * until the budget is spent, then become permanent failures.
 */
export type StepRunUpdate =
  | { status: 'succeeded'; output: Record<string, unknown> | null; provider: ProviderMetadata | null }
  | { status: 'skipped'; skipReason: string; provider: ProviderMetadata | null }
  | { status: 'retry_scheduled'; failureKind: 'temporary'; lastError: WorkflowError; nextRetryAt: Date; provider: ProviderMetadata | null }
  | { status: 'failed'; failureKind: WorkflowErrorKind; lastError: WorkflowError; provider: ProviderMetadata | null };

export function stepRunUpdateForResult(
  result: WorkflowActionResult,
  attempt: number,
  now: Date,
  policy: RetryPolicy
): StepRunUpdate {
  const provider = result.provider ?? null;
  switch (result.outcome) {
    case 'success':
      return { status: 'succeeded', output: result.output ?? null, provider };
    case 'skipped':
      return { status: 'skipped', skipReason: result.reason, provider };
    case 'permanent_failure':
      return { status: 'failed', failureKind: 'permanent', lastError: result.error, provider };
    case 'temporary_failure': {
      const at = nextRetryAt(attempt, now, policy, result.retryAfterSeconds);
      if (at) return { status: 'retry_scheduled', failureKind: 'temporary', lastError: result.error, nextRetryAt: at, provider };
      return {
        status: 'failed',
        failureKind: 'temporary',
        lastError: { ...result.error, details: { ...result.error.details, retries_exhausted: true } },
        provider,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Row shapes (snake_case, as stored)
// ---------------------------------------------------------------------------
export interface WorkflowRunRow {
  id: string;
  workflow_id: string;
  workflow_version: number;
  definition_snapshot: Record<string, unknown>;
  contractor_id: string | null;
  trigger_event_id: string;
  lead_id: string | null;
  entity_type: WorkflowEntityType;
  entity_id: string;
  status: WorkflowRunStatus;
  current_step_key: string | null;
  dedupe_key: string | null;
  concurrency_key: string | null;
  resume_at: string | null;
  locked_by: string | null;
  locked_until: string | null;
  context: Record<string, unknown>;
  metadata: Record<string, unknown>;
  last_error: WorkflowError | null;
  cancel_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStepRunRow {
  id: string;
  run_id: string;
  contractor_id: string | null;
  step_key: string;
  iteration: number;
  step_type: 'action' | 'branch';
  action_type: WorkflowActionType | null;
  status: WorkflowStepRunStatus;
  idempotency_key: string;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string | null;
  resume_at: string | null;
  failure_kind: WorkflowErrorKind | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  last_error: WorkflowError | null;
  provider: ProviderMetadata | null;
  skip_reason: string | null;
  locked_by: string | null;
  locked_until: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** camelCase aliases for application code. */
export type WorkflowRun = WorkflowRunRow;
export type WorkflowStepRun = WorkflowStepRunRow;
