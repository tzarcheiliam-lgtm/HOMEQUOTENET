/**
 * ADU price estimator: the ONE place every number and label lives.
 *
 * Nothing in the UI or in lib/adu/pricing.ts hard-codes a price. Change a
 * number here and the summary, payment calculator and return estimate follow.
 * tests/adu-estimator.test.ts asserts these values, so update its expected
 * numbers in the same commit when a price changes.
 */

export const SIZE_TIERS = ['garage', 'studio1', 'b2ba1', 'b2ba2', 'b3ba2', 'b3ba3'] as const;
export type SizeTier = (typeof SIZE_TIERS)[number];

/** Per-room finish levels, cheapest first. */
export const FINISH_LEVELS = ['basic', 'premium', 'premiumPlus'] as const;
export type FinishLevel = (typeof FINISH_LEVELS)[number];

export const ROOMS = ['bedroom', 'kitchen', 'bathroom', 'livingRoom'] as const;
export type Room = (typeof ROOMS)[number];

/** Which finish levels each room offers. Bathroom and living room stop at Premium. */
export const ROOM_FINISH_OPTIONS: Record<Room, readonly FinishLevel[]> = {
  bedroom: ['basic', 'premium', 'premiumPlus'],
  kitchen: ['basic', 'premium', 'premiumPlus'],
  bathroom: ['basic', 'premium'],
  livingRoom: ['basic', 'premium'],
};

export const ROOM_LABELS: Record<Room, string> = {
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  livingRoom: 'Living room',
};

export const FINISH_LABELS: Record<FinishLevel, string> = {
  basic: 'Basic',
  premium: 'Premium',
  premiumPlus: 'Premium Plus',
};

/** Base build price per size tier, in whole US dollars. */
export const BASE_PRICE: Record<SizeTier, number> = {
  garage: 142000,
  studio1: 178000,
  b2ba1: 224000,
  b2ba2: 242000,
  b3ba2: 288000,
  b3ba3: 288000,
};

/**
 * Upgrade cost over Basic, per room and finish, per size tier. Basic is always
 * 0 and is not listed. A room only lists the levels it offers
 * (see ROOM_FINISH_OPTIONS).
 */
export const UPGRADE_COST: {
  [R in Room]: Partial<Record<Exclude<FinishLevel, 'basic'>, Record<SizeTier, number>>>;
} = {
  bedroom: {
    premium: { garage: 1050, studio1: 1050, b2ba1: 2150, b2ba2: 2150, b3ba2: 3350, b3ba3: 3350 },
    premiumPlus: { garage: 2200, studio1: 2200, b2ba1: 4650, b2ba2: 4650, b3ba2: 6850, b3ba3: 6850 },
  },
  kitchen: {
    premium: { garage: 6400, studio1: 6400, b2ba1: 9250, b2ba2: 9250, b3ba2: 9250, b3ba3: 9250 },
    premiumPlus: { garage: 9650, studio1: 9650, b2ba1: 15750, b2ba2: 15750, b3ba2: 15750, b3ba3: 15750 },
  },
  bathroom: {
    premium: { garage: 1250, studio1: 1250, b2ba1: 1250, b2ba2: 2500, b3ba2: 2500, b3ba3: 3500 },
  },
  livingRoom: {
    premium: { garage: 1400, studio1: 1400, b2ba1: 2500, b2ba2: 2500, b3ba2: 3750, b3ba3: 4000 },
  },
};

/** What the visitor picks for a new build. */
export const BEDROOM_OPTIONS = ['studio', '1', '2', '3'] as const;
export type Bedrooms = (typeof BEDROOM_OPTIONS)[number];

/** Valid bathroom counts per bedroom count. Studio and 1 bed don't change the price. */
export const BATHROOM_OPTIONS: Record<Bedrooms, readonly number[]> = {
  studio: [1],
  '1': [1],
  '2': [1, 2],
  '3': [2, 3],
};

/** Approximate square footage by bedrooms. A garage conversion has no size option. */
export const APPROX_SQFT: Record<Bedrooms, number> = {
  studio: 400,
  '1': 600,
  '2': 800,
  '3': 1200,
};

/** Keys for the illustrative-return table (studio and 1 bed share a price but not a return). */
export const RETURN_KEYS = ['garage', 'studio', 'bed1', 'b2ba1', 'b2ba2', 'b3ba2', 'b3ba3'] as const;
export type ReturnKey = (typeof RETURN_KEYS)[number];

/** ILLUSTRATIVE return figures only: not a guarantee. */
export const RETURN_ESTIMATE: Record<
  ReturnKey,
  { rentPerMonth: number; valueAfterBuild: number; profit: number; roiPercent: number; paybackYears: number }
> = {
  garage: { rentPerMonth: 2400, valueAfterBuild: 240000, profit: 119000, roiPercent: 24, paybackYears: 4.2 },
  studio: { rentPerMonth: 2000, valueAfterBuild: 240000, profit: 98000, roiPercent: 17, paybackYears: 5.9 },
  bed1: { rentPerMonth: 2400, valueAfterBuild: 360000, profit: 218000, roiPercent: 20, paybackYears: 4.9 },
  b2ba1: { rentPerMonth: 3200, valueAfterBuild: 450000, profit: 241400, roiPercent: 18, paybackYears: 5.4 },
  b2ba2: { rentPerMonth: 3600, valueAfterBuild: 540000, profit: 301900, roiPercent: 18, paybackYears: 5.5 },
  b3ba2: { rentPerMonth: 5000, valueAfterBuild: 660000, profit: 388350, roiPercent: 22, paybackYears: 4.5 },
  b3ba3: { rentPerMonth: 5600, valueAfterBuild: 720000, profit: 418350, roiPercent: 22, paybackYears: 4.5 },
};

/**
 * Site questions. Any "Yes" or "Not sure" means the number is only a starting
 * price and the item needs a site visit. `visitNote` is the line listed under
 * "Needs a site visit".
 */
export const SITE_QUESTIONS = [
  { id: 'hillside', label: 'Is the property on a hillside?', visitNote: 'Hillside lot' },
  { id: 'floodZone', label: 'Is the property in a flood zone?', visitNote: 'Flood zone' },
  { id: 'retainingWall', label: 'Is a retaining wall needed?', visitNote: 'Retaining wall' },
  { id: 'belowStreet', label: 'Will the ADU sit below street level?', visitNote: 'ADU below street level' },
  { id: 'specialFoundation', label: 'Is a raised or special foundation needed?', visitNote: 'Raised or special foundation' },
  { id: 'septic', label: 'Is the main home on a septic system?', visitNote: 'Main home on septic' },
  { id: 'narrowAccess', label: 'Is site access under 36 inches wide?', visitNote: 'Site access under 36 inches' },
  { id: 'propertyLines', label: 'Are the property lines unclear?', visitNote: 'Unclear property lines' },
  { id: 'overlayZone', label: 'Is the property in a special overlay zone?', visitNote: 'Special overlay zone' },
] as const;
export type SiteQuestionId = (typeof SITE_QUESTIONS)[number]['id'];
export type SiteAnswer = 'yes' | 'no' | 'unsure';

/** Defaults for the monthly payment calculator. */
export const LOAN_DEFAULTS = { annualRatePercent: 7, termYears: 30 } as const;
export const LOAN_LIMITS = { maxRatePercent: 30, minTermYears: 1, maxTermYears: 40 } as const;
