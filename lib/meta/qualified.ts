
/**
 * Legacy eligibility rules for the website "QualifiedLead" event (kept for reference and its tests; delivery now goes
 * through the conversion queue in queue.ts / conversions.ts, which is OFF until an admin enables it).
 * Sent only when a person (staff review) moves a website
 * funnel lead to qualification_status = 'qualified' — never for the funnel's automatic rules verdict,
 * AI-call outcomes, or an import. Same pixel/dataset, consent gate and event_id scheme as Lead/Schedule.
 * It becomes an optimization signal only once a custom conversion is created on it in Events Manager.
 */
const MAX_EVENT_AGE_MS = 7 * 24 * 3600 * 1000; // Meta rejects event_time older than 7 days.

export type QualifiedEligibilityInput = {
  qualificationStatus: string | null;
  qualifiedAt: string | null;
  qualifiedBy: string | null;
  leadSource: string | null;
  hasMetaSignal: boolean;      // fbc / fbp / fbclid / ad_id present on the lead
  session: { id: string; createdAt: string; measurementAllowed: boolean | null; consentMode: 'opt_in' | 'opt_out'; pixelId?: string; isDemo: boolean } | null;
};

/** Returns null when eligible, otherwise the reason it must not be sent. */
export function qualifiedEventSkipReason(i: QualifiedEligibilityInput, now = Date.now()): string | null {
  if (i.qualificationStatus !== 'qualified' || !i.qualifiedBy || !i.qualifiedAt) return 'not_human_qualified';
  if (i.leadSource !== 'website' || !i.session) return 'not_website_funnel_lead';
  if (i.session.isDemo) return 'demo';
  if (!i.session.pixelId) return 'no_pixel';
  if (!i.hasMetaSignal) return 'no_meta_attribution';
  const allowed = i.session.measurementAllowed ?? i.session.consentMode === 'opt_out';
  if (!allowed) return 'measurement_not_allowed';
  const at = new Date(i.qualifiedAt).getTime();
  if (!Number.isFinite(at) || now - at > MAX_EVENT_AGE_MS) return 'too_old';
  if (at < new Date(i.session.createdAt).getTime()) return 'before_lead_created';
  return null;
}
