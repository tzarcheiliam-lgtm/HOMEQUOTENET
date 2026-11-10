import type { ContractorEstimatorConfig } from '@/lib/estimator/types';
import { HOMEQUOTE_ADU_FUNNEL } from './homequote-adu-funnel';

/**
 * HomeQuote Network's own ADU funnel (/estimator/adu, + the embed): the
 * kitchen funnel (./homequote-kitchen.ts) for ADUs. HomeQuote is a
 * contractor-matching network, not a builder: the page never claims a
 * license, years in business or reviews of its own, and says homeowners are
 * connected with a licensed local ADU builder for a free consultation. Leads
 * file under the published "adu" funnel (content/funnels/adu.json: any service
 * area, qualified = detached / attached / garage conversion + homeowner,
 * unqualifiedAction 'review'), which books a free call on the HomeQuote team
 * calendar (calendarProvider 'homequote'; staff match a builder later).
 *
 * Experience 'funnel' only (no ADU builder). pricesConfirmed stays false: the
 * prices are lib/adu/pricing-config.ts's, examples until a builder confirms them.
 */
export const HOMEQUOTE_ADU_ESTIMATOR: ContractorEstimatorConfig = {
  slug: 'adu',
  trade: 'adu',
  contractorName: 'HomeQuote Network',
  // A network: this line describes the service; it is never shown as a license of its own.
  licenseLabel: 'Connects you with licensed local builders',
  network: true,
  logoUrl: '/brand/homequote-logo-primary-horizontal-tight.png',
  funnelSlug: 'adu',
  calendarProvider: 'homequote',
  revealRange: 'after_contact',
  experience: 'funnel',
  funnel: HOMEQUOTE_ADU_FUNNEL,
  // Mirrors the funnel's trackingPixels.consentMode.
  adMeasurement: 'opt_out',
  pricesConfirmed: false,
  facts: ['Free consultation', 'No obligation', 'Free to use'],
};
