import type { PricingAgreement } from '@/lib/types';

/**
 * Pick the active pricing agreement that applies to a lead's vertical.
 * Prefers a vertical-specific agreement over an all-verticals one, then the
 * most recently effective. Pure so it can be unit-tested; the DB layer just
 * supplies the candidate list.
 */
export function selectActiveAgreement(
  agreements: PricingAgreement[],
  verticalId: string | null,
  today: string = new Date().toISOString().slice(0, 10)
): PricingAgreement | null {
  const active = agreements.filter((a) => {
    if (!a.is_active) return false;
    if (a.active_from && a.active_from > today) return false;
    if (a.active_to && a.active_to < today) return false;
    // vertical-specific must match; null vertical = applies to all
    if (a.vertical_id && a.vertical_id !== verticalId) return false;
    return true;
  });
  if (active.length === 0) return null;

  active.sort((a, b) => {
    // vertical-specific first
    const aSpecific = a.vertical_id === verticalId ? 1 : 0;
    const bSpecific = b.vertical_id === verticalId ? 1 : 0;
    if (aSpecific !== bSpecific) return bSpecific - aSpecific;
    // then most recently effective
    return (b.active_from ?? '').localeCompare(a.active_from ?? '');
  });
  return active[0];
}
