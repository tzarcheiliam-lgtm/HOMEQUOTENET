import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApplicationInput } from '@/lib/validation/application';
import {
  resolveDeliveryOutcome,
  type SinkState,
  type DeliveryMode,
} from './outcome';
import { redactForLog, newSubmissionRef } from './redact';

/**
 * Contractor-application delivery.
 *
 * Submissions are sent to every configured sink. Configuration is entirely
 * environment-variable driven — no credentials are ever hardcoded.
 *
 *   CONTRACTOR_APPLICATION_WEBHOOK_URL
 *       Any POST-accepting endpoint: a GoHighLevel inbound webhook, a Zapier
 *       catch hook, a Make.com webhook, an n8n hook, or your own API.
 *
 *   CONTRACTOR_APPLICATION_WEBHOOK_SECRET   (optional)
 *       Sent as `X-HomeQuote-Secret` so the receiver can verify the caller.
 *
 *   CONTRACTOR_APPLICATIONS_TABLE           (optional, default below)
 *       Supabase table to insert into. Requires SUPABASE_SERVICE_ROLE_KEY.
 *       Create it with supabase/migrations/0006_contractor_applications.sql.
 *
 * Behaviour — see `resolveDeliveryOutcome` in ./outcome.ts for the rule:
 *   - A sink accepted it → success, even if the other sink failed.
 *   - Sinks configured but all failed → error. The payload is logged so it can
 *     be recovered, and the applicant is given a fallback contact route.
 *   - Nothing configured, in production → error. A log line is not a delivery,
 *     and telling a contractor "Application received" when nothing stored it
 *     loses the lead silently.
 *   - Nothing configured, in development → success, with the payload logged
 *     and clearly flagged as a local logging fallback.
 *
 * Production failure logs are redacted — see ./redact.ts. They carry enough to
 * notice and diagnose a failure and nothing that identifies the applicant.
 */

const LOG_MARKER = '[contractor-application]';
const DEFAULT_TABLE = 'contractor_applications';

export type ApplicationRecord = ApplicationInput & {
  /** Set server-side; never taken from the client. */
  submitted_at: string;
  source_page: string | null;
  user_agent: string | null;
};

export type DeliveryResult = {
  ok: boolean;
  /** Short random id correlating the log lines for this submission. */
  ref: string;
  /** True when at least one durable sink accepted the submission. */
  persisted: boolean;
  /** Why this outcome was reached; useful in logs and tests. */
  mode: DeliveryMode;
  sinks: {
    webhook: SinkState;
    supabase: SinkState;
  };
  errors: string[];
};

function webhookConfigured(): boolean {
  return Boolean(process.env.CONTRACTOR_APPLICATION_WEBHOOK_URL);
}

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function sendWebhook(record: ApplicationRecord): Promise<void> {
  const url = process.env.CONTRACTOR_APPLICATION_WEBHOOK_URL!;
  const secret = process.env.CONTRACTOR_APPLICATION_WEBHOOK_SECRET;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-HomeQuote-Secret': secret } : {}),
      },
      body: JSON.stringify({
        form: 'contractor_application',
        ...record,
        // Flattened duplicate for CRMs that cannot read arrays.
        primary_services_text: record.primary_services.join(', '),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Webhook responded ${res.status} ${res.statusText}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function insertSupabase(record: ApplicationRecord): Promise<void> {
  const table = process.env.CONTRACTOR_APPLICATIONS_TABLE || DEFAULT_TABLE;
  const supabase = createAdminClient();

  const { error } = await supabase.from(table).insert({
    first_name: record.first_name,
    last_name: record.last_name,
    company: record.company,
    phone: record.phone,
    email: record.email,
    website: record.website,
    primary_services: record.primary_services,
    service_areas: record.service_areas,
    avg_project_value: record.avg_project_value,
    min_project_size: record.min_project_size,
    monthly_lead_capacity: record.monthly_lead_capacity,
    response_time: record.response_time,
    uses_crm: record.uses_crm,
    track: record.track,
    notes: record.notes,
    consent: true,
    source_page: record.source_page,
    user_agent: record.user_agent,
    submitted_at: record.submitted_at,
  });

  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
}

export async function deliverApplication(
  record: ApplicationRecord
): Promise<DeliveryResult> {
  const ref = newSubmissionRef();

  const result: DeliveryResult = {
    ok: false,
    ref,
    persisted: false,
    mode: 'failed',
    sinks: { webhook: 'skipped', supabase: 'skipped' },
    errors: [],
  };

  // Run configured sinks in parallel; one failing must not block the other.
  const tasks: Promise<void>[] = [];

  if (webhookConfigured()) {
    tasks.push(
      sendWebhook(record)
        .then(() => {
          result.sinks.webhook = 'ok';
        })
        .catch((err: unknown) => {
          result.sinks.webhook = 'failed';
          result.errors.push(
            `webhook: ${err instanceof Error ? err.message : String(err)}`
          );
        })
    );
  }

  if (supabaseConfigured()) {
    tasks.push(
      insertSupabase(record)
        .then(() => {
          result.sinks.supabase = 'ok';
        })
        .catch((err: unknown) => {
          result.sinks.supabase = 'failed';
          result.errors.push(
            `supabase: ${err instanceof Error ? err.message : String(err)}`
          );
        })
    );
  }

  await Promise.all(tasks);

  const outcome = resolveDeliveryOutcome({
    webhook: result.sinks.webhook,
    supabase: result.sinks.supabase,
    isProduction: process.env.NODE_ENV === 'production',
  });

  result.ok = outcome.ok;
  result.persisted = outcome.persisted;
  result.mode = outcome.mode;

  switch (outcome.mode) {
    case 'delivered':
      if (result.errors.length > 0) {
        // One sink stored it, another did not. Note the failure and carry on —
        // the application is safe.
        console.warn(
          `${LOG_MARKER} ${ref} partial delivery`,
          JSON.stringify(redactForLog(record, { ref, sinks: result.sinks, errors: result.errors }))
        );
      } else {
        console.info(`${LOG_MARKER} ${ref} delivered for ${record.company}`);
      }
      break;

    case 'log_only_dev':
      /*
        Development only — this branch is unreachable in production, because
        `resolveDeliveryOutcome` returns `unconfigured` there instead. The full
        payload is kept here on purpose: locally it is the only way to see what
        the form submitted, and there is no durable log to leak into.
      */
      console.warn(
        `${LOG_MARKER} ${ref} NO DELIVERY SINK CONFIGURED — development logging fallback. ` +
          `This submission was NOT stored anywhere. Set ` +
          `CONTRACTOR_APPLICATION_WEBHOOK_URL or SUPABASE_SERVICE_ROLE_KEY to persist it.`,
        JSON.stringify(record)
      );
      break;

    case 'unconfigured':
      // Production with nothing configured. The applicant must not see success.
      console.error(
        `${LOG_MARKER} ${ref} NO DELIVERY SINK CONFIGURED IN PRODUCTION — application ` +
          `refused rather than silently dropped. Configure ` +
          `CONTRACTOR_APPLICATION_WEBHOOK_URL or SUPABASE_SERVICE_ROLE_KEY.`,
        JSON.stringify(redactForLog(record, { ref, sinks: result.sinks, errors: result.errors }))
      );
      break;

    case 'failed':
      console.error(
        `${LOG_MARKER} ${ref} DELIVERY FAILED — every configured sink errored.`,
        JSON.stringify(redactForLog(record, { ref, sinks: result.sinks, errors: result.errors }))
      );
      break;
  }

  return result;
}
