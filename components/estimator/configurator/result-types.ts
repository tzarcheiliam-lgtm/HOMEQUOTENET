import type { ConfiguratorSelection, ConfiguratorSpec } from '@/lib/estimator/configurator/types';
import type { Answers, ContractorEstimatorConfig, EstimatorTemplate } from '@/lib/estimator/types';
import type { StagePhoto } from './photos';
import type { CostBreakdown } from './state';

/** The current photo of one view (result page gallery, lead payload). */
export type ViewPhoto = StagePhoto & { view: string; label: string };

/**
 * What the configurator hands the booking step (booking.tsx): the design, the
 * template answers the lead route re-prices, the figures the page showed and
 * the photos. The booking step asks for contact details (name, phone, email,
 * ZIP, consent as the old flow), posts the lead and then offers the calendar.
 */
export type ConfiguratorBookingProps = {
  slug: string;
  contractor: ContractorEstimatorConfig;
  /** The template the page priced with (publicTemplate; revealRange 'immediately' keeps prices). */
  template: EstimatorTemplate;
  spec: ConfiguratorSpec;
  selection: ConfiguratorSelection;
  /** selectionToAnswers(spec, selection): send these as the lead's `answers` (property questions are not asked here). */
  answers: Answers;
  /** Base, Go Luxe, upgrades, total (breakdown.total) and the raw estimate (breakdown.quote.estimate). */
  breakdown: CostBreakdown;
  /** The design's photo in every view (key, src, alt), current view first. */
  photos: ViewPhoto[];
  /** Absolute link to this exact design ("Save your design"). */
  designUrl: string;
  /** Frame mode (iframe on the contractor's site): open the calendar in a new tab. */
  embedded?: boolean;
  /** Called once the lead is saved (the page marks "Send your design" done). */
  onSent?: () => void;
};
