import type { Niche } from '@/content/types';

/**
 * Pool remodeling vertical.
 *
 * The offer is pay per qualified booked appointment: HomeQuote Network
 * generates the homeowner inquiry, qualifies it against the agreed standard,
 * and books the homeowner into the contractor's calendar. The contractor
 * attends, estimates and closes.
 *
 * Copy here must never imply the contractor receives raw contact details to
 * chase, and must never promise attendance or sales.
 */
export const poolNiche: Niche = {
  slug: 'pool-contractors',
  key: 'pool',
  label: 'Pool Remodeling',
  audience: 'pool remodeling contractors',

  hero: {
    eyebrow: 'For Southern California pool remodeling contractors',
    headline: 'Pool Remodeling Appointments, Booked On Your Calendar.',
    subheadline:
      'HomeQuote Network finds homeowners planning resurfacing, renovation, tile, coping, equipment upgrades, and backyard transformations, qualifies them against your standard, and books them into your calendar.',
    support:
      'You pay per qualified booked appointment. No monthly marketing retainer required to get started. Availability, the qualification standard, and pricing are agreed upon before launch.',
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
        'A list of names is not an opportunity. Someone still has to call them, qualify them, and get a date in the calendar — and that someone is usually you, after hours.',
    },
    {
      title: 'Inquiries outside your service area',
      description:
        'Enquiries arrive from cities you do not drive to, for jobs you do not take. The volume looks fine on a report and is useless on a calendar.',
    },
    {
      title: 'Reporting that measures the wrong thing',
      description:
        'Clicks, impressions, and engagement do not tell you how many homeowners are sitting in your diary this week waiting for an estimate.',
    },
    {
      title: 'Mismatched project types',
      description:
        'Time spent on weekly-cleaning callers and small repair requests is time not spent on the renovation work your company is set up for.',
    },
  ],

  process: [
    {
      step: '01',
      title: 'Define the Market',
      description:
        'We agree on project types, service areas, the qualification standard, your calendar availability, capacity, and pricing before anything runs.',
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
        'You turn up to the appointment, run the estimate, and control your own sales process. The job is yours.',
    },
  ],

  services: [
    {
      title: 'Pool Remodeling',
      description: 'Full-scope remodels on existing pools and spas.',
      icon: 'waves',
    },
    {
      title: 'Pool Resurfacing',
      description: 'Plaster, pebble, quartz, and aggregate interior finishes.',
      icon: 'paintRoller',
    },
    {
      title: 'Pool Replastering',
      description: 'Homeowners with aging, stained, or failing plaster.',
      icon: 'layers',
    },
    {
      title: 'Tile & Coping',
      description: 'Waterline tile, raised bond beams, and coping replacement.',
      icon: 'grid',
    },
    {
      title: 'Equipment Upgrades',
      description: 'Pumps, heaters, filters, automation, and salt systems.',
      icon: 'settings',
    },
    {
      title: 'Baja Shelves & Structural',
      description: 'Tanning ledges, step reconfiguration, structural changes.',
      icon: 'squareStack',
    },
    {
      title: 'Pool Decking',
      description: 'Pavers, concrete, and full deck replacement around the pool.',
      icon: 'sun',
    },
    {
      title: 'Complete Renovation',
      description: 'Pool, deck, and equipment addressed as one project.',
      icon: 'sparkles',
    },
    {
      title: 'Backyard Transformations',
      description: 'Outdoor-living scope connected to the pool renovation.',
      icon: 'trees',
    },
  ],

  reasons: [
    {
      title: 'We do the qualifying',
      description:
        'The homeowner is screened against the standard we set with you before the appointment is booked, not handed to you to sort out.',
    },
    {
      title: 'Agreed areas and project types',
      description:
        'Your service area and the work you want are defined in writing before launch and used as the booking filter.',
    },
    {
      title: 'A written standard',
      description:
        'What counts as a qualified booked appointment is documented up front, so a disputed appointment is a defined question rather than an argument.',
    },
    {
      title: 'Straight into your calendar',
      description:
        'Appointments are booked to a specific date and time on the calendar you nominate, using the availability rules you set.',
    },
    {
      title: 'Transparent tracking',
      description:
        'Every booked appointment is recorded with its project category, service area, and scheduled slot.',
    },
    {
      title: 'Flexible test structure',
      description:
        'Start with an agreed number of appointments for your market instead of committing to an open-ended contract.',
    },
    {
      title: 'Founder-led support',
      description:
        'You deal directly with the person accountable for the programme, not a rotating account coordinator.',
    },
    {
      title: 'Optional infrastructure',
      description:
        'If you want the CRM, follow-up, and reporting system built as well, that is available as a separate managed engagement.',
    },
  ],

  audienceFit: {
    fit: [
      'Licensed and insured contractors',
      'Pool remodeling and renovation companies',
      'Companies with real project photos and a credible online presence',
      'Teams with a calendar they keep and can share access to',
      'Contractors with room for more estimates this month',
      'Companies with a reliable, repeatable sales process',
      'Contractors targeting meaningful renovation projects rather than weekly maintenance',
    ],
    notFit: [
      'Pool cleaning-only businesses',
      'Weekly maintenance-only companies',
      'Teams that cannot commit to attending booked appointments',
      'Contractors already at full capacity',
      'Companies expecting guaranteed closed jobs',
    ],
  },

  faq: [
    {
      question: 'What counts as a qualified booked appointment?',
      answer:
        'Generally: a real homeowner, property owner, or authorized decision-maker, with valid and reachable contact information, for a property inside your approved service area, who asked about one of your agreed services, showed genuine project interest, and agreed to a specific appointment date and time. It must not have been generated through fraud, bots, purchased lists, or falsification, and it must comply with the duplicate, cancellation, rescheduling, and no-show rules in your agreement. The exact standard for your programme is confirmed in writing before launch.',
    },
    {
      question: 'So you book the appointment, not just send contact details?',
      answer:
        'Correct. We generate the homeowner inquiry, speak to them, qualify them against your standard, and book a specific date and time into your calendar. You are not buying a list to chase. You are paying for an appointment that is already in your diary.',
    },
    {
      question: 'How much does each appointment cost?',
      answer:
        'Pricing depends on project types, market, qualification requirements, and expected volume. Because those inputs differ by contractor and by county, we do not publish a fixed price. Your pricing is confirmed before anything launches.',
    },
    {
      question: 'Is there a monthly retainer?',
      answer:
        'Not for the standard pay-per-appointment programme. You pay for qualified appointments booked into your calendar. A full managed growth engagement, where we build and run the entire acquisition system, is available separately for contractors who want it.',
    },
    {
      question: 'What happens if the homeowner does not show up?',
      answer:
        'No-shows, cancellations, and reschedules are handled under the written replacement and dispute policy in your agreement. Those terms are agreed before launch, so the rule is known in advance rather than negotiated afterwards. We do not guarantee attendance — what we guarantee is that the appointment met the agreed standard when it was booked.',
    },
    {
      question: 'What types of pool projects can I receive?',
      answer:
        'Resurfacing, replastering, tile and coping, equipment upgrades, Baja shelves and structural upgrades, decking, complete pool renovation, and backyard or outdoor-living projects connected to a pool renovation. You choose which of these you want, and appointments are booked only for those categories.',
    },
    {
      question: 'Can I choose my service area?',
      answer:
        'Yes. Your service area is defined before launch, by county, city, or ZIP code, and is used as a booking filter. Availability in a given area depends on existing partner commitments at the time you apply.',
    },
    {
      question: 'What if an appointment does not meet the standard?',
      answer:
        'Raise it through the dispute process defined in your agreement, within the dispute window stated there. Replacement or credit terms are agreed before launch so both sides know the rule in advance.',
    },
    {
      question: 'Are sales guaranteed?',
      answer:
        'No. We do not guarantee attendance, estimates, sales, revenue, or profitability, and we do not promise any close rate or contract value. We are paid for delivering appointments that met the agreed qualification and scheduling standard. Attending, estimating, and closing are your work.',
    },
    {
      question: 'How do appointments reach my calendar?',
      answer:
        'By the method that fits your team — a shared calendar, a booking link, or direct entry into your CRM — plus a notification by email or SMS. This is confirmed during onboarding along with your availability and how much notice you need.',
    },
    {
      question: 'Do I still need to follow up with the homeowner?',
      answer:
        'We book the appointment and confirm it with the homeowner. Most contractors still send their own reminder and confirm the day before, which reduces no-shows. If you would rather we ran that follow-up as well, that is part of the managed growth engagement.',
    },
    {
      question: 'Can we begin with a limited test?',
      answer:
        'Yes, and that is the recommended way to start. We agree on a defined number of appointments for your market and project types so you can evaluate them against your own numbers before scaling.',
    },
  ],

  seo: {
    title: 'Booked Pool Remodeling Appointments for Southern California Contractors',
    description:
      'HomeQuote Network books qualified homeowner appointments into the calendars of pool remodeling contractors across Los Angeles, Orange, Ventura, Riverside, and San Bernardino counties. Pay per qualified booked appointment. No monthly retainer required to start.',
  },
};
