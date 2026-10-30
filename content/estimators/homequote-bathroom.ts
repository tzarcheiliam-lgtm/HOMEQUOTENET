import type { ContractorEstimatorConfig } from '@/lib/estimator/types';
import { HOMEQUOTE_BATHROOM_FUNNEL } from './homequote-bathroom-funnel';
import { BATH_GALLERY, BATH_OPTION_IMAGES } from './homequote-bathroom-photos';

/**
 * HomeQuote Network's own instant bathroom builder (/estimator/bathroom-remodel).
 * HomeQuote is a contractor-matching network, not a contractor: the page never
 * claims a license, years in business or reviews of its own, and says
 * homeowners are connected with a licensed local bathroom contractor for a free
 * in-home consultation. Leads file under the published "bathroom-remodel"
 * funnel (content/funnels/bathroom-remodel.json), which takes any service area.
 * That funnel books a free call on the HomeQuote team calendar (project
 * specialists; staff match a contractor later): the result screen shows the
 * slot picker (calendarProvider 'homequote'). No calendarUrl, no financing note.
 *
 * Experience 'funnel' (2026-10-29): the simple mobile funnel of Pool Masters
 * for bathrooms (./homequote-bathroom-funnel.ts): landing, three taps plus the
 * follow-ups that apply, contact, then the range and the booking. The instant
 * builder's code stays (components/estimator/builders/bath.tsx); set
 * experience back to 'builder' to serve it here again.
 *
 * pricesConfirmed stays false while the template's prices are examples.
 */
export const HOMEQUOTE_BATHROOM_ESTIMATOR: ContractorEstimatorConfig = {
  slug: 'bathroom-remodel',
  trade: 'bathroom',
  contractorName: 'HomeQuote Network',
  // A network: this line describes the service; it is never shown as a license of its own.
  licenseLabel: 'Connects you with licensed local contractors',
  network: true,
  logoUrl: '/brand/homequote-logo-primary-horizontal-tight.png',
  funnelSlug: 'bathroom-remodel',
  calendarProvider: 'homequote',
  revealRange: 'after_contact',
  experience: 'funnel',
  funnel: HOMEQUOTE_BATHROOM_FUNNEL,
  // Mirrors the funnel's trackingPixels.consentMode.
  adMeasurement: 'opt_out',
  pricesConfirmed: false,
  // About the service only: no license, years or reviews of the network's own.
  // (The licensed-contractor line is in the header already.)
  facts: ['Free in-home consultation', 'No obligation', 'Free to use'],
  // AI-generated style ideas (labelled as such), never presented as finished jobs.
  options: {
    ...Object.fromEntries(Object.entries(BATH_OPTION_IMAGES).map(([key, image]) => [key, { image }])),
    // The funnel's "Floating double vanity" (from the catalog; the vanity question has room for a fourth option).
    'vanity.floating_double': { enabled: true },
  },
  gallery: BATH_GALLERY,
};
