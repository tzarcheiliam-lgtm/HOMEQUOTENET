import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/actions/sales-calendar', () => ({ markSalesAppointmentAdded: vi.fn(async () => ({ ok: true })) }));

import { AddToCalendar, type AddToCalendarProps } from '@/components/calls/add-to-calendar';

const at = '2026-10-28T16:30:00.000Z';
const base: AddToCalendarProps = {
  id: '11111111-2222-4333-8444-555555555555',
  scheduledAt: at,
  cancelled: false,
  past: false,
  googleAddUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
  googleAddedDayUrl: null,
  icsUrl: '/api/calls/appointments/11111111-2222-4333-8444-555555555555/ics',
  added: { google: null, apple: null },
};
const html = (p: Partial<AddToCalendarProps>) => renderToStaticMarkup(<AddToCalendar {...base} {...p} />);

describe('AddToCalendar', () => {
  it('offers both calendars for a new upcoming meeting', () => {
    const h = html({});
    expect(h).toContain('Add to Google Calendar');
    expect(h).toContain('Add to Apple Calendar');
    expect(h).toContain('href="/api/calls/appointments/11111111-2222-4333-8444-555555555555/ics"');
  });

  it('stops offering Google once added, and links to that day instead', () => {
    const h = html({ added: { google: at, apple: null }, googleAddedDayUrl: 'https://calendar.google.com/calendar/r/day/2026/10/28' });
    expect(h).toContain('In Google Calendar');
    expect(h).not.toContain('Add to Google Calendar');
    expect(h).toContain('r/day/2026/10/28');
  });

  it('asks to move the existing event when the meeting was rescheduled', () => {
    const h = html({ added: { google: '2026-10-27T16:30:00Z', apple: '2026-10-27T16:30:00Z' }, googleAddedDayUrl: 'https://calendar.google.com/calendar/r/day/2026/10/27' });
    expect(h).toContain('Time changed: move it in Google');
    expect(h).toContain('Time changed: update Apple Calendar');
    expect(h).not.toContain('Add to Google Calendar');
  });

  it('shows nothing for a cancelled or past meeting that was never added', () => {
    expect(html({ cancelled: true })).toBe('');
    expect(html({ past: true })).toBe('');
    expect(html({ cancelled: true, added: { google: at, apple: null } })).toContain('Cancelled: remove from Google');
  });
});

describe('AddToCalendar compact', () => {
  it('uses short labels but keeps the full name for screen readers', () => {
    const h = renderToStaticMarkup(<AddToCalendar {...base} compact />);
    expect(h).toContain('Google</a>');
    expect(h).toContain('aria-label="Add to Google Calendar"');
    expect(h).toContain('aria-label="Add to Apple Calendar"');
  });
});
