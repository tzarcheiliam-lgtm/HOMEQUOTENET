// Growth Tools: premium services HomeQuote can set up for a contractor.
// Plain data shared by the contractor pages, the admin review page, the
// notification email, validation and tests. To add an upsell, add an entry
// here (and its slug to the service check constraint in a new migration).
//
// Copy rules: benefit-focused, no invented numbers or results, no
// testimonials. Prices appear only if `startingAt` is set; none are today.
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
  /** Optional price line, e.g. "Starting at $X/mo". Unset = no price shown. */
  startingAt?: string;
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
  },
  {
    slug: 'lead_follow_up',
    name: 'Automated Follow-Up',
    tagline: 'Every lead hears from you, even when you’re on a job.',
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
  },
  {
    slug: 'custom_funnel',
    name: 'Custom Lead Funnel',
    tagline: 'Your own homeowner form, built around how you sell.',
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
  },
  {
    slug: 'website',
    name: 'Website & Landing Page',
    tagline: 'A fast, mobile-ready page that turns visits into requests.',
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
  },
  {
    slug: 'lead_reactivation',
    name: 'Old Lead Reactivation',
    tagline: 'Turn the leads you already paid for into new conversations.',
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
  },
  {
    slug: 'call_tracking',
    name: 'Call & Lead Tracking',
    tagline: 'Know exactly where every call and job comes from.',
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
  },
  {
    slug: 'brochures',
    name: 'Brochures & Sales Materials',
    tagline: 'Leave homeowners with something clear and professional.',
    description:
      'Printed and digital materials your crew can hand over at the appointment or send after it.',
    benefits: ['Brochure or leave-behind layout', 'Print-ready and shareable PDFs', 'Copy written around your services'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Which services should it cover? Do you need print, digital or both?',
  },
  {
    slug: 'brand_identity',
    name: 'Logo & Brand Identity',
    tagline: 'One consistent look on trucks, signs, estimates and online.',
    description: 'A new logo or a refresh, plus simple color and type rules so everything looks like the same company.',
    benefits: ['Logo concepts and final files', 'Color palette and typography', 'Short brand guide'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Do you have a logo today? Anything you want to keep or change?',
  },
  {
    slug: 'social_ad_creative',
    name: 'Social Media Ad Creative',
    tagline: 'Ad images, videos and copy made for Facebook and Instagram.',
    description: 'Creative for your social ads, built from your real projects and services.',
    benefits: ['Ad image and short-video variations', 'Headlines and primary text', 'Sizes for feed, stories and reels'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Are you running ads today? Which services or seasons do you want to promote?',
  },
  {
    slug: 'photo_video',
    name: 'Photo & Video Content',
    tagline: 'Real photos and video of your finished work.',
    description: 'Planned shoots of completed projects and your team at work, edited for everywhere you market.',
    benefits: ['Shoot planning and shot list', 'Edited project photos', 'Short edited video clips'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Do you have finished projects we could shoot? Roughly where are they?',
  },
  {
    slug: 'review_generation',
    name: 'Review Generation',
    tagline: 'A simple, consistent way to ask happy customers for reviews.',
    description: 'A repeatable process for requesting reviews after a job, with templates and timing that fit your projects.',
    benefits: ['Review request texts and emails', 'Timing tied to job completion', 'Direct links to your review profiles'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Which review sites matter most to you? How do you ask for reviews today?',
  },
  {
    slug: 'local_seo',
    name: 'Local SEO & Google Business Profile',
    tagline: 'Keep your Google Business Profile complete and active.',
    description: 'A cleanup of your Google Business Profile and local listings: services, service area, categories and photos.',
    benefits: ['Profile audit and updates', 'Service and service-area setup', 'Consistency across local directories'],
    tier: 'marketing',
    cta: 'Request This',
    notesHint: 'Do you have access to your Google Business Profile? Which areas do you want to reach?',
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
