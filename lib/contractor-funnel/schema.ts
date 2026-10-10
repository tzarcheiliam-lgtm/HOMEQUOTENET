import { z } from 'zod';
import { parseUsPhone } from '@/lib/leads/normalize';

/**
 * Contractor-acquisition funnel (contractors considering HomeQuote's services).
 *
 * Deliberately NOT part of the homeowner funnel builder: its submissions are
 * contractor prospects, stored in `contractor_funnel_submissions`, never in `leads`.
 * Pure module (no server-only imports) so the client form and the API route
 * validate with exactly the same rules.
 */

export const SERVICE_OPTIONS = [
  { value: 'pools', label: 'Pools' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'remodeling_gc', label: 'Residential remodeling / general contracting' },
  { value: 'fencing', label: 'Fencing and gates' },
  { value: 'hvac', label: 'HVAC installation / replacement' },
  { value: 'other', label: 'Something else' },
] as const;

export const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'partner', label: 'Partner' },
  { value: 'marketing_sales', label: 'I run marketing or sales' },
  { value: 'other', label: 'Other' },
] as const;

export const PROJECT_VALUE_OPTIONS = [
  { value: 'under_5k', label: 'Under $5,000' },
  { value: '5k_15k', label: '$5,000 – $15,000' },
  { value: '15k_50k', label: '$15,000 – $50,000' },
  { value: '50k_plus', label: '$50,000 or more' },
  { value: 'varies', label: 'It varies' },
] as const;

export const CAPACITY_OPTIONS = [
  { value: 'none', label: 'No capacity right now' },
  { value: '1_5', label: '1 – 5 appointments' },
  { value: '6_15', label: '6 – 15 appointments' },
  { value: '16_30', label: '16 – 30 appointments' },
  { value: '30_plus', label: 'More than 30 appointments' },
] as const;

export const SOURCE_OPTIONS = [
  { value: 'referrals', label: 'Referrals' },
  { value: 'meta_ads', label: 'Meta (Facebook / Instagram) ads' },
  { value: 'google_ads', label: 'Google ads' },
  { value: 'lead_platforms', label: 'Lead platforms' },
  { value: 'organic_search', label: 'Organic search' },
  { value: 'other', label: 'Something else' },
] as const;

export const TIMELINE_OPTIONS = [
  { value: 'now', label: 'As soon as possible' },
  { value: 'within_30_days', label: 'Within 30 days' },
  { value: 'within_90_days', label: 'Within 90 days' },
  { value: 'researching', label: 'Just researching' },
] as const;

const values = <T extends readonly { value: string }[]>(o: T) =>
  o.map((x) => x.value) as [T[number]['value'], ...T[number]['value'][]];

export const MAX_TEXT = 300;

/** Answers to screens 1–7 (no contact data). Safe to keep in sessionStorage. */
export const answersSchema = z.object({
  services: z.array(z.enum(values(SERVICE_OPTIONS))).min(1, 'Choose at least one.').max(6),
  serviceOtherText: z.string().trim().max(120).optional(),
  serviceArea: z.string().trim().min(2, 'Tell us where you work, such as a city, county or ZIP code.').max(MAX_TEXT),
  role: z.enum(values(ROLE_OPTIONS), { errorMap: () => ({ message: 'Choose your role.' }) }),
  projectValue: z.enum(values(PROJECT_VALUE_OPTIONS), { errorMap: () => ({ message: 'Choose a range.' }) }),
  capacity: z.enum(values(CAPACITY_OPTIONS), { errorMap: () => ({ message: 'Choose a range.' }) }),
  sources: z.array(z.enum(values(SOURCE_OPTIONS))).min(1, 'Choose at least one.').max(6),
  timeline: z.enum(values(TIMELINE_OPTIONS), { errorMap: () => ({ message: 'Choose when you would want to start.' }) }),
});
export type Answers = z.infer<typeof answersSchema>;

const website = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(withScheme);
      if (!u.hostname.includes('.')) throw new Error('host');
      return u.toString();
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid website, or leave this blank.' });
      return z.NEVER;
    }
  });

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(100),
  company: z.string().trim().min(2, 'Enter your company name.').max(150),
  email: z.string().trim().toLowerCase().email('Enter a valid business email.').max(200),
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const r = parseUsPhone(v);
      if (!r.ok) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid US phone number.' });
        return z.NEVER;
      }
      return r.e164;
    }),
  website,
  /** Required: permission to contact them about this inquiry. */
  contactConsent: z.literal(true, { errorMap: () => ({ message: 'Please confirm so we can contact you about your inquiry.' }) }),
  /** Optional and separate: general marketing email. */
  marketingConsent: z.boolean().default(false),
});
export type Contact = z.infer<typeof contactSchema>;

export const attributionSchema = z
  .record(z.string().max(500))
  .default({})
  .transform((rec) => {
    const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name', 'placement', 'site_source_name', 'landing_page_url', 'referrer'];
    return Object.fromEntries(Object.entries(rec).filter(([k]) => allowed.includes(k)).slice(0, 20));
  });

export const inquirySchema = z.object({
  submissionId: z.string().uuid(),
  answers: answersSchema,
  contact: contactSchema,
  attribution: attributionSchema,
  /** Visitor's advertising-measurement choice at submit time. */
  measurement: z.boolean().default(false),
  /** Spam signals; never persisted. */
  honeypot: z.string().optional(),
  startedAt: z.number().optional(),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

/* ---- Qualification --------------------------------------------------------
 * Outcome is only ever `qualified` (show the calendar) or `needs_review`
 * (saved, a person follows up). There is no automatic rejection and no revenue
 * or budget threshold. Each switch below can be edited in
 * /app/funnels/contractor-prospects; defaults apply when nothing is saved.
 */

export type QualificationRules = {
  /** Role "Other" is unclear authority -> human review. */
  reviewIfRoleOther: boolean;
  /** "No capacity right now" can't use appointments yet -> human review. */
  reviewIfNoCapacity: boolean;
  /** "Just researching" -> human review. */
  reviewIfResearching: boolean;
  /** Only "something else" selected -> we may not serve that trade -> human review. */
  reviewIfOnlyOtherServices: boolean;
};

export const DEFAULT_RULES: QualificationRules = {
  reviewIfRoleOther: true,
  reviewIfNoCapacity: true,
  reviewIfResearching: true,
  reviewIfOnlyOtherServices: true,
};

export type QualificationResult = {
  status: 'qualified' | 'needs_review';
  /** Machine-readable reasons a person should look at this prospect. */
  reasons: string[];
};

export function mergeRules(stored: unknown): QualificationRules {
  const out = { ...DEFAULT_RULES };
  if (stored && typeof stored === 'object') {
    for (const k of Object.keys(DEFAULT_RULES) as (keyof QualificationRules)[]) {
      const v = (stored as Record<string, unknown>)[k];
      if (typeof v === 'boolean') out[k] = v;
    }
  }
  return out;
}

export function qualifyContractor(answers: Answers, rules: QualificationRules = DEFAULT_RULES): QualificationResult {
  const reasons: string[] = [];
  if (rules.reviewIfOnlyOtherServices && answers.services.every((s) => s === 'other')) reasons.push('only_other_services');
  if (rules.reviewIfRoleOther && answers.role === 'other') reasons.push('role_other');
  if (rules.reviewIfNoCapacity && answers.capacity === 'none') reasons.push('no_capacity');
  if (rules.reviewIfResearching && answers.timeline === 'researching') reasons.push('researching_only');
  return { status: reasons.length ? 'needs_review' : 'qualified', reasons };
}

export const REASON_LABELS: Record<string, string> = {
  only_other_services: 'Only “something else” selected for services',
  role_other: 'Role is “Other”',
  no_capacity: 'No appointment capacity right now',
  researching_only: 'Only researching',
};

/** What the visitor may see about the calendar. */
export type CalendarInfo = {
  /** Plain configured URL; no contact data in it. Also the fallback link. */
  url: string;
  /** 'calendly' = inline embed + booking events; 'link' = open in a new tab only. */
  provider: 'calendly' | 'link';
};

export function isMeasurementEvent(e: string): e is 'CtaClick' | 'QualificationComplete' | 'Lead' | 'Schedule' {
  return ['CtaClick', 'QualificationComplete', 'Lead', 'Schedule'].includes(e);
}
