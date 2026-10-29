import type { ComponentType, ReactNode } from 'react';
import type { EstimateInput, EstimatorQuestion, EstimatorTemplate, EstimatorTrade } from '@/lib/estimator/types';
import type { DesignItem, OptionLabeler } from '../builder';

/**
 * The trade adapter: everything the live builder flow needs that differs
 * between trades (pool, bathroom, kitchen next), so estimator-flow.tsx and
 * the scene panel never branch on template.trade themselves. One adapter per
 * trade in this folder; getTradeBuilder(trade) picks it.
 *
 * `Spec` is the trade's picture spec (pool SceneSpec, BathSceneSpec). The
 * flow treats it as opaque and only hands it back to the same adapter.
 */

/** A lighting mode of the picture. The first one in `modes` is the default. */
export type BuilderMode = { id: string; label: string; icon: 'sun' | 'moon' };

/** Props every trade's scene component takes. */
export type TradeSceneProps<Spec> = {
  scene: Spec;
  /** One of the adapter's mode ids. */
  mode: string;
  /** Accessible description (adapter.describe). */
  label: string;
  /** overview = the whole design; close = in close while a closeUpIds question is on screen. */
  focus?: 'overview' | 'close';
  /** First-look build-up animation (played once per visit). */
  intro?: boolean;
  /** A small still copy (no animation). */
  still?: boolean;
  /** The spots that just changed (adapter.highlights), flashed briefly on the picture. */
  highlight?: { key: number; items: readonly unknown[] } | null;
  /** Decorative copy fading out over the homeowner's first picture (the example leaving). */
  leaving?: boolean;
  className?: string;
};

export type HeroCopy = { headline: string; subline: string };

/** Words that name the trade's outcome and its next step, so shared screens never say "pool" for a bathroom. */
export type TradeCopy = {
  /** "pool", "bathroom": "a realistic photo of your pool". */
  subject: string;
  /** First stage of the stepper: "Pool", "Bathroom". */
  stageLabel: string;
  /** Under the live picture, desktop and phones. */
  sceneCaption: string;
  sceneCaptionShort: string;
  /** Under the picture while the realistic photo shows. */
  photoCaption: string;
  /** Under the change chip's option photo: "Like this finished job" (real jobs) or an AI style-idea label. */
  chipPhotoNote: string;
  /** Instead of the picture while it is collapsed on a phone. */
  hiddenNote: string;
  /** "free on-site visit", "free in-home consultation" (no article). */
  visit: string;
  /** Who walks them through the look there: "Your designer", "Your contractor". */
  helper: string;
  /** The booking button: "Book your free on-site consultation". */
  bookLabel: string;
  /** Result: heading over the items a site visit settles, and the line shown when there is no range. */
  siteVisitHeading: string;
  priceOnSite: string;
  /** Without a booking link: who gets in touch. */
  contactLine(contractorName: string): string;
  /** "Save my design" file name and the shared photo's file name. */
  designFile: string;
  photoFile: string;
  shareTitle: string;
  shareDesignText: string;
  sharePhotoText: string;
};

export type ExampleImages = {
  /** Public path of an example design picture made with this builder. */
  illustration: string;
  /** Public path of the photoreal render made from that picture (AI-rendered, labelled as such). */
  photo: string;
  designAlt: string;
  photoAlt: string;
  /** Badge on the photo half of the slider (default EXAMPLE_LABELS.photo). */
  photoLabel?: string;
  /** Caption under the slider (default EXAMPLE_PHOTO_CAPTION). */
  caption?: string;
};

/** A short silent clip of an AI-rendered example (shown with a poster; paused under reduced motion). */
export type ExampleVideo = { mp4?: string; webm?: string; poster: string; alt: string };

/** What the frame shows before the first answer when renders are on (resolved by the page: only files that exist). */
export type ExampleMedia = ({ kind: 'compare' } & ExampleImages) | ({ kind: 'video' } & ExampleVideo);

export interface TradeBuilder<Spec = unknown> {
  trade: EstimatorTrade;
  /** Answers (+ typed dimensions) -> the picture spec. Pure; visible answers only. */
  buildSpec(template: EstimatorTemplate, input: EstimateInput): Spec;
  /** The picture shown before the first answer (always captioned as an example). */
  exampleSpec: Spec;
  Scene: ComponentType<TradeSceneProps<Spec>>;
  /** Exactly two: [default, alternate]. Pool: Day / Night. Bath: Daylight / Evening. */
  modes: readonly [BuilderMode, BuilderMode];
  /**
   * Chip messages for what became visibly different, most exciting first
   * ("Spa added", "Marble shower tile"). `unsure` = question ids answered
   * "help me choose".
   */
  changeMessages(prev: Spec, next: Spec, label: OptionLabeler, unsure?: ReadonlySet<string>): string[];
  /** Short phrase for one option (chips and the preview badge). */
  optionPhrase(questionId: string, optionId: string, label: OptionLabeler): string;
  /** True when the question's options change the picture (hover preview, chips). */
  isVisual(q: Pick<EstimatorQuestion, 'id' | 'role'>): boolean;
  /** The result's "Your design" list. */
  designSummary(spec: Spec, label: OptionLabeler): DesignItem[];
  /** Accessible description of the picture. */
  describe(spec: Spec, label: OptionLabeler): string;
  /** Question ids that move the picture in close. */
  closeUpIds: ReadonlySet<string>;
  /** Spots on the picture to flash after a committed pick (pool: water ripple, tile shimmer). [] for none. */
  highlights(prev: Spec, next: Spec): readonly unknown[];
  /** Options newly switched on, as template option refs (the chip shows that option's photo when it has one). */
  addedOptions(prev: Spec, next: Spec): { questionId: string; optionId: string }[];
  /** Questions whose "help me choose" pick the chip names ("We’ll help you pick a finish"). */
  unsureIds: readonly string[];
  /** Picture for an option tile (a material sample), or null to use the shared rules (photo, swatch). */
  optionVisual?(questionId: string, optionId: string): ReactNode | null;
  /** The frame's scene as a PNG data URL, for "Save my design" and the photoreal render. Browser only. */
  rasterize(frame: HTMLElement): Promise<string>;
  hero: { withRenders: HeroCopy; withoutRenders: HeroCopy };
  copy: TradeCopy;
  /** "Sam, here’s your freeform pool" / "Sam, here’s your walk-in shower bathroom". */
  resultHeading(firstName: string, items: readonly DesignItem[], spec: Spec): string;
  /** Example design + its photo for the before-first-answer split; null until the trade has them. */
  exampleImages: ExampleImages | null;
  /** An AI-rendered example clip, used when the example pair is not there. */
  exampleVideo: ExampleVideo | null;
  /** What the photoreal render shows, for copy and the server prompt: "backyard pool", "bathroom". */
  renderSubject: string;
}
