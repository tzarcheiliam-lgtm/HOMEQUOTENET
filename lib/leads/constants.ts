import type { LeadStatus, QualificationStatus } from '@/lib/types';

// Pipeline statuses in canonical order, with display labels and badge styling.
export const LEAD_STATUSES: {
  value: LeadStatus;
  label: string;
  variant: 'default' | 'secondary' | 'success' | 'warning' | 'muted' | 'outline';
}[] = [
  { value: 'new', label: 'New', variant: 'default' },
  { value: 'contact_attempted', label: 'Contact Attempted', variant: 'warning' },
  { value: 'qualified', label: 'Qualified', variant: 'secondary' },
  { value: 'assigned', label: 'Assigned', variant: 'secondary' },
  { value: 'appointment_set', label: 'Appointment Set', variant: 'secondary' },
  { value: 'appointment_completed', label: 'Appointment Completed', variant: 'secondary' },
  { value: 'estimate_sent', label: 'Estimate Sent', variant: 'secondary' },
  { value: 'sold', label: 'Sold', variant: 'success' },
  { value: 'lost', label: 'Lost', variant: 'muted' },
  { value: 'cancelled', label: 'Cancelled', variant: 'muted' },
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = Object.fromEntries(
  LEAD_STATUSES.map((s) => [s.value, s.label])
) as Record<LeadStatus, string>;

export function leadStatusVariant(status: LeadStatus) {
  return LEAD_STATUSES.find((s) => s.value === status)?.variant ?? 'muted';
}

// Lead sources (advertising and manual channels).
export const LEAD_SOURCES: { value: string; label: string }[] = [
  { value: 'meta', label: 'Meta (Facebook/Instagram)' },
  { value: 'google', label: 'Google Ads' },
  { value: 'website', label: 'Website Form' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'referral', label: 'Referral' },
  { value: 'nextdoor', label: 'Nextdoor' },
  { value: 'manual', label: 'Manual Entry' },
  { value: 'other', label: 'Other' },
];

export const LEAD_SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  LEAD_SOURCES.map((s) => [s.value, s.label])
);

// Per-contractor assignment funnel statuses.
export const ASSIGNMENT_STATUSES: { value: string; label: string }[] = [
  { value: 'assigned', label: 'New' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'appointment_set', label: 'Appointment Booked' },
  { value: 'appointment_held', label: 'Appointment Held' },
  { value: 'estimate_given', label: 'Estimate Given' },
  { value: 'sold', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'not_qualified', label: 'Not Qualified' },
  { value: 'returned', label: 'Returned' },
];

export const APPOINTMENT_STATUSES: { value: string; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'held', label: 'Held' },
  { value: 'no_show', label: 'No Show' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

export const URGENCY_OPTIONS = ['low', 'medium', 'high'] as const;

export const TIMELINE_OPTIONS = [
  'Immediate',
  'This month',
  '1-3 months',
  '3-6 months',
  '6+ months',
  'Just researching',
];

export const BUDGET_RANGES = [
  'Under $5k',
  '$5k-$15k',
  '$15k-$30k',
  '$30k-$60k',
  '$60k-$100k',
  '$100k+',
];

// Human review of a new lead (migration 0016). Only "qualified" leads can be sent.
export const QUALIFICATION_STATUSES: {
  value: QualificationStatus;
  label: string;
  help: string;
  variant: 'warning' | 'success' | 'muted';
}[] = [
  { value: 'needs_qualification', label: 'Needs qualification', help: 'Not reviewed yet', variant: 'warning' },
  { value: 'qualified', label: 'Qualified', help: 'Ready to send', variant: 'success' },
  { value: 'not_qualified', label: 'Not qualified', help: 'Won’t be sent', variant: 'muted' },
  // Set automatically by a funnel's hard service-area gate (migration 0034), never by
  // human review — distinct from 'not_qualified' so staff can tell "wrong state" apart
  // from "reviewed and declined" at a glance.
  { value: 'out_of_service_area', label: 'Outside service area', help: 'Won’t be sent — project is outside the service area', variant: 'muted' },
];

export const QUALIFICATION_STATUS_LABELS: Record<QualificationStatus, string> = Object.fromEntries(
  QUALIFICATION_STATUSES.map((s) => [s.value, s.label])
) as Record<QualificationStatus, string>;

export function qualificationVariant(status: QualificationStatus): 'warning' | 'success' | 'muted' {
  return QUALIFICATION_STATUSES.find((s) => s.value === status)?.variant ?? 'muted';
}

// ---------------------------------------------------------------------------------------------------
// Qualification definition and reasons (Meta outcome reporting uses these; keep them short and explicit)
// ---------------------------------------------------------------------------------------------------
/**
 * What "qualified" means in HomeQuote Network. A form submission is NEVER automatically qualified: the funnel's
 * rules only record a service-area / eligibility verdict. A lead is qualified when a person (or an AI call that
 * followed these same criteria and saved its evidence) has confirmed ALL of:
 *  1. a real, reachable homeowner (valid contact, not spam or a test);
 *  2. a project in a service the network covers, inside the service area;
 *  3. a stated timeline and budget that are plausible for the project;
 *  4. consent to be contacted.
 */
export const QUALIFICATION_DEFINITION =
  'Qualified = a person (or an AI call following these criteria, with its evidence saved) confirmed a reachable homeowner, ' +
  'an in-area project in a covered service, a plausible timeline and budget, and consent to be contacted. A submission alone is never qualified.';

export const QUALIFIED_REASONS = [
  { value: 'confirmed_by_call', label: 'Confirmed by phone' },
  { value: 'confirmed_by_text', label: 'Confirmed by text message' },
  { value: 'confirmed_by_email', label: 'Confirmed by email' },
  { value: 'meets_criteria_on_form', label: 'Form answers meet all criteria' },
] as const;

export const NOT_QUALIFIED_REASONS = [
  { value: 'unreachable', label: 'Could not reach' },
  { value: 'out_of_area', label: 'Outside service area' },
  { value: 'service_not_offered', label: 'Service not offered' },
  { value: 'not_homeowner', label: 'Not the homeowner' },
  { value: 'budget_too_low', label: 'Budget too low' },
  { value: 'not_ready', label: 'Not ready / just browsing' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'spam_or_test', label: 'Spam or test' },
  { value: 'other', label: 'Other' },
] as const;

export function reasonAllowed(status: string, reason: string): boolean {
  if (status === 'qualified') return QUALIFIED_REASONS.some((r) => r.value === reason);
  if (status === 'not_qualified') return NOT_QUALIFIED_REASONS.some((r) => r.value === reason);
  return false;
}
