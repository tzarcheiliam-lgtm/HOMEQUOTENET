import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { zonedToUtc } from '@/lib/availability/time';
import { SlotPicker, SlotPickerSkeleton } from '@/components/booking/slot-picker';
import { BookedView, BookingFlow, fillIntro } from '@/components/booking/booking-flow';
import { CallHow } from '@/components/booking/call-summary';
import { ManageBooking } from '@/components/booking/manage-booking';
import { callDetails, callTitle, googleCalendarLink } from '@/components/booking/calendar-links';
import { flowReducer, initialFlow, nextIndex, type FlowState } from '@/components/booking/flow-state';
import type { PublicBooking, PublicCalendar, PublicSlot } from '@/components/booking/types';
import { sameClock, zoneCity, zoneLabel, zoneLabelRange } from '@/components/booking/zone';

/**
 * The homeowner booking UI (components/booking/**): the Buildoly-style picker
 * (day headings, stacked full-width blue time buttons, listbox semantics, zone
 * note, "Show more days" / "N more times"), the skeleton, "You're booked",
 * the manage page states, and the flow reducer that drives select -> confirm
 * -> booked. Server-rendered markup only (no DOM, no network).
 */
const LA = 'America/Los_Angeles';
const at = (date: string, h: number, m = 0) => new Date(zonedToUtc(date, h * 60 + m, LA)).toISOString();
function day(date: string, hours: number[]): PublicSlot[] {
  return hours.flatMap((h) => [0, 30].map((m) => ({ start: at(date, h, m), end: new Date(Date.parse(at(date, h, m)) + 30 * 60_000).toISOString() })));
}
// Winter dates (PST) so the zone label is stable.
const slots = [...day('2026-12-01', [9, 10, 11, 12]), ...day('2026-12-02', [13]), ...day('2026-12-03', [9]), ...day('2026-12-04', [15]), ...day('2026-12-07', [9])];
const calendar: PublicCalendar = { hostName: 'Pool Masters LA', kind: 'contractor', timeZone: LA, durationMinutes: 30, meetingType: 'phone', host: null };
const booking: PublicBooking = {
  status: 'scheduled', startsAt: at('2026-12-01', 9, 30), endsAt: at('2026-12-01', 10), timeZone: LA, inviteeTimeZone: LA, meetingType: 'phone',
  hostName: 'Pool Masters LA', kind: 'contractor', hostPhone: '+18186436888', durationMinutes: 30, firstName: 'Sam', phoneHint: '0123', videoLink: null,
  manageUrl: '/booking/manage/' + 'a'.repeat(43), icsUrl: '/api/booking/manage/' + 'a'.repeat(43) + '/ics', canChange: true, host: null,
};
const LIAM = {
  displayName: 'Liam from Pool Masters', firstName: 'Liam', org: 'Pool Masters LA', phone: '+17472175713', phoneDisplay: '(747) 217-5713',
  photoUrl: '/images/brand/poolmasters-logo.png', vcardUrl: '/api/booking/contact/11111111-1111-4111-8111-111111111111.vcf',
};
/** The Pool Masters calendar as shipped: Liam calls for a quick 10-minute call. */
const liamBooking: PublicBooking = { ...booking, startsAt: at('2026-12-01', 9, 15), endsAt: at('2026-12-01', 9, 25), durationMinutes: 10, host: LIAM };
const picker = (p: Partial<Parameters<typeof SlotPicker>[0]> = {}) =>
  renderToStaticMarkup(<SlotPicker slots={slots} timeZone={LA} onSelect={() => undefined} {...p} />);
const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('SlotPicker', () => {
  it('shows day headings over full-width time buttons, three days at first, six times a day', () => {
    const h = picker();
    expect(h).toContain('Times are in Pacific Time (PST).');
    expect(h).toContain('Tuesday, December 1');
    expect(h).toContain('Wednesday, December 2');
    expect(h).toContain('Thursday, December 3');
    expect(h).not.toContain('Friday, December 4');
    expect(count(h, 'class="bk-slot"')).toBe(6 + 2 + 2);
    expect(h).toContain('>9:00 AM<');
    expect(h).toContain('2 more times');
    expect(h).toContain('Show more days');
  });

  it('is one listbox per day, labelled by its heading, with one tab stop each', () => {
    const h = picker({ headingLevel: 2 });
    expect(count(h, 'role="listbox"')).toBe(3);
    expect(count(h, 'role="option"')).toBe(10);
    expect(count(h, 'tabindex="0"')).toBe(3);
    const heading = /<h2 id="([^"]+)"[^>]*>Tuesday, December 1<\/h2>/.exec(h);
    expect(heading).toBeTruthy();
    expect(h).toContain(`role="listbox" aria-labelledby="${heading![1]}"`);
  });

  it('marks the selection and puts the tab stop on it', () => {
    const sel = at('2026-12-01', 10, 30);
    const h = picker({ selected: sel });
    expect(count(h, 'aria-selected="true"')).toBe(1);
    expect(h).toMatch(new RegExp(`aria-selected="true" tabindex="0"[^>]*data-slot-start="${sel}"`));
  });

  it('groups and labels in the viewer’s zone, and offers the calendar’s zone when the clock differs', () => {
    const h = picker({ timeZone: 'America/New_York', zoneChoices: ['America/New_York', LA], onTimeZoneChange: () => undefined });
    expect(h).toContain('Times are in Eastern Time (EST).');
    expect(h).toContain('>12:00 PM<'); // 9:00 AM Pacific
    expect(h).toContain('Show Los Angeles time');
    expect(picker({ zoneChoices: [LA, LA], onTimeZoneChange: () => undefined })).not.toContain('Show Los Angeles');
  });

  it('shows the current time on the reschedule picker without offering it', () => {
    const cur = at('2026-12-01', 9, 30);
    const h = picker({ current: cur, slots: slots.filter((s) => s.start !== cur) });
    expect(h).toContain('(your current time)');
    expect(h).toMatch(new RegExp(`aria-disabled="true"[^>]*data-slot-start="${cur}"`));
  });

  it('the skeleton has the picker’s footprint and is hidden from assistive tech', () => {
    const h = renderToStaticMarkup(<SlotPickerSkeleton />);
    expect(h).toContain('aria-hidden="true"');
    expect(count(h, 'bk-skeleton h-14 w-full')).toBe(8);
  });
});

describe('BookingFlow and BookedView', () => {
  it('starts with the heading and a skeleton (no request during server render)', () => {
    const h = renderToStaticMarkup(<BookingFlow grant="hqb1.x" intro="Review your price on a free call." />);
    expect(h).toContain('Book your free call');
    expect(h).toContain('Review your price on a free call.');
    expect(h).toContain('data-booking-skeleton');
    expect(h).toContain('role="status"');
  });

  it('confirms the booking with the call details, Add to calendar and the change link', () => {
    const h = renderToStaticMarkup(<BookedView booking={booking} timeZone={LA} />);
    expect(h).toContain('You’re booked, Sam');
    expect(h).toContain('Tuesday, December 1');
    expect(h).toContain('>9:30 AM<');
    expect(h).toContain('to 10:00 AM PST');
    expect(h).toContain('A 30-minute phone call with Pool Masters LA.');
    expect(h).not.toContain('data-booking-save-contact'); // no host contact: no card
    expect(h).toContain('They will call you at the number ending <span class="tabular-nums">0123</span>');
    expect(h).toContain('Google Calendar');
    expect(h).toContain(`href="${booking.icsUrl}"`);
    expect(h).toContain(`href="${booking.manageUrl}"`);
  });

  it('without a manage link (an old external booking) points to the confirmation email, never the text', () => {
    const h = renderToStaticMarkup(<BookedView booking={{ ...booking, manageUrl: null, icsUrl: null }} timeZone={LA} />);
    expect(h).toContain('Use the link in your confirmation email');
    expect(h).not.toContain('text or email');
    expect(h).not.toContain('Google Calendar');
  });

  it('promises a text only to homeowners, and can leave the heading to the host page', () => {
    expect(renderToStaticMarkup(<BookedView booking={booking} timeZone={LA} />)).toContain('We’ll text and email you the details');
    const sales = renderToStaticMarkup(<BookedView booking={{ ...booking, kind: 'sales', hostName: 'HomeQuote' }} timeZone={LA} hideHeading />);
    expect(sales).toContain('We’ll email you the details');
    expect(sales).not.toContain('text and email');
    expect(sales).not.toContain('You’re booked');
  });
});

describe('Liam as the caller (10-minute calls, contact card)', () => {
  it('"You’re booked": the time large, who calls, the contact card with "Save Liam’s number", Add to calendar, then change', () => {
    const h = renderToStaticMarkup(<BookedView booking={liamBooking} timeZone={LA} />);
    expect(h).toContain('You’re booked, Sam');
    expect(h).toContain('>9:15 AM<');
    expect(h).toContain('to 9:25 AM PST');
    expect(h).toContain('A quick 10-minute call. <span class="font-medium text-[var(--bk-ink)]">Liam from Pool Masters</span> will call you at the number ending <span class="tabular-nums">0123</span>.');
    expect(h).toContain('src="/images/brand/poolmasters-logo.png"');
    expect(h).toContain(`href="${LIAM.vcardUrl}" data-booking-save-contact=""`);
    expect(h).toContain('Save Liam’s number');
    expect(h).toContain('(747) 217-5713');
    expect(h).not.toContain(' download');
    // Order: the card comes before Add to calendar, and the change link last.
    expect(h.indexOf('data-booking-save-contact')).toBeLessThan(h.indexOf('data-booking-add-to-calendar'));
    expect(h.indexOf('data-booking-add-to-calendar')).toBeLessThan(h.indexOf('data-booking-manage'));
  });

  it('a host with no number to save shows the wording but no card; network funnels read "Liam from HomeQuote"', () => {
    const h = renderToStaticMarkup(<BookedView booking={{ ...liamBooking, host: { ...LIAM, phone: null, phoneDisplay: null, vcardUrl: null } }} timeZone={LA} />);
    expect(h).toContain('Liam from Pool Masters</span> will call you');
    expect(h).not.toContain('data-booking-save-contact');
    const team = renderToStaticMarkup(<CallHow meetingType="phone" hostName="a HomeQuote project specialist" durationMinutes={10} phoneHint="4567" host={{ ...LIAM, displayName: 'Liam from HomeQuote' }} />);
    expect(team).toContain('A quick 10-minute call. <span class="font-medium text-[var(--bk-ink)]">Liam from HomeQuote</span> will call you at the number ending');
    // A longer call is not "quick".
    expect(renderToStaticMarkup(<CallHow meetingType="phone" hostName="HomeQuote" durationMinutes={30} phoneHint={null} host={LIAM} />)).toContain('A 30-minute call. ');
  });

  it('fills the funnel intro from the calendar once it has loaded', () => {
    const intro = 'Pick a time for a quick {minutes}-minute call with {host}.';
    expect(fillIntro(intro, null)).toBeNull();
    expect(fillIntro(intro, { ...calendar, durationMinutes: 10, host: LIAM })).toBe('Pick a time for a quick 10-minute call with Liam from Pool Masters.');
    expect(fillIntro(intro, calendar)).toBe('Pick a time for a quick 30-minute call with Pool Masters LA.');
    expect(fillIntro('No placeholders here.', null)).toBe('No placeholders here.');
    // Server render: a quiet placeholder line instead of "{minutes}".
    const h = renderToStaticMarkup(<BookingFlow grant="hqb1.x" heading={null} intro={intro} />);
    expect(h).not.toContain('{minutes}');
    expect(h).toContain('data-booking-intro');
  });

  it('the picker reads 9:00, 9:15, 9:30 … on a 15-minute grid', () => {
    const quarter = [0, 15, 30, 45].map((m) => ({ start: at('2026-12-01', 9, m), end: new Date(Date.parse(at('2026-12-01', 9, m)) + 10 * 60_000).toISOString() }));
    const h = renderToStaticMarkup(<SlotPicker slots={quarter} timeZone={LA} onSelect={() => undefined} />);
    const times = [...h.matchAll(/>(\d{1,2}:\d{2} [AP]M)</g)].map((m) => m[1]);
    expect(times).toEqual(['9:00 AM', '9:15 AM', '9:30 AM', '9:45 AM']);
  });

  it('manage page: Liam’s card with a quiet button while the call can change', () => {
    const h = renderToStaticMarkup(<ManageBooking token={'a'.repeat(43)} initial={liamBooking} />);
    expect(h).toContain('Your call with Liam from Pool Masters');
    expect(h).toContain('class="bk-secondary w-full mt-4" href="/api/booking/contact/');
    expect(renderToStaticMarkup(<ManageBooking token={'a'.repeat(43)} initial={{ ...liamBooking, status: 'cancelled', canChange: false }} />)).not.toContain('data-booking-save-contact');
  });

  it('calendar entries name Liam and the number he calls from', () => {
    expect(callTitle(liamBooking)).toBe('Phone call with Liam from Pool Masters');
    expect(callDetails(liamBooking, null)).toBe('10-minute call. Liam from Pool Masters will call you at the number ending 0123 from (747) 217-5713.');
  });
});

describe('ManageBooking', () => {
  it('shows the call with Reschedule and Cancel while it can change', () => {
    const h = renderToStaticMarkup(<ManageBooking token={'a'.repeat(43)} initial={booking} />);
    expect(h).toContain('<h1');
    expect(h).toContain('Your call with Pool Masters LA');
    expect(h).toContain('9:30 AM – 10:00 AM PST');
    expect(h).toContain('Reschedule');
    expect(h).toContain('Cancel call');
  });

  it('is read-only once cancelled or past', () => {
    const c = renderToStaticMarkup(<ManageBooking token={'a'.repeat(43)} initial={{ ...booking, status: 'cancelled', canChange: false }} />);
    expect(c).toContain('Your call is cancelled');
    expect(c).toContain('line-through');
    expect(c).not.toContain('data-booking-reschedule');
    const p = renderToStaticMarkup(<ManageBooking token={'a'.repeat(43)} initial={{ ...booking, canChange: false }} />);
    expect(p).toContain('time has passed');
    expect(p).not.toContain('data-booking-cancel-open');
  });
});

describe('flowReducer', () => {
  const loaded = flowReducer(initialFlow, { type: 'loaded', calendar, slots, booked: null, callbackRequested: false, contact: { firstName: 'Sam', phoneHint: '0123' } });

  it('loads to the picker without moving focus; a refresh after booking shows the confirmation', () => {
    expect(loaded).toMatchObject({ view: 'pick', focusKey: 0 });
    expect(flowReducer(initialFlow, { type: 'loaded', calendar, slots: [], booked: booking, callbackRequested: false, contact: loaded.contact }).view).toBe('booked');
    expect(flowReducer(initialFlow, { type: 'loaded', calendar, slots, booked: null, callbackRequested: true, contact: loaded.contact }).view).toBe('callback_sent');
  });

  it('select -> confirm (no request yet) -> booking -> booked, moving focus on each step the homeowner takes', () => {
    const t = slots[2].start;
    const c = flowReducer(loaded, { type: 'select', start: t });
    expect(c).toMatchObject({ view: 'confirm', selected: t, focusKey: 1 });
    const b = flowReducer(c, { type: 'submit' });
    expect(b.view).toBe('booking');
    expect(flowReducer(b, { type: 'booked', booking })).toMatchObject({ view: 'booked', booking, focusKey: 2 });
    expect(flowReducer(loaded, { type: 'select', start: '2020-01-01T00:00:00.000Z' })).toBe(loaded);
  });

  it('a taken time goes back to the picker without it, with the reason', () => {
    const t = slots[0].start;
    const b = flowReducer(flowReducer(flowReducer(loaded, { type: 'select', start: t }), { type: 'submit' }), { type: 'pick_another', message: 'Sorry, someone just booked that time.' });
    expect(b).toMatchObject({ view: 'pick', selected: null, message: 'Sorry, someone just booked that time.' });
    expect(b.slots.map((s) => s.start)).not.toContain(t);
    // The reload that follows keeps the message.
    expect(flowReducer(b, { type: 'loaded', calendar, slots: b.slots, booked: null, callbackRequested: false, contact: loaded.contact }).message).toMatch(/someone just booked/);
  });

  it('other failures stay put so the action can be retried', () => {
    const b: FlowState = flowReducer(flowReducer(loaded, { type: 'select', start: slots[0].start }), { type: 'submit' });
    expect(flowReducer(b, { type: 'failed', message: 'x' })).toMatchObject({ view: 'confirm', message: 'x' });
    const cb = flowReducer(loaded, { type: 'open_callback' });
    expect(cb.view).toBe('callback');
    expect(flowReducer(cb, { type: 'failed', message: 'y' }).view).toBe('callback');
    expect(flowReducer(cb, { type: 'callback_sent' })).toMatchObject({ view: 'callback_sent', callbackRequested: true });
    expect(flowReducer(cb, { type: 'back' }).view).toBe('pick');
  });

  it('"Try again" shows the skeleton while it reloads; a callback can be asked for when times will not load', () => {
    const down = flowReducer(initialFlow, { type: 'load_failed', message: 'Booking is temporarily unavailable.' });
    expect(flowReducer(down, { type: 'reload' })).toMatchObject({ view: 'loading', message: null });
    const cb = flowReducer(down, { type: 'open_callback' });
    expect(cb.view).toBe('callback');
    expect(flowReducer(cb, { type: 'back' }).view).toBe('unavailable');
  });

  it('moves list focus with the arrow keys, Home and End', () => {
    expect(nextIndex('ArrowDown', 0, 3)).toBe(1);
    expect(nextIndex('ArrowDown', 2, 3)).toBe(2);
    expect(nextIndex('ArrowUp', 0, 3)).toBe(0);
    expect(nextIndex('End', 0, 3)).toBe(2);
    expect(nextIndex('Home', 2, 3)).toBe(0);
    expect(nextIndex('Tab', 0, 3)).toBeNull();
  });
});

describe('calendar links and zones', () => {
  it('describes the call the same way for Google and .ics', () => {
    expect(callTitle(booking)).toBe('Phone call with Pool Masters LA');
    expect(callTitle({ ...booking, meetingType: 'video', hostName: 'a HomeQuote project specialist' })).toBe('Video call with a HomeQuote project specialist');
    expect(callDetails(booking, 'https://x.test/booking/manage/t')).toBe('30-minute call. Pool Masters LA will call you at the number ending 0123.\nReschedule or cancel: https://x.test/booking/manage/t');
    const g = new URL(googleCalendarLink(booking, 'https://x.test'));
    expect(g.searchParams.get('dates')).toBe('20261201T173000Z/20261201T180000Z');
    expect(g.searchParams.get('details')).toContain('https://x.test/booking/manage/');
  });

  it('names zones plainly', () => {
    expect(zoneLabel(Date.parse(at('2026-07-01', 9)), LA)).toBe('Pacific Time (PDT)');
    // A list that crosses the Nov 1 change drops the abbreviation (PDT would be wrong for half of it).
    expect(zoneLabelRange(Date.parse(at('2026-10-30', 9)), Date.parse(at('2026-11-03', 9)), LA)).toBe('Pacific Time');
    expect(zoneLabelRange(Date.parse(at('2026-11-03', 9)), Date.parse(at('2026-11-10', 9)), LA)).toBe('Pacific Time (PST)');
    expect(zoneCity('America/Los_Angeles')).toBe('Los Angeles');
    expect(sameClock('America/Los_Angeles', 'America/Tijuana', Date.parse(at('2026-12-01', 9)))).toBe(true);
    expect(sameClock('America/Los_Angeles', 'America/New_York')).toBe(false);
  });
});
