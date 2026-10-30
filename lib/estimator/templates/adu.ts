import { BASE_PRICE, UPGRADE_COST, type SizeTier } from '../../adu/pricing-config.ts';
import { DEFAULT_LIMITS, type EstimatorTemplate, type Price } from '../types.ts';

/**
 * The default ADU estimator template.
 *
 * EVERY PRICE COMES FROM lib/adu/pricing-config.ts, the same numbers as the
 * /adu-estimator page, and is an EXAMPLE (pricesConfirmed: false) until an
 * ADU builder confirms it. Each config figure is one number; the range here
 * runs from it to about 12% above it (RANGE_SPREAD), because a ballpark is
 * never shown as one figure.
 *
 * Pricing model (all flat, nothing per sq ft): the build type carries the
 * base build price of the studio / 1-bed tier (config `studio1`), or of the
 * garage conversion (`garage`); the size adds the step up to the 2-bed tier
 * (`b2ba1` - `studio1`; a studio and a 1 bed share the base price, as in the
 * config); the Luxe finish adds every room's top finish upgrade over Basic
 * for that tier (bedroom, kitchen, bathroom, living room), and a 2 bed's
 * larger upgrade is its own hidden question (`luxe2bed`) shown only for the
 * 2 bed, so the totals are exactly the config's numbers.
 *
 * An ATTACHED addition is priced like a detached ADU of the same size: the
 * config has no attached price of its own yet (a builder confirms it).
 *
 * Geometry is unused for pricing (every price is flat); the size presets are
 * the floor footprints, so the size role still reads as small / medium /
 * large: studio ~400 sq ft (20 x 20), 1 bed ~600 (30 x 20), 2 bed ~800 (32 x 25).
 *
 * Only the simple funnel uses this template (HomeQuote Network's
 * /estimator/adu, experience 'funnel'): no builder, no packages, no scope.
 * Ids are a fixed contract with the funnel spec
 * (content/estimators/homequote-adu-funnel.ts), the lead route (project ids =
 * the "adu" funnel's service values) and the tests: rename labels freely but
 * do not rename ids.
 */

/** A config figure as a range: the figure to about 12% above it, in whole hundreds. */
const RANGE_SPREAD = 0.12;
const range = (amount: number): Price => ({ unit: 'flat', low: amount, high: Math.round((amount * (1 + RANGE_SPREAD)) / 100) * 100 });

/** Every room's top finish over Basic for a size tier (Premium Plus where offered, else Premium). */
export function luxeUpgrade(tier: SizeTier): number {
  return Object.values(UPGRADE_COST).reduce((sum, levels) => sum + (levels.premiumPlus?.[tier] ?? levels.premium?.[tier] ?? 0), 0);
}

export const ADU_TEMPLATE: EstimatorTemplate = {
  trade: 'adu',
  title: 'ADU',
  projectNoun: 'ADU',
  pricesConfirmed: false,
  minimumJob: 50000,
  roundTo: 1000,
  limits: DEFAULT_LIMITS,
  geometry: {
    sizes: { small: { lengthFt: 20, widthFt: 20 }, medium: { lengthFt: 30, widthFt: 20 }, large: { lengthFt: 32, widthFt: 25 } },
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
      id: 'project',
      label: 'What would you like to build?',
      kind: 'single',
      role: 'project',
      options: [
        { id: 'detached', label: 'Detached backyard ADU', note: 'A new home of its own in the yard', price: range(BASE_PRICE.studio1) },
        { id: 'garage', label: 'Garage conversion', note: 'Turn the garage into a studio', price: range(BASE_PRICE.garage) },
        // Priced like a detached ADU of the same size until a builder confirms an attached price.
        { id: 'attached', label: 'Attached addition', note: 'New rooms joined to the house', price: range(BASE_PRICE.studio1) },
      ],
    },
    {
      id: 'size',
      label: 'How big?',
      kind: 'single',
      role: 'size',
      summaryLabel: 'Size',
      options: [
        // A garage conversion is a studio (the funnel answers small for it).
        { id: 'small', label: 'Studio', note: 'About 400 sq ft' },
        { id: 'medium', label: '1 bedroom', note: 'About 600 sq ft' },
        { id: 'large', label: '2 bedrooms', note: 'About 800 sq ft', price: range(BASE_PRICE.b2ba1 - BASE_PRICE.studio1) },
      ],
    },
    {
      id: 'finish',
      label: 'Which finish?',
      kind: 'single',
      summaryLabel: 'Finish',
      options: [
        { id: 'standard', label: 'Standard', note: 'Builder-grade finishes throughout' },
        { id: 'luxe', label: 'Luxe', note: 'Top finishes in every room', price: range(luxeUpgrade('studio1')) },
      ],
    },
    {
      // A 2 bed's Luxe costs more (bigger rooms): the difference, shown only for the 2 bed and answered by the funnel.
      id: 'luxe2bed',
      label: 'Luxe for two bedrooms',
      kind: 'single',
      summaryLabel: 'Luxe, 2 bedrooms',
      showWhen: { questionId: 'size', anyOf: ['large'] },
      optional: true,
      options: [
        { id: 'no', label: 'Standard' },
        { id: 'yes', label: 'Luxe', price: range(luxeUpgrade('b2ba1') - luxeUpgrade('studio1')) },
      ],
    },
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
