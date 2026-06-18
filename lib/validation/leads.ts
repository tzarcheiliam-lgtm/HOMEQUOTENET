import { z } from 'zod';
import type { LeadStatus } from '@/lib/types';

const LEAD_STATUS_VALUES = [
  'new',
  'contact_attempted',
  'qualified',
  'assigned',
  'appointment_set',
  'appointment_completed',
  'estimate_sent',
  'sold',
  'lost',
  'cancelled',
] as const satisfies readonly LeadStatus[];

// Empty string -> null, trimmed.
const optStr = z
  .string()
  .optional()
  .transform((v) => {
    const s = (v ?? '').trim();
    return s === '' ? null : s;
  });

// Empty string -> null, otherwise a finite number.
const optNum = z
  .string()
  .optional()
  .transform((v) => (v ?? '').trim())
  .transform((s) => (s === '' ? null : Number(s)))
  .refine((n) => n === null || Number.isFinite(n), 'Must be a number');

const optEmail = z
  .string()
  .optional()
  .transform((v) => (v ?? '').trim())
  .refine((s) => s === '' || z.string().email().safeParse(s).success, {
    message: 'Invalid email',
  })
  .transform((s) => (s === '' ? null : s));

// Used for both create and edit. A lead needs at least a name or a phone.
export const leadInputSchema = z
  .object({
    vertical_id: optStr,
    sub_service_id: optStr,
    status: z.enum(LEAD_STATUS_VALUES).default('new'),

    first_name: optStr,
    last_name: optStr,
    email: optEmail,
    phone: optStr,

    address: optStr,
    city: optStr,
    state: optStr,
    zip: optStr,

    project_description: optStr,

    lead_cost: optNum,
    estimated_job_value: optNum,
    actual_revenue: optNum,
    commission: optNum,

    qualified: z.boolean().default(false),
    budget_range: optStr,
    timeline: optStr,
    urgency: optStr,

    notes: optStr,

    source: optStr,
    campaign: optStr,
    ad_set: optStr,
    ad_name: optStr,
    utm_source: optStr,
    utm_medium: optStr,
    utm_campaign: optStr,
    utm_term: optStr,
    utm_content: optStr,
    referrer: optStr,
    landing_page_url: optStr,
  })
  .refine((d) => d.first_name || d.last_name || d.phone, {
    message: 'Provide at least a name or a phone number',
    path: ['first_name'],
  });

export type LeadInput = z.infer<typeof leadInputSchema>;

// Parse a FormData into the shape leadInputSchema expects.
export function leadFormToObject(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return v === null ? undefined : String(v);
  };
  return {
    vertical_id: get('vertical_id'),
    sub_service_id: get('sub_service_id'),
    status: get('status') ?? 'new',
    first_name: get('first_name'),
    last_name: get('last_name'),
    email: get('email'),
    phone: get('phone'),
    address: get('address'),
    city: get('city'),
    state: get('state'),
    zip: get('zip'),
    project_description: get('project_description'),
    lead_cost: get('lead_cost'),
    estimated_job_value: get('estimated_job_value'),
    actual_revenue: get('actual_revenue'),
    commission: get('commission'),
    qualified: formData.get('qualified') === 'on',
    budget_range: get('budget_range'),
    timeline: get('timeline'),
    urgency: get('urgency'),
    notes: get('notes'),
    source: get('source'),
    campaign: get('campaign'),
    ad_set: get('ad_set'),
    ad_name: get('ad_name'),
    utm_source: get('utm_source'),
    utm_medium: get('utm_medium'),
    utm_campaign: get('utm_campaign'),
    utm_term: get('utm_term'),
    utm_content: get('utm_content'),
    referrer: get('referrer'),
    landing_page_url: get('landing_page_url'),
  };
}
