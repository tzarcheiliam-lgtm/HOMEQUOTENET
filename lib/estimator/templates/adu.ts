import { BASE_PRICE, UPGRADE_COST, type SizeTier } from '../../adu/pricing-config.ts';
import { DEFAULT_LIMITS, type EstimatorQuestion, type EstimatorTemplate, type Price } from '../types.ts';

/**
 * The default ADU estimator template.
 *
 * EVERY PRICE COMES FROM lib/adu/pricing-config.ts, the same numbers as the
 * /adu-estimator page, and is an EXAMPLE (pricesConfirmed: false) until an
 * ADU builder confirms it. Each config figure is one number; the range here
 * runs from it to about 12% above it (RANGE_SPREAD), because a ballpark is
 * never shown as one figure.
 *
 * Pricing model (all flat, nothing per sq ft), Buildoly's four picks:
 * - model: the base build price of its config tier (studio and one bedroom
 *   share `studio1`, as in the config; two bedroom `b2ba1`; three bedroom
 *   `b3ba2`; garage conversion `garage`).
 * - finish Luxe: the living room's and bathroom's Premium upgrade for that tier.
 * - upgraded kitchen: the kitchen's Premium Plus upgrade for that tier.
 * - more closet space: the bedroom's Premium Plus upgrade for that tier.
 * The three upgrades together are every room's top finish (luxeUpgrade).
 * Each upgrade differs per tier, so each has one hidden yes/no question per
 * tier (`finishUp_<tier>`...) shown only for that tier's models; the funnel's
 * pick answers all of them and only the visible one prices.
 *
 * `project` (detached / garage) is the lead's project (= the "adu" funnel's
 * service values); the funnel answers it from the model. Geometry is unused
 * (every price is flat). Only the simple funnel uses this template (HomeQuote
 * Network's /estimator/adu, experience 'funnel'). Ids are a fixed contract with
 * the funnel spec (content/estimators/homequote-adu-funnel.ts), the lead route
 * and the tests: rename labels freely but do not rename ids.
 */

/** A config figure as a range: the figure to about 12% above it, in whole hundreds. */
const RANGE_SPREAD = 0.12;
const range = (amount: number): Price => ({ unit: 'flat', low: amount, high: Math.round((amount * (1 + RANGE_SPREAD)) / 100) * 100 });

/** Every room's top finish over Basic for a size tier (Premium Plus where offered, else Premium). */
export function luxeUpgrade(tier: SizeTier): number {
  return Object.values(UPGRADE_COST).reduce((sum, levels) => sum + (levels.premiumPlus?.[tier] ?? levels.premium?.[tier] ?? 0), 0);
}

export type AduModel = 'studio' | '1bed' | '2bed' | '3bed' | 'garage';
export const ADU_MODELS: readonly AduModel[] = ['studio', '1bed', '2bed', '3bed', 'garage'];

/** The config tier each model is priced at. */
export const MODEL_TIER: Record<AduModel, SizeTier> = { studio: 'studio1', '1bed': 'studio1', '2bed': 'b2ba1', '3bed': 'b3ba2', garage: 'garage' };
const TIERS = [...new Set(Object.values(MODEL_TIER))];
const modelsOf = (tier: SizeTier) => ADU_MODELS.filter((m) => MODEL_TIER[m] === tier);

/** The three upgrades per tier: what Luxe, the upgraded kitchen and more closet space each add. */
export const UPGRADE = {
  finish: (tier: SizeTier) => (UPGRADE_COST.livingRoom.premium?.[tier] ?? 0) + (UPGRADE_COST.bathroom.premium?.[tier] ?? 0),
  kitchen: (tier: SizeTier) => UPGRADE_COST.kitchen.premiumPlus?.[tier] ?? 0,
  storage: (tier: SizeTier) => UPGRADE_COST.bedroom.premiumPlus?.[tier] ?? 0,
} as const;
export type AduUpgrade = keyof typeof UPGRADE;

/** The hidden question id of an upgrade at a tier, e.g. "kitchenUp_b2ba1". */
export const upgradeQuestionId = (upgrade: AduUpgrade, tier: SizeTier) => `${upgrade}Up_${tier}`;
/** The models an upgrade applies to at a tier (a model with no bedroom, studio or garage conversion, has no storage pick). */
function upgradeModels(upgrade: AduUpgrade, tier: SizeTier): AduModel[] {
  return upgrade === 'storage' ? modelsOf(tier).filter((m) => m !== 'studio' && m !== 'garage') : modelsOf(tier);
}

/** Answers that turn an upgrade on for every tier (only the model's tier is visible, so only it prices). */
export const upgradeAnswers = (upgrade: AduUpgrade): Record<string, string[]> =>
  Object.fromEntries(TIERS.filter((tier) => upgradeModels(upgrade, tier).length).map((tier) => [upgradeQuestionId(upgrade, tier), ['yes']]));

const UPGRADE_LABEL: Record<AduUpgrade, string> = { finish: 'Luxe finish', kitchen: 'Upgraded kitchen', storage: 'More closet space' };

function upgradeQuestions(upgrade: AduUpgrade): EstimatorQuestion[] {
  return TIERS.flatMap((tier) => {
    const models = upgradeModels(upgrade, tier);
    if (!models.length) return [];
    return [{
      id: upgradeQuestionId(upgrade, tier),
      label: UPGRADE_LABEL[upgrade],
      kind: 'single',
      summaryLabel: UPGRADE_LABEL[upgrade],
      showWhen: { questionId: 'model', anyOf: models },
      optional: true,
      options: [
        { id: 'no', label: 'Standard' },
        { id: 'yes', label: UPGRADE_LABEL[upgrade], price: range(UPGRADE[upgrade](tier)) },
      ],
    } satisfies EstimatorQuestion];
  });
}

export const ADU_TEMPLATE: EstimatorTemplate = {
  trade: 'adu',
  title: 'ADU',
  projectNoun: 'ADU',
  pricesConfirmed: false,
  minimumJob: 50000,
  roundTo: 1000,
  // Five models on one step (Buildoly's four plus the garage conversion).
  limits: { ...DEFAULT_LIMITS, maxSingleOptions: 5 },
  geometry: {
    sizes: { small: { lengthFt: 22, widthFt: 16 }, medium: { lengthFt: 32, widthFt: 16 }, large: { lengthFt: 36, widthFt: 21 } },
    avgDepthFt: 0,
    shapes: {
      rectangle: { areaFactor: 1, perimeterFactor: 1 },
      l_shape: { areaFactor: 1, perimeterFactor: 1 },
      freeform: { areaFactor: 1, perimeterFactor: 1 },
      unsure: { areaFactor: 1, perimeterFactor: 1 },
    },
    deckSizes: {},
    limits: { minFt: 10, maxLengthFt: 60, maxWidthFt: 60, minDepthFt: 0, maxDepthFt: 0 },
  },
  questions: [
    {
      // The lead's project (the "adu" funnel's service values); the funnel answers it from the model. Unpriced.
      id: 'project',
      label: 'What would you like to build?',
      kind: 'single',
      role: 'project',
      options: [
        { id: 'detached', label: 'Detached backyard ADU', note: 'A new home of its own in the yard' },
        { id: 'garage', label: 'Garage conversion', note: 'Turn the garage into a studio' },
        // Kept for leads filed before the Buildoly flow (no funnel pick answers it now).
        { id: 'attached', label: 'Attached addition', note: 'New rooms joined to the house' },
      ],
    },
    {
      id: 'model',
      label: 'Select a model.',
      kind: 'single',
      summaryLabel: 'Model',
      options: [
        { id: 'studio', label: 'Studio', note: '1 bath, about 350 sq ft', price: range(BASE_PRICE[MODEL_TIER.studio]) },
        { id: '1bed', label: 'One bedroom', note: '1 bath, about 500 sq ft', price: range(BASE_PRICE[MODEL_TIER['1bed']]) },
        { id: '2bed', label: 'Two bedroom', note: '1 or 2 baths, about 750 sq ft', price: range(BASE_PRICE[MODEL_TIER['2bed']]) },
        { id: '3bed', label: 'Three bedroom', note: '2 baths, about 1,000 sq ft', price: range(BASE_PRICE[MODEL_TIER['3bed']]) },
        { id: 'garage', label: 'Garage conversion', note: 'Studio, about 400 sq ft', price: range(BASE_PRICE[MODEL_TIER.garage]) },
      ],
    },
    {
      id: 'finish',
      label: 'Choose your finish.',
      kind: 'single',
      summaryLabel: 'Finish',
      options: [
        { id: 'standard', label: 'Standard', note: 'Shingle roof and stucco, concrete patio' },
        { id: 'luxe', label: 'Luxe', note: 'Metal roof, wood siding, composite deck' },
      ],
    },
    ...upgradeQuestions('finish'),
    {
      id: 'kitchen',
      label: 'Design your kitchen.',
      kind: 'single',
      summaryLabel: 'Kitchen',
      options: [
        { id: 'standard', label: 'Standard kitchen', note: 'White cabinets, GE-style appliances' },
        { id: 'upgraded', label: 'Upgraded kitchen', note: 'Oak cabinets, premium appliances' },
      ],
    },
    ...upgradeQuestions('kitchen'),
    {
      id: 'storage',
      label: 'Choose your storage.',
      kind: 'single',
      summaryLabel: 'Storage',
      showWhen: { questionId: 'model', anyOf: ['1bed', '2bed', '3bed'] },
      options: [
        { id: 'standard', label: 'Standard storage', note: 'Two built-in wardrobe closets' },
        { id: 'more', label: 'More closet space', note: 'Three built-in wardrobe closets' },
      ],
    },
    ...upgradeQuestions('storage'),
  ],
  packages: [],
  notIncluded: [
    'Permits, plan check and city or school fees',
    'Utility upgrades (electrical panel, sewer or water lines)',
    'Hillside, retaining walls or a special foundation',
    'Landscaping beyond the ADU entry',
    'Unforeseen site conditions',
  ],
  disclaimer:
    'This is a ballpark range, not a quote. Your final price is set by a licensed local ADU builder after a free consultation and a look at your lot.',
};
