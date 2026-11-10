import type { ContractorEstimatorConfig } from '@/lib/estimator/types';
import { HOMEQUOTE_KITCHEN_FUNNEL } from './homequote-kitchen-funnel';

/**
 * HomeQuote Network's own kitchen funnel (/estimator/kitchen-remodel, + the
 * embed): the bathroom funnel (./homequote-bathroom.ts) for kitchen remodels.
 * HomeQuote is a contractor-matching network, not a contractor: the page never
 * claims a license, years in business or reviews of its own, and says
 * homeowners are connected with a licensed local kitchen contractor for a free
 * in-home consultation. Leads file under the published "kitchen-remodel"
 * funnel (content/funnels/kitchen-remodel.json: any service area, qualified =
 * full remodel + homeowner, unqualifiedAction 'review'), which books a free
 * call on the HomeQuote team calendar (calendarProvider 'homequote'; staff
 * match a contractor later). No calendarUrl, no financing note.
 *
 * Experience 'funnel' only: there is no kitchen builder or configurator
 * (components/estimator/builders has no kitchen adapter, and the trade has no
 * builder meta), so 'builder' would fall back to the plain question list.
 *
 * pricesConfirmed stays false while the template's prices are examples.
 */
export const HOMEQUOTE_KITCHEN_ESTIMATOR: ContractorEstimatorConfig = {
  slug: 'kitchen-remodel',
  trade: 'kitchen',
  contractorName: 'HomeQuote Network',
  // A network: this line describes the service; it is never shown as a license of its own.
  licenseLabel: 'Connects you with licensed local contractors',
  network: true,
  logoUrl: '/brand/homequote-logo-primary-horizontal-tight.png',
  funnelSlug: 'kitchen-remodel',
  calendarProvider: 'homequote',
  revealRange: 'after_contact',
  experience: 'funnel',
  funnel: HOMEQUOTE_KITCHEN_FUNNEL,
  // Mirrors the funnel's trackingPixels.consentMode.
  adMeasurement: 'opt_out',
  pricesConfirmed: false,
  // About the service only: no license, years or reviews of the network's own.
  facts: ['Free in-home consultation', 'No obligation', 'Free to use'],
};
