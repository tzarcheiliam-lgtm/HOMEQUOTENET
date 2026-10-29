import type { Answers } from '../types.ts';

/**
 * One-page configurator ("pick the size, pick the finish, pick the upgrades"),
 * the opt-in alternative to the step-by-step builder
 * (ContractorEstimatorConfig.experience === 'configurator').
 *
 * A spec only maps clicks to the trade template's answers: pricing still runs
 * through computeEstimate on the merged template (lib/estimator/configurator/engine.ts),
 * so the lead route can re-price the same answers server-side. Photos are
 * pre-rendered files: each view resolves the current picks to one image key
 * from a small fixed matrix (no live drawing, no AI render while the homeowner waits).
 *
 * Plain JSON (no functions) so it can be passed from the server page to the client.
 * Ids are a contract with the screens, saved-design URLs and tests: do not rename.
 */

/** A size card ("model"). `answers` sets the size-role, deck-size and shape questions. */
export type ConfiguratorModel = {
  id: string;
  name: string;
  /** One line under the name, e.g. "Room for a spa and loungers". */
  tagline: string;
  /** e.g. "30 × 15 ft". */
  dimensions: string;
  answers: Answers;
};

/** A photo view, shown as a pill tab over the photo. */
export type ConfiguratorView = {
  id: string;
  label: string;
  /**
   * The few picks this view shows. The image key is the view id plus one token
   * per dimension (empty tokens skipped), joined with "-", e.g. "aerial-pavers-spa".
   */
  dimensions: PhotoDimension[];
  /** A real photo used when a variant file is missing (public path). */
  fallback: { src: string; alt: string };
};

/**
 * One visual dimension of a view. Options are checked in order: the first whose
 * `rows` intersects the selected rows wins; an option with `rows: []` is the
 * default and must come last.
 */
export type PhotoDimension = {
  id: string;
  options: { token: string; rows: string[] }[];
};

/**
 * A radio or toggle row. `answers` are the template answers this row adds:
 * in a single group they replace the group's included row; in a multi group the
 * picks are added to whatever the other rows picked.
 */
export type ConfiguratorRow = {
  /** Unique across the whole spec (rows share one id space in the URL). */
  id: string;
  label: string;
  note?: string;
  answers: Answers;
  /** The baseline row of a single group ("Included"). Exactly one per single group. */
  included?: boolean;
  /** Photo view to switch to when picked, when it differs from the group's (e.g. fire bowls -> evening). */
  view?: string;
};

export type ConfiguratorGroup = {
  id: string;
  title: string;
  /** Picking a row in this group switches the photo to this view. Absent: price-only group, the photo stays. */
  view?: string;
  /** single: radio rows with one `included` baseline. multi: optional add-ons, none by default. */
  kind: 'single' | 'multi';
  /** Short line under the title, e.g. "Variable-speed pump and filter included". */
  note?: string;
  rows: ConfiguratorRow[];
};

/** "Go Luxe": a set of upgrade rows sold together for less than the sum of their deltas. */
export type ConfiguratorBundle = {
  id: string;
  label: string;
  /** e.g. "Bundle our 6 signature upgrades and save 10%". */
  headline: string;
  /** Rows the bundle turns on (and locks while it is on). */
  rows: string[];
  /** Discount off the summed row deltas, 0..1 (0.1 = 10%). */
  discountPct: number;
  /** Bullet list for "What's included". */
  includes: string[];
};

export type ConfiguratorPhoto = { src: string; alt: string };

export type ConfiguratorSpec = {
  /** Heading over the options, e.g. "Design your pool". */
  title: string;
  models: ConfiguratorModel[];
  /** Model selected on load. */
  defaultModel: string;
  views: ConfiguratorView[];
  groups: ConfiguratorGroup[];
  bundle?: ConfiguratorBundle;
  /**
   * Template answers every design starts from that no group controls (project,
   * package, scope, always-included items such as a new pump and filter).
   * Together with each single group's `included` row this is what "Included" means.
   */
  baseAnswers: Answers;
  /** Every image key the views can resolve to (tests check the matrix is complete). */
  photos: Record<string, ConfiguratorPhoto>;
  /** Shown once on the page, e.g. "Photos show example designs (AI-assisted), not your yard." */
  photoNote: string;
};

/**
 * What the homeowner picked. `picks` is keyed by group id (single groups hold
 * exactly one row id). With `luxe` on, the bundle's rows count as picked and
 * locked, while `picks` keeps the homeowner's own choices for when it is
 * switched off again.
 */
export type ConfiguratorSelection = {
  model: string;
  picks: Record<string, string[]>;
  luxe: boolean;
};

/** A price range in whole dollars. */
export type Range = { low: number; high: number };
