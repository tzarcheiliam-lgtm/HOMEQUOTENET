/**
 * Homeowner-facing project pages (/homeowners/*).
 *
 * No invented numbers: `answer` carries no dollar figures or timelines beyond
 * "varies by project" until a sourced range is supplied (see TODO in
 * docs/homeowner-section.md). Rules cite an official source and a check date.
 */
import type { FaqItem } from './types';

export const homeownersUpdated = 'October 29, 2026';
export const homeownersUpdatedIso = '2026-10-29';

export type HomeownerProject = {
  slug: 'adu' | 'kitchen-remodel' | 'bathroom-remodel' | 'pool-remodel';
  navLabel: string;
  blurb: string;
  seo: { title: string; description: string };
  h1: string;
  /** Two sentences, answer first. */
  answer: string;
  drivers: { title: string; body: string }[];
  rules: {
    intro: string;
    items: string[];
    source: { label: string; href: string };
  };
  faq: FaqItem[];
  /** Quiz/funnel to send the visitor to. When absent the page offers phone/email. */
  quizHref?: string;
  cta: string;
};

const CSLB_RULE =
  'California generally requires the contractor on a remodel to hold an active license from the Contractors State License Board (CSLB). You can check any license number at cslb.ca.gov before you sign anything.';

export const homeownerProjects: HomeownerProject[] = [
  {
    slug: 'adu',
    navLabel: 'ADUs',
    blurb: 'Detached, attached and garage-conversion ADUs.',
    seo: {
      title: 'ADU Cost and Contractors in Southern California',
      description:
        'What drives ADU cost in Southern California, the state rules that apply, and how to get a free, no-obligation conversation with an ADU builder.',
    },
    h1: 'ADU Cost and Contractors in Southern California',
    answer:
      'ADU cost depends mostly on size, type (detached, attached or garage conversion), finishes, utility work and local permit fees, so there is no single price: typical range, varies by project. Our ADU price estimator gives you a starting figure for your lot, and permitting plus construction usually takes several months depending on your city.',
    drivers: [
      { title: 'Type of ADU', body: 'A garage conversion reuses an existing structure. A detached backyard unit needs a new foundation, framing and roof, and usually costs more per square foot.' },
      { title: 'Size and layout', body: 'More square feet means more cost, but kitchens and bathrooms are the expensive rooms, so a small unit with a full kitchen can cost more per square foot than a larger, simpler one.' },
      { title: 'Utilities and site work', body: 'Connecting water, sewer, gas and electric, trenching, grading and an electrical panel upgrade can add a lot, and depend on how far your lot is from existing lines.' },
      { title: 'Finishes and extras', body: 'Flooring, cabinets, windows, solar, porches and landscaping all move the price.' },
      { title: 'Permits and city fees', body: 'Plan check, permit and utility fees differ by city and by unit size.' },
    ],
    rules: {
      intro: 'California state law limits how much a city can restrict ADUs. The points below are a summary, not legal advice, and your city may have additional rules.',
      items: [
        'Cities and counties must approve or deny a complete ADU permit application within 60 days, without a discretionary hearing.',
        'State law allows a single-story detached ADU of up to 800 square feet with side and rear setbacks of as little as 4 feet.',
        'Local rules on size, height, parking and design still apply, and they change. Confirm with your city planning department before you design.',
        CSLB_RULE,
      ],
      source: {
        label: 'California HCD letter citing the ADU approval requirement',
        href: 'https://www.hcd.ca.gov/sites/default/files/docs/policy-and-research/ordinance-review-letters/napa-adu-findings-012924.pdf',
      },
    },
    faq: [
      { question: 'How much does an ADU cost?', answer: 'It varies by project. Size, ADU type, finishes, utility connections and city fees all change the price. Use the ADU price estimator for a starting figure, then get a written quote from a licensed contractor.' },
      { question: 'How long does it take to get an ADU permit?', answer: 'State law requires cities to act on a complete ADU application within 60 days. Preparing plans beforehand and construction afterwards add to the total timeline, and both vary by project.' },
      { question: 'Is HomeQuote Network a contractor?', answer: 'No. We are a referral and appointment-setting service. We help set up a conversation with a contractor that serves your area. We do not build anything.' },
      { question: 'Does it cost anything to use HomeQuote Network?', answer: 'No. Requesting a conversation is free and carries no obligation to hire anyone.' },
    ],
    quizHref: '/adu-quiz',
    cta: 'See your ADU price range',
  },
  {
    slug: 'kitchen-remodel',
    navLabel: 'Kitchen remodels',
    blurb: 'Cabinets, counters, layout changes and full kitchens.',
    seo: {
      title: 'Kitchen Remodel Cost and Contractors in Southern California',
      description:
        'What changes the cost of a kitchen remodel in Southern California, permit basics, and how to get a free conversation with a licensed contractor.',
    },
    h1: 'Kitchen Remodel Cost and Contractors in Southern California',
    answer:
      'Kitchen remodel cost varies widely with scope, from refreshing cabinets and counters to moving walls, plumbing and gas lines: typical range, varies by project. Timelines depend on scope, material lead times and permits, so get a written scope and schedule from a licensed contractor before you commit.',
    drivers: [
      { title: 'Scope', body: 'Cosmetic updates cost far less than a gut remodel with layout changes.' },
      { title: 'Cabinets and counters', body: 'Stock, semi-custom and custom cabinets, and the counter material, are usually the largest line items.' },
      { title: 'Appliances', body: 'Prices range from basic packages to high-end built-ins, and some require new gas, venting or electrical.' },
      { title: 'Moving plumbing, gas or walls', body: 'Changing the layout adds labor, permits and sometimes structural work.' },
      { title: 'Hidden conditions', body: 'Older homes can reveal wiring, plumbing or subfloor problems once walls and floors are opened.' },
    ],
    rules: {
      intro: 'Permit requirements differ by city. This is a general summary, not legal advice.',
      items: [
        'Work that changes plumbing, gas, electrical or structure typically requires a city building permit. Ask your contractor who pulls it.',
        CSLB_RULE,
        'Get the scope, price, schedule and payment terms in a written contract.',
      ],
      source: { label: 'Contractors State License Board', href: 'https://www.cslb.ca.gov/' },
    },
    faq: [
      { question: 'How much does a kitchen remodel cost?', answer: 'It varies by project. Scope, cabinets, counters, appliances and whether the layout changes all matter. A licensed contractor can give you a written estimate after seeing the space.' },
      { question: 'Do I need a permit?', answer: 'Often, if the work changes plumbing, gas, electrical or structure. Your city building department sets the rules, and your contractor should tell you what applies.' },
      { question: 'Is HomeQuote Network a contractor?', answer: 'No. We are a referral and appointment-setting service, not a contractor.' },
      { question: 'Does it cost anything to use HomeQuote Network?', answer: 'No. Requesting a conversation is free and carries no obligation to hire anyone.' },
    ],
    cta: 'Talk to us about your kitchen',
  },
  {
    slug: 'bathroom-remodel',
    navLabel: 'Bathroom remodels',
    blurb: 'Showers, tubs, vanities, tile and full bathrooms.',
    seo: {
      title: 'Bathroom Remodel Cost and Contractors in Southern California',
      description:
        'What drives bathroom remodel cost in Southern California, permit basics, and how to get a free conversation with a licensed contractor.',
    },
    h1: 'Bathroom Remodel Cost and Contractors in Southern California',
    answer:
      'Bathroom remodel cost depends on size, how much plumbing moves, and the tile and fixtures you choose: typical range, varies by project. Most of the schedule is waterproofing, tile and inspections, so ask any contractor for a written timeline.',
    drivers: [
      { title: 'Size and scope', body: 'A powder-room refresh and a primary-suite remodel are very different jobs.' },
      { title: 'Plumbing changes', body: 'Moving a toilet, shower or tub drain adds labor and may need a permit.' },
      { title: 'Tile and waterproofing', body: 'Tile choice and a properly waterproofed shower are a large share of the cost and the work.' },
      { title: 'Fixtures and vanity', body: 'Fixture quality and vanity type vary widely in price.' },
      { title: 'Hidden conditions', body: 'Water damage or old plumbing found behind walls can add cost.' },
    ],
    rules: {
      intro: 'Permit requirements differ by city. This is a general summary, not legal advice.',
      items: [
        'Plumbing, electrical and structural changes typically require a city permit. Ask your contractor who pulls it.',
        CSLB_RULE,
        'Get the scope, price, schedule and payment terms in a written contract.',
      ],
      source: { label: 'Contractors State License Board', href: 'https://www.cslb.ca.gov/' },
    },
    faq: [
      { question: 'How much does a bathroom remodel cost?', answer: 'It varies by project. Size, plumbing changes, tile and fixtures drive the price. A licensed contractor can quote after seeing the space.' },
      { question: 'How long does a bathroom remodel take?', answer: 'It varies by scope. Waterproofing, tile and any inspections set the pace, so ask for a written schedule.' },
      { question: 'Is HomeQuote Network a contractor?', answer: 'No. We are a referral and appointment-setting service, not a contractor.' },
      { question: 'Does it cost anything to use HomeQuote Network?', answer: 'No. Requesting a conversation is free and carries no obligation to hire anyone.' },
    ],
    cta: 'Talk to us about your bathroom',
  },
  {
    slug: 'pool-remodel',
    navLabel: 'Pool remodels',
    blurb: 'Resurfacing, tile, equipment, decks and full pool remodels.',
    seo: {
      title: 'Pool Remodel Cost and Contractors in Southern California',
      description:
        'What changes the cost and timeline of a pool remodel in Southern California, what to check before hiring, and how to get a free conversation with a contractor.',
    },
    h1: 'Pool Remodel Cost and Contractors in Southern California',
    answer:
      'Pool remodel cost depends on whether you are resurfacing, retiling, replacing equipment or reworking the whole pool and deck: typical range, varies by project. Timelines depend on scope, drying and curing times, and permits, so get them in writing.',
    drivers: [
      { title: 'Surface', body: 'Plaster, pebble and tile finishes differ in cost and lifespan.' },
      { title: 'Equipment', body: 'Pumps, heaters, filters and automation can be replaced alone or as part of a larger remodel.' },
      { title: 'Shape and structure changes', body: 'Changing the shape, depth or adding features needs more work and likely permits.' },
      { title: 'Deck and surroundings', body: 'Decking, coping, lighting and landscaping often make up a large part of the budget.' },
      { title: 'Existing condition', body: 'Cracks, leaks or aging plumbing found during demolition can add cost.' },
    ],
    rules: {
      intro: 'Requirements differ by city. This is a general summary, not legal advice.',
      items: [
        'Structural, plumbing, gas and electrical changes to a pool typically require a city permit.',
        'California generally requires the contractor to hold an active CSLB license, and pool work uses specific license classifications. Check the license and classification at cslb.ca.gov.',
        'Get the scope, price, schedule and payment terms in a written contract.',
      ],
      source: { label: 'Contractors State License Board', href: 'https://www.cslb.ca.gov/' },
    },
    faq: [
      { question: 'How much does a pool remodel cost?', answer: 'It varies by project. Resurfacing, tile, equipment and deck work are priced differently. A licensed pool contractor can quote after inspecting the pool.' },
      { question: 'How long does a pool remodel take?', answer: 'It varies by scope, curing times and permits. Ask for a written schedule.' },
      { question: 'Is HomeQuote Network a contractor?', answer: 'No. We are a referral and appointment-setting service, not a contractor.' },
      { question: 'Does it cost anything to use HomeQuote Network?', answer: 'No. Requesting a conversation is free and carries no obligation to hire anyone.' },
    ],
    cta: 'Talk to us about your pool',
  },
];

export const homeownerHub = {
  seo: {
    title: 'Free Quotes from Licensed Contractors in Southern California',
    description:
      'Planning an ADU, kitchen, bath or pool remodel in Southern California? Get a free, no-obligation conversation with a contractor that serves your area.',
  },
  h1: 'Free Quotes from Licensed Contractors in Southern California',
  lead:
    'Tell us about your project and we help set up a free, no-obligation conversation with a contractor that serves your area.',
} as const;
