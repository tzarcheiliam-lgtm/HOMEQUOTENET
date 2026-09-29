import { DEFAULT_TZ } from '@/components/calls/format';

export type AppointmentTab = 'today' | 'upcoming' | 'past';

export const APPOINTMENT_TABS: { value: AppointmentTab; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

/** yyyy-mm-dd of an instant in the workspace time zone. */
function dayKey(d: Date, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Which phone tab an appointment belongs to. Days are the workspace's (Los
 * Angeles) days, matching how the calling workspace already reads times. An
 * appointment with no time set is treated as upcoming so it is never lost.
 */
export function appointmentTab(
  scheduledAt: string | null,
  now: Date = new Date()
): AppointmentTab {
  if (!scheduledAt) return 'upcoming';
  const t = new Date(scheduledAt);
  if (Number.isNaN(t.getTime())) return 'upcoming';
  const today = dayKey(now);
  const day = dayKey(t);
  if (day === today) return 'today';
  return day > today ? 'upcoming' : 'past';
}

/** "Today", "Tomorrow" or "Tue, Oct 1" for the card's date line. */
export function dayLabel(scheduledAt: string | null, now: Date = new Date()): string {
  if (!scheduledAt) return 'No time set';
  const t = new Date(scheduledAt);
  if (Number.isNaN(t.getTime())) return 'No time set';
  const day = dayKey(t);
  if (day === dayKey(now)) return 'Today';
  if (day === dayKey(new Date(now.getTime() + 24 * 3600 * 1000))) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(t);
}

export function timeLabel(scheduledAt: string | null): string {
  if (!scheduledAt) return '';
  const t = new Date(scheduledAt);
  if (Number.isNaN(t.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TZ,
    hour: 'numeric',
    minute: '2-digit',
  }).format(t);
}

/** A maps directions URL, or null when there is nothing to navigate to. */
export function directionsUrl(parts: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  location?: string | null;
}): string | null {
  const dest =
    [parts.address, parts.city, parts.state, parts.zip].filter(Boolean).join(', ') ||
    parts.location ||
    '';
  if (!dest) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
