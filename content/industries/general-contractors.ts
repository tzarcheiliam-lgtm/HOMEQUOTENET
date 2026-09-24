import type { IndustryPage } from '@/content/types';
import { generalContractorPhotos as p, stockImageryDisclosure } from '@/content/industry-photos';
import { bookingSteps, coreReasons, coreFaq } from './shared';

/** /general-contractors */
export const generalContractorsIndustry: IndustryPage = {
  key: 'general-contractors',
  slug: 'general-contractors',
  navLabel: 'General Contractors',
  cardDescription: 'Kitchens, baths, additions, ADUs and whole-home remodels.',
  trade: 'remodeling',
  audience: 'general contractors',

  hero: {
    eyebrow: 'For Southern California general contractors and remodelers',
    headline: 'More Remodeling Projects. Less Time Chasing Leads.',
    subheadline:
      'HomeQuote helps general contractors connect with homeowners looking for serious remodeling and construction work, then books them onto your calendar.',
    support:
      'You set the project types and minimum job size. We screen out the small stuff and the not-yet-ready, and you pay per qualified booked appointment.',
  },

  cta: 'Get More Remodeling Appointments',

  pains: {
    title: 'The inquiries come in. The right projects don’t.',
    lead: 'Remodeling demand is real, but most of what reaches a general contractor is too small, too early or too vague to be worth a site visit.',
    items: [
      {
        title: 'Too many low-budget inquiries',
        description:
          'Handyman-sized requests and price shoppers take the same time to answer as a kitchen or an addition.',
      },
      {
        title: 'Homeowners not ready to start',
        description:
          '“Just getting ideas” is fine for them and expensive for you when it takes a walkthrough to find out.',
      },
      {
        title: 'Time lost qualifying small jobs',
        description:
          'Every call spent working out budget, scope and timing on a job you would never take is time off a real project.',
      },
      {
        title: 'An inconsistent pipeline',
        description:
          'Referrals come in waves. A remodeling business needs a steady run of estimates, not feast and famine.',
      },
      {
        title: 'Big opportunities with weak follow-up',
        description:
          'Large remodels take longer to decide. Without consistent follow-up, the expensive ones quietly go to someone else.',
      },
    ],
  },

  steps: bookingSteps({
    demand: 'kitchen, bath, addition and whole-home remodeling',
    details: 'project type, scope, budget range and timing',
  }),

  services: {
    lead: 'Choose the work you want more of. Inquiries below your minimum job size or outside these categories are filtered out.',
    items: [
      { title: 'Whole Home Remodeling', description: 'Multi-room and full-interior renovations.', icon: 'house' },
      { title: 'Kitchen Remodeling', description: 'Layout changes, cabinetry, counters and full rebuilds.', icon: 'chefHat' },
      { title: 'Bathroom Remodeling', description: 'Primary suites, guest baths and full gut renovations.', icon: 'bath' },
      { title: 'Additions', description: 'Room additions and second-storey builds.', icon: 'building' },
      { title: 'ADUs', description: 'Detached and attached accessory dwelling units.', icon: 'warehouse' },
      { title: 'Garage Conversions', description: 'Garages turned into living space or ADUs.', icon: 'doorOpen' },
      { title: 'Flooring', description: 'Whole-home flooring as part of a larger remodel.', icon: 'grid' },
      { title: 'Exterior Renovations', description: 'Siding, windows, facades and entry upgrades.', icon: 'hammer' },
      { title: 'Outdoor Living', description: 'Patios, covers and outdoor kitchens.', icon: 'trees' },
      { title: 'Structural Remodeling', description: 'Wall removals, beams and structural changes.', icon: 'construction' },
    ],
  },

  appointmentNote:
    'Large remodels take longer to decide. HomeQuote keeps following up while the homeowner works out scope and timing, and books the walkthrough when they are ready.',

  reasons: [
    {
      title: 'Minimum job size, enforced',
      description:
        'Tell us the smallest project worth a walkthrough. Inquiries below it are screened out before anything is booked.',
    },
    {
      title: 'Timing asked up front',
      description:
        'Homeowners are asked when they want to start, so a “maybe next year” is handled before it reaches your calendar.',
    },
    ...coreReasons,
  ],

  faq: [
    {
      question: 'What types of remodeling projects can I target?',
      answer:
        'Whole-home remodels, kitchens, bathrooms, additions, ADUs, garage conversions, flooring as part of a larger job, exterior renovations, outdoor living and structural work. You choose which, and appointments are booked only for those.',
    },
    {
      question: 'Can I set a minimum project size?',
      answer:
        'Yes. You tell us the smallest project you want in the application, and it becomes part of the qualification standard. It filters on what the homeowner describes, so it is a screen, not a guarantee of final contract value.',
    },
    {
      question: 'Do you book handyman or small repair jobs?',
      answer:
        'Not unless you ask for them. The programme is aimed at remodeling and construction projects, and small repair requests are filtered out by default.',
    },
    ...coreFaq('remodeling', 'remodeling and construction projects'),
  ],

  imagery: {
    hero: p.hero,
    heroPosition: 'object-[50%_55%] md:object-[60%_55%]',
    gallery: [p.kitchen, p.bathroom, p.openKitchen],
    disclosure: stockImageryDisclosure,
  },

  seo: {
    title: 'General Contractor Lead Generation & Remodeling Appointments',
    description:
      'HomeQuote Network finds, qualifies and books homeowners planning kitchens, baths, additions, ADUs and whole-home remodels onto general contractors’ calendars. Pay per qualified booked appointment.',
    ogHeadline: 'More Remodeling Projects',
    ogSubline: 'Less time chasing leads',
  },
};
