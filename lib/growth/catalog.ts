// Growth Tools: premium services HomeQuote can set up for a contractor.
// Plain data shared by the contractor pages, the admin review page, the
// notification email, validation and tests. To add an upsell, add an entry
// here (and its slug to the service check constraint in a new migration).
//
// Copy rules: benefit-focused, no invented numbers or results, no
// testimonials. Prices live only in `price`, never in the copy fields.
// Slugs must match the check constraint in
// supabase/migrations/0021_growth_tools_upsells.sql.

export const SERVICE_SLUGS = [
  // Growth tools
  'ai_receptionist',
  'lead_follow_up',
  'crm_setup',
  'custom_funnel',
  'website',
  'lead_reactivation',
  'call_tracking',
  // Marketing services
  'brochures',
  'brand_identity',
  'social_ad_creative',
  'photo_video',
  'review_generation',
  'local_seo',
  // Retired (merged into 'website'); still valid for existing requests.
  'landing_pages',
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

/**
 * How a service is priced. Every card states its type, so contractors can
 * tell a monthly tool from a one-time build at a glance.
 * - monthly / one_time / per_campaign / per_pack: `amount` is a range or figure
 * - starting_at: `amount` is the lowest price
 * - custom_quote: priced per project, no amount
 * - included: part of eligible HomeQuote plans, not sold separately
 *
 * Display only. Nothing here charges a contractor; the team confirms scope
 * and price after a request. When a service gets a fixed Stripe Price, the
 * type maps to Checkout mode: monthly = subscription, the rest = payment.
 */
export type PriceType = 'monthly' | 'one_time' | 'per_campaign' | 'per_pack' | 'starting_at' | 'custom_quote' | 'included';

export interface ServicePrice {
  type: PriceType;
  /** e.g. "$399–$699". Required unless custom_quote or included. */
  amount?: string;
  /** One-time setup fee on top, e.g. "$500". */
  setup?: string;
  /** Short caveat under the price. */
  note?: string;
}

/** The unit shown after the amount. */
export const PRICE_UNITS: Record<PriceType, string> = {
  monthly: '/mo',
  one_time: 'one-time',
  per_campaign: 'per campaign',
  per_pack: 'per creative pack',
  starting_at: '',
  custom_quote: '',
  included: '',
};

/** Plain-text price, e.g. "$399–$699/mo + $500 setup". For emails, admin and labels. */
export function formatPrice(price: ServicePrice): string {
  let main: string;
  if (price.type === 'custom_quote') main = 'Custom quote';
  else if (price.type === 'included') main = 'Included with eligible HomeQuote plans';
  else if (price.type === 'starting_at') main = `Starting at ${price.amount}`;
  else if (price.type === 'monthly') main = `${price.amount}/mo`;
  else main = `${price.amount} ${PRICE_UNITS[price.type]}`;
  return price.setup ? `${main} + ${price.setup} setup` : main;
}

/** featured = the hero card; core = growth tools; marketing = supporting services. */
export type ServiceTier = 'featured' | 'core' | 'marketing';

export interface GrowthService {
  slug: ServiceSlug;
  name: string;
  /** Short benefit-focused subtitle. */
  tagline: string;
  /** A sentence or two for the featured card, modal and detail page. */
  description: string;
  /** 3–5 benefit bullets. */
  benefits: string[];
  tier: ServiceTier;
  /** The request button. Never "Submit". */
  cta: string;
  /** Helps the contractor write useful notes. */
  notesHint: string;
  /** Optional static badge. Only set when it's true (e.g. real popularity data). */
  badge?: 'most_popular';
  /** Shown on every active card. */
  price: ServicePrice;
  /** Hidden from the page; kept so older requests still display. */
  retired?: boolean;
}

export const GROWTH_SERVICES: GrowthService[] = [
  {
    slug: 'ai_receptionist',
    name: 'AI Receptionist',
    tagline: 'Never miss another homeowner call.',
    description:
      '24/7 AI call answering that can qualify leads, answer basic questions, book appointments and send confirmations automatically.',
    benefits: [
      'Answers calls 24/7',
      'Qualifies homeowners',
      'Books appointments',
      'Sends confirmations',
      'Reduces missed leads',
    ],
    tier: 'featured',
    cta: 'Request AI Receptionist',
    notesHint: 'When do you miss the most calls? Which calendar do you book appointments in?',
    price: { type: 'monthly', amount: '$399–$699', setup: '$500' },
  },
  {
    slug: 'lead_follow_up',
    name: 'Automated Follow-Up',
    tagline: 'Keep every lead warm, even while you’re on a job.',
    description:
      'Text and email follow-up that runs on its own, from the first reply to the reminder before an estimate appointment.',
    benefits: [
      'SMS and email follow-up',
      'No-answer recovery',
      'Appointment reminders',
      'Estimate follow-up',
      'No-show recovery',
    ],
    tier: 'core',
    cta: 'Request Setup',
    notesHint: 'How do you follow up with new leads today? Who on your team handles it?',
    price: { type: 'monthly', amount: '$149–$299' },
  },
  {
    slug: 'crm_setup',
    name: 'CRM & Pipeline Upgrade',
    tagline: 'See every job from first call to signed contract.',
    description:
      'A pipeline built around how you sell, so nothing falls through the cracks between the first call and the signed contract.',
    benefits: [
      'Track every lead',
      'Appointments and estimates in one place',
      'Won and lost jobs',
      'Follow-up status at a glance',
    ],
    tier: 'core',
    cta: 'Request Setup',
    notesHint: 'Which CRM do you use today, if any? What is frustrating about it?',
    price: { type: 'included' },
  },
  {
    slug: 'custom_funnel',
    name: 'Custom Lead Funnel',
    tagline: 'Your own branded homeowner form that asks the questions you need answered.',
    description:
      'A branded request form for your company that asks your qualifying questions, books on your calendar and routes by service area.',
    benefits: [
      'Contractor-specific homeowner form',
      'Your branding',
      'Custom qualification questions',
      'Calendar booking',
      'Service-area routing',
    ],
    tier: 'core',
    cta: 'Get Started',
    notesHint: 'Which services and ZIP codes should it cover? Which questions do you always ask?',
    price: { type: 'one_time', amount: '$350–$750' },
  },
  {
    slug: 'website',
    name: 'Website & Landing Page',
    tagline: 'High-converting pages built to turn traffic into leads.',
    description:
      'A high-converting contractor landing page or full site with lead forms and tracking, built to look great on a phone.',
    benefits: [
      'High-converting contractor landing page',
      'Lead forms that reach you right away',
      'Tracking built in',
      'Mobile optimized',
    ],
    tier: 'core',
    cta: 'Request Setup',
    notesHint: 'Do you have a website or domain today? Any sites you like the look of?',
    price: { type: 'starting_at', amount: '$500' },
  },
  {
    slug: 'lead_reactivation',
    name: 'Old Lead Reactivation',
    tagline: 'Turn old leads you already paid for into new conversations.',
    description:
      'Campaigns that reach back out to past inquiries and estimates that went quiet, so old opportunities get a second look.',
    benefits: [
      'Follow up with old leads',
      'Bring back dead opportunities',
      'SMS and email reactivation campaigns',
    ],
    tier: 'core',
    cta: 'Request This',
    notesHint: 'Roughly how many past leads do you have, and where are they stored?',
    price: { type: 'per_campaign', amount: '$300–$750', note: 'Messaging usage may be billed separately.' },
  },
  {
    slug: 'call_tracking',
    name: 'Call & Lead Tracking',
    tagline: 'See which marketing brings in calls, so you spend where it works.',
    description:
      'Tracking numbers and source tagging that tie each call and lead to where it came from and what happened next.',
    benefits: [
      'Call source tracking',
      'Lead source tracking',
      'Appointment outcomes',
      'Clear attribution',
    ],
    tier: 'core',
    cta: 'Request Setup',
    notesHint: 'Where do your leads come from today? Which numbers or forms do you use?',
    price: { type: 'monthly', amount: '$99–$199' },
  },
  {
    slug: 'brochures',
    name: 'Brochures & Sales Materials',
    tagline: 'Leave homeowners something that keeps you top of mind after the estimate.',
    description:
      'Printed and digital materials your crew can hand over at the appointment or send after it.',
    benefits: ['Brochure or leave-behind layout', 'Print-ready and shareable PDFs', 'Copy written around your services'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Which services should it cover? Do you need print, digital or both?',
    price: { type: 'one_time', amount: '$350–$750' },
  },
  {
    slug: 'brand_identity',
    name: 'Logo & Brand Identity',
    tagline: 'Look like the established company homeowners want to hire.',
    description: 'A new logo or a refresh, plus simple color and type rules so everything looks like the same company.',
    benefits: ['Logo concepts and final files', 'Color palette and typography', 'Short brand guide'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Do you have a logo today? Anything you want to keep or change?',
    price: { type: 'one_time', amount: '$500–$1,000+' },
  },
  {
    slug: 'social_ad_creative',
    name: 'Social Media Ad Creative',
    tagline: 'Scroll-stopping ads built from your real projects.',
    description: 'Creative for your social ads, built from your real projects and services.',
    benefits: ['Ad image and short-video variations', 'Headlines and primary text', 'Sizes for feed, stories and reels'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Are you running ads today? Which services or seasons do you want to promote?',
    price: { type: 'per_pack', amount: '$250–$500' },
  },
  {
    slug: 'photo_video',
    name: 'Photo & Video Content',
    tagline: 'Show homeowners the quality of your finished work.',
    description: 'Planned shoots of completed projects and your team at work, edited for everywhere you market.',
    benefits: ['Shoot planning and shot list', 'Edited project photos', 'Short edited video clips'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Do you have finished projects we could shoot? Roughly where are they?',
    price: { type: 'custom_quote' },
  },
  {
    slug: 'review_generation',
    name: 'Review Generation',
    tagline: 'Ask every happy customer for a review at the right moment.',
    description: 'A repeatable process for requesting reviews after a job, with templates and timing that fit your projects.',
    benefits: ['Review request texts and emails', 'Timing tied to job completion', 'Direct links to your review profiles'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Which review sites matter most to you? How do you ask for reviews today?',
    price: { type: 'monthly', amount: '$99–$199' },
  },
  {
    slug: 'local_seo',
    name: 'Local SEO & Google Business Profile',
    tagline: 'Show up where local homeowners are already searching.',
    description: 'A cleanup of your Google Business Profile and local listings: services, service area, categories and photos.',
    benefits: ['Profile audit and updates', 'Service and service-area setup', 'Consistency across local directories'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Do you have access to your Google Business Profile? Which areas do you want to reach?',
    price: { type: 'monthly', amount: '$500–$1,000+' },
  },
  {
    slug: 'landing_pages',
    name: 'Landing Pages',
    tagline: 'Focused pages for a single service or promotion.',
    description: 'Now part of Website & Landing Page.',
    benefits: ['Landing page design and copy', 'Request form', 'Basic tracking'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Which service or offer should the page focus on?',
    retired: true,
    price: { type: 'starting_at', amount: '$500' },
  },
];

/** Services shown on the page (retired ones only appear on old requests). */
export const ACTIVE_SERVICES = GROWTH_SERVICES.filter((s) => !s.retired);

export function servicesByTier(tier: ServiceTier): GrowthService[] {
  return ACTIVE_SERVICES.filter((s) => s.tier === tier);
}

export function getService(slug: string): GrowthService | undefined {
  return GROWTH_SERVICES.find((s) => s.slug === slug);
}

/** A service a contractor may request now (known and not retired). */
export function isRequestableService(slug: string): boolean {
  return ACTIVE_SERVICES.some((s) => s.slug === slug);
}

export function isServiceSlug(value: unknown): value is ServiceSlug {
  return typeof value === 'string' && (SERVICE_SLUGS as readonly string[]).includes(value);
}

// ---- request status ----------------------------------------------------------

export const REQUEST_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number]['value'];

/** Statuses that still count as an open request (one per service per company). */
export const OPEN_REQUEST_STATUSES: RequestStatus[] = ['new', 'contacted', 'in_progress'];

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && REQUEST_STATUSES.some((s) => s.value === value);
}

export function requestStatusLabel(status: string): string {
  return REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status;
}

// ---- request source ------------------------------------------------------------

export const REQUEST_SOURCES = ['growth_page', 'service_page', 'dashboard'] as const;
export type RequestSource = (typeof REQUEST_SOURCES)[number];

export const REQUEST_SOURCE_LABELS: Record<RequestSource, string> = {
  growth_page: 'Growth Tools page',
  service_page: 'Service page',
  dashboard: 'Dashboard',
};

export const NOTES_MAX = 2000;
