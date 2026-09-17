import { z } from 'zod';

/**
 * Contractor application schema.
 *
 * Shared by the client form (for inline validation) and the server action
 * (as the authoritative check). Never trust the client copy alone.
 */

/* ---- Option sets (also used to render the form controls) ---------------- */

export const PRIMARY_SERVICES = [
  'Pool remodeling',
  'Pool resurfacing',
  'Pool replastering',
  'Tile & coping',
  'Equipment upgrades',
  'Baja shelves & structural',
  'Pool decking',
  'Complete pool renovation',
  'Backyard transformation',
  'Outdoor living',
] as const;

export const AVG_PROJECT_VALUES = [
  'Under $10,000',
  '$10,000 – $25,000',
  '$25,000 – $50,000',
  '$50,000 – $100,000',
  'Over $100,000',
] as const;

export const MIN_PROJECT_SIZES = [
  'No minimum',
  '$5,000+',
  '$10,000+',
  '$20,000+',
  '$35,000+',
  '$50,000+',
] as const;

export const LEAD_CAPACITIES = [
  '1 – 5 per month',
  '6 – 15 per month',
  '16 – 30 per month',
  '31 – 50 per month',
  '50+ per month',
] as const;

export const RESPONSE_TIMES = [
  'Within 5 minutes',
  'Within 30 minutes',
  'Within 2 hours',
  'Same business day',
  'Next business day',
] as const;

export const CRM_OPTIONS = [
  'Yes — GoHighLevel',
  'Yes — another CRM',
  'No — we track appointments manually',
  'Not sure',
] as const;

/*
  The stored values are deliberately left alone. `pay_per_lead` is written into
  a CHECK constraint in supabase/migrations/0006_contractor_applications.sql and
  into every row already captured, so renaming it would need a migration and a
  backfill. Only the customer-facing label changes.
*/
export const TRACKS = ['pay_per_lead', 'managed'] as const;
export type Track = (typeof TRACKS)[number];

export const TRACK_LABELS: Record<Track, string> = {
  pay_per_lead: 'Pay Per Booked Appointment',
  managed: 'Full Managed Growth System',
};

/* ---- Helpers ------------------------------------------------------------ */

/**
 * `FormData.get()` returns null for a field that was not submitted at all.
 * Coercing null to '' here means every failure produces our own friendly
 * message rather than Zod's raw "Expected string, received null".
 */
const asText = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

const required = (field: string, min = 1) =>
  z.preprocess(
    asText,
    z
      .string()
      .min(min, min > 1 ? `${field} looks too short` : `${field} is required`)
      .max(200, `${field} is too long`)
  );

/** Blank or missing becomes null rather than an error. */
const optional = z.preprocess(
  asText,
  z
    .string()
    .max(2000, 'That is longer than we can accept')
    .transform((s) => (s === '' ? null : s))
);

/** Accepts common US formats; stores whatever was typed, checks digit count. */
const phone = z.preprocess(
  asText,
  z.string().refine((v) => v.replace(/\D/g, '').length >= 10, {
    message: 'Enter a valid phone number with at least 10 digits',
  })
);

/** Tolerates a bare domain by prefixing https:// before validating. */
const website = z.preprocess(
  asText,
  z
    .string()
    .transform((v) => {
      if (v === '') return null;
      return /^https?:\/\//i.test(v) ? v : `https://${v}`;
    })
    .refine((v) => v === null || z.string().url().safeParse(v).success, {
      message: 'Enter a valid website URL',
    })
);

/**
 * A select field. Any missing, blank, or unrecognised value produces the same
 * plain-language message — never Zod's full list of permitted values, which is
 * unreadable in a form error.
 */
const choice = <T extends readonly [string, ...string[]]>(
  values: T,
  message: string
) =>
  z.preprocess(
    asText,
    z.enum(values, { errorMap: () => ({ message }) })
  );

/* ---- Schema ------------------------------------------------------------- */

export const applicationSchema = z.object({
  first_name: required('First name'),
  last_name: required('Last name'),
  company: required('Company name'),
  phone,
  email: z.preprocess(asText, z.string().email('Enter a valid email address')),
  website,

  primary_services: z.preprocess(
    (v) => (Array.isArray(v) ? v : v == null ? [] : [v]),
    z
      .array(z.enum(PRIMARY_SERVICES, { errorMap: () => ({ message: 'Select a service from the list' }) }))
      .min(1, 'Select at least one service')
  ),

  service_areas: required('Service areas', 3),

  avg_project_value: choice(
    AVG_PROJECT_VALUES,
    'Select an average project value'
  ),
  min_project_size: choice(MIN_PROJECT_SIZES, 'Select a minimum project size'),
  monthly_lead_capacity: choice(
    LEAD_CAPACITIES,
    'Select how many additional appointments you can handle'
  ),
  response_time: choice(RESPONSE_TIMES, 'Select your typical response time'),
  uses_crm: choice(CRM_OPTIONS, 'Tell us whether you use a CRM'),

  track: choice(TRACKS, 'Choose a preferred arrangement'),

  notes: optional,

  consent: z
    .any()
    .refine((v) => v === 'on' || v === 'true' || v === true, {
      message: 'Please confirm you agree to be contacted about your application',
    }),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

/** Field-level errors keyed by field name, as returned to the client form. */
export type FieldErrors = Partial<Record<keyof ApplicationInput, string>>;
