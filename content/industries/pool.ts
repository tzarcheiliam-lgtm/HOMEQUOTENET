import type { IndustryPage } from '@/content/types';
import { poolNiche } from '@/content/niches/pool';
import { photos, imageryDisclosure } from '@/content/photos';
import { bookingSteps, coreReasons, coreFaq } from './shared';

/** /pool-contractors */
export const poolIndustry: IndustryPage = {
  key: 'pool',
  slug: 'pool-contractors',
  navLabel: 'Pool Contractors',
  cardDescription: 'Remodels, resurfacing, tile and coping, equipment and backyard renovation.',
  trade: 'pool',
  audience: 'pool contractors',

  hero: {
    eyebrow: 'For Southern California pool contractors',
    headline: 'Booked Pool Remodeling Appointments.',
    subheadline:
      'HomeQuote helps pool contractors generate, qualify, and book homeowners actively looking for pool remodeling and renovation services.',
    support:
      'You pay per qualified booked appointment. No monthly retainer required to start. Service area, project types and pricing are agreed before launch.',
  },

  cta: 'Get More Pool Appointments',

  pains: {
    title: 'Pool remodel leads are slow, shopped and expensive to chase.',
    lead: 'A remodel is a big decision, and homeowners take their time. That is exactly why the follow-up is where most pool leads are lost.',
    items: [
      {
        title: 'Homeowners shopping several contractors',
        description:
          'Remodel buyers collect bids. The contractor who reaches them first and gets a site visit booked is the one still in the conversation.',
      },
      {
        title: 'Expensive leads that never answer',
        description:
          'A form fill is not a conversation. Paying for inquiries nobody picks up for is the most expensive way to fill a pipeline.',
      },
      {
        title: 'Long follow-up cycles',
        description:
          'Pool projects often take several touches before a homeowner commits to a visit. Most teams do not have the hours to keep that up.',
      },
      {
        title: 'Empty estimate slots',
        description:
          'A week with gaps in the calendar is a week of remodels you did not get the chance to bid.',
      },
      {
        title: 'Salespeople stuck dialing',
        description:
          'Every hour your closer spends calling unresponsive leads is an hour not spent in front of a homeowner who is ready.',
      },
    ],
  },

  steps: bookingSteps({
    demand: 'pool remodeling, resurfacing and renovation',
    details: 'pool condition, scope and timing',
  }),

  services: {
    lead: 'Pick the categories you want. Inquiries outside them are filtered out before anything is booked.',
    items: poolNiche.services,
  },

  appointmentNote:
    'Pool remodel leads often need several follow-ups before a homeowner commits to a visit. HomeQuote handles that stretch of the process, so you take over at the appointment.',

  reasons: [
    {
      title: 'Built around renovation work',
      description:
        'Remodels, resurfacing, tile and coping, equipment and backyard scope. Weekly cleaning and small repair callers are screened out.',
    },
    {
      title: 'Handles the long follow-up',
      description:
        'The repeated touches a remodel lead needs happen on our side, before the appointment reaches your calendar.',
    },
    ...coreReasons,
  ],

  faq: [
    {
      question: 'What pool projects can I target?',
      answer:
        'Remodeling, resurfacing, replastering, tile and coping, equipment upgrades, Baja shelves and structural changes, decking, complete renovations, and backyard work connected to a pool renovation. You choose the categories, and appointments are booked only for those.',
    },
    {
      question: 'Do you book weekly cleaning or small repair calls?',
      answer:
        'No. The programme is built for renovation work. Cleaning-only and small repair inquiries are filtered out unless you ask for them.',
    },
    ...coreFaq('pool', 'pool remodeling and renovation projects'),
  ],

  imagery: {
    hero: photos.heroHillside,
    heroPosition: 'object-[55%_45%] md:object-[65%_50%]',
    gallery: [photos.longPool, photos.mountainView, photos.firepit],
    disclosure: imageryDisclosure,
  },

  seo: {
    title: 'Pool Contractor Lead Generation & Booked Appointments',
    description:
      'HomeQuote Network generates, qualifies and books pool remodeling homeowners into your calendar across Southern California. Pay per qualified booked appointment, no retainer to start.',
    ogHeadline: 'Booked Pool Remodeling Appointments',
    ogSubline: 'Qualified homeowners, on your calendar',
  },
};
