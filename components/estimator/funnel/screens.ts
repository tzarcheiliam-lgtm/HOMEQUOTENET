import type { FunnelSelection, FunnelSpec } from '@/lib/estimator/funnel/types';
import type { ContractorEstimatorConfig, Estimate, EstimatorTemplate } from '@/lib/estimator/types';

/*
 * The contract between the funnel shell (components/estimator/funnel/funnel.tsx)
 * and the contact and booking screens (components/estimator/funnel/contact/**
 * and components/estimator/funnel/booking/**).
 *
 * The shell draws the page chrome: the logo bar, "LAST STEP" with its bar and
 * back arrow (contact), the footer, the transition between screens, the URL
 * (?step=contact / ?step=book) and the sessionStorage copy. A screen draws
 * only its content column, from its heading down (the column is already
 * centred and padded: 32 px side gutters on phones, 560 px wide on desktop).
 */

/** What the lead route answered, kept by the shell (sessionStorage) so the booking step survives a refresh. */
export type FunnelLeadResult = {
  /** Server-computed; the booking step shows its range. */
  estimate: Estimate;
  /** false for renters / out-of-area ZIPs (the lead is still saved for review). */
  qualified: boolean;
  calendarUrl?: string;
  /** For the scheduler prefill (Calendly name / email params). */
  contact: { firstName: string; lastName: string; email: string };
};

export type FunnelContactScreenProps = {
  slug: string;
  spec: FunnelSpec;
  contractor: ContractorEstimatorConfig;
  /** publicTemplate(...): with revealRange 'after_contact' it carries no prices. */
  template: EstimatorTemplate;
  /** The three picks (normalized). */
  selection: FunnelSelection;
  embedded: boolean;
  /** Id of the heading the shell moves focus to when the screen opens. */
  headingId: string;
  /** The lead went through: the shell stores the result and opens the booking step. */
  onDone: (result: FunnelLeadResult) => void;
};

export type FunnelBookingScreenProps = {
  slug: string;
  spec: FunnelSpec;
  contractor: ContractorEstimatorConfig;
  template: EstimatorTemplate;
  selection: FunnelSelection;
  result: FunnelLeadResult;
  embedded: boolean;
  headingId: string;
};
