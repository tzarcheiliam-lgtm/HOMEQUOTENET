/**
 * Decides whether a contractor application was genuinely delivered.
 *
 * Pure and dependency-free so it can be unit-tested: `deliver.ts` imports
 * `server-only`, which throws outside a React server context.
 *
 * The rule that matters: the applicant is only told "Application received"
 * when a real sink actually accepted the submission. Writing the payload to
 * the server log is a developer convenience, never a delivery — a contractor
 * who sees success while their application sits in a log line is a lost lead.
 */

export type SinkState = 'skipped' | 'ok' | 'failed';

export type DeliveryMode =
  /** At least one sink stored it. The only mode that may report success. */
  | 'delivered'
  /** Nothing configured, development only. Logged, clearly flagged as such. */
  | 'log_only_dev'
  /** Nothing configured in production. A misconfiguration, never a success. */
  | 'unconfigured'
  /** Sinks were configured and every one of them failed. */
  | 'failed';

export type DeliveryOutcome = {
  /** True only when the applicant may be shown the success panel. */
  ok: boolean;
  /** True when a durable sink accepted the submission. */
  persisted: boolean;
  mode: DeliveryMode;
};

export function resolveDeliveryOutcome(input: {
  webhook: SinkState;
  supabase: SinkState;
  isProduction: boolean;
}): DeliveryOutcome {
  const { webhook, supabase, isProduction } = input;

  const persisted = webhook === 'ok' || supabase === 'ok';
  const configuredCount =
    (webhook === 'skipped' ? 0 : 1) + (supabase === 'skipped' ? 0 : 1);

  // A sink accepted it. This is the only path to success, and it holds even
  // when the other sink failed — the application is safely stored either way.
  if (persisted) {
    return { ok: true, persisted: true, mode: 'delivered' };
  }

  // Nothing was configured at all.
  if (configuredCount === 0) {
    return isProduction
      ? { ok: false, persisted: false, mode: 'unconfigured' }
      : { ok: true, persisted: false, mode: 'log_only_dev' };
  }

  // Sinks existed and all of them failed. Never a success, in any environment:
  // in development this is exactly the bug a developer needs to see.
  return { ok: false, persisted: false, mode: 'failed' };
}
