import { describe, expect, it } from 'vitest';
import { checkDatasets, crmReadiness, pixelIdFromPromotedObject, pixelIdsFromTrackingSpecs } from '@/lib/meta/datasets';

const funnel = { slug: 'pool-masters-la', contractorId: 'c1', pixelId: '933962709362966', published: true };
const adset = (o = {}) => ({ id: 's1', name: 'Set A', campaignName: 'Camp', effectiveStatus: 'ACTIVE', pixelId: '2057270381542607', optimizationGoal: 'OFFSITE_CONVERSIONS', contractorId: null, ...o });
const ad = (o = {}) => ({ id: 'a1', name: 'Ad 1', adsetId: 's1', effectiveStatus: 'ACTIVE', trackingPixelIds: ['2057270381542607'], ...o });

describe('dataset consistency', () => {
  it('parses Graph shapes defensively', () => {
    expect(pixelIdFromPromotedObject({ pixel_id: '123456', custom_event_type: 'LEAD' })).toBe('123456');
    expect(pixelIdFromPromotedObject({ pixel_id: 'x' })).toBeNull();
    expect(pixelIdFromPromotedObject(null)).toBeNull();
    expect(pixelIdsFromTrackingSpecs([{ 'action.type': ['offsite_conversion'], fb_pixel: ['111111', 'bad'] }, null, { fb_pixel: ['111111'] }])).toEqual(['111111']);
    expect(pixelIdsFromTrackingSpecs('nope')).toEqual([]);
  });
  it('flags the reported mismatch: ads on one dataset while the funnel sends to another', () => {
    const f = checkDatasets({ funnels: [funnel], adsets: [adset()], ads: [ad()], crmDatasetId: null });
    expect(f.map((x) => x.code)).toEqual(expect.arrayContaining(['adset_dataset_not_sent_to', 'ad_tracking_pixel_unknown', 'funnel_dataset_not_used_by_ads']));
    expect(f.find((x) => x.code === 'adset_dataset_not_sent_to')).toMatchObject({ severity: 'error' });
  });
  it('is quiet when ad set, ads and funnel agree', () => {
    const f = checkDatasets({ funnels: [funnel], adsets: [adset({ pixelId: '933962709362966' })], ads: [ad({ trackingPixelIds: ['933962709362966'] })], crmDatasetId: null });
    expect(f).toEqual([]);
  });
  it('ignores paused ad sets and pixel-less (lead form) ad sets', () => {
    expect(checkDatasets({ funnels: [funnel], adsets: [adset({ effectiveStatus: 'PAUSED' }), adset({ id: 's2', pixelId: null })], ads: [], crmDatasetId: null }).map((x) => x.code)).toEqual([]);
  });
  it('notes a shared CRM/web dataset and reports missing data instead of guessing', () => {
    expect(checkDatasets({ funnels: [funnel], adsets: [], ads: [], crmDatasetId: '933962709362966' }).map((x) => x.code)).toEqual(['no_adsets', 'crm_dataset_shared']);
    expect(checkDatasets({ funnels: [], adsets: [], ads: [], crmDatasetId: null }).map((x) => x.code)).toEqual(['no_adsets', 'no_funnel_pixel']);
  });
});

describe('Conversion Leads readiness (Meta fit guidelines)', () => {
  it('requires 200+ leads/month and a stage rate between 1% and 40% within 28 days', () => {
    const r = crmReadiness(250, { qualified: { count: 60, within28d: 60 }, appointment: { count: 1, within28d: 1 }, won: { count: 120, within28d: 100 } });
    expect(r.meetsVolume).toBe(true);
    expect(r.stages.map((s) => [s.stage, s.fits])).toEqual([['qualified', true], ['appointment', false], ['won', false]]);
    expect(r.stages[1].note).toMatch(/Below 1%/); expect(r.stages[2].note).toMatch(/Above 40%/);
  });
  it('is not ready with a handful of leads', () => {
    expect(crmReadiness(12, { qualified: { count: 3, within28d: 3 }, appointment: { count: 0, within28d: 0 }, won: { count: 0, within28d: 0 } }).meetsVolume).toBe(false);
    expect(crmReadiness(0, { qualified: { count: 0, within28d: 0 }, appointment: { count: 0, within28d: 0 }, won: { count: 0, within28d: 0 } }).stages[0].note).toMatch(/No Instant Form leads/);
  });
});
