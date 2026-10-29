import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('@/lib/actions/sms', () => ({ saveReminderSettings: vi.fn(async () => ({ ok: true })) }));

import { RemindersForm, type ReminderFormValue } from '@/components/texting/reminders-form';

const blank = { booked: '', four_days: '', day_before: '', morning_of: '', two_hours: '', no_show: '' };
const value: ReminderFormValue = {
  contractor: { enabled: true, host: '', brand: '', templates: blank },
  homeowner: { enabled: true, templates: { ...blank, booked: 'Hi {first_name}, {host} here. See you {when}.' } },
  followups: { enabled: true, days: [1, 3, 7], templates: { first: '', second: '', final: '', nudge: '', nudge_last: '' } },
  unconfirmedAlert: true,
};

describe('Reminders & follow-ups card', () => {
  it('shows the schedule with live previews (8 AM morning-of included) and the custom wording', () => {
    const html = renderToStaticMarkup(<RemindersForm value={value} />);
    expect(html).toContain('8:00 AM on the day');
    expect(html).toContain('Hi Mike, Liam from HomeQuote. Just confirming our call tomorrow at 2:00 PM. Reply YES to confirm or R if you need to reschedule.');
    expect(html).toContain('Hi Sam, Acme Remodeling here. See you Thursday, Nov 6 at 2:00 PM.');
    expect(html).toContain('Day 7, if they never replied');
    expect(html).toContain('role="switch"');
  });
  it('hides a section that is switched off', () => {
    const html = renderToStaticMarkup(<RemindersForm value={{ ...value, homeowner: { ...value.homeowner, enabled: false } }} />);
    expect(html).not.toContain('Acme Remodeling here');
  });
});
