/**
 * Instant estimator: the shared contract.
 *
 * Every estimator file (engine, catalog, templates, screens, lead route,
 * contractor settings) builds on these types. Change them deliberately: a
 * change here ripples through all of lib/estimator, components/estimator and
 * app/api/estimator.
 *
 * Everything is plain JSON-shaped data so a template, and later each
 * contractor's saved copy, can be stored as JSON.
 */

/* ------------------------------------------------------------------ */
/* Prices                                                              */
/* ------------------------------------------------------------------ */

/**
 * How an option is priced. Quantities come from the pool geometry, the deck
 * size answer or the option's default quantity:
 * - interior_sqft: pool interior surface (floor + walls), e.g. plaster, pebble
 * - perimeter_lf:  pool edge length, e.g. coping, waterline tile
 * - deck_sqft:     deck area from the deck-size answer, e.g. pavers
 * - floor_sqft:    room floor area, length x width from the size preset or typed
 *                  dimensions (bathroom), e.g. floor tile
 * - linear_ft:     other run lengths with a default quantity, e.g. seating wall
 * - each:          per item with a default quantity, e.g. LED lights
 * - flat:          one price, e.g. automation, Baja shelf
 */
export type PriceUnit = 'interior_sqft' | 'perimeter_lf' | 'deck_sqft' | 'floor_sqft' | 'linear_ft' | 'each' | 'flat';

/** Whole US dollars per unit. `quantity` is the default for `each` and `linear_ft` (1 if absent). */
export type Price = { unit: PriceUnit; low: number; high: number; quantity?: number };

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

export type EstimatorOption = {
  id: string;
  label: string;
  /** Short helper text under the label. */
  note?: string;
  price?: Price;
  /** Picking this flags the estimate for a site visit; the text is shown to the homeowner. */
  siteVisit?: string;
  /**
   * Flag siteVisit only when this (visible) question has one of these picks,
   * e.g. a freestanding tub only in a small bathroom. Absent = always.
   */
  siteVisitWhen?: { questionId: string; anyOf: string[] };
  /** Visual for the option: a swatch id from components/estimator/swatches.tsx. */
  swatch?: string;
  /** Optional photo (public path) shown on the option card. */
  image?: string;
};

/**
 * Special meaning for the engine and the screen. Each role appears at most
 * once per template.
 * - project:  remodel / pool + backyard (drives which scope items show)
 * - shape:    option ids must be PoolShape values
 * - size:     option ids must be PoolSize values
 * - package:  option ids are package ids, plus CUSTOM_PACKAGE_ID
 * - scope:    "what to include" multi-select that gates the detail questions
 * - deckSize: option ids are keys of geometry.deckSizes
 */
export type QuestionRole = 'project' | 'shape' | 'size' | 'package' | 'scope' | 'deckSize';

export type EstimatorQuestion = {
  id: string;
  label: string;
  help?: string;
  kind: 'single' | 'multi';
  role?: QuestionRole;
  /** Prefix for this question's lines in the breakdown, e.g. "Coping". */
  summaryLabel?: string;
  /**
   * Questions sharing a screen id render on one screen, in template order
   * (e.g. tile + coping, or the three property questions). Default: own screen.
   */
  screen?: string;
  /** Title for a shared screen (taken from the first question that sets it). */
  screenTitle?: string;
  options: EstimatorOption[];
  /** Ask only when an earlier question has one of these answers. */
  showWhen?: { questionId: string; anyOf: string[] };
  /** May be left with no picks (multi questions such as backyard extras). */
  optional?: boolean;
};

/** Picked option ids per question id. A single question uses a one-element array. */
export type Answers = Record<string, string[]>;

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

/** The package-question option id meaning "build my own". */
export const CUSTOM_PACKAGE_ID = 'custom';

export type EstimatorPackage = {
  id: string;
  label: string;
  description: string;
  /** Bullet list shown on the package card. */
  includes: string[];
  /** Answers the package pre-fills (scope + detail questions). */
  answers: Answers;
  /** Show a "Most popular" badge. */
  popular?: boolean;
};

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

export type PoolShape = 'rectangle' | 'l_shape' | 'freeform' | 'unsure';
export type PoolSize = 'small' | 'medium' | 'large' | 'unsure';
export const POOL_SHAPES: readonly PoolShape[] = ['rectangle', 'l_shape', 'freeform', 'unsure'];
export const POOL_SIZES: readonly PoolSize[] = ['small', 'medium', 'large', 'unsure'];

/** Typed by the homeowner via "I know my dimensions". */
export type PoolDimensions = { lengthFt: number; widthFt: number; avgDepthFt?: number };

export type GeometrySettings = {
  /** Rectangle-equivalent footprint per size preset. "unsure" uses medium. */
  sizes: Record<Exclude<PoolSize, 'unsure'>, { lengthFt: number; widthFt: number }>;
  /** Used when the homeowner does not give a depth. */
  avgDepthFt: number;
  /**
   * Relative to a rectangle of the same length x width:
   * surface area = L x W x areaFactor, perimeter = 2(L + W) x perimeterFactor.
   * "unsure" should be 1 / 1.
   */
  shapes: Record<PoolShape, { areaFactor: number; perimeterFactor: number }>;
  /** Deck area in sq ft per deckSize option id. */
  deckSizes: Record<string, number>;
  /** Accepted typed dimensions (inclusive). Outside this, the preset is used. */
  limits: { minFt: number; maxLengthFt: number; maxWidthFt: number; minDepthFt: number; maxDepthFt: number };
};

export type PoolGeometry = {
  shape: PoolShape;
  size: PoolSize;
  lengthFt: number;
  widthFt: number;
  avgDepthFt: number;
  /** Water surface area. */
  surfaceAreaSqft: number;
  perimeterFt: number;
  /** Floor + walls: surfaceArea + perimeter x avgDepth. */
  interiorSqft: number;
  /** Deck area from the deckSize answer; 0 when unanswered. */
  deckSqft: number;
  source: 'preset' | 'dimensions';
};

/* ------------------------------------------------------------------ */
/* Template                                                            */
/* ------------------------------------------------------------------ */

export type EstimatorLimits = { maxSingleOptions: number; maxMultiOptions: number };

/** The "keep it short" rule: at most 4 options on a single question, 5 on a multi. */
export const DEFAULT_LIMITS: EstimatorLimits = { maxSingleOptions: 4, maxMultiOptions: 5 };

export type EstimatorTemplate = {
  trade: string;
  title: string;
  /** Used in copy and the consent line, e.g. "pool project". */
  projectNoun: string;
  /** False while prices are examples. The page then says so and is not indexed. */
  pricesConfirmed: boolean;
  /** Neither end of the range goes below this. */
  minimumJob: number;
  /** Low end rounds down, high end rounds up, to this step. */
  roundTo: number;
  geometry: GeometrySettings;
  questions: EstimatorQuestion[];
  packages: EstimatorPackage[];
  notIncluded: string[];
  disclaimer: string;
  limits: EstimatorLimits;
};

/** Every option a template can draw from, per question id (most are off by default). */
export type EstimatorCatalog = Record<string, EstimatorOption[]>;

/* ------------------------------------------------------------------ */
/* Estimate                                                            */
/* ------------------------------------------------------------------ */

export type EstimateInput = {
  answers: Answers;
  dimensions?: PoolDimensions;
};

export type EstimateLine = {
  questionId: string;
  optionId: string;
  /** e.g. "Coping: Travertine". */
  label: string;
  unit: PriceUnit;
  /** Rounded quantity used, e.g. 124 (linear ft). 1 for flat. */
  quantity: number;
  low: number;
  high: number;
};

/**
 * incomplete: a shown question is unanswered, so the range may still move.
 * site_visit: everything answered, but something needs an on-site look.
 * ready:      everything answered, nothing flagged.
 */
export type EstimateStatus = 'incomplete' | 'site_visit' | 'ready';

export type Estimate = {
  geometry: PoolGeometry;
  lines: EstimateLine[];
  /** null until at least one priced option is picked. */
  low: number | null;
  high: number | null;
  siteVisitItems: { questionId: string; label: string }[];
  /** Ids of shown, unanswered questions. */
  unanswered: string[];
  status: EstimateStatus;
};

/* ------------------------------------------------------------------ */
/* Contractor settings                                                 */
/* ------------------------------------------------------------------ */

/** Per-option override, keyed `${questionId}.${optionId}`. */
export type OptionOverride = {
  enabled?: boolean;
  label?: string;
  note?: string;
  price?: Partial<Price>;
  image?: string;
};

/** A look photo; `thumb` is an optional smaller copy the picker tiles load instead of `src`. */
export type GalleryImage = { src: string; alt: string; caption?: string; thumb?: string };

/** Trades with a template (lib/estimator/registry.ts TEMPLATES). Kitchen slots in here later. */
export type EstimatorTrade = 'pool' | 'bathroom';

export type ContractorEstimatorConfig = {
  /** URL segment, e.g. "pool-masters". */
  slug: string;
  /** Which template + catalog the config is merged onto. Default 'pool'. */
  trade?: EstimatorTrade;
  contractorName: string;
  /** Shown on the page, e.g. "CSLB #1112793". */
  licenseLabel: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  serviceAreaLabel?: string;
  /** Plain-language financing note shown under the result (no payment amounts). */
  financingNote?: string;
  /** Lender disclosure shown with the financing note. */
  financingDisclosure?: string;
  /** The existing homeowner funnel (funnels.slug) leads are filed under. */
  funnelSlug: string;
  /** Booking link shown after the range. */
  calendarUrl?: string;
  /** after_contact: the range appears only after the contact step (prices never reach the browser before it). */
  revealRange: 'after_contact' | 'immediately';
  /**
   * Default of the "Allow optional advertising measurement" checkbox. Mirror the
   * funnel's trackingPixels.consentMode (opt_out = checked by default).
   */
  adMeasurement?: 'opt_in' | 'opt_out';
  pricesConfirmed: boolean;
  minimumJob?: number;
  options?: Record<string, OptionOverride>;
  /** Contractor-added options, appended to the question's options. */
  customOptions?: Record<string, EstimatorOption[]>;
  /** Replaces the template's packages when set. */
  packages?: EstimatorPackage[];
  /** "Which look do you like?" photos (not priced). */
  gallery?: GalleryImage[];
};
