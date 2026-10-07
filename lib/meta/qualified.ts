
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendMetaEvent } from '@/lib/meta/capi';
import { directSendAudit } from '@/lib/meta/audit.server';

/**
 * The ORIGINAL direct "QualifiedLead" sender, kept running on purpose until the conversion queue is switched on, so that
 * deploying the queue does not silently stop a signal that is live today (see meta_settings.legacy_direct_qualified).
 * It is unchanged in what it sends (action_source website - see docs/meta-ads-setup.md for why the queue path differs).
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

/**
 * Runs while the legacy flag is on. Test mode leaves it on (test events go to Events Manager's Test events tab only, real
 * sending is unaffected); switching the queue to LIVE turns the flag off and the queue sends the corrected event instead -
 * same event id, so the handover cannot double count.
 * Best-effort and non-blocking: never throws, never blocks the qualification save.
 */
export async function sendQualifiedLeadEvent(db: SupabaseClient, leadId: string): Promise<void> {
  try {
    const { data: cfg } = await db.from('meta_settings').select('delivery_mode, legacy_direct_qualified').eq('id', true).maybeSingle();
    // No settings row (migration 0042 not applied yet) behaves exactly as before the queue existed.
    if (cfg && cfg.legacy_direct_qualified === false) return;
    const { data: lead } = await db.from('leads')
      .select('email, phone, first_name, last_name, zip, source, fbp, fbc, fbclid, ad_id, qualification_status, qualified_at, qualified_by, landing_page_url')
      .eq('id', leadId).maybeSingle();
    if (!lead) return;
    const { data: s } = await db.from('funnel_sessions')
      .select('id, created_at, measurement_allowed, config_snapshot, funnels(is_demo, slug)')
      .eq('lead_id', leadId).order('created_at', { ascending: true }).limit(1).maybeSingle();
    const config = s?.config_snapshot as { trackingPixels?: { metaPixelId?: string; consentMode?: 'opt_in' | 'opt_out' } } | undefined;
    const funnel = (Array.isArray(s?.funnels) ? s?.funnels[0] : s?.funnels) as { is_demo?: boolean; slug?: string } | null | undefined;
    const reason = qualifiedEventSkipReason({
      qualificationStatus: lead.qualification_status, qualifiedAt: lead.qualified_at, qualifiedBy: lead.qualified_by, leadSource: lead.source,
      hasMetaSignal: !!(lead.fbc || lead.fbp || lead.fbclid || lead.ad_id),
      session: s ? { id: s.id, createdAt: s.created_at, measurementAllowed: s.measurement_allowed, consentMode: config?.trackingPixels?.consentMode ?? 'opt_in',
        pixelId: config?.trackingPixels?.metaPixelId, isDemo: !!funnel?.is_demo } : null,
    });
    if (reason) { console.info(`[meta-capi] QualifiedLead skipped: ${reason}`); return; }
    const base = process.env.NEXT_PUBLIC_SITE_URL;
    const sourceUrl = lead.landing_page_url ?? (base ? `${base}/estimate/${funnel?.slug ?? ''}` : null);
    if (!sourceUrl) { console.info('[meta-capi] QualifiedLead skipped: no_source_url'); return; }
    await sendMetaEvent({
      pixelId: config!.trackingPixels!.metaPixelId!, eventName: 'QualifiedLead', eventId: `${s!.id}:QualifiedLead`,
      eventTime: Math.floor(new Date(lead.qualified_at).getTime() / 1000),
      eventSourceUrl: sourceUrl,
      // No client IP / user agent here: the original request's raw values are deliberately never stored.
      user: { email: lead.email, phone: lead.phone, firstName: lead.first_name, lastName: lead.last_name, zip: lead.zip, fbp: lead.fbp, fbc: lead.fbc },
    }, directSendAudit(db, { leadId, stage: 'qualified' }));
  } catch (error) {
    console.error('[meta-capi] QualifiedLead failed', error instanceof Error ? error.name : 'unknown');
  }
}
