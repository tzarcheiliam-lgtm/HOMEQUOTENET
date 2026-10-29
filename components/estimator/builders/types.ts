import type { ComponentType } from 'react';
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
  className?: string;
};

export type HeroCopy = { headline: string; subline: string };

export type ExampleImages = {
  /** Public path of an example design picture made with this builder. */
  illustration: string;
  /** Public path of the photoreal render made from that picture (AI-rendered, labelled as such). */
  photo: string;
  designAlt: string;
  photoAlt: string;
};

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
  hero: { withRenders: HeroCopy; withoutRenders: HeroCopy };
  /** "Sam, here's your freeform pool" / "Sam, here's your new bathroom". */
  resultHeading(firstName: string, items: readonly DesignItem[]): string;
  /** Example design + its photo for the before-first-answer split; null until the trade has them. */
  exampleImages: ExampleImages | null;
  /** What the photoreal render shows, for copy and the server prompt: "backyard pool", "bathroom". */
  renderSubject: string;
}
