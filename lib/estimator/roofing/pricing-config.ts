/**
 * Roof replacement funnel: the ONE place every roofing number lives
 * (HomeQuote Network's /estimator/roofing). The template
 * (lib/estimator/templates/roofing.ts), the roof measurement
 * (./roof.ts) and the tests read these; nothing else hard-codes a price.
 *
 * EVERY PRICE HERE IS AN EXAMPLE (pricesConfirmed: false): plausible
 * Southern California installed prices per roofing square (100 sq ft of
 * roof), tear-off of one old layer, underlayment, flashing, permit and
 * haul-away included. They are not any contractor's real pricing; confirm or
 * replace each one before the page drops the "Example prices" label.
 *
 * How a roof is priced:
 *   roof sq ft (measured by the Google Solar API, which reports the sloped
 *   roof surface, or a preset from "How big is your home?")
 *   x WASTE_FACTOR (cut-offs at hips, valleys and edges)
 *   x the pitch factor (steep roofs need more labor and safety gear)
 *   = priced sq ft, x the material's price per sq ft (per square / 100).
 */

export const ROOF_MATERIALS = ['asphalt', 'tile', 'metal'] as const;
export type RoofMaterial = (typeof ROOF_MATERIALS)[number];

/** Installed price per roofing square (100 sq ft), whole US dollars. EXAMPLES. */
export const PRICE_PER_SQUARE: Record<RoofMaterial, { low: number; high: number }> = {
  asphalt: { low: 550, high: 750 },
  tile: { low: 1100, high: 1600 },
  metal: { low: 1200, high: 1700 },
};

/** Extra material for cut-offs at hips, valleys, ridges and edges. */
export const WASTE_FACTOR = 1.12;

/**
 * Labor factor by roof pitch (degrees; 6/12 = 26.57°): walkable roofs are 1,
 * steeper ones need more time, staging and safety gear. The first tier whose
 * `maxDeg` the pitch does not exceed applies.
 */
export const PITCH_TIERS: { maxDeg: number; factor: number; label: string }[] = [
  { maxDeg: 26.57, factor: 1, label: 'walkable pitch' },
  { maxDeg: 33.69, factor: 1.1, label: 'steep pitch' },
  { maxDeg: 39.81, factor: 1.2, label: 'very steep pitch' },
  { maxDeg: 90, factor: 1.3, label: 'very steep pitch' },
];

/** Under 2/12 (9.46°) shingles and tile need a low-slope system: material confirmed on site. */
export const LOW_SLOPE_DEG = 9.46;

/** Neither end of the range goes below this; both round out to ROUND_TO. */
export const MINIMUM_JOB = 9000;
export const ROUND_TO = 500;

/**
 * "How big is your home?" when the roof cannot be measured from above: the
 * template's size presets (small / medium / large) as roof sq ft. A one-story
 * home's roof is about its floor area x 1.15 (pitch) plus overhangs; a
 * two-story home has a smaller roof for the same floor area, so the bands are
 * in between.
 */
export const HOME_BANDS = [
  { id: 'small', title: 'Under 1,500 sq ft', subtitle: 'About a 1,700 sq ft roof', roofSqft: 1700 },
  { id: 'medium', title: '1,500 – 2,500 sq ft', subtitle: 'About a 2,500 sq ft roof', roofSqft: 2500 },
  { id: 'large', title: 'Over 2,500 sq ft', subtitle: 'About a 3,400 sq ft roof', roofSqft: 3400 },
] as const;
export type HomeBand = (typeof HOME_BANDS)[number]['id'];
export const DEFAULT_HOME_BAND: HomeBand = 'medium';

/** A measured roof outside this range is not trusted (a shed, or a whole apartment block): the bands are asked instead. */
export const MEASURED_ROOF_SQFT = { min: 400, max: 12000 } as const;

/**
 * The template geometry's fixed width: priced sq ft = length x width, so a
 * roof of N priced sq ft is (N / 50) x 50 ft. Only the product matters.
 */
export const ROOF_GEOMETRY_WIDTH_FT = 50;
