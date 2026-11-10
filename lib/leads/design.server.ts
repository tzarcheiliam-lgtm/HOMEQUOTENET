/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import 'server-only';
import type { createAdminClient } from '@/lib/supabase/admin';
import { formatRange } from '@/lib/estimator/engine';
import { funnelSpecFor, normalizeFunnelSelection, pickedOptions } from '@/lib/estimator/funnel/engine';
import { getEstimator } from '@/lib/estimator/registry';
import { signedSharePath } from '@/lib/estimator/share.server';

type Db = ReturnType<typeof createAdminClient>;

/**
 * A homeowner's estimator design, read back from the lead's estimator
 * timeline entry (lead_activities.metadata.estimator, written by the lead
 * route): what the alerts, recovery messages and the booking confirmation
 * email show. Everything here is derived from the stored picks; the share link
 * is the signed read-only design page (no personal data in it).
 */
export interface LeadDesign {
  slug: string;
  /** 'pool' | 'bathroom' | 'kitchen' | 'ADU' (the noun in "New Luxe pool lead", "your pool design"). */
  noun: string;
  /** The finish pick when the funnel has one ("Luxe", "Standard"); null otherwise. */
  tier: string | null;
  /** "Classic · Luxe · Zero-edge spa" (each pick's short title). */
  recap: string | null;
  /** "$85,000 – $110,000" (the ballpark the homeowner saw), or null. */
  range: string | null;
  /** Example prices not yet confirmed by the contractor. */
  examplePrices: boolean;
  /** The main design photo (absolute URL) the homeowner saw. */
  photo: { url: string; alt: string } | null;
  /** Absolute read-only share page, or null (only funnel-experience estimators have one). */
  shareUrl: string | null;
}

const NOUN: Record<string, string> = { pool: 'pool', bathroom: 'bathroom', kitchen: 'kitchen', adu: 'ADU', roofing: 'roof' };

export function designFromEstimator(meta: any, siteUrl: string): LeadDesign | null {
  const est = meta?.estimator;
  if (!est || typeof est !== 'object' || typeof est.slug !== 'string') return null;
  const found = getEstimator(est.slug);
  const trade = found?.template.trade ?? 'pool';
  const spec = found ? funnelSpecFor(found.contractor) : null;
  const site = siteUrl.replace(/\/+$/, '');
  const low = typeof est.low === 'number' ? est.low : null;
  const high = typeof est.high === 'number' ? est.high : null;
  const range = low !== null && high !== null && high > 0 ? formatRange(low, high) : null;

  let tier: string | null = null;
  let recap: string | null = null;
  let shareUrl: string | null = null;
  let mainStep: string | null = null;
  const rawSel = est.funnel?.selection;
  if (spec && rawSel && typeof rawSel === 'object') {
    const selection = normalizeFunnelSelection(spec, rawSel);
    const picks = pickedOptions(spec, selection);
    recap = picks.map((o) => o.short ?? o.title).filter(Boolean).join(' · ') || null;
    const finish = spec.steps.find((s) => s.id === 'finish');
    tier = finish ? finish.options.find((o) => o.id === selection.finish)?.title ?? null : null;
    shareUrl = `${site}${signedSharePath(est.slug, spec, selection)}`;
    // The last main (not follow-up) step pictures the whole design.
    mainStep = [...spec.steps].reverse().find((s) => !s.showWhen && selection[s.id] !== undefined)?.id ?? null;
  } else if (Array.isArray(est.configurator?.summary)) {
    recap = (est.configurator.summary as unknown[]).filter((l): l is string => typeof l === 'string').slice(0, 3).join(' · ') || null;
  }
  const photos = Array.isArray(est.configurator?.photos) ? (est.configurator.photos as any[]) : [];
  const main = (mainStep && photos.find((p) => p?.view === mainStep)) || photos[0];
  const photo = main && typeof main.url === 'string' && /^https?:\/\//.test(main.url) ? { url: main.url as string, alt: String(main.alt ?? 'Their design') } : null;
  return {
    slug: est.slug, noun: NOUN[trade] ?? 'project', tier, recap, range,
    examplePrices: est.pricesConfirmed === false, photo, shareUrl,
  };
}

/** The lead's latest estimator design, or null (not an estimator lead, or nothing readable). Never throws. */
export async function loadLeadDesign(db: Db, leadId: string, siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homequotenet.com'): Promise<LeadDesign | null> {
  try {
    const { data } = await db.from('lead_activities').select('metadata, created_at').eq('lead_id', leadId)
      .not('metadata->estimator', 'is', null).order('created_at', { ascending: false }).limit(1);
    const row = ((data ?? []) as any[])[0];
    return row ? designFromEstimator(row.metadata, siteUrl) : null;
  } catch {
    return null;
  }
}
