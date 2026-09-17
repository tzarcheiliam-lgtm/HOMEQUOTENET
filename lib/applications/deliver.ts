import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApplicationInput } from '@/lib/validation/application';

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
 * Behaviour:
 *   - No sink configured  → log-only mode. The full payload is written to the
 *     server log with a findable marker so nothing is lost, and the applicant
 *     still sees success. Intended for local development and first deploys.
 *   - A sink is configured but fails → the action reports an error so the
 *     applicant is given a fallback, and the payload is logged for recovery.
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
  /** True when at least one durable sink accepted the submission. */
  persisted: boolean;
  sinks: {
    webhook: 'skipped' | 'ok' | 'failed';
    supabase: 'skipped' | 'ok' | 'failed';
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
  const result: DeliveryResult = {
    ok: false,
    persisted: false,
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

  const configuredCount = tasks.length;
  result.persisted =
    result.sinks.webhook === 'ok' || result.sinks.supabase === 'ok';

  if (configuredCount === 0) {
    // Log-only mode: nothing configured yet. Keep the payload recoverable.
    console.warn(
      `${LOG_MARKER} NO DELIVERY SINK CONFIGURED — submission captured in logs only. ` +
        `Set CONTRACTOR_APPLICATION_WEBHOOK_URL or SUPABASE_SERVICE_ROLE_KEY to persist applications.`,
      JSON.stringify(record)
    );
    result.ok = true;
    return result;
  }

  if (!result.persisted) {
    // Everything configured failed. Log the payload so it can be recovered,
    // and report failure so the applicant gets a fallback route.
    console.error(
      `${LOG_MARKER} DELIVERY FAILED — all configured sinks errored. Payload follows for recovery.`,
      JSON.stringify({ record, errors: result.errors })
    );
    result.ok = false;
    return result;
  }

  if (result.errors.length > 0) {
    // Partial success: at least one sink stored it. Note the failure, continue.
    console.warn(
      `${LOG_MARKER} partial delivery — ${result.errors.join('; ')}`
    );
  } else {
    console.info(`${LOG_MARKER} delivered for ${record.company}`);
  }

  result.ok = true;
  return result;
}
