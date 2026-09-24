import type { IndustryPage } from '@/content/types';
import { roofingPhotos as p, stockImageryDisclosure } from '@/content/industry-photos';
import { bookingSteps, coreReasons, coreFaq } from './shared';

/** /roofing */
export const roofingIndustry: IndustryPage = {
  key: 'roofing',
  slug: 'roofing',
  navLabel: 'Roofing',
  cardDescription: 'Replacements, repairs, tile, shingle and flat roofing estimates.',
  trade: 'roofing',
  audience: 'roofing companies',

  hero: {
    eyebrow: 'For Southern California roofing companies',
    headline: 'Booked Roofing Appointments in Your Service Area.',
    subheadline:
      'HomeQuote helps roofing companies generate homeowner inquiries, follow up quickly, and book qualified estimates onto your calendar.',
    support:
      'Replacements, repairs and inspections, filtered to the roof types and areas you serve. You pay per qualified booked appointment.',
  },

  cta: 'Get More Roofing Appointments',

  pains: {
    title: 'In roofing, the first company to book the inspection usually wins it.',
    lead: 'Homeowners rarely call one roofer. Whoever responds, qualifies and gets a time on the calendar first is in the strongest position.',
    items: [
      {
        title: 'Shared roofing leads',
        description:
          'The same homeowner sold to several roofers turns every lead into a race to the phone.',
      },
      {
        title: 'Storm-chasing competition',
        description:
          'Out-of-area crews flood the market after weather and undercut local companies that are still there next year.',
      },
      {
        title: 'Homeowners collecting several estimates',
        description:
          'Roof replacements are shopped. A booked inspection is worth far more than a name on a list.',
      },
      {
        title: 'Slow response kills conversion',
        description:
          'A homeowner with a leak does not wait. If nobody reaches them quickly, the next roofer will.',
      },
      {
        title: 'Reps wasting time on dead leads',
        description:
          'Sales reps should be on roofs and in kitchens presenting estimates, not redialing numbers that never pick up.',
      },
    ],
  },

  steps: bookingSteps({
    demand: 'roof replacement, repair and inspections',
    details: 'roof type, age, the problem they are seeing and timing',
  }),

  services: {
    lead: 'Choose the roofing work you want. Inquiries outside these categories or your area are filtered out.',
    items: [
      { title: 'Roof Replacement', description: 'Full tear-off and re-roof projects.', icon: 'house' },
      { title: 'Roof Repair', description: 'Damaged, missing or failing sections.', icon: 'wrench' },
      { title: 'Shingle Roofing', description: 'Asphalt and composition shingle roofs.', icon: 'layers' },
      { title: 'Tile Roofing', description: 'Clay and concrete tile, re-roof and underlayment.', icon: 'grid' },
      { title: 'Flat Roofing', description: 'Low-slope and flat roof systems.', icon: 'squareStack' },
      { title: 'Leak Repair', description: 'Active leaks and water intrusion.', icon: 'droplets' },
      { title: 'Commercial Roofing', description: 'Light commercial work, if it is part of your agreement.', icon: 'building' },
      { title: 'Inspections & Estimates', description: 'Homeowners asking for an assessment and a quote.', icon: 'clipboardCheck' },
    ],
  },

  appointmentNote:
    'Instead of handing a roofer another phone number, the goal is to put an estimate request onto their calendar, with the roof type and the problem already noted.',

  reasons: [
    {
      title: 'Built for speed-to-lead',
      description:
        'Inquiries are worked as they arrive, so a homeowner comparing roofers hears from someone quickly.',
    },
    {
      title: 'Your area, not the whole region',
      description:
        'Appointments are filtered to the cities and ZIP codes you actually drive to.',
    },
    ...coreReasons,
  ],

  faq: [
    {
      question: 'What roofing projects can I target?',
      answer:
        'Roof replacement, repair, shingle, tile and flat roofing, leak repair, inspection and estimate requests, and light commercial work if it is part of your agreement. You choose the categories, and appointments are booked only for those.',
    },
    {
      question: 'Do you book insurance-claim or storm jobs?',
      answer:
        'We book homeowners asking about the roofing services you have chosen. We do not handle insurance claims or paperwork. Whether you want inquiries that mention storm damage or a claim is set as part of your filters.',
    },
    ...coreFaq('roofing', 'roof replacement, repair and inspections'),
  ],

  imagery: {
    hero: p.hero,
    heroPosition: 'object-[60%_55%] md:object-[70%_60%]',
    gallery: [p.tileDetail, p.install, p.shingleHome],
    disclosure: stockImageryDisclosure,
  },

  seo: {
    title: 'Roofing Lead Generation & Booked Roofing Estimates',
    description:
      'HomeQuote Network generates, qualifies and books homeowners asking for roof replacement, repair and inspections onto roofing companies’ calendars. Pay per qualified booked appointment.',
    ogHeadline: 'Booked Roofing Appointments',
    ogSubline: 'Estimates on your calendar, not phone numbers',
  },
};
