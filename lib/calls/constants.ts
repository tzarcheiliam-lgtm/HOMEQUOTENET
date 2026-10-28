import type { ProspectDisposition, SalesAppointmentStatus } from '@/lib/types';

type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'muted'
  | 'outline';

/**
 * Every call outcome, in the order a caller sees them. `queue` says whether a
 * prospect with this disposition still belongs in an active calling list;
 * terminal outcomes (not interested, wrong number, duplicate, do not call)
 * leave the queue for good.
 */
export const DISPOSITIONS: {
  value: ProspectDisposition;
  label: string;
  variant: BadgeVariant;
  queue: boolean;
  /** Counts as reaching a decision-maker for the contact-rate metric. */
  dmReached: boolean;
}[] = [
  { value: 'new', label: 'New', variant: 'default', queue: true, dmReached: false },
  { value: 'calling', label: 'Calling', variant: 'secondary', queue: true, dmReached: false },
  { value: 'no_answer', label: 'No answer', variant: 'muted', queue: true, dmReached: false },
  { value: 'left_voicemail', label: 'Left voicemail', variant: 'muted', queue: true, dmReached: false },
  { value: 'gatekeeper', label: 'Gatekeeper', variant: 'secondary', queue: true, dmReached: false },
  { value: 'spoke_with_dm', label: 'Spoke with decision maker', variant: 'secondary', queue: true, dmReached: true },
  { value: 'callback_requested', label: 'Callback requested', variant: 'warning', queue: true, dmReached: true },
  { value: 'interested', label: 'Interested', variant: 'success', queue: true, dmReached: true },
  { value: 'follow_up_required', label: 'Follow-up required', variant: 'warning', queue: true, dmReached: true },
  { value: 'appointment_booked', label: 'Appointment booked', variant: 'success', queue: false, dmReached: true },
  { value: 'not_interested', label: 'Not interested', variant: 'muted', queue: false, dmReached: true },
  { value: 'wrong_number', label: 'Wrong number', variant: 'muted', queue: false, dmReached: false },
  { value: 'duplicate', label: 'Duplicate', variant: 'muted', queue: false, dmReached: false },
  { value: 'do_not_call', label: 'Do not call', variant: 'muted', queue: false, dmReached: false },
];

export const DISPOSITION_LABELS = Object.fromEntries(
  DISPOSITIONS.map((d) => [d.value, d.label])
) as Record<ProspectDisposition, string>;

export function dispositionVariant(d: ProspectDisposition): BadgeVariant {
  return DISPOSITIONS.find((x) => x.value === d)?.variant ?? 'muted';
}

/** Dispositions that keep a prospect in an active calling queue. */
export const QUEUE_DISPOSITIONS = DISPOSITIONS.filter((d) => d.queue).map(
  (d) => d.value
);

/** Outcomes that mean a decision-maker was actually reached. */
export const DM_REACHED_OUTCOMES = DISPOSITIONS.filter((d) => d.dmReached).map(
  (d) => d.value
);

/** The outcomes a caller can pick when logging a call (everything but 'new'). */
export const LOGGABLE_OUTCOMES = DISPOSITIONS.filter(
  (d) => d.value !== 'new'
).map((d) => d.value);

/**
 * One-tap outcomes: nothing else to fill in, so picking one saves the call and
 * opens the next prospect straight away. Each must have no required fields
 * (pinned by tests/calls-goals.test.ts against requiredFieldsFor).
 */
export const QUICK_OUTCOMES: ProspectDisposition[] = [
  'no_answer',
  'left_voicemail',
  'gatekeeper',
  'spoke_with_dm',
  'not_interested',
  'wrong_number',
  // One tap: blocks the number everywhere and moves on. Deliberately has no keyboard key.
  'do_not_call',
];

/** Short labels for the quick buttons. */
export const QUICK_LABELS: Partial<Record<ProspectDisposition, string>> = {
  no_answer: 'No answer',
  left_voicemail: 'Voicemail',
  gatekeeper: 'Gatekeeper',
  spoke_with_dm: 'Spoke w/ DM',
  not_interested: 'Not interested',
  wrong_number: 'Wrong #',
  do_not_call: 'Do not call',
};

/** Keyboard shortcuts in the calling workspace: digit → outcome. */
export const OUTCOME_KEYS: Record<string, ProspectDisposition> = {
  '1': 'no_answer',
  '2': 'left_voicemail',
  '3': 'gatekeeper',
  '4': 'spoke_with_dm',
  '5': 'callback_requested',
  '6': 'interested',
  '7': 'appointment_booked',
  '8': 'not_interested',
  '9': 'wrong_number',
  '0': 'follow_up_required',
};

export const SALES_APPOINTMENT_STATUSES: {
  value: SalesAppointmentStatus;
  label: string;
  variant: BadgeVariant;
}[] = [
  { value: 'scheduled', label: 'Scheduled', variant: 'secondary' },
  { value: 'confirmed', label: 'Confirmed', variant: 'success' },
  { value: 'rescheduled', label: 'Rescheduled', variant: 'warning' },
  { value: 'completed', label: 'Completed', variant: 'success' },
  { value: 'no_show', label: 'No-show', variant: 'muted' },
  { value: 'cancelled', label: 'Cancelled', variant: 'muted' },
];

export const SALES_APPOINTMENT_STATUS_LABELS = Object.fromEntries(
  SALES_APPOINTMENT_STATUSES.map((s) => [s.value, s.label])
) as Record<SalesAppointmentStatus, string>;

export function salesAppointmentVariant(s: SalesAppointmentStatus): BadgeVariant {
  return SALES_APPOINTMENT_STATUSES.find((x) => x.value === s)?.variant ?? 'muted';
}

export const APPOINTMENT_TYPES: { value: string; label: string }[] = [
  { value: 'phone', label: 'Phone call' },
  { value: 'video', label: 'Video call' },
  { value: 'in_person', label: 'In person' },
];

export const CONTACT_METHODS: { value: string; label: string }[] = [
  { value: 'phone', label: 'Phone' },
  { value: 'text', label: 'Text message' },
  { value: 'email', label: 'Email' },
];

export const TIME_ZONES: { value: string; label: string }[] = [
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Phoenix', label: 'Arizona (Phoenix)' },
  { value: 'America/Denver', label: 'Mountain (Denver)' },
  { value: 'America/Chicago', label: 'Central (Chicago)' },
  { value: 'America/New_York', label: 'Eastern (New York)' },
];

/** Saved views on /app/calls. `adminOnly` views need the admin role. */
export type CallView =
  | 'mine'
  | 'liam'
  | 'nadav'
  | 'all'
  | 'new'
  | 'callbacks'
  | 'interested'
  | 'booked'
  | 'dnc';

export const CALL_VIEWS: { value: CallView; label: string; adminOnly: boolean }[] = [
  { value: 'mine', label: 'My Call List', adminOnly: false },
  { value: 'liam', label: "Liam's Call List", adminOnly: true },
  { value: 'nadav', label: "Nadav's Call List", adminOnly: true },
  { value: 'all', label: 'All Prospects', adminOnly: true },
  { value: 'new', label: 'New Prospects', adminOnly: false },
  { value: 'callbacks', label: 'Callbacks Due', adminOnly: false },
  { value: 'interested', label: 'Interested', adminOnly: false },
  { value: 'booked', label: 'Appointments Booked', adminOnly: false },
  { value: 'dnc', label: 'Do Not Call', adminOnly: false },
];

export type CallSort = 'oldest' | 'newest' | 'fewest_attempts' | 'next_callback';

export const CALL_SORTS: { value: CallSort; label: string }[] = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'fewest_attempts', label: 'Fewest attempts' },
  { value: 'next_callback', label: 'Next callback' },
];

export const CALL_PAGE_SIZE = 50;
