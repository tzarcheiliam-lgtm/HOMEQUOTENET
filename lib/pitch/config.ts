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

export type TierId = 'leads' | 'appointments' | 'growth';

export interface Tier {
  id: TierId;
  name: string;
  /** Monthly HomeQuote service fee, USD. */
  price: number;
  /** Recommended monthly ad budget, paid by the contractor to Meta. */
  adBudget: { min: number; max: number; plus?: boolean };
  positioning: string;
  /** "Everything in X, plus" line for tiers that build on the previous one. */
  buildsOn?: string;
  includes: string[];
  recommended?: boolean;
}

export const PRICING_STATUS = {
  /** Flip to true once the owner signs off on prices and inclusions. */
  confirmed: false,
  note: 'Proposed pricing. Confirm packages and terms before quoting in writing.',
};

export const TIERS: Tier[] = [
  {
    id: 'leads',
    name: 'Lead Generation',
    price: 1750,
    adBudget: { min: 1500, max: 3000 },
    positioning: 'For contractors with an existing sales or dispatch team.',
    includes: [
      'Meta advertising management',
      'HomeQuote CRM access',
      'Homeowner lead generation funnel',
      'Automated notifications and follow-ups',
      'Calendar integration',
      'Monthly campaign reporting',
      'Lead delivery to your team',
    ],
  },
  {
    id: 'appointments',
    name: 'Appointment Generation',
    price: 2750,
    adBudget: { min: 1500, max: 3000 },
    positioning: 'We handle the follow-up and scheduling. You show up and sell.',
    buildsOn: 'Everything in Lead Generation, plus',
    recommended: true,
    includes: [
      'Lead calling and homeowner qualification',
      'Appointment scheduling',
      'Confirmations and reminders',
      'Digital document signing',
      'Automated iMessage follow-ups, where supported',
      'Enhanced CRM workflows and AI tools',
      'Appointment and conversion reporting',
    ],
  },
  {
    id: 'growth',
    name: 'Growth Partner',
    price: 3500,
    adBudget: { min: 2000, max: 4000, plus: true },
    positioning: 'For established contractors ready to build a scalable acquisition engine.',
    buildsOn: 'Everything in Appointment Generation, plus',
    includes: [
      'Priority campaign optimization',
      'Dedicated branded landing page',
      'Monthly on-site content shoot',
      'About 15 edited ad creatives a month',
      'Creative testing and retargeting',
      'Advanced lead nurturing and reactivation',
      'Weekly performance reviews',
    ],
  },
];

export const AD_SPEND_NOTE =
  'Ad spend is paid by you, directly to Meta, separate from HomeQuote fees. Budgets are recommendations, not guarantees.';

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

const ALL: TierId[] = ['leads', 'appointments', 'growth'];
const T2UP: TierId[] = ['appointments', 'growth'];
const T3: TierId[] = ['growth'];

export const COMPARISON: ComparisonGroup[] = [
  {
    title: 'Bring in homeowners',
    rows: [
      { feature: 'Meta ad management', detail: 'We build, launch and manage your Facebook and Instagram campaigns aimed at homeowners in your service area. Ad spend is paid by you, directly to Meta.', tiers: ALL },
      { feature: 'Homeowner lead funnel', detail: 'A mobile-first funnel that asks about the project, screens the service area and captures contact details before anything reaches you.', tiers: ALL },
      { feature: 'HomeQuote CRM', detail: 'Every lead, status, note and appointment in one place, on desktop and phone.', tiers: ALL },
      { feature: 'Instant notifications', detail: 'New-lead alerts by email and push so nobody waits on a homeowner.', tiers: ALL },
      { feature: 'Monthly campaign reporting', detail: 'Spend, leads and cost per lead from your campaigns, reviewed with you each month.', tiers: ALL },
    ],
  },
  {
    title: 'Turn leads into appointments',
    rows: [
      { feature: 'Lead calling and qualification', detail: 'Our team calls new homeowners, confirms the project, the address and that the decision makers can be there, and screens out poor fits.', tiers: T2UP },
      { feature: 'Appointment scheduling', detail: 'Qualified homeowners are booked straight onto your calendar at times you have made available.', tiers: T2UP },
      { feature: 'Confirmations and reminders', detail: 'Automatic confirmation and reminder texts and emails before every appointment, with easy reschedule links.', tiers: T2UP },
      { feature: 'Digital document signing', detail: 'Send estimates and agreements for e-signature from the CRM.', tiers: T2UP },
      { feature: 'iMessage follow-ups', detail: 'Automated text follow-ups from a real number, where your setup supports it.', tiers: T2UP },
      { feature: 'AI-assisted workflows', detail: 'Automations that follow up, remind and move leads along without someone remembering to do it.', tiers: T2UP },
      { feature: 'Appointment and conversion reporting', detail: 'See booked, held and sold appointments, not only leads.', tiers: T2UP },
    ],
  },
  {
    title: 'Grow faster',
    rows: [
      { feature: 'Dedicated branded landing page', detail: 'A landing page in your brand, built for your services and service area.', tiers: T3 },
      { feature: 'Monthly on-site content shoot', detail: 'We film your crew and finished projects locally once a month.', tiers: T3 },
      { feature: 'About 15 ad creatives a month', detail: 'Edited videos and images from your shoots, ready to run.', tiers: T3 },
      { feature: 'Creative testing and retargeting', detail: 'New angles tested every month, and homeowners who showed interest are shown your ads again.', tiers: T3 },
      { feature: 'Lead nurturing and reactivation', detail: 'Older leads and past estimates are worked again with follow-up sequences.', tiers: T3 },
      { feature: 'Weekly performance reviews', detail: 'A weekly check-in on spend, appointments and what to change next.', tiers: T3 },
      { feature: 'Priority optimization', detail: 'Your campaigns are first in line for changes and new tests.', tiers: T3 },
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
  { name: 'Standard onboarding', price: '$500 one-time', detail: 'Account setup, campaign build and launch.' },
  { name: 'Custom branded funnel', price: '$2,000 one-time', detail: 'A funnel designed around your brand and services.', includedIn: 'A branded landing page is included in Growth Partner.' },
  { name: 'Calling and qualification', price: '$900 / month', detail: 'Add our calling team to Lead Generation.', includedIn: 'Included in Appointment Generation and Growth Partner.' },
  { name: 'Extra content shoot', price: '$750 to $1,250', detail: 'Another on-site shoot for a new project or season.', includedIn: 'Growth Partner includes one shoot a month.' },
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
    a: 'No one can honestly guarantee homeowner demand. We commit to doing the work in your package, and you see every lead and appointment in your CRM.',
  },
  {
    q: 'What counts as a qualified appointment?',
    a: 'We agree on it with you before launch: service area, project type, homeowner and decision makers present, and any budget or timing rules you need.',
    decision: 'Set the default qualification standard (budget floor? timeline?) to start every agreement from.',
  },
  {
    q: 'Do I need my own salesperson?',
    a: 'Someone on your side runs the estimate and closes the job. With Appointment Generation we handle the follow-up and scheduling before that.',
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
    a: 'Terms are set out in your service agreement before anything launches.',
    decision: 'Decide minimum term (month-to-month? 3 months?) and the cancellation notice period.',
  },
];

/** ROI calculator starting point: a clearly labelled hypothetical, never a forecast. */
export const ROI_EXAMPLE = {
  avgContract: 35000,
  marginPct: 30,
  appointments: 10,
  showRatePct: 80,
  closeRatePct: 25,
  adBudget: 2000,
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
      emphasize: 'Only promise what is marked Live. Rolling-out items are on the way, not ready.',
      next: 'Now, three ways to work with us.',
    },
  },
  {
    id: 'pricing',
    title: 'Packages',
    notes: {
      say: 'Three levels. Lead Generation if you have someone to work the leads. Appointment Generation if you want us to call, qualify and book. Growth Partner if you want us running creative too.',
      ask: 'Who would call your leads if we sent them to you tomorrow?',
      emphasize: 'Steer to Appointment Generation. Ad spend is separate and goes straight to Meta.',
      next: 'Let me show exactly what changes between them.',
    },
  },
  {
    id: 'compare',
    title: 'Package comparison',
    notes: {
      say: 'The big jump is from Lead Generation to Appointment Generation: we take over calling, qualifying, scheduling and reminders.',
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
      say: 'Based on what you told me, I’d start with Appointment Generation. You keep selling; we keep the calendar full of real conversations.',
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
