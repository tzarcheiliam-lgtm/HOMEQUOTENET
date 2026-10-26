import { contactSchema } from '../funnels/schema.ts';
import { SITE_QUESTIONS } from './pricing-config.ts';
import type { AduSelection, Estimate } from './pricing.ts';

/**
 * Lead capture for the ADU estimator.
 *
 * DISABLED ON PURPOSE. No visitor data is sent or stored anywhere until the
 * owner approves a destination. The form still validates (with the same rules
 * the homeowner funnel uses) so the experience can be reviewed end to end.
 *
 * To connect it, see "Connecting lead capture" in docs/adu-estimator.md.
 */
export const ADU_LEAD_CAPTURE_ENABLED = false;

/** What a connected destination would receive alongside the contact details. */
export function buildLeadPayload(selection: AduSelection, estimate: Estimate) {
  return {
    build: selection.kind === 'garage' ? 'garage_conversion' : 'new_detached',
    bedrooms: selection.kind === 'garage' ? null : selection.bedrooms,
    sizeTier: estimate.tier,
    approxSqft: estimate.approxSqft,
    finishes: selection.finishes,
    siteAnswers: Object.fromEntries(SITE_QUESTIONS.map((q) => [q.id, selection.site[q.id] ?? null])),
    price: { amount: estimate.total, kind: estimate.isFirm ? 'estimate' : 'starting_price' },
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
