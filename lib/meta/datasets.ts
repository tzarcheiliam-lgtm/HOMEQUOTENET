/**
 * Dataset (Pixel) consistency and Conversion Leads readiness. Pure functions over data that is read-only mirrored from
 * Meta (ad set promoted_object, ad tracking_specs) and from HQN (funnel configs, lead counts). They report findings; they
 * never change a setting anywhere.
 */

export type FunnelPixel = { slug: string; contractorId: string | null; pixelId: string | null; published: boolean };
export type AdsetDataset = { id: string; name: string; campaignName: string; effectiveStatus: string | null; pixelId: string | null; optimizationGoal: string | null; contractorId: string | null };
export type AdDataset = { id: string; name: string; adsetId: string; effectiveStatus: string | null; trackingPixelIds: string[] };

export type DatasetFinding = { severity: 'error' | 'warning' | 'info'; code: string; message: string; subject?: string };

const isLive = (s: string | null) => s === 'ACTIVE' || s === null;

export function pixelIdsFromTrackingSpecs(specs: unknown): string[] {
  const out = new Set<string>();
  for (const spec of Array.isArray(specs) ? specs : []) {
    const px = (spec as { fb_pixel?: unknown })?.fb_pixel;
    for (const id of Array.isArray(px) ? px : []) if (typeof id === 'string' && /^\d{5,30}$/.test(id)) out.add(id);
  }
  return [...out];
}

export function pixelIdFromPromotedObject(po: unknown): string | null {
  const id = (po as { pixel_id?: unknown } | null)?.pixel_id;
  return typeof id === 'string' && /^\d{5,30}$/.test(id) ? id : null;
}

export function checkDatasets(i: { funnels: FunnelPixel[]; adsets: AdsetDataset[]; ads: AdDataset[]; crmDatasetId: string | null }): DatasetFinding[] {
  const f: DatasetFinding[] = [];
  const funnelPixels = new Map<string, string[]>();
  for (const fn of i.funnels) if (fn.published && fn.pixelId) funnelPixels.set(fn.pixelId, [...(funnelPixels.get(fn.pixelId) ?? []), fn.slug]);
  const liveSets = i.adsets.filter((a) => isLive(a.effectiveStatus));
  const adsetById = new Map(i.adsets.map((a) => [a.id, a]));

  if (i.adsets.length === 0) f.push({ severity: 'info', code: 'no_adsets', message: 'No ad sets imported yet, so ad-side datasets cannot be compared. Run a sync.' });
  if (funnelPixels.size === 0) f.push({ severity: 'warning', code: 'no_funnel_pixel', message: 'No published funnel has a Meta Pixel ID configured.' });

  for (const a of liveSets) {
    if (!a.pixelId) continue; // lead-ads / messaging ad sets legitimately have no pixel
    if (!funnelPixels.has(a.pixelId) && a.pixelId !== i.crmDatasetId) {
      f.push({ severity: 'error', code: 'adset_dataset_not_sent_to', subject: a.name,
        message: `Ad set “${a.name}” (${a.campaignName}) optimizes on dataset ${a.pixelId}, but no published HQN funnel sends events to it${funnelPixels.size ? ` (funnels use ${[...funnelPixels.keys()].join(', ')})` : ''}. Its conversions are not coming from HQN.` });
    }
  }
  for (const ad of i.ads.filter((x) => isLive(x.effectiveStatus))) {
    const set = adsetById.get(ad.adsetId);
    const mism = ad.trackingPixelIds.filter((p) => !funnelPixels.has(p) && p !== i.crmDatasetId);
    if (mism.length) {
      f.push({ severity: set?.pixelId && ad.trackingPixelIds.includes(set.pixelId) ? 'info' : 'warning', code: 'ad_tracking_pixel_unknown', subject: ad.name,
        message: `Ad “${ad.name}” tracks dataset ${mism.join(', ')}, which no HQN funnel sends to${set?.pixelId ? ` (its ad set uses ${set.pixelId})` : ''}. A “Pixel is not active” warning on this ad is expected until that is reconciled.` });
    }
  }
  const usedByAds = new Set([...liveSets.map((a) => a.pixelId), ...i.ads.flatMap((a) => a.trackingPixelIds)].filter(Boolean) as string[]);
  if (i.adsets.length && i.ads.length) {
    for (const [px, slugs] of funnelPixels) {
      if (!usedByAds.has(px)) f.push({ severity: 'warning', code: 'funnel_dataset_not_used_by_ads', message: `Funnel ${slugs.join(', ')} sends events to dataset ${px}, but no live ad set or ad references it.` });
    }
  }
  if (i.crmDatasetId && funnelPixels.has(i.crmDatasetId)) {
    f.push({ severity: 'info', code: 'crm_dataset_shared', message: 'The CRM (Instant Form) dataset is also a website funnel dataset. Meta recommends a separate CRM dataset; if you share one, CRM event names must differ from web event names (HQN’s do: lead_received, qualified, appointment_booked, won).' });
  }
  return f;
}

// --------------------------------------------------------------------------------------------------
// Conversion Leads (Instant Form CRM) optimization readiness, per Meta's documented fit guidelines
// --------------------------------------------------------------------------------------------------
export const CRM_FIT = { minLeadsPerMonth: 200, minStageRate: 0.01, maxStageRate: 0.4, stageWithinDays: 28 } as const;

export type StageStat = { stage: 'qualified' | 'appointment' | 'won'; count: number; rate: number | null; within28d: number };
export type Readiness = { leads30d: number; meetsVolume: boolean; stages: (StageStat & { fits: boolean; note: string })[] };

/**
 * `leads` are Instant Form leads created in the last 30 days; `reached` gives, per stage, how many of them reached it and
 * how many did so within 28 days of lead creation. Informational: only Meta decides eligibility.
 */
export function crmReadiness(leads30d: number, reached: Record<StageStat['stage'], { count: number; within28d: number }>): Readiness {
  const stages = (['qualified', 'appointment', 'won'] as const).map((stage) => {
    const r = reached[stage];
    const rate = leads30d > 0 ? r.count / leads30d : null;
    const fits = rate !== null && rate >= CRM_FIT.minStageRate && rate <= CRM_FIT.maxStageRate && r.count > 0 && r.within28d === r.count;
    const note = rate === null ? 'No Instant Form leads yet'
      : rate < CRM_FIT.minStageRate ? 'Below 1% of leads reach this stage - too rare to optimize on'
      : rate > CRM_FIT.maxStageRate ? 'Above 40% - too common to be a useful signal'
      : r.within28d < r.count ? 'Some leads reached it after 28 days; Meta wants the stage within 28 days of the lead'
      : 'Within Meta’s documented range';
    return { stage, count: r.count, rate, within28d: r.within28d, fits, note };
  });
  return { leads30d, meetsVolume: leads30d >= CRM_FIT.minLeadsPerMonth, stages };
}
