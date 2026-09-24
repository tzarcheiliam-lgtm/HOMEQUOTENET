import type { FaqItem, ProcessStep } from '@/content/types';
import { disclaimers } from '@/content/site';

/**
 * Copy every industry page shares, parameterised by trade where the wording
 * needs it. Trade-specific copy lives in the sibling files.
 *
 * Same compliance rules as the rest of the site (see content/site.ts): no
 * response-time numbers, close rates, volumes or results that have not been
 * measured for that trade, and never a promise of attendance or sales.
 */

/** The four-step system. Same on every page; only the nouns change. */
export function bookingSteps(opts: {
  /** e.g. "a roof replacement or repair" */
  demand: string;
  /** e.g. "roof age, material and scope" */
  details: string;
}): ProcessStep[] {
  return [
    {
      step: '01',
      title: 'Generate Demand',
      description: `We run campaigns designed to reach homeowners looking for ${opts.demand}, inside the service area we agree with you.`,
    },
    {
      step: '02',
      title: 'Capture & Qualify',
      description: `We collect project details (${opts.details}) and filter each inquiry by service area, job type and fit.`,
    },
    {
      step: '03',
      title: 'Follow Up & Book',
      description:
        'HomeQuote follows up with the homeowner and schedules the appointment into your calendar, at a time you have made available.',
    },
    {
      step: '04',
      title: 'You Sell the Job',
      description:
        'You receive the booked appointment and spend your time on the estimate and the close, not on chasing the homeowner.',
    },
  ];
}

/** Reasons that hold for every trade. Each page puts two of its own first. */
export const coreReasons = [
  {
    title: 'Appointments, not phone numbers',
    description:
      'You are paying for a homeowner booked into a time slot, not a list of contacts for your team to work through.',
  },
  {
    title: 'You set the filters',
    description:
      'Service area, project types and minimum job size are agreed in writing before launch and used to screen every inquiry.',
  },
  {
    title: 'A written standard',
    description:
      'What counts as a qualified booked appointment is documented up front, so a disputed appointment is a defined question.',
  },
  {
    title: 'No retainer to start',
    description:
      'The standard programme is priced per booked appointment. Pricing is confirmed with you before anything runs.',
  },
  {
    title: 'Start with a defined test',
    description:
      'Begin with an agreed number of appointments for your market and judge them against your own numbers.',
  },
  {
    title: 'Fits your calendar and CRM',
    description:
      'Appointments land on a shared calendar, a booking link or directly in your CRM, with a notification to your team.',
  },
];

/**
 * FAQ answers every trade needs. `trade` is the lower-case noun ("roofing"),
 * `jobs` the plural work description ("roofing projects").
 */
export function coreFaq(trade: string, jobs: string): FaqItem[] {
  return [
    {
      question: `How does HomeQuote generate ${trade} leads?`,
      answer: `We create and pay for homeowner acquisition campaigns, aimed at people in your service area asking about ${jobs}. Homeowners submit their project details, and our team follows up from there.`,
    },
    {
      question: 'How are homeowners qualified?',
      answer:
        'Against the standard we agree with you before launch: a real homeowner or decision-maker, reachable contact details, a property inside your service area, one of your agreed project types, genuine interest, and agreement to a specific appointment time. The full definition is on our appointment standards page and in your agreement.',
    },
    {
      question: 'Are appointments guaranteed to close?',
      answer:
        'No. We do not guarantee attendance, estimates, sales, revenue or profitability. What we stand behind is that each appointment billed met the agreed qualification and scheduling standard when it was booked. Running the estimate and closing the job is your side.',
    },
    {
      question: 'How quickly do new inquiries get contacted?',
      answer:
        'Our team works new inquiries as they come in during our operating hours, because speed matters for every trade. The follow-up standard for your programme is written into your agreement. We do not publish a fixed response-time promise.',
    },
    {
      question: 'What areas do you work in?',
      answer:
        'We currently focus on Southern California, including Los Angeles, Orange, Ventura, Riverside and San Bernardino counties. Coverage is assigned market by market, so tell us your service area in the application and we will confirm what is available.',
    },
    {
      question: 'Do I need a long-term contract?',
      answer:
        'No. The recommended start is a defined number of appointments for your market, so you can evaluate the programme before scaling. Terms for cancellations, no-shows, replacements and disputes are set out in your agreement before launch.',
    },
    {
      question: 'Can HomeQuote work with my existing CRM?',
      answer:
        'Yes. Appointments can be delivered to a shared calendar, through a booking link, or entered directly into your CRM, with an email or SMS notification. The method is confirmed during onboarding.',
    },
    {
      question: 'How much does each appointment cost?',
      answer: disclaimers.pricing,
    },
  ];
}
