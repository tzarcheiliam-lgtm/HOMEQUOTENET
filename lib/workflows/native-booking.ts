/**
 * Built-in booking notices vs the old appointment workflow templates.
 *
 * Calls booked on a HomeQuote booking calendar (migration 0068) get their
 * confirmation, 24 h / 1 h reminders and cancellation notice automatically
 * (lib/booking/notify.server.ts). Workflows cloned from the "Appointment
 * Confirmation" templates would send the same messages a second time, so the
 * engines skip those workflows for calendar bookings (event payload carries
 * `calendarId`). On-site visits booked by staff (no calendar) still run them,
 * and custom appointment.* workflows are untouched.
 */
export const SUPERSEDED_WORKFLOW_TEMPLATES: readonly string[] = ['appointment_confirmation', 'appointment_confirmation_reminder'];

export function supersededByNativeBooking(templateKey: string | null | undefined, eventType: string, payload: Record<string, unknown> | null | undefined): boolean {
  if (!templateKey || !SUPERSEDED_WORKFLOW_TEMPLATES.includes(templateKey)) return false;
  if (!eventType.startsWith('appointment.')) return false;
  const calendarId = payload?.calendarId;
  return typeof calendarId === 'string' && calendarId.length > 0;
}
