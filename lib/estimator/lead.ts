import { contactSchema } from '../funnels/schema.ts';
import { picksFor, visibleQuestions, type Answers, type EstimatorConfig, type RangeEstimate } from './engine.ts';

/**
 * Lead capture for the instant estimators.
 *
 * DISABLED ON PURPOSE, like the ADU estimator: nothing is sent or stored until
 * a destination is approved. Estimator leads must NOT go into the network
 * `leads` pipeline (alerts, AI calls, Meta events, distribution); they belong
 * to the contractor who owns the estimator. See docs/pool-estimator.md.
 */
export const ESTIMATOR_LEAD_CAPTURE_ENABLED = false;

/** What a connected destination would receive alongside the contact details. */
export function buildLeadPayload(config: EstimatorConfig, answers: Answers, estimate: RangeEstimate) {
  return {
    trade: config.trade,
    pricesConfirmed: config.pricesConfirmed,
    answers: Object.fromEntries(
      visibleQuestions(config, answers).map((q) => [
        q.id,
        picksFor(q, answers).map((id) => q.options.find((o) => o.id === id)?.label ?? id),
      ]),
    ),
    range: estimate.low === null ? null : { low: estimate.low, high: estimate.high },
    status: estimate.status,
    siteVisitItems: estimate.siteVisitItems.map((i) => i.label),
  };
}

/** Same contact rules as the homeowner funnel (name, email, US phone, consent, honeypot). */
export function validateContact(input: unknown) {
  const parsed = contactSchema.safeParse(input);
  if (parsed.success) return { ok: true as const, contact: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false as const, errors };
}
