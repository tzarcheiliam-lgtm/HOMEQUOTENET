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
  { value: 'assigned', label: 'Assigned' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'appointment_set', label: 'Appointment Set' },
  { value: 'appointment_held', label: 'Appointment Held' },
  { value: 'estimate_given', label: 'Estimate Given' },
  { value: 'sold', label: 'Sold' },
  { value: 'lost', label: 'Lost' },
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
];

export const QUALIFICATION_STATUS_LABELS: Record<QualificationStatus, string> = Object.fromEntries(
  QUALIFICATION_STATUSES.map((s) => [s.value, s.label])
) as Record<QualificationStatus, string>;

export function qualificationVariant(status: QualificationStatus) {
  return QUALIFICATION_STATUSES.find((s) => s.value === status)?.variant ?? 'muted';
}
