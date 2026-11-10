import type { ContractorEstimatorConfig } from '@/lib/estimator/types';
import { HOMEQUOTE_ROOFING_FUNNEL } from './homequote-roofing-funnel';

/**
 * HomeQuote Network's roof replacement funnel (/estimator/roofing, + the
 * embed): the kitchen funnel's shape (./homequote-kitchen.ts) with the address
 * first and the roof measured from above (lib/estimator/roofing). A network,
 * not a contractor: no licence, years or reviews of its own; homeowners are
 * connected with a licensed local roofer for a free inspection.
 *
 * Leads file under the "roof-replacement" funnel
 * (content/funnels/roof-replacement.json, in lib/funnels/presets.ts): an admin
 * adds it as a draft from /app/funnels ("Add house funnels") and publishes it;
 * until then the lead route answers "We can’t take requests online for a
 * moment". It books a free call on the HomeQuote team calendar
 * (calendarProvider 'homequote'). No financing note.
 *
 * pricesConfirmed stays false while the prices are examples.
 */
export const HOMEQUOTE_ROOFING_ESTIMATOR: ContractorEstimatorConfig = {
  slug: 'roofing',
  trade: 'roofing',
  contractorName: 'HomeQuote Network',
  licenseLabel: 'Connects you with licensed local contractors',
  network: true,
  logoUrl: '/brand/homequote-logo-primary-horizontal-tight.png',
  funnelSlug: 'roof-replacement',
  calendarProvider: 'homequote',
  revealRange: 'after_contact',
  experience: 'funnel',
  funnel: HOMEQUOTE_ROOFING_FUNNEL,
  adMeasurement: 'opt_out',
  pricesConfirmed: false,
  facts: ['Free roof inspection', 'No obligation', 'Free to use'],
};
