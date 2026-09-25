// Optional growth services a contractor can ask HomeQuote about
// ("Grow Your Business"). Plain data shared by the contractor pages, the admin
// review page, validation and tests. Keep copy factual: no prices, no promised
// results, no testimonials. Slugs must match the check constraint in
// supabase/migrations/0018_contractor_service_requests.sql.

export const SERVICE_SLUGS = [
  'brochures',
  'brand_identity',
  'website',
  'landing_pages',
  'social_ad_creative',
  'photo_video',
  'lead_follow_up',
  'crm_setup',
  'review_generation',
  'local_seo',
] as const;

export type ServiceSlug = (typeof SERVICE_SLUGS)[number];

export interface GrowthService {
  slug: ServiceSlug;
  name: string;
  /** One benefit-focused line for the card. */
  summary: string;
  /** A short paragraph for the detail page. */
  description: string;
  /** What the work typically includes. Scope is confirmed in a consultation. */
  deliverables: string[];
  /** Helps the contractor write useful notes. */
  notesHint: string;
}

export const GROWTH_SERVICES: GrowthService[] = [
  {
    slug: 'brochures',
    name: 'Brochures & sales materials',
    summary: 'Leave homeowners with something clear and professional after every estimate.',
    description:
      'Printed and digital materials your crew can hand over at the appointment or send after it: what you do, how the project works and how to reach you.',
    deliverables: [
      'Brochure or leave-behind layout',
      'Print-ready and shareable PDF files',
      'Copy written around your services and service area',
    ],
    notesHint: 'Which services should it cover? Do you need print, digital or both?',
  },
  {
    slug: 'brand_identity',
    name: 'Logo & brand identity',
    summary: 'A consistent look across your trucks, yard signs, estimates and online profiles.',
    description:
      'A new logo or a refresh of the one you have, plus simple rules for colors and type so everything you put in front of homeowners looks like the same company.',
    deliverables: [
      'Logo concepts and final files',
      'Color palette and typography',
      'Short brand guide for signs, shirts and documents',
    ],
    notesHint: 'Do you have a logo today? Anything you want to keep or change?',
  },
  {
    slug: 'website',
    name: 'Website creation or redesign',
    summary: 'A site that explains your services and makes it easy for homeowners to reach you.',
    description:
      'A new website, or a rebuild of your current one, focused on your services, your service area, your past work and a clear way to contact you.',
    deliverables: [
      'Site structure and page copy',
      'Mobile-friendly design',
      'Contact and quote-request forms',
      'Launch on your domain',
    ],
    notesHint: 'Do you have a website or domain today? Any sites you like the look of?',
  },
  {
    slug: 'landing_pages',
    name: 'Landing pages',
    summary: 'Focused pages for a single service or promotion, built to capture requests.',
    description:
      'Single-purpose pages for one service or offer, useful for ads, mailers and QR codes, with a short form that sends requests straight to you.',
    deliverables: [
      'Landing page design and copy',
      'Request form connected to your inbox or CRM',
      'Basic conversion tracking setup',
    ],
    notesHint: 'Which service or offer should the page focus on? Where will traffic come from?',
  },
  {
    slug: 'social_ad_creative',
    name: 'Social media ad creative',
    summary: 'Ad images, videos and copy made for Facebook and Instagram.',
    description:
      'Creative for your social ads: static images, short videos and ad copy built from your real projects and services.',
    deliverables: [
      'Ad image and short-video variations',
      'Headlines and primary text',
      'Sizes for feed, stories and reels',
    ],
    notesHint: 'Are you running ads today? Which services or seasons do you want to promote?',
  },
  {
    slug: 'photo_video',
    name: 'Photo & video content',
    summary: 'Real photos and video of your finished work to use everywhere you market.',
    description:
      'Planned shoots of completed projects and your team at work, edited for your website, social profiles, ads and printed materials.',
    deliverables: [
      'Shoot planning and shot list',
      'Edited project photos',
      'Short edited video clips',
    ],
    notesHint: 'Do you have finished projects we could shoot? Roughly where are they?',
  },
  {
    slug: 'lead_follow_up',
    name: 'Lead follow-up automation',
    summary: 'Automatic texts and emails so new inquiries hear from you quickly.',
    description:
      'Automated first responses and follow-up reminders for new inquiries, set up around how your office already works so no request sits unanswered.',
    deliverables: [
      'Instant text and email replies',
      'Follow-up sequence for unanswered inquiries',
      'Reminders for your team',
    ],
    notesHint: 'How do you follow up with new inquiries today? Who on your team handles it?',
  },
  {
    slug: 'crm_setup',
    name: 'CRM setup & optimization',
    summary: 'One organized place for every lead, estimate and follow-up.',
    description:
      'Set up a CRM or clean up the one you use: pipeline stages that match your sales process, contact records, tasks and simple reporting.',
    deliverables: [
      'Pipeline and stage setup',
      'Import of existing contacts',
      'Task and reminder rules',
      'Walkthrough for your team',
    ],
    notesHint: 'Which CRM do you use today, if any? What is frustrating about it?',
  },
  {
    slug: 'review_generation',
    name: 'Review generation system',
    summary: 'A simple, consistent way to ask happy customers for reviews.',
    description:
      'A repeatable process for requesting reviews after a job is finished, with message templates and timing that fit your projects.',
    deliverables: [
      'Review request texts and emails',
      'Timing tied to job completion',
      'Direct links to your review profiles',
    ],
    notesHint: 'Which review sites matter most to you? How do you ask for reviews today?',
  },
  {
    slug: 'local_seo',
    name: 'Local SEO & Google Business Profile',
    summary: 'Keep your Google Business Profile complete, accurate and active.',
    description:
      'A review and cleanup of your Google Business Profile and local listings: services, service area, categories, photos and consistent business details.',
    deliverables: [
      'Google Business Profile audit and updates',
      'Service, category and service-area setup',
      'Consistency check across local directories',
    ],
    notesHint: 'Do you have access to your Google Business Profile? Which areas do you want to reach?',
  },
];

export function getService(slug: string): GrowthService | undefined {
  return GROWTH_SERVICES.find((s) => s.slug === slug);
}

export function isServiceSlug(value: unknown): value is ServiceSlug {
  return typeof value === 'string' && (SERVICE_SLUGS as readonly string[]).includes(value);
}

// ---- request status ----------------------------------------------------------

export const REQUEST_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'closed', label: 'Closed' },
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number]['value'];

/** Statuses that still count as an open request (one per service per company). */
export const OPEN_REQUEST_STATUSES: RequestStatus[] = ['new', 'contacted', 'proposal_sent'];

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && REQUEST_STATUSES.some((s) => s.value === value);
}

export function requestStatusLabel(status: string): string {
  return REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export const NOTES_MAX = 2000;
