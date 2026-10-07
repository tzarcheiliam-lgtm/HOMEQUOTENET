/**
 * Tracking health for rule gating. Pure.
 *
 * HQN cannot see Events Manager diagnostics, so "healthy" is deliberately conservative:
 *   - false  : recent outcome-event delivery is failing (more than half of the last 20 attempts failed), or
 *   - true   : an administrator recorded a recent manual verification (Settings > "I verified tracking") and
 *              nothing is failing,
 *   - null   : unknown. Rules that depend on conversion data stay SUSPENDED while this is null; they do not
 *              assume health they cannot see.
 */
export type TrackingInputs = {
  now: Date;
  verifiedAt: string | null; // admin's manual verification timestamp
  verificationValidDays?: number;
  recentEvents: { status: 'accepted' | 'failed' | 'pending' | 'processing' | 'skipped'; test_mode: boolean }[];
};

export function trackingHealth(i: TrackingInputs): { healthy: boolean | null; reason: string } {
  const real = i.recentEvents.filter((e) => !e.test_mode && (e.status === 'accepted' || e.status === 'failed')).slice(0, 20);
  const failed = real.filter((e) => e.status === 'failed').length;
  if (real.length >= 4 && failed / real.length > 0.5) return { healthy: false, reason: `${failed} of the last ${real.length} outcome events failed to deliver.` };
  const valid = (i.verificationValidDays ?? 30) * 86_400_000;
  if (i.verifiedAt && i.now.getTime() - new Date(i.verifiedAt).getTime() <= valid) return { healthy: true, reason: 'An administrator verified conversion tracking recently.' };
  return { healthy: null, reason: 'Conversion tracking has not been verified recently; an administrator must confirm it in Settings.' };
}
