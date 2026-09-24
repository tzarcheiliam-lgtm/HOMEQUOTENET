import type { IndustryPage } from '@/content/types';
import { hvacPhotos as p, stockImageryDisclosure } from '@/content/industry-photos';
import { bookingSteps, coreReasons, coreFaq } from './shared';

/** /hvac */
export const hvacIndustry: IndustryPage = {
  key: 'hvac',
  slug: 'hvac',
  navLabel: 'HVAC',
  cardDescription: 'AC and heating replacement, heat pumps, mini splits and ductwork.',
  trade: 'HVAC',
  audience: 'HVAC companies',

  hero: {
    eyebrow: 'For Southern California HVAC companies',
    headline: 'Keep Your HVAC Calendar Full.',
    subheadline:
      'HomeQuote helps HVAC companies generate and book homeowner opportunities for high-value replacement, installation and upgrade work.',
    support:
      'System replacements, heat pumps, mini splits and ductwork, filtered to the work and areas you want. You pay per qualified booked appointment.',
  },

  cta: 'Get More HVAC Appointments',

  pains: {
    title: 'HVAC demand swings. Your calendar shouldn’t.',
    lead: 'Homeowners who need a new system want an answer now. The companies that respond first and book the visit get the replacement.',
    items: [
      {
        title: 'Seasonal demand swings',
        description:
          'Peak season overwhelms the phones, then the shoulder months leave install crews underbooked.',
      },
      {
        title: 'Speed-to-lead problems',
        description:
          'A homeowner with a failing system calls around. If you are not the first to reply, you are often not in the running.',
      },
      {
        title: 'Missed after-hours inquiries',
        description:
          'Forms submitted in the evening sit until morning, by which time the homeowner has spoken to someone else.',
      },
      {
        title: 'Techs chasing quotes',
        description:
          'Comfort advisors and technicians should be in homes presenting options, not calling back cold inquiries.',
      },
      {
        title: 'Competitors responding faster',
        description:
          'Larger shops with call centres win on response time, even when your installs are better.',
      },
    ],
  },

  steps: bookingSteps({
    demand: 'AC and heating replacement, heat pumps, mini splits and system upgrades',
    details: 'system age, the issue, home size and timing',
  }),

  services: {
    lead: 'Choose the HVAC work you want more of. Inquiries outside these categories or your area are filtered out.',
    items: [
      { title: 'AC Replacement', description: 'Central air system replacement.', icon: 'snowflake' },
      { title: 'HVAC Installation', description: 'New systems and full installs.', icon: 'airVent' },
      { title: 'Heating Replacement', description: 'Furnace and heating system replacement.', icon: 'flame' },
      { title: 'Heat Pumps', description: 'Heat pump installs and conversions.', icon: 'thermometer' },
      { title: 'Mini Splits', description: 'Ductless single and multi-zone systems.', icon: 'fan' },
      { title: 'Ductwork', description: 'Duct replacement, redesign and sealing.', icon: 'wind' },
      { title: 'System Upgrades', description: 'Thermostats, zoning and air quality.', icon: 'gauge' },
      { title: 'HVAC Estimates', description: 'Homeowners asking for a replacement quote.', icon: 'clipboardCheck' },
      { title: 'Energy-Efficient Upgrades', description: 'High-efficiency equipment upgrades.', icon: 'leaf' },
    ],
  },

  appointmentNote:
    'Speed matters in HVAC. HomeQuote helps respond quickly and move homeowner inquiries toward booked appointments, so your comfort advisor walks in to a scheduled visit.',

  reasons: [
    {
      title: 'Focused on replacement work',
      description:
        'Replacements, installs and upgrades are the target. Tune-up and service-call-only requests are filtered out unless you want them.',
    },
    {
      title: 'Capacity you control',
      description:
        'Tell us how many appointments your team can run, and adjust it with the season as your agreement allows.',
    },
    ...coreReasons,
  ],

  faq: [
    {
      question: 'What HVAC projects can I target?',
      answer:
        'AC replacement, HVAC installation, heating replacement, heat pumps, mini splits, ductwork, system upgrades, replacement estimates and energy-efficient upgrades. You choose the categories, and appointments are booked only for those.',
    },
    {
      question: 'Do you book emergency repair calls?',
      answer:
        'The programme is built for replacement, installation and upgrade appointments. We do not run emergency dispatch. Whether repair inquiries are included is part of your filters.',
    },
    {
      question: 'What happens to inquiries that arrive after hours?',
      answer:
        'They are followed up by our team during our operating hours, under the follow-up standard in your agreement. We do not promise 24/7 answering.',
    },
    {
      question: 'Can volume change with the season?',
      answer:
        'You set the number of appointments your team can take, and can adjust it with the notice defined in your agreement. Homeowner demand itself varies by season, so we do not promise a fixed monthly volume.',
    },
    ...coreFaq('HVAC', 'HVAC replacement, installation and upgrades'),
  ],

  imagery: {
    hero: p.hero,
    heroPosition: 'object-[70%_55%] md:object-[80%_60%]',
    gallery: [p.technicians, p.wallUnits, p.rooftop],
    disclosure: stockImageryDisclosure,
  },

  seo: {
    title: 'HVAC Lead Generation & Booked Appointments',
    description:
      'HomeQuote Network generates, qualifies and books homeowners asking about AC and heating replacement, heat pumps and mini splits onto HVAC companies’ calendars. Pay per qualified booked appointment.',
    ogHeadline: 'Keep Your HVAC Calendar Full',
    ogSubline: 'Booked replacement and install appointments',
  },
};
