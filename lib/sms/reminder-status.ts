/**
 * The one-line reminder status shown on a meeting (sales appointments page). Pure. Rows are this meeting's
 * sms_reminders for its CURRENT time (older times belong to before a reschedule).
 */
export type ReminderChip = { label: string; tone: 'good' | 'warn' | 'muted' };
const STEP_LABEL: Record<string, string> = {
  booked: 'Booking text sent', four_days: '4-day reminder sent', day_before: 'Day-before reminder sent',
  morning_of: 'Morning reminder sent', two_hours: '2-hour reminder sent', no_show: '“Missed you” text sent',
};

export function reminderChip(rows: { step: string; status: string; created_at: string }[], confirmedAt: string | null): ReminderChip | null {
  if (rows.some((r) => r.status === 'reschedule')) return { label: 'Asked to reschedule by text', tone: 'warn' };
  if (rows.some((r) => r.status === 'confirmed')) return { label: 'Confirmed by text', tone: 'good' };
  if (rows.some((r) => r.step === 'unconfirmed_alert')) return confirmedAt ? null : { label: 'Not confirmed. Call them', tone: 'warn' };
  const sent = rows.filter((r) => r.status === 'queued').sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return sent ? { label: STEP_LABEL[sent.step] ?? 'Reminder sent', tone: 'muted' } : null;
}
