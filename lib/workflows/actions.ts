import { z } from 'zod';
import { assignmentStatusSchema, leadStatusSchema, uuidSchema, type Availability } from './domain';
import { waitConfigurationSchema } from './wait';
import type { WorkflowEvent } from './events';

/**
 * Canonical action registry. wait and stop_workflow are control actions: the
 * engine handles them itself (no handler, no side effect). Every other action
 * is executed by a handler implementing WorkflowActionHandler. The engine
 * never imports a provider SDK — providers live behind handlers/adapters.
 */

export const WORKFLOW_ACTION_TYPES = [
  'send_sms',
  'send_email',
  'assign_user',
  'change_pipeline_stage',
  'create_task',
  'add_tag',
  'remove_tag',
  'wait',
  'send_webhook',
  'notify_team',
  'create_calendar_event',
  'stop_workflow',
] as const;
export type WorkflowActionType = (typeof WORKFLOW_ACTION_TYPES)[number];
export const workflowActionTypeSchema = z.enum(WORKFLOW_ACTION_TYPES);

// ---------------------------------------------------------------------------
// Merge fields: message text may reference {{lead.first_name}} etc. Only these
// roots resolve; anything else is a validation error, so templates cannot
// reach arbitrary data (or secrets).
// ---------------------------------------------------------------------------
export const MERGE_FIELDS = [
  'lead.first_name',
  'lead.last_name',
  'lead.city',
  'lead.zip',
  'contractor.name',
  'appointment.scheduled_at',
  'appointment.location',
  'estimate.amount',
  'homequote.phone',
  'homequote.site_url',
] as const;
export type MergeField = (typeof MERGE_FIELDS)[number];
const MERGE_TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function mergeFieldsIn(text: string): string[] {
  return Array.from(text.matchAll(MERGE_TOKEN), (m) => m[1]);
}

const templatedText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .superRefine((text, ctx) => {
      for (const field of mergeFieldsIn(text)) {
        if (!(MERGE_FIELDS as readonly string[]).includes(field)) {
          ctx.addIssue({ code: 'custom', message: `Unknown merge field {{${field}}}` });
        }
      }
    });

const httpsUrl = z
  .string()
  .url()
  .max(2000)
  .refine((v) => new URL(v).protocol === 'https:', 'Webhooks must use HTTPS');

// ---------------------------------------------------------------------------
// Per-action config schemas
// ---------------------------------------------------------------------------
export const WORKFLOW_ACTION_CONFIG_SCHEMAS = {
  // Contract only. Recipient is always the lead's phone (leads.phone_e164).
  // No provider field: the transport is chosen by server configuration.
  send_sms: z
    .object({
      body: templatedText(1600),
      // Hold until the lead's local 8am-9pm window (TCPA). Default on.
      respectQuietHours: z.boolean().default(true),
    })
    .strict(),
  // Delivered through the existing Gmail connection (lib/emails/gmail.ts).
  // Either inline subject/body, or a saved email_templates row (id) whose
  // subject/html_body are rendered instead — existing workflows that already
  // store inline subject/body keep working unchanged.
  send_email: z
    .object({
      to: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('lead') }).strict(),
        // Existing lead_recipients rows (migration 0016).
        z.object({ kind: z.literal('recipients'), recipientIds: z.array(uuidSchema).min(1).max(20) }).strict(),
      ]),
      templateId: uuidSchema.optional(),
      subject: templatedText(200).optional(),
      body: templatedText(10_000).optional(),
    })
    .strict()
    .refine((c) => !!c.templateId || (!!c.subject && !!c.body), 'Choose a saved template or enter a subject and body'),
  // needs_domain: leads have no owner/assignee user column yet.
  assign_user: z
    .object({
      strategy: z.enum(['specific', 'round_robin']),
      userIds: z.array(uuidSchema).min(1).max(50),
    })
    .strict()
    .refine((c) => c.strategy !== 'specific' || c.userIds.length === 1, 'A specific assignment names exactly one user'),
  // Network pipeline = leads.status; contractor pipeline = lead_assignments.status.
  change_pipeline_stage: z.discriminatedUnion('pipeline', [
    z.object({ pipeline: z.literal('lead'), status: leadStatusSchema }).strict(),
    z.object({ pipeline: z.literal('assignment'), status: assignmentStatusSchema }).strict(),
  ]),
  // needs_domain: no tasks table yet.
  create_task: z
    .object({
      title: templatedText(200),
      description: templatedText(2000).optional(),
      dueInMinutes: z.number().int().min(0).max(129_600).optional(),
      assigneeUserId: uuidSchema.optional(),
    })
    .strict(),
  // needs_domain: no tags table yet.
  add_tag: z.object({ tag: z.string().trim().regex(/^[a-z0-9][a-z0-9 _-]{0,49}$/i) }).strict(),
  remove_tag: z.object({ tag: z.string().trim().regex(/^[a-z0-9][a-z0-9 _-]{0,49}$/i) }).strict(),
  wait: waitConfigurationSchema,
  send_webhook: z
    .object({
      url: httpsUrl,
      // Signing secret is referenced by integrations.id, never stored inline.
      signingIntegrationId: uuidSchema.optional(),
      includeLeadContact: z.boolean().default(false),
    })
    .strict(),
  // HomeQuote team alert through the existing Gmail sender and LEAD_ALERT_EMAILS.
  notify_team: z
    .object({
      audience: z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('lead_alert_team') }).strict(),
        z.object({ kind: z.literal('recipients'), recipientIds: z.array(uuidSchema).min(1).max(20) }).strict(),
      ]),
      subject: templatedText(200),
      message: templatedText(5000),
    })
    .strict(),
  // Creates a HomeQuote appointments row on the run's assignment. External
  // calendar sync (Google/Calendly/GHL) is out of scope for this action.
  create_calendar_event: z
    .object({
      startsInMinutes: z.number().int().min(0).max(129_600),
      location: z.string().max(300).optional(),
      notes: templatedText(2000).optional(),
    })
    .strict(),
  stop_workflow: z.object({ reason: z.string().max(200).optional() }).strict(),
} as const satisfies Record<WorkflowActionType, z.ZodTypeAny>;

export type WorkflowActionConfigMap = {
  [K in WorkflowActionType]: z.input<(typeof WORKFLOW_ACTION_CONFIG_SCHEMAS)[K]>;
};

/** A configured action: the discriminated pair stored in workflow_steps (action_type + config). */
export type WorkflowAction = {
  [K in WorkflowActionType]: { type: K; config: WorkflowActionConfigMap[K] };
}[WorkflowActionType];

export function parseActionConfig<K extends WorkflowActionType>(type: K, config: unknown) {
  return WORKFLOW_ACTION_CONFIG_SCHEMAS[type].safeParse(config);
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export interface WorkflowActionDefinition<K extends WorkflowActionType = WorkflowActionType> {
  type: K;
  label: string;
  category: 'messaging' | 'crm' | 'integration' | 'control';
  availability: Availability;
  /** Handled by the engine itself (no handler, no side effect). */
  control: boolean;
  /** Needs leads.consent_granted = true (TCPA / CAN-SPAM for lead-facing messages). */
  requiresConsent: boolean;
  requiresLead: boolean;
  /** Needs a lead_assignment on the run (contractor-side actions). */
  requiresAssignment: boolean;
  /** Default retry budget; 1 = no retries. */
  defaultMaxAttempts: number;
  /** Existing system the handler must build on — never a parallel one. */
  backedBy: string;
}

const a = <K extends WorkflowActionType>(d: WorkflowActionDefinition<K>) => d;

export const WORKFLOW_ACTIONS = {
  send_sms: a({ type: 'send_sms', label: 'Send SMS', category: 'messaging', availability: 'contract_only', control: false, requiresConsent: true, requiresLead: true, requiresAssignment: false, defaultMaxAttempts: 5, backedBy: 'No SMS provider is connected (Phase 1 is contract only). A future provider adapter sits behind the send_sms handler.' }),
  send_email: a({ type: 'send_email', label: 'Send email', category: 'messaging', availability: 'ready', control: false, requiresConsent: true, requiresLead: true, requiresAssignment: false, defaultMaxAttempts: 5, backedBy: 'Existing Gmail connection (lib/emails/gmail.ts sendGmailMessage) via a durable outbox, like lead_email_deliveries.' }),
  assign_user: a({ type: 'assign_user', label: 'Assign user', category: 'crm', availability: 'needs_domain', control: false, requiresConsent: false, requiresLead: true, requiresAssignment: false, defaultMaxAttempts: 3, backedBy: 'None yet: leads have no owner/assignee user column. Contractor distribution stays manual (distribute_lead).' }),
  change_pipeline_stage: a({ type: 'change_pipeline_stage', label: 'Change pipeline stage', category: 'crm', availability: 'ready', control: false, requiresConsent: false, requiresLead: true, requiresAssignment: false, defaultMaxAttempts: 3, backedBy: 'leads.status (pipeline=lead) or lead_assignments.status (pipeline=assignment, requires the run assignment).' }),
  create_task: a({ type: 'create_task', label: 'Create task', category: 'crm', availability: 'needs_domain', control: false, requiresConsent: false, requiresLead: false, requiresAssignment: false, defaultMaxAttempts: 3, backedBy: 'None yet: no tasks table.' }),
  add_tag: a({ type: 'add_tag', label: 'Add tag', category: 'crm', availability: 'needs_domain', control: false, requiresConsent: false, requiresLead: true, requiresAssignment: false, defaultMaxAttempts: 3, backedBy: 'None yet: no tags table.' }),
  remove_tag: a({ type: 'remove_tag', label: 'Remove tag', category: 'crm', availability: 'needs_domain', control: false, requiresConsent: false, requiresLead: true, requiresAssignment: false, defaultMaxAttempts: 3, backedBy: 'None yet: no tags table.' }),
  wait: a({ type: 'wait', label: 'Wait', category: 'control', availability: 'ready', control: true, requiresConsent: false, requiresLead: false, requiresAssignment: false, defaultMaxAttempts: 1, backedBy: 'workflow_runs.resume_at + scheduled worker (no in-memory timers).' }),
  send_webhook: a({ type: 'send_webhook', label: 'Send webhook', category: 'integration', availability: 'ready', control: false, requiresConsent: false, requiresLead: false, requiresAssignment: false, defaultMaxAttempts: 5, backedBy: 'Outbound HTTPS POST; signing secret from public.integrations (admin-only secret column).' }),
  notify_team: a({ type: 'notify_team', label: 'Notify team', category: 'messaging', availability: 'ready', control: false, requiresConsent: false, requiresLead: false, requiresAssignment: false, defaultMaxAttempts: 5, backedBy: 'Existing Gmail connection + LEAD_ALERT_EMAILS / lead_recipients (migration 0016).' }),
  create_calendar_event: a({ type: 'create_calendar_event', label: 'Create appointment', category: 'crm', availability: 'ready', control: false, requiresConsent: false, requiresLead: true, requiresAssignment: true, defaultMaxAttempts: 3, backedBy: 'public.appointments on the run assignment.' }),
  stop_workflow: a({ type: 'stop_workflow', label: 'Stop workflow', category: 'control', availability: 'ready', control: true, requiresConsent: false, requiresLead: false, requiresAssignment: false, defaultMaxAttempts: 1, backedBy: 'Engine: completes the run with no further steps.' }),
} as const satisfies { [K in WorkflowActionType]: WorkflowActionDefinition<K> };

// ---------------------------------------------------------------------------
// Result / failure contract
// ---------------------------------------------------------------------------
/**
 * Provider-neutral delivery metadata. `provider` is an opaque label for
 * display/debugging ("gmail", "sms"...); the engine never branches on it.
 * Never store secrets, tokens, or full message bodies here.
 */
export interface ProviderMetadata {
  provider: string;
  providerMessageId?: string;
  statusCode?: number;
  detail?: Record<string, string | number | boolean | null>;
}

export const WORKFLOW_ERROR_KINDS = ['temporary', 'permanent'] as const;
export type WorkflowErrorKind = (typeof WORKFLOW_ERROR_KINDS)[number];

/** Stored in workflow_runs.last_error / workflow_step_runs.last_error. */
export interface WorkflowError {
  /** Stable machine code, e.g. 'no_consent', 'provider_timeout', 'invalid_config'. */
  code: string;
  /** Human summary. No PII, no raw provider bodies, no secrets. */
  message: string;
  kind: WorkflowErrorKind;
  retryable: boolean;
  details?: Record<string, string | number | boolean | null>;
}

export const workflowErrorSchema = z
  .object({
    code: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
    message: z.string().min(1).max(500),
    kind: z.enum(WORKFLOW_ERROR_KINDS),
    retryable: z.boolean(),
    details: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  })
  .strict()
  .refine((e) => (e.kind === 'temporary') === e.retryable, 'Temporary errors are retryable; permanent errors are not');

/** Codes a handler reports when an action is deliberately not performed. */
export const WORKFLOW_SKIP_REASONS = [
  'no_consent',
  'missing_contact',
  'missing_assignment',
  'condition_not_met',
  'quiet_hours_expired',
  'anchor_missing',
  'anchor_past',
  'unavailable_action',
] as const;
export type WorkflowSkipReason = (typeof WORKFLOW_SKIP_REASONS)[number];

export type WorkflowActionResult =
  | { outcome: 'success'; output?: Record<string, unknown>; provider?: ProviderMetadata }
  | { outcome: 'skipped'; reason: WorkflowSkipReason; provider?: ProviderMetadata }
  | { outcome: 'temporary_failure'; error: WorkflowError; retryAfterSeconds?: number; provider?: ProviderMetadata }
  | { outcome: 'permanent_failure'; error: WorkflowError; provider?: ProviderMetadata };

export interface RetryPolicy {
  maxAttempts: number;
  baseDelaySeconds: number;
  maxDelaySeconds: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = { maxAttempts: 5, baseDelaySeconds: 60, maxDelaySeconds: 3600 };

/**
 * Exponential backoff: base * 2^(attempt-1), capped; a provider's
 * retryAfterSeconds wins when larger. `attempt` is the attempt that just
 * failed (1-based). Returns null when the budget is spent (-> permanent).
 */
export function nextRetryAt(
  attempt: number,
  now: Date,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  retryAfterSeconds?: number
): Date | null {
  if (attempt >= policy.maxAttempts) return null;
  const backoff = Math.min(policy.baseDelaySeconds * 2 ** (attempt - 1), policy.maxDelaySeconds);
  const delay = Math.max(backoff, Math.min(retryAfterSeconds ?? 0, policy.maxDelaySeconds));
  return new Date(now.getTime() + delay * 1000);
}

// ---------------------------------------------------------------------------
// Handler port (implemented in Phase 2+; SMS providers plug in behind it)
// ---------------------------------------------------------------------------
export interface WorkflowActionContext<K extends WorkflowActionType = WorkflowActionType> {
  action: { type: K; config: z.output<(typeof WORKFLOW_ACTION_CONFIG_SCHEMAS)[K]> };
  run: { id: string; workflowId: string; contractorId: string | null; leadId: string | null };
  stepRun: {
    id: string;
    stepKey: string;
    attempt: number;
    /** Pass to the provider / outbox unique key so a retry never double-sends. */
    idempotencyKey: string;
  };
  event: WorkflowEvent;
  now: Date;
}

export interface WorkflowActionHandler<K extends WorkflowActionType = WorkflowActionType> {
  type: K;
  execute(ctx: WorkflowActionContext<K>): Promise<WorkflowActionResult>;
}
