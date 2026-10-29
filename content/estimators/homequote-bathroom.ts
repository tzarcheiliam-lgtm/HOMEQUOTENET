import type { ContractorEstimatorConfig } from '@/lib/estimator/types';
import { BATH_GALLERY, BATH_OPTION_IMAGES } from './homequote-bathroom-photos';

/**
 * HomeQuote Network's own instant bathroom builder (/estimator/bathroom-remodel).
 * HomeQuote is a contractor-matching network, not a contractor: the page never
 * claims a license, years in business or reviews of its own, and says
 * homeowners are connected with a licensed local bathroom contractor for a free
 * in-home consultation. Leads file under the published "bathroom-remodel"
 * funnel (content/funnels/bathroom-remodel.json), which takes any service area
 * and has no booking link, so there is no calendarUrl and no financing note.
 *
 * pricesConfirmed stays false while the template's prices are examples.
 */
export const HOMEQUOTE_BATHROOM_ESTIMATOR: ContractorEstimatorConfig = {
  slug: 'bathroom-remodel',
  trade: 'bathroom',
  contractorName: 'HomeQuote Network',
  // Truthful for a network: the license belongs to the matched contractor.
  licenseLabel: 'Licensed local contractors',
  logoUrl: '/images/brand/homequote-network-logo.webp',
  funnelSlug: 'bathroom-remodel',
  revealRange: 'after_contact',
  // Mirrors the funnel's trackingPixels.consentMode.
  adMeasurement: 'opt_out',
  pricesConfirmed: false,
  // About the service only: no license, years or reviews of the network's own.
  facts: ['Free in-home consultation', 'Licensed local contractors', 'No obligation'],
  // AI-generated style ideas (labelled as such), never presented as finished jobs.
  options: Object.fromEntries(Object.entries(BATH_OPTION_IMAGES).map(([key, image]) => [key, { image }])),
  gallery: BATH_GALLERY,
};
