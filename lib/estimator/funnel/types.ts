import type { ConfiguratorSpec } from '../configurator/types.ts';
import type { Answers, GalleryImage } from '../types.ts';
import type { ExampleFinancing } from '../demo-financing.ts';

/**
 * The simple mobile funnel (ContractorEstimatorConfig.experience === 'funnel'):
 * a landing page, then one question per screen ("Select your pool size.",
 * "Choose your finish.", "Add the extras.", then follow-up steps only when
 * a pick asks for them, e.g. "Choose your spa."), each with a photo on top that
 * swaps with the selected option, then the contact step (the range is revealed
 * only after it) and the booking step.
 *
 * A spec only maps taps to the trade template's answers. When `configurator`
 * is set (pool), options pick configurator models and rows and pricing reuses
 * the configurator mapping (selectionToAnswers / estimateSelection, never the
 * Go Luxe bundle); without it (e.g. a future bathroom or kitchen funnel),
 * options carry template answers directly. Either way the result goes through
 * computeEstimate on the merged template, so the lead route can re-price it.
 *
 * Plain JSON (no functions) so it can be passed from the server page to the
 * client. Step and option ids are a contract with the URL (?step=...&size=...),
 * sessionStorage, the lead route and the tests: do not rename.
 */

/** A photo shown above a step's question. `srcSm` is the smaller copy for phones (srcset). */
/** Pixel widths of `srcSm` and `src`, for the srcset. Default 1200 / 1800 (the configurator files). */
export type FunnelPhotoWidths = { sm: number; full: number };

export type FunnelPhoto = {
  src: string;
  srcSm?: string;
  widths?: FunnelPhotoWidths;
  alt: string;
  /** Used when `src` is missing (e.g. a plan image not made yet): the screen swaps to it on error. */
  fallback?: { src: string; srcSm?: string; alt: string };
};

/**
 * Which photo a step shows, declaratively:
 * - option: one photo per option id of THIS step (the selected option's photo).
 * - view:   a configurator view (lib/estimator/configurator) resolved from the
 *           whole funnel selection, e.g. 'aerial' -> "aerial-porcelain-pebble-spa".
 *           Needs FunnelSpec.configurator.
 */
export type FunnelPhotoRule =
  | { kind: 'option'; photos: Record<string, FunnelPhoto> }
  | { kind: 'view'; view: string };

export type FunnelOption = {
  /** Unique within the step; used in the URL and sessionStorage. */
  id: string;
  /** e.g. "Classic". */
  title: string;
  /** One grey line, e.g. "About 30 × 15 ft". */
  subtitle: string;
  /**
   * Shorter title for the one-line recap on the price card, e.g. "Full backyard". Default: title.
   * '' leaves the pick out of the recap (e.g. "Add a spa" when the spa step's pick says it).
   */
  short?: string;
  /** Configurator model id this option selects (needs FunnelSpec.configurator). */
  model?: string;
  /** Configurator row ids this option turns on (needs FunnelSpec.configurator). */
  rows?: string[];
  /**
   * Template answers laid over the top (each replaces the question it names),
   * after the configurator mapping. Without a configurator this is the
   * option's whole mapping.
   */
  answers?: Answers;
  /** Template answers ADDED to what the mapping already picked (a multi question keeps its other picks), e.g. one more backyard extra. */
  addAnswers?: Answers;
};

export type FunnelStep = {
  /** e.g. "size". Also the URL param name for the step's pick. */
  id: string;
  /** The one question, e.g. "Select your pool size." */
  label: string;
  options: FunnelOption[];
  /** Option selected when the step is first shown. Default: the first option. */
  defaultOption?: string;
  photo: FunnelPhotoRule;
  /** Primary button text. Default "Continue" (FunnelSpec.finalCta on whichever step is last on the path). */
  cta?: string;
  /**
   * A follow-up step: shown only when an EARLIER step's pick is one of `anyOf`
   * (e.g. "Choose your spa." after "Add a spa"). Hidden steps have no pick in
   * the selection, are not counted in "STEP n OF m" and price nothing.
   */
  showWhen?: { stepId: string; anyOf: string[] };
};

export type FunnelLanding = {
  /** Dark announcement bar text (dismissible), e.g. the service area. */
  announcement: string;
  /** Huge centred headline, at most two short lines on a phone. */
  headline: string;
  subline: string;
  /** Primary button, e.g. "Design your pool". */
  cta: string;
  heroPhoto: { src: string; srcSm?: string };
  heroAlt: string;
  /** Optional, below the fold: a few real finished jobs (never AI-edited). */
  projects?: GalleryImage[];
};

export type FunnelContactStep = {
  /** Small caps label above the heading, e.g. "LAST STEP". */
  eyebrow: string;
  /** e.g. "Your estimate is ready." */
  headline: string;
  /** Second (grey) line, e.g. "Where should we send it?" */
  subline: string;
  /** Submit button, e.g. "Get my estimate". */
  cta: string;
  /**
   * The ownership question under the address, e.g. "Are you the homeowner?"
   * with "Yes" / "No" (the lead's homeowner yes / no).
   * Always asked: the lead funnel's qualification rules read it, so it is never
   * assumed. The address (Google suggestions when GOOGLE_PLACES_API_KEY is set)
   * is always asked too: its ZIP gates the service area.
   */
  homeowner: { label: string; yes: string; no: string };
  /** Trust line under the button; only truthful facts (no reviews or ratings unless real and published). */
  trustLine: string;
};

export type FunnelBookingStep = {
  /** e.g. "Book your free consultation". */
  headline: string;
  /** Small caps over the range; `{options}` is replaced with the picked options' short titles (or titles) joined by " · ". */
  priceEyebrow: string;
  /** Line under the range, e.g. "Ballpark, not a quote: ...". */
  priceNote: string;
  /** Short financing line shown with a "See details" toggle (the contractor's financingDisclosure); no payment amounts. */
  financingLabel?: string;
  /**
   * DEMO ONLY: example terms for "or from $649/mo*" under the range, shown
   * only with ?demo=financing (lib/estimator/demo-financing.ts). Replace with
   * the lender's real terms before ever showing it without the flag.
   */
  exampleFinancing?: ExampleFinancing;
  /** Heading of the booking card above the scheduler. */
  bookingTitle: string;
  /** e.g. "Prefer to talk now? Call". The contractor's phone follows. */
  callPrompt?: string;
};

export type FunnelSpec = {
  landing: FunnelLanding;
  /** One question per screen, in order ("STEP n OF m", m = the steps shown on this path, see showWhen). */
  steps: FunnelStep[];
  /** Button of the last step shown on the path, e.g. "Get my estimate". Default: that step's cta, else "Continue". */
  finalCta?: string;
  /**
   * Configurator group ids whose lines the lead summary leaves out because the
   * steps say it better (the steps' own lines name the real picks, e.g. the
   * coping or the kind of spa the configurator rows only approximate).
   */
  summaryReplacesGroups?: string[];
  contactStep: FunnelContactStep;
  bookingStep: FunnelBookingStep;
  /**
   * The configurator whose models, rows and photo views the options use (pool).
   * Its Go Luxe bundle is never applied by the funnel.
   */
  configurator?: ConfiguratorSpec;
  /** Template answers every design starts from when there is no configurator (it has its own baseAnswers). */
  baseAnswers?: Answers;
  /** One quiet line in the page footer (and under the embed's column): photos are example designs. Never on a photo. */
  photoNote?: string;
};

/** What the homeowner picked: option id per step id (steps not shown on this path have no entry). */
export type FunnelSelection = Record<string, string>;
