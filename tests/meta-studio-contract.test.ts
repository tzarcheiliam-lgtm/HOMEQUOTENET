/**
 * REQUEST-CONSTRUCTION CONTRACT (locally verified; NOT a live Meta test).
 *
 * Every body HQN builds is checked against field lists and enums copied from Meta's official documentation, so a typo,
 * a renamed field or an invented value fails here. This proves HQN only sends documented fields with documented values.
 * It does NOT prove Meta accepts the combination - several rules ("which CTA is valid for which objective", the video
 * cover requirement, `promoted_object` shape for lead ads) are only provable by the paused live test in
 * docs/meta-ads-studio-setup.md.
 *
 * Sources (fetched 2026-10-07):
 *  - Campaign create : https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group
 *  - Ad set create   : https://developers.facebook.com/docs/marketing-api/reference/ad-campaign
 *  - Creative        : https://developers.facebook.com/docs/marketing-api/reference/ad-creative
 *  - object_story_spec / link_data / video_data / call_to_action / call_to_action.value reference pages
 *  - Lead ads guide  : https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create
 *  - Targeting       : https://developers.facebook.com/docs/marketing-api/audiences/reference/basic-targeting/
 *  - Currencies      : https://developers.facebook.com/docs/marketing-api/currencies
 */
import { describe, expect, it } from 'vitest';
import { LEAD_AD_CTA_TYPES, LEAD_AD_LINK, buildPlan, draftConfigSchema, eligibleGoals, type DraftConfig } from '@/lib/meta/studio/draft';
import { buildDestination } from '@/lib/meta/studio/url-params';

const CAMPAIGN_FIELDS = new Set(['name', 'objective', 'status', 'special_ad_categories', 'buying_type', 'is_adset_budget_sharing_enabled', 'daily_budget', 'lifetime_budget', 'bid_strategy', 'spend_cap']);
const ADSET_FIELDS = new Set(['name', 'campaign_id', 'status', 'billing_event', 'optimization_goal', 'destination_type', 'promoted_object', 'targeting', 'start_time', 'end_time', 'daily_budget', 'lifetime_budget', 'bid_strategy', 'bid_amount']);
const CREATIVE_FIELDS = new Set(['name', 'object_story_spec', 'url_tags']);
const AD_FIELDS = new Set(['name', 'status', 'adset_id', 'creative']);
const STORY_SPEC_FIELDS = new Set(['page_id', 'instagram_user_id', 'link_data', 'video_data']);
const LINK_DATA_FIELDS = new Set(['image_hash', 'message', 'link', 'name', 'description', 'call_to_action']);
const VIDEO_DATA_FIELDS = new Set(['video_id', 'message', 'title', 'link_description', 'image_hash', 'call_to_action']);
const CTA_VALUE_FIELDS = new Set(['link', 'lead_gen_form_id']);
const TARGETING_FIELDS = new Set(['geo_locations', 'age_min', 'age_max', 'genders']);
const GEO_FIELDS = new Set(['countries', 'regions']);
const PROMOTED_OBJECT_FIELDS = new Set(['page_id', 'pixel_id', 'custom_event_type']);

const OFFICIAL_OBJECTIVES = new Set(['OUTCOME_APP_PROMOTION', 'OUTCOME_AWARENESS', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_TRAFFIC']);
const OFFICIAL_GOALS = new Set(['LEAD_GENERATION', 'QUALITY_LEAD', 'OFFSITE_CONVERSIONS', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'IMPRESSIONS', 'REACH']);
const OFFICIAL_BILLING = new Set(['IMPRESSIONS', 'LINK_CLICKS']);
const OFFICIAL_BID_STRATEGIES = new Set(['LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'COST_CAP', 'LOWEST_COST_WITH_MIN_ROAS']);
const OFFICIAL_DESTINATIONS = new Set(['WEBSITE', 'ON_AD']);
const OFFICIAL_SPECIAL_CATEGORIES = new Set(['NONE', 'EMPLOYMENT', 'HOUSING', 'CREDIT', 'ISSUES_ELECTIONS_POLITICS', 'ONLINE_GAMBLING_AND_GAMING', 'FINANCIAL_PRODUCTS_SERVICES']);
// The CTA type enum from the call_to_action reference (subset HQN can emit):
const OFFICIAL_CTA_TYPES = new Set(['LEARN_MORE', 'SIGN_UP', 'CONTACT_US', 'APPLY_NOW', 'GET_QUOTE', 'SUBSCRIBE', 'DOWNLOAD']);
// Lead-ads guide: valid CTA types for an Instant Form ad.
const GUIDE_LEAD_CTA = new Set(['APPLY_NOW', 'DOWNLOAD', 'GET_QUOTE', 'LEARN_MORE', 'SIGN_UP', 'SUBSCRIBE']);

const base: Record<string, unknown> = {
  structure: { mode: 'new' }, objective: 'OUTCOME_LEADS', conversion_location: 'instant_form', optimization_goal: 'LEAD_GENERATION', page_id: '1234567890',
  budget: { type: 'daily', amount: 25 }, bid: {}, schedule: { start: '2030-01-01T09:00:00-08:00', end: '2030-02-01T09:00:00-08:00' },
  targeting: { countries: ['US'], regions: ['3847'], genders: [1] }, placements: { mode: 'automatic' },
  ad: { primary_text: 'x', headline: 'h', description: 'd', cta: 'GET_QUOTE', lead_form_id: '555000111' },
};
const make = (over: Record<string, unknown>) => draftConfigSchema.parse({ ...base, ...over });
const website = (over: Record<string, unknown> = {}) => make({ objective: 'OUTCOME_TRAFFIC', conversion_location: 'website', optimization_goal: 'LINK_CLICKS', ad: { primary_text: 'x', headline: 'h', cta: 'LEARN_MORE', destination_url: 'https://pool.example.com/quote' }, ...over });
const leadsWebsite = () => make({ conversion_location: 'website', optimization_goal: 'OFFSITE_CONVERSIONS', dataset_id: '777777', ad: { primary_text: 'x', cta: 'SIGN_UP', destination_url: 'https://pool.example.com/quote' } });

const variants: [string, DraftConfig, 'image' | 'video'][] = [
  ['instant form, image, adset budget', make({}), 'image'],
  ['instant form, video', make({}), 'video'],
  ['instant form, campaign budget + cost cap + instagram', make({ budget: { level: 'campaign', type: 'daily', amount: 25 }, bid: { strategy: 'COST_CAP', amount: 12.5 }, instagram_user_id: '99887766' }), 'image'],
  ['instant form, lifetime budget', make({ budget: { type: 'lifetime', amount: 500 } }), 'image'],
  ['website traffic, image', website(), 'image'],
  ['website traffic, video', website(), 'video'],
  ['website lead conversions (pixel)', leadsWebsite(), 'image'],
  ['existing campaign', make({ structure: { mode: 'existing_campaign', campaign_id: '111111' } }), 'image'],
  ['existing ad set', make({ structure: { mode: 'existing_adset', campaign_id: '111111', adset_id: '222222' } }), 'image'],
];

const keys = (o: unknown) => Object.keys(o as object);
const subset = (got: string[], allowed: Set<string>, where: string) => { for (const k of got) expect(allowed.has(k), `${where}: "${k}" is not a documented field`).toBe(true); };

describe.each(variants)('%s', (_name, config, kind) => {
  const dest = config.conversion_location === 'website' && config.ad.destination_url ? buildDestination(config.ad.destination_url) : null;
  const plan = buildPlan({ name: 'Pool', tag: 'HQN-ABCD1234', config, currency: 'USD', have: {}, creativeKind: kind, destination: dest?.ok ? { url: dest.url, urlTags: dest.urlTags } : null });
  const body = (step: string) => plan.find((s) => s.step === step)?.body as Record<string, any> | undefined;

  it('every object is created PAUSED and only documented fields are sent', () => {
    const c = body('campaign'); if (c) { subset(keys(c), CAMPAIGN_FIELDS, 'campaign'); expect(c.status).toBe('PAUSED'); expect(OFFICIAL_OBJECTIVES.has(c.objective)).toBe(true); expect((c.special_ad_categories as string[]).every((x) => OFFICIAL_SPECIAL_CATEGORIES.has(x))).toBe(true); }
    const s = body('adset'); if (s) {
      subset(keys(s), ADSET_FIELDS, 'adset'); expect(s.status).toBe('PAUSED');
      expect(OFFICIAL_GOALS.has(s.optimization_goal)).toBe(true); expect(OFFICIAL_BILLING.has(s.billing_event)).toBe(true); expect(OFFICIAL_DESTINATIONS.has(s.destination_type)).toBe(true);
      if (s.bid_strategy) expect(OFFICIAL_BID_STRATEGIES.has(s.bid_strategy)).toBe(true);
      subset(keys(s.targeting), TARGETING_FIELDS, 'targeting'); subset(keys(s.targeting.geo_locations), GEO_FIELDS, 'geo_locations');
      if (s.promoted_object) subset(keys(s.promoted_object), PROMOTED_OBJECT_FIELDS, 'promoted_object');
      expect([1, 2].every((g) => true) && (s.targeting.genders ?? [1]).every((g: number) => g === 1 || g === 2)).toBe(true);
      expect(s.targeting.age_min).toBeGreaterThanOrEqual(13); expect(s.targeting.age_max).toBeLessThanOrEqual(65);
    }
    const cr = body('creative')!; subset(keys(cr), CREATIVE_FIELDS, 'creative'); subset(keys(cr.object_story_spec), STORY_SPEC_FIELDS, 'object_story_spec');
    const ad = body('ad')!; subset(keys(ad), AD_FIELDS, 'ad'); expect(ad.status).toBe('PAUSED'); expect(keys(ad.creative)).toEqual(['creative_id']);
  });

  it('the creative uses exactly the documented shape for its media type', () => {
    const spec = body('creative')!.object_story_spec;
    const cta = (kind === 'video' ? spec.video_data : spec.link_data).call_to_action;
    expect(OFFICIAL_CTA_TYPES.has(cta.type)).toBe(true);
    subset(keys(cta.value), CTA_VALUE_FIELDS, 'call_to_action.value');
    if (kind === 'image') {
      subset(keys(spec.link_data), LINK_DATA_FIELDS, 'link_data');
      expect(spec.video_data).toBeUndefined();
      expect('image_hash' in spec.link_data && !('picture' in spec.link_data)).toBe(true); // reference: image_hash OR picture, never both
    } else {
      subset(keys(spec.video_data), VIDEO_DATA_FIELDS, 'video_data');
      expect(spec.link_data).toBeUndefined();
      expect(spec.video_data.image_hash).toBeTruthy(); // cover image supplied (HQN requires one; docs do not state it is optional)
    }
  });

  it('follows the lead-ads guide for Instant Form ads, and the website rules otherwise', () => {
    const spec = body('creative')!.object_story_spec;
    const cta = (kind === 'video' ? spec.video_data : spec.link_data).call_to_action;
    if (config.conversion_location === 'instant_form') {
      expect(GUIDE_LEAD_CTA.has(cta.type)).toBe(true);
      expect(cta.value.lead_gen_form_id).toBe('555000111');
      if (kind === 'image') { expect(spec.link_data.link).toBe(LEAD_AD_LINK); expect(cta.value.link).toBeUndefined(); }
      else expect(cta.value.link).toBe('http://fb.me/');
      expect(body('adset')?.destination_type ?? 'ON_AD').toBe('ON_AD');
    } else {
      expect(cta.value.link).toBe(dest && dest.ok ? dest.url : '');
      if (kind === 'image') expect(spec.link_data.link).toBe(cta.value.link); // reference: CTA link "required to be same as the link url of the creative"
      expect(body('adset')?.destination_type ?? 'WEBSITE').toBe('WEBSITE');
    }
  });

  it('sends budgets/bids as API integers, once, at the owning level', () => {
    const owners = [body('campaign'), body('adset')].filter((b) => b && (b.daily_budget != null || b.lifetime_budget != null));
    if (config.structure.mode === 'existing_adset') expect(owners).toHaveLength(0);
    else { expect(owners).toHaveLength(1); const o = owners[0]!; expect(Number.isInteger(o.daily_budget ?? o.lifetime_budget)).toBe(true); }
    const s = body('adset'); if (s?.bid_amount != null) expect(Number.isInteger(s.bid_amount)).toBe(true);
    if (config.budget.type === 'lifetime' && s) expect(s.end_time).toBeTruthy(); // reference: lifetime_budget requires end_time
  });

  it('tracking parameters ride in url_tags without overwriting the URL', () => {
    const cr = body('creative')!;
    if (dest?.ok) expect(String(cr.url_tags)).toContain('ad_id={{ad.id}}');
  });
});

describe('enumerations HQN offers are all documented', () => {
  it('goals offered per objective/location are in the official optimization_goal enum', () => {
    for (const obj of ['OUTCOME_LEADS', 'OUTCOME_TRAFFIC'] as const) for (const loc of ['instant_form', 'website'] as const) for (const g of eligibleGoals(obj, loc)) expect(OFFICIAL_GOALS.has(g)).toBe(true);
  });
  it('lead-ad CTAs offered equal the guide list minus DOWNLOAD (not offered), and are all official enum values', () => {
    for (const t of LEAD_AD_CTA_TYPES) { expect(GUIDE_LEAD_CTA.has(t)).toBe(true); expect(OFFICIAL_CTA_TYPES.has(t)).toBe(true); }
    expect([...LEAD_AD_CTA_TYPES].sort()).toEqual(['APPLY_NOW', 'GET_QUOTE', 'LEARN_MORE', 'SIGN_UP', 'SUBSCRIBE']);
  });
  it('special ad categories other than NONE are not buildable', () => {
    const cfg = draftConfigSchema.parse({ ...base, special_ad_categories: ['HOUSING'] });
    expect(cfg.special_ad_categories).toEqual(['HOUSING']); // accepted by the schema, rejected by validateDraft (covered in meta-studio-create.test.ts)
  });
});

describe('what this test file cannot prove', () => {
  it('is explicit that live acceptance by Meta is unverified', () => {
    // Intentionally a documentation test: if someone removes the paused-test step from the checklist this fails.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const doc = require('node:fs').readFileSync(new URL('../docs/meta-ads-studio-setup.md', import.meta.url), 'utf8') as string;
    expect(doc).toMatch(/Paused-ad test procedure/i);
    expect(doc).toMatch(/Needs a real Meta test/i);
  });
});
