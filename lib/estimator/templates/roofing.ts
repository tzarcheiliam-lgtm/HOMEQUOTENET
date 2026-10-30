import { HOME_BANDS, MINIMUM_JOB, PRICE_PER_SQUARE, ROOF_GEOMETRY_WIDTH_FT, ROOF_MATERIALS, ROUND_TO, type RoofMaterial } from '../roofing/pricing-config.ts';
import { bandPreset } from '../roofing/roof.ts';
import { DEFAULT_LIMITS, type EstimatorOption, type EstimatorTemplate } from '../types.ts';

/**
 * The default roof replacement estimator template (HomeQuote Network's
 * /estimator/roofing, experience 'funnel' only: there is no roofing builder).
 *
 * EVERY PRICE IS AN EXAMPLE (pricesConfirmed: false); the numbers live in
 * ../roofing/pricing-config.ts.
 *
 * Pricing model: one line, the material, priced per sq ft of "priced roof"
 * (floor_sqft = geometry length x width). The funnel never asks for
 * dimensions: the lead route turns the roof into dimensions
 * (../roofing/roof.ts roofDimensions: roof sq ft x waste x pitch factor, as
 * (N / 50) x 50 ft) from the Google Solar measurement whose signature it
 * verified, else from the "How big is your home?" band, which is also the
 * size preset (small / medium / large) the template falls back to. So the
 * material's price per sq ft is its price per roofing square / 100.
 *
 * The colour is a design pick (no price), one question per material
 * ("asphaltColor", "tileColor", "metalColor"). Ids are a fixed contract with the
 * funnel spec (content/estimators/homequote-roofing-funnel.ts), the lead
 * route and the tests.
 */

const perSqft = (m: RoofMaterial) => ({ unit: 'floor_sqft' as const, low: PRICE_PER_SQUARE[m].low / 100, high: PRICE_PER_SQUARE[m].high / 100 });

/** The template question (and funnel step) id of a material's colours, e.g. "tileColor". */
export const colorQuestionId = (material: RoofMaterial) => `${material}Color`;

/** Colours per material (the funnel's colour step for each material; ids unique across materials). */
export const ROOF_COLORS: Record<RoofMaterial, EstimatorOption[]> = {
  asphalt: [
    { id: 'charcoal', label: 'Charcoal', note: 'Dark grey blend' },
    { id: 'weathered_wood', label: 'Weathered wood', note: 'Warm brown-grey blend' },
    { id: 'pewter', label: 'Pewter grey', note: 'Soft light grey' },
  ],
  tile: [
    { id: 'terracotta', label: 'Terracotta', note: 'Classic red clay blend' },
    { id: 'sandstone', label: 'Sandstone', note: 'Warm tan blend' },
    { id: 'slate_grey', label: 'Slate grey', note: 'Flat slate-look tile' },
  ],
  metal: [
    { id: 'matte_black', label: 'Matte black', note: 'Modern, crisp seams' },
    { id: 'dark_bronze', label: 'Dark bronze', note: 'Warm dark brown' },
    { id: 'galvalume', label: 'Galvalume silver', note: 'Bare metal look' },
  ],
};

export const ROOFING_TEMPLATE: EstimatorTemplate = {
  trade: 'roofing',
  title: 'Roof replacement',
  projectNoun: 'roof replacement',
  pricesConfirmed: false,
  minimumJob: MINIMUM_JOB,
  roundTo: ROUND_TO,
  limits: DEFAULT_LIMITS,
  geometry: {
    // The band presets as priced roof sq ft (length x 50 ft); see ../roofing/roof.ts.
    sizes: { small: bandPreset('small'), medium: bandPreset('medium'), large: bandPreset('large') },
    avgDepthFt: 0,
    shapes: {
      rectangle: { areaFactor: 1, perimeterFactor: 1 },
      l_shape: { areaFactor: 1, perimeterFactor: 1 },
      freeform: { areaFactor: 1, perimeterFactor: 1 },
      unsure: { areaFactor: 1, perimeterFactor: 1 },
    },
    deckSizes: {},
    // A measured roof arrives as (N / 50) x 50 ft: 8 ft (400 sq ft) up to 400 ft (20,000 priced sq ft).
    limits: { minFt: 1, maxLengthFt: 400, maxWidthFt: ROOF_GEOMETRY_WIDTH_FT, minDepthFt: 0, maxDepthFt: 0 },
  },
  questions: [
    {
      id: 'project',
      label: 'What are you planning?',
      kind: 'single',
      role: 'project',
      options: [{ id: 'replace', label: 'Full roof replacement', note: 'Tear-off and a new roof' }],
    },
    {
      id: 'size',
      label: 'How big is your home?',
      kind: 'single',
      role: 'size',
      summaryLabel: 'Home',
      options: HOME_BANDS.map((b) => ({ id: b.id, label: b.title, note: b.subtitle })),
    },
    {
      id: 'material',
      label: 'Choose your roof',
      kind: 'single',
      summaryLabel: 'Roof',
      options: [
        { id: 'asphalt', label: 'Architectural asphalt shingle', note: 'Tear-off and new shingles', price: perSqft('asphalt') },
        { id: 'tile', label: 'Concrete tile', note: 'Tear-off and new tile', price: perSqft('tile') },
        { id: 'metal', label: 'Standing-seam metal', note: 'Tear-off and new metal panels', price: perSqft('metal') },
      ],
    },
    // One colour question per material (the template's 4-option limit), each asked only for its material.
    ...ROOF_MATERIALS.map((material) => ({
      id: colorQuestionId(material),
      label: 'Choose your colour',
      kind: 'single' as const,
      summaryLabel: 'Colour',
      showWhen: { questionId: 'material', anyOf: [material] },
      options: ROOF_COLORS[material],
    })),
  ],
  packages: [],
  notIncluded: [
    'Replacing rotted roof decking (priced per sheet once the old roof is off)',
    'Structural work to carry a heavier roof (e.g. shingles to tile)',
    'Gutters, skylights, solar panel removal and re-install',
    'More than one old layer to tear off',
  ],
  disclaimer:
    'This is a ballpark range, not a quote. Your final price is set by a licensed local roofing contractor after a free inspection.',
};
