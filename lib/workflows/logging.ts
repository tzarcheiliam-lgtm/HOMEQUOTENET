import { z } from 'zod';

/**
 * Structured workflow logging. One row in public.workflow_logs per entry.
 * Codes are a closed list so dashboards and alerts can rely on them.
 * `data` carries ids, codes and counts only — never phone numbers, emails,
 * message bodies, tokens or secrets (enforced by workflowLogEntrySchema).
 */

export const WORKFLOW_LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type WorkflowLogLevel = (typeof WORKFLOW_LOG_LEVELS)[number];

export const WORKFLOW_LOG_CODES = [
  'event.recorded',
  'event.duplicate',
  'event.no_match',
  'event.dispatch_failed',
  'run.created',
  'run.duplicate',
  'run.conditions_not_met',
  'run.started',
  'run.waiting',
  'run.resumed',
  'run.completed',
  'run.failed',
  'run.cancelled',
  'run.exit_event',
  'run.lease_expired',
  'step.started',
  'step.succeeded',
  'step.skipped',
  'step.retry_scheduled',
  'step.failed',
  'step.waiting',
  'action.provider_response',
] as const;
export type WorkflowLogCode = (typeof WORKFLOW_LOG_CODES)[number];

/**
 * Keys that must never appear in log data, checked at any depth after
 * normalizing camelCase to snake_case. Fragments match anywhere in the key
 * (phoneNumber, lead_email, refresh_token); exact names match whole keys only
 * (so step_name is fine but name is not).
 */
export const FORBIDDEN_LOG_KEY_FRAGMENTS = ['email', 'phone', 'token', 'secret', 'password', 'authorization', 'api_key', 'body', 'address', 'cookie'] as const;
export const FORBIDDEN_LOG_KEYS = ['name', 'first_name', 'last_name', 'full_name', 'text', 'html', 'message'] as const;

export function isForbiddenLogKey(key: string): boolean {
  const norm = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  return (
    (FORBIDDEN_LOG_KEYS as readonly string[]).includes(norm) ||
    FORBIDDEN_LOG_KEY_FRAGMENTS.some((f) => norm.includes(f))
  );
}

function forbiddenKeyIn(value: unknown, depth = 0): string | null {
  if (depth > 5 || value === null || typeof value !== 'object') return null;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (isForbiddenLogKey(k)) return k;
    const nested = forbiddenKeyIn(v, depth + 1);
    if (nested) return nested;
  }
  return null;
}

export interface WorkflowLogEntry {
  level: WorkflowLogLevel;
  code: WorkflowLogCode;
  message: string;
  workflowId?: string | null;
  runId?: string | null;
  stepRunId?: string | null;
  eventId?: string | null;
  /** Filled by the database from the run/event; callers may omit it. */
  contractorId?: string | null;
  data?: Record<string, unknown>;
}

const optionalUuid = z.string().uuid().nullable().optional();

export const workflowLogEntrySchema = z
  .object({
    level: z.enum(WORKFLOW_LOG_LEVELS),
    code: z.enum(WORKFLOW_LOG_CODES),
    message: z.string().min(1).max(1000),
    workflowId: optionalUuid,
    runId: optionalUuid,
    stepRunId: optionalUuid,
    eventId: optionalUuid,
    contractorId: optionalUuid,
    data: z.record(z.unknown()).default({}),
  })
  .strict()
  .superRefine((entry, ctx) => {
    const bad = forbiddenKeyIn(entry.data);
    if (bad) ctx.addIssue({ code: 'custom', path: ['data', bad], message: `"${bad}" may carry personal data or secrets; log ids instead` });
    if (!entry.workflowId && !entry.runId && !entry.stepRunId && !entry.eventId) {
      ctx.addIssue({ code: 'custom', message: 'A log entry references at least one workflow, run, step run or event' });
    }
  });

/** Maps a validated entry to a public.workflow_logs insert. */
export function toWorkflowLogRow(entry: WorkflowLogEntry) {
  const e = workflowLogEntrySchema.parse(entry);
  return {
    level: e.level,
    code: e.code,
    message: e.message,
    workflow_id: e.workflowId ?? null,
    run_id: e.runId ?? null,
    step_run_id: e.stepRunId ?? null,
    event_id: e.eventId ?? null,
    contractor_id: e.contractorId ?? null,
    data: e.data,
  };
}
