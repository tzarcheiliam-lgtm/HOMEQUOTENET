import type { ContractorEstimatorConfig } from '@/lib/estimator/types';
import { POOL_MASTERS_CONFIGURATOR } from './pool-masters-configurator';
import { POOL_MASTERS_FUNNEL } from './pool-masters-funnel';
import { POOL_MASTERS_GALLERY, POOL_MASTERS_OPTION_IMAGES } from './pool-masters-photos';

/**
 * Pool Masters LA's settings for the instant pool estimator: who they are, where
 * leads go and which photos show. This is the only file with Pool Masters
 * specifics; the template and catalog stay generic.
 *
 * pricesConfirmed stays false until the owner replaces the example prices (see
 * docs/pool-estimator.md). Flip it here, with any price overrides in `options`.
 */
export const POOL_MASTERS_ESTIMATOR: ContractorEstimatorConfig = {
  slug: 'pool-masters',
  contractorName: 'Pool Masters LA',
  licenseLabel: 'CSLB #1112793',
  phone: '(818) 643-6888',
  website: 'https://poolmastersla.com',
  logoUrl: '/images/brand/poolmasters-logo.png',
  // From the brochure; the funnel's qualification gate (content/funnels/clients/pool-masters-la.json
  // zipPrefixes) covers the same five counties.
  serviceAreaLabel: 'Los Angeles, Orange, Ventura, Riverside and San Bernardino counties',
  financingNote: 'Financing is available through third-party lenders, including Lyon Financial. Ask about it during your free on-site estimate.',
  financingDisclosure:
    'Financing is provided by third-party lenders, including Lyon Financial, and is subject to credit approval. Pool Masters LA is not a lender and does not make credit decisions, set rates, or guarantee approval. All financing terms, rates and monthly payments are determined by the lender based on your application.',
  funnelSlug: 'pool-masters',
  // Same booking link as content/funnels/clients/pool-masters-la.json.
  calendarUrl: 'https://calendly.com/homequotenetwork/30min',
  // The simple mobile funnel (landing, three taps, contact, then the range and booking):
  // prices never reach the browser before the contact step. The one-page
  // configurator spec stays attached (the funnel reuses its rows and photos).
  revealRange: 'after_contact',
  experience: 'funnel',
  funnel: POOL_MASTERS_FUNNEL,
  configurator: POOL_MASTERS_CONFIGURATOR,
  // Mirrors the funnel's trackingPixels.consentMode.
  adMeasurement: 'opt_out',
  pricesConfirmed: false,
  options: Object.fromEntries(Object.entries(POOL_MASTERS_OPTION_IMAGES).map(([key, image]) => [key, { image }])),
  gallery: POOL_MASTERS_GALLERY,
  // From the brochure (V3): licensed & insured, serving SoCal since 2010, complimentary on-site estimates.
  facts: ['Licensed & insured', 'Serving SoCal since 2010', 'Free on-site estimate'],
};
