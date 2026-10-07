import { z } from 'zod';
import { buildDestination } from './url-params';

/**
 * Ad draft model: what a human configures, the validation that decides whether it may be created, and the exact
 * Meta payloads each creation step will send (shown on the review screen BEFORE anything is sent).
 *
 * Supported surface is deliberately narrow and limited to what the Marketing API reference documents
 * (verified 2026-10-07 against developers.facebook.com/docs/marketing-api/reference/ad-campaign-group,
 * /ad-campaign and /ad-creative):
 *   - objectives OUTCOME_LEADS and OUTCOME_TRAFFIC (Advantage+ shopping/app creation is not offered)
 *   - special_ad_categories must be NONE (restricted-category setups are refused, not guessed)
 *   - every object is created PAUSED
 *   - budgets are sent in the account currency's MINOR units. The reference does not state the unit, so
 *     the review screen shows both the entered amount and the exact value sent, and the checklist asks the
 *     owner to confirm with one paused test ad before any live use.
 */

export const OBJECTIVES = ['OUTCOME_LEADS', 'OUTCOME_TRAFFIC'] as const;
export const CTA_TYPES = ['LEARN_MORE', 'GET_QUOTE', 'SIGN_UP', 'CONTACT_US', 'APPLY_NOW'] as const;
export const FB_POSITIONS = ['feed', 'story', 'video_feeds', 'marketplace', 'right_hand_column', 'search'] as const;
export const IG_POSITIONS = ['stream', 'story', 'reels'] as const; // 'explore' is rejected by v26.0
export const GOALS = ['LEAD_GENERATION', 'QUALITY_LEAD', 'OFFSITE_CONVERSIONS', 'LINK_CLICKS', 'LANDING_PAGE_VIEWS'] as const;

export type ConversionLocation = 'instant_form' | 'website';

/** Which optimization goals are allowed for a given objective + conversion location. */
export function eligibleGoals(objective: (typeof OBJECTIVES)[number], location: ConversionLocation): (typeof GOALS[number])[] {
  if (objective === 'OUTCOME_LEADS') return location === 'instant_form' ? ['LEAD_GENERATION', 'QUALITY_LEAD'] : ['OFFSITE_CONVERSIONS'];
  return location === 'website' ? ['LINK_CLICKS', 'LANDING_PAGE_VIEWS'] : [];
}

const id = z.string().regex(/^[0-9]{5,25}$/, 'Must be a Meta id (digits)');
const money = z.number().positive().max(100000);

export const draftConfigSchema = z.object({
  structure: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('new') }),
    z.object({ mode: z.literal('existing_campaign'), campaign_id: id }),
    z.object({ mode: z.literal('existing_adset'), campaign_id: id, adset_id: id }),
  ]),
  objective: z.enum(OBJECTIVES),
  conversion_location: z.enum(['instant_form', 'website']),
  optimization_goal: z.enum(GOALS),
  special_ad_categories: z.array(z.string()).default([]),
  page_id: id,
  instagram_user_id: id.nullable().default(null),
  dataset_id: id.nullable().default(null), // required for website lead conversions
  budget: z.object({
    level: z.enum(['adset', 'campaign']).default('adset'), // who owns the budget
    type: z.enum(['daily', 'lifetime']),
    amount: money, // major units of the account currency
  }),
  bid: z.object({
    strategy: z.enum(['LOWEST_COST_WITHOUT_CAP', 'COST_CAP', 'LOWEST_COST_WITH_BID_CAP']).default('LOWEST_COST_WITHOUT_CAP'),
    amount: money.nullable().default(null), // major units; required for COST_CAP / BID_CAP
  }),
  schedule: z.object({
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }).nullable().default(null),
  }),
  targeting: z.object({
    countries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(10),
    age_min: z.number().int().min(18).max(65).default(18),
    age_max: z.number().int().min(18).max(65).default(65),
    genders: z.array(z.union([z.literal(1), z.literal(2)])).default([]), // [] = all
    regions: z.array(z.string().regex(/^[0-9]{1,10}$/)).max(50).default([]), // Meta region keys
  }),
  placements: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('automatic') }),
    z.object({
      mode: z.literal('manual'),
      facebook: z.array(z.enum(FB_POSITIONS)).default([]),
      instagram: z.array(z.enum(IG_POSITIONS)).default([]),
    }),
  ]),
  ad: z.object({
    primary_text: z.string().trim().min(1).max(2200),
    headline: z.string().trim().max(255).default(''),
    description: z.string().trim().max(255).default(''),
    cta: z.enum(CTA_TYPES),
    destination_url: z.string().trim().max(2048).nullable().default(null), // website
    lead_form_id: id.nullable().default(null), // instant form
  }),
});
export type DraftConfig = z.infer<typeof draftConfigSchema>;

/** Currencies whose Graph amounts have no minor unit (whole-unit). Everything else is x100. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'HUF', 'TWD', 'UGX', 'PYG']);
export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(ZERO_DECIMAL.has(currency.toUpperCase()) ? amount : amount * 100);
}

export type Issue = { code: string; message: string; field?: string };
export type DraftContext = {
  currency: string | null;
  accountSyncedCampaignIds: Set<string>;
  accountSyncedAdsetIds: Map<string, string>; // adset id -> campaign id
  creativeReady: boolean;
  creativeKind: 'image' | 'video' | null;
  /** Meta ids of assets mapped to the same contractor (or network-level). */
  allowedPageIds: Set<string>;
  allowedInstagramIds: Set<string>;
  allowedDatasetIds: Set<string>;
  allowedLeadFormIds: Set<string>;
  now: Date;
};

/** Blocking errors (cannot create) and warnings (allowed, but the reviewer must see them). */
export function validateDraft(c: DraftConfig, x: DraftContext): { errors: Issue[]; warnings: Issue[] } {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const e = (code: string, message: string, field?: string) => errors.push({ code, message, field });
  const w = (code: string, message: string, field?: string) => warnings.push({ code, message, field });

  if (!x.currency) e('currency_unknown', 'The ad account currency is unknown. Run a Meta sync first.');
  if (c.special_ad_categories.some((s) => s !== 'NONE')) e('special_category', 'Ads in a special ad category (housing, credit, employment, politics…) have restricted targeting and are not supported here. Create them in Ads Manager.', 'special_ad_categories');
  if (!eligibleGoals(c.objective, c.conversion_location).includes(c.optimization_goal)) {
    e('goal_not_eligible', `${c.optimization_goal} is not available for ${c.objective} with ${c.conversion_location === 'instant_form' ? 'an Instant Form' : 'a website'} destination.`, 'optimization_goal');
  }
  if (!x.allowedPageIds.has(c.page_id)) e('page_not_mapped', 'This Facebook Page is not mapped to the selected contractor.', 'page_id');
  if (c.instagram_user_id && !x.allowedInstagramIds.has(c.instagram_user_id)) e('instagram_not_mapped', 'This Instagram account is not mapped to the selected contractor.', 'instagram_user_id');

  if (c.conversion_location === 'instant_form') {
    if (!c.ad.lead_form_id) e('lead_form_required', 'Choose the Instant Form to attach.', 'ad.lead_form_id');
    else if (!x.allowedLeadFormIds.has(c.ad.lead_form_id)) e('lead_form_not_mapped', 'This Instant Form is not available for the selected Page.', 'ad.lead_form_id');
    if (c.optimization_goal === 'QUALITY_LEAD') w('quality_lead_data', 'Quality-lead optimization only helps once outcome events from this form reach Meta (Meta Ads > Setup). Without them it can behave like plain lead optimization.', 'optimization_goal');
  } else {
    const dest = c.ad.destination_url ? buildDestination(c.ad.destination_url) : null;
    if (!dest) e('destination_required', 'Enter the page people should land on.', 'ad.destination_url');
    else if (!dest.ok) e('destination_invalid', dest.error, 'ad.destination_url');
    if (c.optimization_goal === 'OFFSITE_CONVERSIONS') {
      if (!c.dataset_id) e('dataset_required', 'Choose the dataset (Pixel) that records the conversion.', 'dataset_id');
      else if (!x.allowedDatasetIds.has(c.dataset_id)) e('dataset_not_mapped', 'This dataset is not mapped to the selected contractor.', 'dataset_id');
    }
  }

  if (c.targeting.age_min > c.targeting.age_max) e('age_range', 'Minimum age is above the maximum age.', 'targeting.age_min');
  if (c.budget.type === 'lifetime' && !c.schedule.end) e('lifetime_needs_end', 'A lifetime budget needs an end date.', 'schedule.end');
  if (c.schedule.end && new Date(c.schedule.end) <= new Date(c.schedule.start)) e('schedule_order', 'The end must be after the start.', 'schedule.end');
  if (new Date(c.schedule.start) < new Date(x.now.getTime() - 5 * 60_000)) w('start_in_past', 'The start time is in the past; Meta will treat it as starting when activated.', 'schedule.start');
  if (c.bid.strategy !== 'LOWEST_COST_WITHOUT_CAP' && !c.bid.amount) e('bid_amount', 'This bid strategy needs a bid amount.', 'bid.amount');
  if (c.structure.mode === 'existing_adset' && c.budget.level === 'campaign') w('budget_owner', 'Budget is owned by the existing campaign/ad set; the budget entered here is ignored.', 'budget.level');

  if (c.structure.mode !== 'new') {
    if (!x.accountSyncedCampaignIds.has(c.structure.campaign_id)) e('campaign_unknown', 'That campaign is not in this ad account\'s last sync.', 'structure.campaign_id');
    if (c.structure.mode === 'existing_adset' && x.accountSyncedAdsetIds.get(c.structure.adset_id) !== c.structure.campaign_id) e('adset_unknown', 'That ad set is not in the selected campaign.', 'structure.adset_id');
  }

  if (!x.creativeReady) e('creative_missing', 'Choose a creative that has passed validation.', 'creative');
  if (c.placements.mode === 'manual' && c.placements.facebook.length + c.placements.instagram.length === 0) e('placements_empty', 'Pick at least one placement or use automatic placements.', 'placements');
  if (c.placements.mode === 'manual' && c.placements.instagram.length > 0 && !c.instagram_user_id) w('instagram_identity', 'Instagram placements are selected but no Instagram account is chosen; Meta will use the Page\'s identity.', 'instagram_user_id');

  const ad = c.ad;
  if (ad.primary_text.length > 125) w('primary_text_long', 'Primary text is over 125 characters; Meta truncates it behind "See more".', 'ad.primary_text');
  if (ad.headline.length > 40) w('headline_long', 'Headline is over 40 characters and may be cut off.', 'ad.headline');
  if (ad.description.length > 30) w('description_long', 'Description is over 30 characters and may be cut off or not shown.', 'ad.description');
  if (!ad.headline) w('headline_empty', 'No headline set.', 'ad.headline');
  return { errors, warnings };
}

// ---- Exact Meta payloads --------------------------------------------------------------------------------------
export type StepName = 'media' | 'campaign' | 'adset' | 'creative' | 'ad';
export type PlanStep = {
  step: StepName;
  object: 'adimages' | 'advideos' | 'campaigns' | 'adsets' | 'adcreatives' | 'ads';
  /** Searched BEFORE posting so a retry after an ambiguous failure finds, not duplicates. Null for media. */
  findByName: string | null;
  body: Record<string, unknown>;
};

/** Short, stable, URL-safe tag embedded in every object name so retries can recognise their own work. */
export const draftTag = (idempotencyKey: string) => `HQN-${idempotencyKey.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()}`;

export function objectName(base: string, tag: string, kind: 'Campaign' | 'Ad set' | 'Creative' | 'Ad') {
  return `${base.slice(0, 60)} · ${kind} [${tag}]`;
}

export type PlanInput = {
  name: string;
  tag: string;
  config: DraftConfig;
  currency: string;
  /** ids already known (existing objects or created earlier) */
  have: Partial<Record<'image_hash' | 'video_id' | 'campaign_id' | 'adset_id' | 'creative_id', string>>;
  creativeKind: 'image' | 'video';
  /** Required for video media upload (Meta fetches it), image bytes are posted by the executor. */
  mediaUrl?: string;
  thumbnailUrl?: string | null;
  destination: { url: string; urlTags: string } | null;
};

export function buildPlan(p: PlanInput): PlanStep[] {
  const c = p.config;
  const steps: PlanStep[] = [];
  const cur = p.currency;
  const campaignBudget = c.budget.level === 'campaign' && c.structure.mode === 'new';
  const budgetFields = (): Record<string, unknown> => c.budget.type === 'daily'
    ? { daily_budget: toMinorUnits(c.budget.amount, cur) }
    : { lifetime_budget: toMinorUnits(c.budget.amount, cur) };
  const bidFields = (): Record<string, unknown> => ({
    bid_strategy: c.bid.strategy,
    ...(c.bid.amount ? { bid_amount: toMinorUnits(c.bid.amount, cur) } : {}),
  });

  if (p.creativeKind === 'video') {
    steps.push({ step: 'media', object: 'advideos', findByName: null, body: { file_url: p.mediaUrl ? '[signed storage URL, expires]' : null, name: p.name } });
  } else {
    steps.push({ step: 'media', object: 'adimages', findByName: null, body: { bytes: '[original file bytes, base64]' } });
  }

  if (c.structure.mode === 'new') {
    const name = objectName(p.name, p.tag, 'Campaign');
    steps.push({
      step: 'campaign', object: 'campaigns', findByName: name,
      body: {
        name, objective: c.objective, status: 'PAUSED', special_ad_categories: [],
        buying_type: 'AUCTION', is_adset_budget_sharing_enabled: false,
        ...(campaignBudget ? { ...budgetFields(), bid_strategy: c.bid.strategy } : {}),
      },
    });
  }

  if (c.structure.mode !== 'existing_adset') {
    const name = objectName(p.name, p.tag, 'Ad set');
    const geo: Record<string, unknown> = { countries: c.targeting.countries };
    if (c.targeting.regions.length) geo.regions = c.targeting.regions.map((key) => ({ key }));
    const targeting: Record<string, unknown> = {
      geo_locations: geo, age_min: c.targeting.age_min, age_max: c.targeting.age_max,
      ...(c.targeting.genders.length ? { genders: c.targeting.genders } : {}),
      ...(c.placements.mode === 'manual'
        ? {
            publisher_platforms: [...(c.placements.facebook.length ? ['facebook'] : []), ...(c.placements.instagram.length ? ['instagram'] : [])],
            ...(c.placements.facebook.length ? { facebook_positions: c.placements.facebook } : {}),
            ...(c.placements.instagram.length ? { instagram_positions: c.placements.instagram } : {}),
          }
        : {}),
    };
    const promoted: Record<string, unknown> = c.optimization_goal === 'OFFSITE_CONVERSIONS'
      ? { pixel_id: c.dataset_id, custom_event_type: 'LEAD' }
      : c.conversion_location === 'instant_form' ? { page_id: c.page_id } : {};
    steps.push({
      step: 'adset', object: 'adsets', findByName: name,
      body: {
        name, campaign_id: p.have.campaign_id ?? (c.structure.mode === 'existing_campaign' ? c.structure.campaign_id : '[campaign id from previous step]'),
        status: 'PAUSED', billing_event: 'IMPRESSIONS', optimization_goal: c.optimization_goal,
        destination_type: c.conversion_location === 'instant_form' ? 'ON_AD' : 'WEBSITE',
        ...(Object.keys(promoted).length ? { promoted_object: promoted } : {}),
        targeting, start_time: c.schedule.start, ...(c.schedule.end ? { end_time: c.schedule.end } : {}),
        ...(campaignBudget ? {} : { ...budgetFields(), ...bidFields() }),
      },
    });
  }

  const creativeName = objectName(p.name, p.tag, 'Creative');
  const media = p.creativeKind === 'video'
    ? { video_data: {
        video_id: p.have.video_id ?? '[video id from media step]', message: c.ad.primary_text,
        ...(c.ad.headline ? { title: c.ad.headline } : {}), ...(c.ad.description ? { link_description: c.ad.description } : {}),
        ...(p.thumbnailUrl ? { image_url: '[signed thumbnail URL]' } : {}),
        call_to_action: callToAction(c, p.destination),
      } }
    : { link_data: {
        image_hash: p.have.image_hash ?? '[image hash from media step]', message: c.ad.primary_text,
        link: c.conversion_location === 'instant_form' ? 'https://fb.me/' : (p.destination?.url ?? ''),
        ...(c.ad.headline ? { name: c.ad.headline } : {}), ...(c.ad.description ? { description: c.ad.description } : {}),
        call_to_action: callToAction(c, p.destination),
      } };
  steps.push({
    step: 'creative', object: 'adcreatives', findByName: creativeName,
    body: {
      name: creativeName,
      object_story_spec: { page_id: c.page_id, ...(c.instagram_user_id ? { instagram_user_id: c.instagram_user_id } : {}), ...media },
      ...(p.destination?.urlTags ? { url_tags: p.destination.urlTags } : {}),
    },
  });

  const adName = objectName(p.name, p.tag, 'Ad');
  steps.push({
    step: 'ad', object: 'ads', findByName: adName,
    body: {
      name: adName, status: 'PAUSED',
      adset_id: p.have.adset_id ?? (c.structure.mode === 'existing_adset' ? c.structure.adset_id : '[ad set id from previous step]'),
      creative: { creative_id: p.have.creative_id ?? '[creative id from previous step]' },
    },
  });
  return steps;
}

function callToAction(c: DraftConfig, dest: { url: string } | null) {
  return c.conversion_location === 'instant_form'
    ? { type: c.ad.cta, value: { lead_gen_form_id: c.ad.lead_form_id } }
    : { type: c.ad.cta, value: { link: dest?.url ?? '' } };
}

/** Plain-language summary a human must see (and the exact thing recorded as confirmed). */
export function confirmationSummary(input: {
  accountName: string | null; accountId: string; currency: string; pageName: string | null; config: DraftConfig; timezone: string | null;
}) {
  const c = input.config;
  const dest = c.conversion_location === 'instant_form' ? `Instant Form ${c.ad.lead_form_id}` : (c.ad.destination_url ?? '');
  return {
    account: `${input.accountName ?? input.accountId} (${input.accountId})`,
    page: input.pageName ?? c.page_id,
    budget: `${c.budget.amount.toFixed(2)} ${input.currency} ${c.budget.type} (owned by ${c.structure.mode === 'existing_adset' ? 'the existing ad set' : c.budget.level})`,
    budget_minor_units_sent: toMinorUnits(c.budget.amount, input.currency),
    schedule: `${c.schedule.start}${c.schedule.end ? ` to ${c.schedule.end}` : ' (no end)'}${input.timezone ? ` · account timezone ${input.timezone}` : ''}`,
    destination: dest,
    objective: c.objective,
    optimization_goal: c.optimization_goal,
    created_as: 'PAUSED (nothing delivers until you turn it on in Ads Manager)',
  };
}
