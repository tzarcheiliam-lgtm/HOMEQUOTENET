/**
 * HomeQuote sales presentation (/app/pitch): every price, package inclusion,
 * policy answer, example number and speaker note lives HERE, so the deck can be
 * re-priced or re-worded without touching a component.
 *
 * Rules this content follows (owner brief, 2026-11-02):
 * - No invented results, reviews, testimonials or performance numbers.
 * - Proposed prices / packages are marked as such until the owner confirms them.
 * - Client-paid ad spend is always separate from HomeQuote fees.
 * - Anything that needs a business decision carries `decision` text: shown to
 *   the rep in the presenter window, never on the shared screen.
 */

export type TierId = 'starter' | 'managed' | 'pipeline';

export interface Tier {
  id: TierId;
  /** Small chip above the name ("Get started", "Recommended", "The full system"). */
  tag: string;
  name: string;
  /** Monthly HomeQuote service fee, USD. */
  price: number;
  /** One-time setup fee, USD (not part of the monthly all-in). */
  setup: number;
  /** Commitment, as the contractor reads it. */
  term: string;
  /** Recommended monthly ad budget, paid by the contractor to Meta. */
  adBudget: { min: number; max: number };
  positioning: string;
  /** "Everything in X" line for tiers that build on the previous one. */
  buildsOn?: string;
  includes: string[];
  /** The one item to bold on the card. */
  highlight?: string;
  /** Callout at the bottom of the card. `lead` is bolded. */
  callout: { lead: string; text: string };
  recommended?: boolean;
}

export const PRICING_STATUS = {
  /** Owner-supplied prices and terms (2026-11-04). Set false to show "proposed" warnings to reps again. */
  confirmed: true,
  note: 'Proposed pricing. Confirm packages and terms before quoting in writing.',
};

/** The performance credit on Managed Growth and Full Pipeline (owner, 2026-11-04). "Qualified" is agreed with each contractor before launch; full terms live in the agreement. */
export const MANAGED_GUARANTEE = {
  qualified: 10,
  days: 90,
  creditPerShort: 750,
  atAdBudget: 3000,
};

export const TIERS: Tier[] = [
  {
    id: 'starter',
    tag: 'Get started',
    name: 'Growth Starter',
    price: 1500,
    setup: 500,
    term: 'month-to-month',
    adBudget: { min: 1500, max: 3000 },
    positioning: 'Your marketing system, built and running. Your team works the leads.',
    includes: ['Ads in your own ad account', 'Landing pages and tracking', 'CRM to track and work your leads', 'Monthly report'],
    callout: { lead: 'Your system, running.', text: 'No appointment guarantee.' },
  },
  {
    id: 'managed',
    tag: 'Recommended',
    name: 'Managed Growth',
    price: 2997,
    setup: 750,
    term: 'month-to-month',
    adBudget: { min: 1500, max: 3000 },
    positioning: 'We text, qualify and book your leads. You show up and sell.',
    buildsOn: 'Everything in Growth Starter',
    recommended: true,
    includes: ['Pixel and Conversions API tracking', 'We text, qualify and book your leads', 'Fresh creative and a strategy call monthly'],
    highlight: 'We text, qualify and book your leads',
    callout: {
      lead: `${MANAGED_GUARANTEE.qualified} qualified in ${MANAGED_GUARANTEE.days} days`,
      text: `or a $${MANAGED_GUARANTEE.creditPerShort} credit for each one short, at the recommended $${MANAGED_GUARANTEE.atAdBudget.toLocaleString('en-US')}/mo in ads.`,
    },
  },
  {
    id: 'pipeline',
    tag: 'The full system',
    name: 'Full Pipeline',
    price: 4997,
    setup: 1500,
    term: '3-month minimum',
    adBudget: { min: 1500, max: 3000 },
    positioning: 'Every lead answered in seconds and every quiet estimate chased.',
    buildsOn: 'Everything in Managed Growth',
    includes: [
      'AI speed-to-lead, 24/7',
      'Follow-up on quiet estimates',
      'Old-lead reactivation and reports',
      `The same ${MANAGED_GUARANTEE.qualified}-in-${MANAGED_GUARANTEE.days} qualified guarantee`,
    ],
    highlight: `The same ${MANAGED_GUARANTEE.qualified}-in-${MANAGED_GUARANTEE.days} qualified guarantee`,
    callout: { lead: 'Why the jump:', text: 'AI answers every lead in seconds, 24/7, and chases quiet estimates, so jobs don’t go cold.' },
  },
];

/** Monthly fee plus the recommended ad range (setup not included). */
export const allIn = (t: Tier) => ({ min: t.price + t.adBudget.min, max: t.price + t.adBudget.max });

export const AD_SPEND_NOTE = 'All-in = monthly fee + ads; one-time setup not included. Ads are paid by you, directly to Meta. Full terms in your agreement.';

/** Detailed comparison (slide 7). `tiers` = the packages that include it. */
export interface ComparisonRow {
  feature: string;
  detail: string;
  tiers: TierId[];
}
export interface ComparisonGroup {
  title: string;
  rows: ComparisonRow[];
}

const ALL: TierId[] = ['starter', 'managed', 'pipeline'];
const T2UP: TierId[] = ['managed', 'pipeline'];
const T3: TierId[] = ['pipeline'];

export const COMPARISON: ComparisonGroup[] = [
  {
    title: 'Your marketing system',
    rows: [
      { feature: 'Ads in your own ad account', detail: 'We build, launch and manage Facebook and Instagram campaigns in an ad account you own. Ad spend is paid by you, directly to Meta.', tiers: ALL },
      { feature: 'Landing pages and tracking', detail: 'Mobile-first pages that ask about the project, screen your service area and capture contact details, with tracking on every step.', tiers: ALL },
      { feature: 'CRM to track and work your leads', detail: 'Every lead, status, note and appointment in one place, on desktop and phone.', tiers: ALL },
      { feature: 'Monthly report', detail: 'Spend, leads and cost per lead from your campaigns, every month.', tiers: ALL },
    ],
  },
  {
    title: 'We work your leads',
    rows: [
      { feature: 'Pixel and Conversions API tracking', detail: 'Meta learns which homeowners actually turn into appointments, so your ads find more people like them.', tiers: T2UP },
      { feature: 'We text, qualify and book your leads', detail: 'Our team follows up with every new homeowner, confirms the project, the address and that the decision makers can be there, and books qualified ones onto your calendar.', tiers: T2UP },
      { feature: 'Fresh creative every month', detail: 'New ads every month so your campaigns don’t go stale.', tiers: T2UP },
      { feature: 'Monthly strategy call', detail: 'We review what’s working with you and plan the next month.', tiers: T2UP },
      {
        feature: `${MANAGED_GUARANTEE.qualified} qualified in ${MANAGED_GUARANTEE.days} days, or a credit`,
        detail: `At the recommended $${MANAGED_GUARANTEE.atAdBudget.toLocaleString('en-US')}/mo in ads, we deliver ${MANAGED_GUARANTEE.qualified} qualified appointments in ${MANAGED_GUARANTEE.days} days, or credit you $${MANAGED_GUARANTEE.creditPerShort} for each one short. What counts as qualified is agreed with you before launch.`,
        tiers: T2UP,
      },
    ],
  },
  {
    title: 'No lead goes cold',
    rows: [
      { feature: 'AI speed-to-lead, 24/7', detail: 'Every new lead gets an answer in seconds, day or night, before they call the next contractor.', tiers: T3 },
      { feature: 'Follow-up on quiet estimates', detail: 'Homeowners who went quiet after an estimate are followed up automatically, so jobs don’t slip away.', tiers: T3 },
      { feature: 'Old-lead reactivation and reports', detail: 'Older leads are worked again, and you see what came back.', tiers: T3 },
    ],
  },
];

/** CRM capabilities (slide 5). `live` = in production today; otherwise rolling out. */
export const PLATFORM_FEATURES: { label: string; live: boolean }[] = [
  { label: 'Lead pipeline and statuses', live: true },
  { label: 'Customer profiles and activity history', live: true },
  { label: 'Appointment calendar and booking pages', live: true },
  { label: 'Automated text and email reminders', live: true },
  { label: 'Digital document signing', live: true },
  { label: 'Workflow automations', live: true },
  { label: 'Campaign performance reporting', live: true },
  { label: 'Built-in video sales calls', live: true },
  { label: 'AI-assisted text follow-up', live: false },
  { label: 'iMessage follow-up', live: false },
];

export const ADD_ONS: { name: string; price: string; detail: string; includedIn?: string }[] = [
  { name: 'Custom branded funnel', price: '$2,000 one-time', detail: 'A funnel designed around your brand and services.' },
  { name: 'Calling and qualification', price: '$900 / month', detail: 'Add our team texting, qualifying and booking to Growth Starter.', includedIn: 'Included in Managed Growth and Full Pipeline.' },
  { name: 'On-site content shoot', price: '$750 to $1,250', detail: 'We film your crew and finished projects for new ads.' },
  { name: 'Extra ad creatives', price: 'Custom pricing', detail: 'More edited creatives when you want to test faster.' },
];

export const PAY_PER_APPOINTMENT: { service: string; price: string }[] = [
  { service: 'Kitchen remodeling', price: '$200' },
  { service: 'Bathroom remodeling', price: '$200' },
  { service: 'Roofing', price: '$175 to $225' },
  { service: 'Pool remodeling', price: '$200 to $275' },
  { service: 'ADU', price: '$350 to $450' },
];

export const PAY_PER_APPOINTMENT_TERMS = [
  'What counts as a qualified appointment',
  'Delivery timeline and volume',
  'Your service area',
  'Replacement policy for no-shows',
];

export const ONBOARDING: { title: string; detail: string }[] = [
  { title: 'Strategy and onboarding', detail: 'Goals, services, pricing, and how your team sells.' },
  { title: 'Service area and standards', detail: 'ZIP codes, project types and what a qualified homeowner means for you.' },
  { title: 'Campaign and funnel setup', detail: 'Ads, funnel, CRM, calendar and notifications built and tested.' },
  { title: 'Launch', detail: 'Campaigns go live and the first homeowners come in.' },
  { title: 'Deliver, follow up, improve', detail: 'Leads and appointments flow, and we tune what works.' },
];

export interface Faq {
  q: string;
  a: string;
  /** Business decision still open: shown in the presenter window only. */
  decision?: string;
}

export const FAQS: Faq[] = [
  {
    q: 'Is ad spend included?',
    a: 'No. You pay Meta directly for ads, so you always see exactly what was spent. HomeQuote fees cover the work, not the media.',
  },
  {
    q: 'Are appointments guaranteed?',
    a: `Managed Growth and Full Pipeline are: ${MANAGED_GUARANTEE.qualified} qualified appointments in ${MANAGED_GUARANTEE.days} days, or a $${MANAGED_GUARANTEE.creditPerShort} credit for each one short, at the recommended $${MANAGED_GUARANTEE.atAdBudget.toLocaleString('en-US')}/mo in ads. Growth Starter has no appointment guarantee. Full terms are in your agreement.`,
  },
  {
    q: 'What counts as a qualified appointment?',
    a: 'We agree on it with you before launch: service area, project type, homeowner and decision makers present, and any budget or timing rules you need. That same definition is what the guarantee counts.',
  },
  {
    q: 'Do I need my own salesperson?',
    a: 'Someone on your side runs the estimate and closes the job. With Managed Growth we text, qualify and book the homeowners before that.',
  },
  {
    q: 'Can you work within my service area?',
    a: 'Yes. Campaigns and funnels target the area you choose, and homeowners outside it are screened out.',
  },
  {
    q: 'Do I own my leads?',
    a: 'Every lead from your campaigns is delivered to you and kept in your CRM. Ownership and export terms are written into your agreement.',
    decision: 'Confirm lead ownership and data export if the client leaves.',
  },
  {
    q: 'How long does onboarding take?',
    a: 'It depends on ad account access, approvals and creative. We give you a target launch date at kickoff.',
    decision: 'Pick a typical onboarding range to quote (for example 7 to 14 days).',
  },
  {
    q: 'What if a homeowner cancels or doesn’t show?',
    a: 'Reminders go out before every appointment and cancellations are offered a new time. Any replacement terms are agreed in writing before launch.',
    decision: 'Decide the no-show / cancellation replacement policy for retainers and for pay-per-appointment.',
  },
  {
    q: 'Is there a contract commitment?',
    a: 'Growth Starter and Managed Growth are month-to-month. Full Pipeline has a 3-month minimum. Each has a one-time setup fee.',
    decision: 'Set the cancellation notice period.',
  },
];

/** ROI calculator starting point: a clearly labelled hypothetical, never a forecast. */
export const ROI_EXAMPLE = {
  avgContract: 35000,
  marginPct: 30,
  appointments: 10,
  showRatePct: 80,
  closeRatePct: 25,
  adBudget: 3000,
};

export interface SlideNotes {
  say: string;
  ask: string;
  emphasize: string;
  next: string;
}

export interface SlideMeta {
  id: string;
  title: string;
  notes: SlideNotes;
}

/** Slide order, deep-link ids (/app/pitch#pricing) and speaker notes. */
export const SLIDES: SlideMeta[] = [
  {
    id: 'intro',
    title: 'Opening',
    notes: {
      say: 'Thanks for the time. In 15 minutes I’ll show you how we get homeowners from scrolling to sitting across from you for an estimate, and what that costs.',
      ask: 'Before I start: what does a great month look like for you right now, in jobs or estimates?',
      emphasize: 'We sell booked sales conversations, not ads.',
      next: 'Let me start with where most contractors lose jobs.',
    },
  },
  {
    id: 'problem',
    title: 'The problem',
    notes: {
      say: 'Most contractors we talk to are great at the work. The jobs slip away earlier: slow callbacks, homeowners who go quiet, leads that were never a fit.',
      ask: 'Which of these hits you hardest? How fast does a new lead get a call today?',
      emphasize: 'Let them pick their pain. Repeat it back in their words.',
      next: 'Here is how we take that whole stretch off your plate.',
    },
  },
  {
    id: 'solution',
    title: 'The solution',
    notes: {
      say: 'This is the whole path. We run everything from the ad to the booked appointment. You take it from the estimate.',
      ask: 'Who on your team handles the steps before the estimate today?',
      emphasize: 'One partner owns the full path, so nothing falls between vendors.',
      next: 'Let me show you how that works step by step.',
    },
  },
  {
    id: 'how',
    title: 'How it works',
    notes: {
      say: 'Four stages: we attract homeowners, capture their project details, qualify them, and put appointments on your calendar.',
      ask: 'Which project types do you want more of, and which do you want to avoid?',
      emphasize: 'Qualification depends on the package. That is the difference between a lead and an appointment.',
      next: 'All of it runs on our own platform.',
    },
  },
  {
    id: 'platform',
    title: 'HomeQuote technology',
    notes: {
      say: 'This is the HomeQuote CRM. Every lead, call, appointment and document lives here, and you have access from day one.',
      ask: 'What do you use to track leads today?',
      emphasize: 'Only promise what is marked Live. Full Pipeline’s AI speed-to-lead is still rolling out: confirm it is switched on before promising a start date.',
      next: 'Now, three ways to work with us.',
    },
  },
  {
    id: 'pricing',
    title: 'Packages',
    notes: {
      say: 'Three levels. Growth Starter if your team works the leads. Managed Growth if you want us to text, qualify and book them, with 10 qualified in 90 days or a credit. Full Pipeline adds AI answering every lead 24/7 and chasing quiet estimates, with the same guarantee.',
      ask: 'Who would call your leads if we sent them to you tomorrow?',
      emphasize: 'Steer to Managed Growth. Point to the all-in line so there are no surprises: fee plus ads, setup is one-time.',
      next: 'Let me show exactly what changes between them.',
    },
  },
  {
    id: 'compare',
    title: 'Package comparison',
    notes: {
      say: 'The big jump is from Growth Starter to Managed Growth: we take over texting, qualifying and booking, and we back it with the 10-in-90 credit.',
      ask: 'How many hours a week does someone spend chasing leads right now?',
      emphasize: 'Open a row to explain it. Keep the focus on the middle column.',
      next: 'Here is why that middle column matters.',
    },
  },
  {
    id: 'why',
    title: 'Why appointments win',
    notes: {
      say: 'On the left, every step after the lead is yours. On the right, we do all of it and you show up to a confirmed appointment.',
      ask: 'If you had five more estimates a month, could your team run them?',
      emphasize: 'Speed and convenience. Never promise a close rate.',
      next: 'Let’s run your own numbers.',
    },
  },
  {
    id: 'roi',
    title: 'Return calculator',
    notes: {
      say: 'Let’s use your numbers. These starting values are only an example.',
      ask: 'What is your average job size? Your margin? Out of ten estimates, how many do you close?',
      emphasize: 'Type their numbers in. It is hypothetical, not a forecast. Point to the break-even jobs.',
      next: 'A few optional extras if you need them.',
    },
  },
  {
    id: 'addons',
    title: 'Optional services',
    notes: {
      say: 'These are optional. Some are already included in the higher packages, so nobody pays twice.',
      ask: 'Do you have recent project photos or video we can use?',
      emphasize: 'Onboarding is one-time. Keep this slide short.',
      next: 'If a retainer isn’t right yet, there is another option.',
    },
  },
  {
    id: 'per-appointment',
    title: 'Pay per appointment',
    notes: {
      say: 'If you’d rather start smaller, you can buy appointments one at a time instead of a monthly package.',
      ask: 'Would you rather pay per appointment or have us build the full system?',
      emphasize: 'Terms (qualification, service area, replacements) are agreed before launch.',
      next: 'Here’s what happens once you’re in.',
    },
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    notes: {
      say: 'Five steps from signed agreement to appointments. Timing depends on account access, approvals and creative.',
      ask: 'Do you already have a Meta ad account and a Facebook page?',
      emphasize: 'Do not promise a launch date until access is in place.',
      next: 'Let me answer the questions most contractors ask.',
    },
  },
  {
    id: 'faq',
    title: 'Common questions',
    notes: {
      say: 'Here are the questions we hear most. Open the ones that matter to them.',
      ask: 'What would you need to see to feel confident starting?',
      emphasize: 'Items marked “decision” below are not settled policy yet. Do not commit to them on the call.',
      next: 'Let’s talk about which level fits.',
    },
  },
  {
    id: 'choose',
    title: 'Choose a package',
    notes: {
      say: 'Based on what you told me, I’d start with Managed Growth. You keep selling; we keep the calendar full of real conversations.',
      ask: 'Which level of support makes the most sense for your business right now?',
      emphasize: 'Ask, then stop talking. Click their pick to highlight it.',
      next: 'Great. Here’s what we do next.',
    },
  },
  {
    id: 'close',
    title: 'Closing',
    notes: {
      say: 'You focus on closing jobs. We’ll build the pipeline. Next step is a short strategy session to map your service area and launch plan.',
      ask: 'What day this week works for the strategy session?',
      emphasize: 'Book the next step before ending the call.',
      next: 'End of deck.',
    },
  },
];

export const SLIDE_INDEX: Record<string, number> = Object.fromEntries(SLIDES.map((s, i) => [s.id, i]));

export const CONTACT = { site: 'homequotenet.com', url: 'https://homequotenet.com' };
