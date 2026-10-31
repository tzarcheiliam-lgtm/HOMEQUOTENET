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
  /** External booking link (the Calendly fallback); unset on the HomeQuote calendar. */
  calendarUrl?: string;
  /** HomeQuote calendar: the booking ticket the lead route returned (the booking screen books with it). */
  bookingTicket?: string;
  /** For the scheduler prefill (Calendly name / email params). */
  contact: { firstName: string; lastName: string; email: string };
  /**
   * The picks this result was priced for (normalized). The shell only opens the
   * booking step while the current picks equal these; older stored results lack it.
   */
  selection?: FunnelSelection;
  /** false: nothing was saved (an unqualified visitor on a funnel set to 'stop'). */
  saved?: boolean;
  /** Their answer to "Are you the homeowner?" ('no' = not the owner): picks the honest unqualified wording. */
  homeowner?: 'yes' | 'no';
  /** "Send my design to my partner": the signed read-only design page path the lead route returned. */
  shareUrl?: string;
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
  /** These exact picks were already sent: show a link to the estimate instead of asking again (no second lead). */
  onOpenSent?: () => void;
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
