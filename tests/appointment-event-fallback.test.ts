import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { mapAppointment, toIcsEvent } from '@/lib/calendar/appointment-event.server';

// HomeQuote team-calendar bookings (0070) can exist before any contractor is matched:
// no assignment, so the lead comes from appointments.lead_id, then the booking contact.
describe('appointment event mapping without an assignment', () => {
  it('reads the lead through appointments.lead_id and keeps the calendar and end time', () => {
    const a = mapAppointment({
      id: 'appt-1', calendar_id: 'cal-team', scheduled_at: '2026-10-30T17:00:00Z', ends_at: '2026-10-30T17:30:00Z', status: 'scheduled',
      assignment: null, direct_lead: { id: 'lead-1', first_name: 'Maria', last_name: 'Lopez', phone: '+13105550142', city: 'Encino', vertical: { name: 'Bathroom Remodel' } },
    });
    expect(a).toMatchObject({ leadId: 'lead-1', customerName: 'Maria Lopez', firstName: 'Maria', phone: '+13105550142', calendarId: 'cal-team', contractorId: null, project: 'Bathroom Remodel' });
    const ics = toIcsEvent(a, 60)!;
    expect(ics.endMs - ics.startMs).toBe(30 * 60_000); // its own 30 minutes, not the 60-minute visit default
  });
  it('falls back to the contact typed at booking, then the default length', () => {
    const a = mapAppointment({ id: 'appt-2', scheduled_at: '2026-10-30T17:00:00Z', status: 'scheduled', contact_name: 'Dan Rivera', contact_phone: '+18182034471' });
    expect(a).toMatchObject({ customerName: 'Dan Rivera', firstName: 'Dan', phone: '+18182034471', leadId: null });
    const ics = toIcsEvent(a, 60)!;
    expect(ics.endMs - ics.startMs).toBe(60 * 60_000);
  });
});
