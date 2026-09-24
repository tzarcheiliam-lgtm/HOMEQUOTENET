import type { IndustryPage } from '@/content/types';
import { fencingPhotos as p, stockImageryDisclosure } from '@/content/industry-photos';
import { bookingSteps, coreReasons, coreFaq } from './shared';

/** /fencing */
export const fencingIndustry: IndustryPage = {
  key: 'fencing',
  slug: 'fencing',
  navLabel: 'Fencing',
  cardDescription: 'Installations, replacements, gates, pool fencing and railing.',
  trade: 'fencing',
  audience: 'fencing companies',

  hero: {
    eyebrow: 'For Southern California fence companies',
    headline: 'More Fence Installation Jobs. More Booked Estimates.',
    subheadline:
      'HomeQuote helps fencing companies reach homeowners actively planning installation and replacement projects, and books the estimate for you.',
    support:
      'Wood, vinyl, aluminum, gates and pool fencing, filtered to the materials, areas and job sizes you want. You pay per qualified booked appointment.',
  },

  cta: 'Get More Fencing Appointments',

  pains: {
    title: 'Fencing leads are easy to get and hard to make worth it.',
    lead: 'Plenty of homeowners ask about fences. The problem is how many are a short repair, a quote collection exercise, or nowhere near your yard.',
    items: [
      {
        title: 'Small, low-value inquiries',
        description:
          'A two-panel repair takes as long to quote as a full perimeter install. The small ones crowd out the jobs you want.',
      },
      {
        title: 'Homeowners collecting endless quotes',
        description:
          'Some homeowners gather five bids and pick the cheapest. You need the ones ready to choose a contractor.',
      },
      {
        title: 'Poor-quality lead lists',
        description:
          'Bought lists and recycled contacts mean wrong numbers, old projects and homeowners who never asked to hear from you.',
      },
      {
        title: 'Missed follow-up',
        description:
          'Crews are out installing all day. Inquiries that are not answered that day often go to the next company.',
      },
      {
        title: 'An inconsistent install pipeline',
        description:
          'Crews need a steady run of booked jobs. Gaps in the schedule cost the same whether the phone rang or not.',
      },
    ],
  },

  steps: bookingSteps({
    demand: 'fence installation, replacement and gates',
    details: 'material, approximate length, gates and timing',
  }),

  services: {
    lead: 'Choose the fencing work and materials you want. Inquiries outside them, or under your minimum job size, are filtered out.',
    items: [
      { title: 'Aluminum Fencing', description: 'Ornamental and modern aluminum systems.', icon: 'columns' },
      { title: 'Vinyl Fencing', description: 'Privacy, semi-privacy and picket vinyl.', icon: 'fence' },
      { title: 'Wood Fencing', description: 'Cedar, redwood and horizontal slat builds.', icon: 'trees' },
      { title: 'Privacy Fencing', description: 'Full-height privacy along property lines.', icon: 'shield' },
      { title: 'Pool Fencing', description: 'Enclosures and barriers around pools.', icon: 'waves' },
      { title: 'Gates', description: 'Walk gates, double gates and entry gates.', icon: 'doorOpen' },
      { title: 'Sliding Gates', description: 'Driveway and rolling gate systems.', icon: 'arrowLeftRight' },
      { title: 'Railing', description: 'Deck, stair and balcony railing.', icon: 'grid' },
      { title: 'Fence Replacement', description: 'Tear-out and replacement of aging fences.', icon: 'hammer' },
    ],
  },

  appointmentNote:
    'Fence estimates move fast when the homeowner is ready. HomeQuote confirms material, rough length and timing, then books the measure-up so your estimator arrives with context.',

  reasons: [
    {
      title: 'Small jobs screened out',
      description:
        'Set a minimum job size and material list. Two-panel repairs and off-list requests do not reach your calendar.',
    },
    {
      title: 'Estimator time protected',
      description:
        'Your estimator shows up to measure a real project, with the material and scope already noted.',
    },
    ...coreReasons,
  ],

  faq: [
    {
      question: 'What fencing projects can I target?',
      answer:
        'Aluminum, vinyl, wood and privacy fencing, pool fencing, gates and sliding gates, railing, and fence replacement. You choose the categories and materials, and appointments are booked only for those.',
    },
    {
      question: 'Can I avoid small repair jobs?',
      answer:
        'Yes. Set a minimum job size in the application and it becomes part of the qualification standard. It filters on what the homeowner describes, so it is a screen, not a guarantee of final contract value.',
    },
    {
      question: 'Do you book commercial fencing?',
      answer:
        'Only if it is part of your agreement. The programme is built around residential installation and replacement by default.',
    },
    ...coreFaq('fencing', 'fence installation, replacement and gates'),
  ],

  imagery: {
    hero: p.hero,
    heroPosition: 'object-[50%_50%]',
    gallery: [p.metal, p.gate, p.picket],
    disclosure: stockImageryDisclosure,
  },

  seo: {
    title: 'Fence Contractor Lead Generation & Booked Estimates',
    description:
      'HomeQuote Network generates, qualifies and books homeowners planning fence installation, replacement and gates onto fencing companies’ calendars. Pay per qualified booked appointment.',
    ogHeadline: 'More Fence Installation Jobs',
    ogSubline: 'More booked estimates',
  },
};
