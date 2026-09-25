/**
 * Canonical variable registry for the email template library. This is a
 * superset of lib/workflows/actions.ts MERGE_FIELDS (which is deliberately
 * narrow — workflow send_email bodies only ever see lead/contractor/
 * appointment/homequote data resolvable inside a workflow run). Templates
 * used for manual sends can reference the same {{root.key}} tokens; a
 * template referencing a workflow-only field still works when sent from a
 * workflow, and resolves to '' when sent manually without that data.
 *
 * Report and billing variables are NOT included here on purpose: there is no
 * Stripe/billing table and no analytics rollup table backing them yet (see
 * README note in template-library.ts). Adding {{billing.amount}} or
 * {{report.leads}} here would silently render blank in production, so those
 * templates use plain bracketed placeholder text like "[Plan Name]" that an
 * admin fills in by hand until that data source exists.
 */

export interface EmailVariableDefinition {
  field: string; // dotted path, e.g. "lead.first_name"
  label: string;
  example: string;
}

export const EMAIL_VARIABLE_GROUPS: { group: string; fields: EmailVariableDefinition[] }[] = [
  {
    group: 'Homeowner / Lead',
    fields: [
      { field: 'lead.first_name', label: 'First name', example: 'Sarah' },
      { field: 'lead.last_name', label: 'Last name', example: 'Nguyen' },
      { field: 'lead.full_name', label: 'Full name', example: 'Sarah Nguyen' },
      { field: 'lead.email', label: 'Email', example: 'sarah@example.com' },
      { field: 'lead.phone', label: 'Phone', example: '(555) 123-4567' },
      { field: 'lead.address', label: 'Address', example: '123 Main St' },
      { field: 'lead.city', label: 'City', example: 'Austin' },
      { field: 'lead.zip', label: 'ZIP', example: '78701' },
      { field: 'lead.service_type', label: 'Service / vertical', example: 'Pool Installation' },
      { field: 'lead.project_description', label: 'Project description', example: 'New inground pool, ~14x28' },
      { field: 'lead.timeline', label: 'Timeline', example: 'Within 3 months' },
      { field: 'lead.budget', label: 'Budget range', example: '$40,000–$60,000' },
    ],
  },
  {
    group: 'Appointment',
    fields: [
      { field: 'appointment.date', label: 'Date', example: 'Thursday, Oct 2' },
      { field: 'appointment.time', label: 'Time', example: '2:00 PM' },
      { field: 'appointment.location', label: 'Location', example: '123 Main St, Austin, TX' },
    ],
  },
  {
    group: 'Contractor',
    fields: [
      { field: 'contractor.name', label: 'Company name', example: 'Blue Wave Pools' },
      { field: 'contractor.contact_name', label: 'Contact name', example: 'Mike Torres' },
      { field: 'contractor.phone', label: 'Phone', example: '(555) 987-6543' },
      { field: 'contractor.email', label: 'Email', example: 'mike@bluewavepools.com' },
    ],
  },
  {
    group: 'HomeQuote',
    fields: [
      { field: 'homequote.phone', label: 'HomeQuote phone', example: '(555) 000-1111' },
      { field: 'homequote.site_url', label: 'Site URL', example: 'https://homequotenet.com' },
      { field: 'homequote.portal_url', label: 'Portal login URL', example: 'https://homequotenet.com/sign-in' },
      { field: 'homequote.support_email', label: 'Support email', example: 'support@homequotenet.com' },
    ],
  },
];

export const EMAIL_VARIABLE_FIELDS: string[] = EMAIL_VARIABLE_GROUPS.flatMap((g) => g.fields.map((f) => f.field));

const TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function variablesIn(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(TOKEN), (m) => m[1])));
}

/** Tokens in the text that the canonical registry does not know how to resolve. */
export function findUnknownVariables(text: string): string[] {
  return variablesIn(text).filter((field) => !EMAIL_VARIABLE_FIELDS.includes(field));
}

export interface EmailTemplateContext {
  lead?: Record<string, unknown> | null;
  appointment?: Record<string, unknown> | null;
  contractor?: Record<string, unknown> | null;
  homequote?: {
    phone?: string;
    siteUrl?: string;
    portalUrl?: string;
    supportEmail?: string;
  };
}

function fullName(first?: unknown, last?: unknown): string {
  return [first, last]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .join(' ');
}

function resolve(context: EmailTemplateContext, field: string): string {
  const [root, key] = field.split('.');
  if (root === 'homequote') {
    const hq = context.homequote ?? {};
    if (key === 'phone') return hq.phone ?? '';
    if (key === 'site_url') return hq.siteUrl ?? '';
    if (key === 'portal_url') return hq.portalUrl ?? (hq.siteUrl ? `${hq.siteUrl.replace(/\/$/, '')}/sign-in` : '');
    if (key === 'support_email') return hq.supportEmail ?? '';
    return '';
  }
  if (root === 'lead' && key === 'full_name') {
    const lead = context.lead ?? {};
    return fullName(lead.first_name, lead.last_name);
  }
  if (root === 'contractor' && key === 'full_name') {
    return String((context.contractor ?? {}).name ?? '');
  }
  const source = context[root as 'lead' | 'appointment' | 'contractor'];
  if (source && typeof source === 'object' && key in source) {
    const value = (source as Record<string, unknown>)[key];
    return value == null ? '' : String(value);
  }
  return '';
}

/** Substitutes {{root.key}} tokens; unknown/unresolvable tokens render as ''. */
export function renderEmailTemplate(text: string, context: EmailTemplateContext): string {
  return text.replace(TOKEN, (_match, field: string) => resolve(context, field));
}

export function homequoteSystemValues(): Required<NonNullable<EmailTemplateContext['homequote']>> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://homequotenet.com';
  return {
    phone: process.env.HOMEQUOTE_PHONE ?? '',
    siteUrl,
    portalUrl: `${siteUrl.replace(/\/$/, '')}/sign-in`,
    supportEmail: process.env.GMAIL_FROM_EMAIL ?? 'support@homequotenet.com',
  };
}
