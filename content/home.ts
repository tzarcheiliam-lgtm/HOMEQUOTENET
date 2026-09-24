import type { Niche } from '@/content/types';
import { disclaimers } from '@/content/site';
import { generalContractorPhotos } from '@/content/industry-photos';
import { stockImageryDisclosure } from '@/content/industry-photos';
import { coreReasons } from '@/content/industries/shared';

/**
 * Homepage content. Deliberately trade-neutral: the homepage speaks to
 * home-service contractors in general, and each trade has its own page under
 * content/industries/.
 *
 * Same rules as everywhere else on the site: no invented results, no promise
 * of attendance or sales, and nothing that implies territory or lead lock-in.
 */
export const homeContent: Niche = {
  slug: '',
  key: 'home',
  label: 'Home-Service Contractors',
  audience: 'home-service contractors',

  hero: {
    eyebrow: 'For Southern California contractors',
    headline: 'Qualified Homeowner Appointments, Booked On Your Calendar.',
    subheadline:
      'HomeQuote Network finds homeowners planning remodels, roofing, fencing, HVAC and pool projects, qualifies them against your standard, and books them into your calendar.',
    support:
      'You pay per qualified booked appointment. No monthly marketing retainer required to get started. Service area, project types and pricing are agreed before launch.',
    trustLine:
      'Built for established contractors with the capacity to run more estimates and close high-value projects.',
  },

  markets: {
    region: 'Southern California',
    areas: [
      'Los Angeles County',
      'Orange County',
      'Ventura County',
      'Riverside County',
      'San Bernardino County',
    ],
    note: 'Coverage is assigned market by market. Availability in a given county or city depends on existing partner commitments at the time you apply.',
  },

  problems: [
    {
      title: 'Paying before you know it works',
      description:
        'Most marketing arrangements ask for a monthly retainer before a single homeowner has contacted you. You carry the risk of the test.',
    },
    {
      title: 'Buying contact details, not conversations',
      description:
        'A list of names is not an opportunity. Someone still has to call them, qualify them and get a date in the calendar, and that someone is usually you, after hours.',
    },
    {
      title: 'Inquiries outside your service area',
      description:
        'Requests arrive from cities you do not drive to, for jobs you do not take. The volume looks fine on a report and is useless on a calendar.',
    },
    {
      title: 'Reporting that measures the wrong thing',
      description:
        'Clicks and impressions do not tell you how many homeowners are sitting in your calendar this week waiting for an estimate.',
    },
    {
      title: 'Small jobs crowding out big ones',
      description:
        'Time spent on small repairs and price shoppers is time not spent on the projects your company is set up to win.',
    },
  ],

  process: [
    {
      step: '01',
      title: 'Define the Market',
      description:
        'We agree on project types, service areas, the qualification standard, your calendar availability, capacity and pricing before anything runs.',
    },
    {
      step: '02',
      title: 'Generate Demand',
      description:
        'HomeQuote Network creates and manages the homeowner acquisition campaigns that feed your market.',
    },
    {
      step: '03',
      title: 'Qualify and Book',
      description:
        'We speak to the homeowner, check them against your agreed standard, and book a specific date and time into your calendar.',
    },
    {
      step: '04',
      title: 'Attend and Close',
      description:
        'You turn up to the appointment, run the estimate and control your own sales process. The job is yours.',
    },
  ],

  services: [
    { title: 'Kitchen & Bath Remodeling', description: 'Kitchens, primary suites and full bathroom renovations.', icon: 'chefHat' },
    { title: 'Whole Home Remodeling', description: 'Multi-room and full-interior renovations.', icon: 'house' },
    { title: 'Additions & ADUs', description: 'Room additions, ADUs and garage conversions.', icon: 'building' },
    { title: 'Roofing', description: 'Roof replacement, repair, tile, shingle and flat roofing.', icon: 'layers' },
    { title: 'HVAC', description: 'AC and heating replacement, heat pumps and mini splits.', icon: 'snowflake' },
    { title: 'Fencing & Gates', description: 'Wood, vinyl and aluminum fencing, gates and railing.', icon: 'fence' },
    { title: 'Exterior Renovations', description: 'Siding, windows, facades and entry upgrades.', icon: 'hammer' },
    { title: 'Outdoor Living', description: 'Patios, covers, decking and outdoor kitchens.', icon: 'trees' },
    { title: 'Pool Remodeling', description: 'Resurfacing, tile and coping, equipment and renovation.', icon: 'waves' },
  ],

  reasons: [
    {
      title: 'We do the qualifying',
      description:
        'The homeowner is screened against the standard we set with you before the appointment is booked, not handed to you to sort out.',
    },
    {
      title: 'Founder-led support',
      description:
        'You deal directly with the person accountable for the programme, not a rotating account coordinator.',
    },
    ...coreReasons,
  ],

  audienceFit: {
    fit: [
      'Licensed and insured contractors',
      'Remodeling, roofing, fencing, HVAC and pool companies',
      'Companies with real project photos and a credible online presence',
      'Teams with a calendar they keep and can share access to',
      'Contractors with room for more estimates this month',
      'Companies with a reliable, repeatable sales process',
      'Contractors targeting meaningful projects rather than small repairs',
    ],
    notFit: [
      'Handyman or small-repair-only businesses',
      'Maintenance-only companies',
      'Teams that cannot commit to attending booked appointments',
      'Contractors already at full capacity',
      'Companies expecting guaranteed closed jobs',
    ],
  },

  faq: [
    {
      question: 'What counts as a qualified booked appointment?',
      answer:
        'Generally: a real homeowner, property owner or authorized decision-maker, with valid and reachable contact information, for a property inside your approved service area, who asked about one of your agreed services, showed genuine project interest, and agreed to a specific appointment date and time. It must not have been generated through fraud, bots, purchased lists or falsification, and it must comply with the duplicate, cancellation, rescheduling and no-show rules in your agreement. The exact standard for your programme is confirmed in writing before launch.',
    },
    {
      question: 'So you book the appointment, not just send contact details?',
      answer:
        'Correct. We generate the homeowner inquiry, speak to them, qualify them against your standard, and book a specific date and time into your calendar. You are not buying a list to chase. You are paying for an appointment that is already in your calendar.',
    },
    {
      question: 'What trades do you work with?',
      answer:
        'General contractors and remodelers, roofing, fencing, HVAC and pool contractors. Each has its own page under Industries, and appointments are booked only for the project types you choose.',
    },
    {
      question: 'How much does each appointment cost?',
      answer: disclaimers.pricing,
    },
    {
      question: 'Is there a monthly retainer?',
      answer:
        'Not for the standard pay-per-appointment programme. You pay for qualified appointments booked into your calendar. A full managed growth engagement, where we build and run the entire acquisition system, is available separately for contractors who want it.',
    },
    {
      question: 'What happens if the homeowner does not show up?',
      answer:
        'No-shows, cancellations and reschedules are handled under the written replacement and dispute policy in your agreement. Those terms are agreed before launch, so the rule is known in advance rather than negotiated afterwards. We do not guarantee attendance. What we stand behind is that the appointment met the agreed standard when it was booked.',
    },
    {
      question: 'Can I choose my service area?',
      answer:
        'Yes. Your service area is defined before launch, by county, city or ZIP code, and is used as a booking filter. Availability in a given area depends on existing partner commitments at the time you apply.',
    },
    {
      question: 'What if an appointment does not meet the standard?',
      answer:
        'Raise it through the dispute process defined in your agreement, within the dispute window stated there. Replacement or credit terms are agreed before launch so both sides know the rule in advance.',
    },
    {
      question: 'Are sales guaranteed?',
      answer:
        'No. We do not guarantee attendance, estimates, sales, revenue or profitability, and we do not promise any close rate or contract value. We are paid for delivering appointments that met the agreed qualification and scheduling standard. Attending, estimating and closing are your work.',
    },
    {
      question: 'How do appointments reach my calendar?',
      answer:
        'By the method that fits your team: a shared calendar, a booking link, or direct entry into your CRM, plus a notification by email or SMS. This is confirmed during onboarding along with your availability and how much notice you need.',
    },
    {
      question: 'Can we begin with a limited test?',
      answer:
        'Yes, and that is the recommended way to start. We agree on a defined number of appointments for your market and project types so you can evaluate them against your own numbers before scaling.',
    },
  ],

  seo: {
    title: 'Booked Homeowner Appointments for Contractors',
    description:
      'HomeQuote Network books qualified homeowner appointments into the calendars of remodeling, roofing, fencing, HVAC and pool contractors across Southern California. Pay per qualified booked appointment. No monthly retainer required to start.',
  },
};

/** Homepage imagery: general-contractor photography, not pool. */
export const homePhotos = {
  hero: generalContractorPhotos.hero,
  heroPosition: 'object-[40%_55%] md:object-[60%_55%]',
  strip: {
    tall: generalContractorPhotos.framing,
    top: generalContractorPhotos.kitchen,
    bottom: generalContractorPhotos.bathroom,
  },
  why: generalContractorPhotos.livingKitchen,
  standards: generalContractorPhotos.openKitchen,
  finalCta: generalContractorPhotos.darkLiving,
  disclosure: stockImageryDisclosure,
} as const;
