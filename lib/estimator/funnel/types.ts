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
  | { kind: 'view'; view: string }
  /**
   * matrix: one photo per option of THIS step AND the pick of another step
   * (`stepId`, earlier or later; its default while it has no pick), e.g. the
   * bathroom's "Choose your layout." photo per layout and finish:
   * photos[optionId][otherPick]. Key "<stepId>-<optionId>-<otherPick>".
   */
  | { kind: 'matrix'; stepId: string; photos: Record<string, Record<string, FunnelPhoto>> };

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
  /**
   * How the photo fills the card: 'cover' (room photos) or 'contain' (plan
   * drawings on white, zoomed in a little). Default: 'cover' for view and
   * matrix rules, 'contain' for option rules. Fallback photos always cover.
   */
  photoFit?: 'cover' | 'contain';
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
  /** Shown instead of heroPhoto when the server finds its file missing (e.g. a photo not generated yet). */
  heroFallback?: { src: string; srcSm?: string; alt: string };
  /**
   * The logo's width / height (default 2.38, the Pool Masters mark) and, for a
   * round badge too small to read in the header, a wordmark set next to it.
   */
  logo?: { aspect?: number; wordmark?: string };
  /** Line under "Recent {name} projects" (only with projects). Default: "Real backyards we remodeled, photographed as built." */
  projectsNote?: string;
  /** Optional, below the fold: a few real finished jobs (never AI-edited). */
  projects?: GalleryImage[];
  /** Optional: a few of the contractor's real 5-star Google reviews under the button (lib/estimator/reviews.ts). */
  reviews?: FunnelReviewsConfig;
};

/**
 * Google reviews under the landing's button. Only 5-star reviews with text are
 * shown, never the average rating or the review count, under a heading that
 * does not claim to be all the reviews (FTC 16 CFR 465). Nothing renders when
 * GOOGLE_PLACES_API_KEY is missing, Google fails or no review qualifies.
 */
export type FunnelReviewsConfig = {
  enabled: boolean;
  /** The business's Google place id. Preferred: when set, no lookup is made. */
  googlePlaceId?: string;
  /** Without a place id: a Text Search whose result must match strictly (else nothing shows). */
  lookup?: GoogleBusinessMatch;
  /** e.g. "What Pool Masters customers say". Default: "What {contractorName} customers say". */
  heading?: string;
  /** Reviews shown, newest first (default 3, at most 5: Google returns up to 5). */
  max?: number;
};

/** How a Text Search result is recognised as this business (out-of-state namesakes are rejected). */
export type GoogleBusinessMatch = {
  /** e.g. "Pool Masters Sherman Oaks CA". */
  query: string;
  /** Words the Google name must contain, e.g. "Pool Masters". */
  name: string;
  /** The business's website host, e.g. "poolmastersla.com" (a match on its own, with the name). */
  websiteHost?: string;
  /** Two-letter state the address must be in when Google gives one, e.g. "CA". */
  state?: string;
  /** Cities / neighbourhoods that count as a match, e.g. ["Sherman Oaks"]. */
  places?: string[];
  /** ZIP codes that count as a match, e.g. ["91403", "91423"]. */
  postalCodes?: string[];
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
  /** Instead of a range when nothing priced was picked. Default: "Priced at your free on-site visit". */
  noRangeText?: string;
  /**
   * Qualified without a calendar to book on: what happens next. Default: "We’ll call you
   * within one business day to talk through it and set up your free on-site estimate."
   */
  followUpText?: string;
  /**
   * Not the homeowner, saved for review: `{name}` is the contractor's name. Default: "We book
   * on-site estimates online with homeowners. Your details are saved, and the {name} team
   * will review them before we can confirm a fit."
   */
  reviewText?: string;
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
  /**
   * Meta description of the /design page; `{noun}` = the template's projectNoun, `{name}` = the
   * contractor. Default: "Three quick picks, then a ballpark price for your {noun} from {name} and a free on-site estimate."
   */
  designDescription?: string;
};

/** What the homeowner picked: option id per step id (steps not shown on this path have no entry). */
export type FunnelSelection = Record<string, string>;
