import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { zonedToUtc } from '@/lib/availability/time';
import { calendarSlots, groupSlotsByDay, slotProblem, type CalendarState } from '@/lib/booking/slots';
import { DEFAULT_CALENDAR, type BookingCalendar } from '@/lib/booking/types';
import { formatForHomeowner, formatRange, formatSlot } from '@/lib/booking/format';
import { hashManageToken, isManageTokenShape, newManageToken } from '@/lib/booking/tokens';

const TZ = 'America/Los_Angeles';
const at = (date: string, hh: number, mm = 0) => zonedToUtc(date, hh * 60 + mm, TZ);
const cal: BookingCalendar = { ...DEFAULT_CALENDAR, id: 'cal', kind: 'team', contractorId: null, name: 'HomeQuote team' };
const weekdays = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 540, endMinute: 1020 }));
// Monday 2026-11-02 08:00 PST (the day after DST ends).
const NOW = at('2026-11-02', 8);
const state = (over: Partial<CalendarState> = {}): CalendarState => ({
  calendar: cal, rules: weekdays, exceptions: [], busy: [], externalBusy: [], nowMs: NOW, ...over,
});
const daySlots = (s: CalendarState, date: string) => calendarSlots(s, at(date, 0), at(date, 23, 59));
const times = (slots: { startMs: number }[]) => slots.map((x) => new Date(x.startMs).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }));

describe('calendarSlots (9–5 Mon–Fri, 30 min, 15 min buffer, 2 h notice, 14 days)', () => {
  it('offers 30-minute starts inside hours, after the notice period', () => {
    const mon = daySlots(state(), '2026-11-02');
    expect(times(mon)[0]).toBe('10:00 AM'); // 8:00 + 2 h notice
    expect(times(mon).at(-1)).toBe('4:30 PM'); // ends at 5:00
    expect(mon).toHaveLength(14);
    expect(daySlots(state(), '2026-11-03')).toHaveLength(16);
    expect(daySlots(state(), '2026-11-07')).toHaveLength(0); // Saturday
  });

  it('keeps the buffer around existing bookings', () => {
    const busy = [{ kind: 'appointment' as const, id: 'a', startMs: at('2026-11-03', 11), endMs: at('2026-11-03', 11, 30) }];
    const t = times(daySlots(state({ busy }), '2026-11-03'));
    expect(t).toContain('10:00 AM');
    expect(t).not.toContain('10:30 AM');
    expect(t).not.toContain('11:00 AM');
    expect(t).not.toContain('11:30 AM');
    expect(t).toContain('12:00 PM');
    // Rescheduling that booking ignores it.
    expect(times(calendarSlots(state({ busy }), at('2026-11-03', 0), at('2026-11-03', 23), { excludeId: 'a' }))).toContain('11:00 AM');
  });

  it('honors the horizon, exceptions, daily cap and host busy time', () => {
    const all = calendarSlots(state(), NOW, NOW + 30 * 86_400_000);
    expect(Math.max(...all.map((s) => s.startMs))).toBeLessThanOrEqual(NOW + 14 * 86_400_000);
    const exceptions = [
      { kind: 'blocked' as const, dateStart: '2026-11-04', dateEnd: '2026-11-04', startMinute: null, endMinute: null, repeatWeekly: false, repeatUntil: null },
      { kind: 'available' as const, dateStart: '2026-11-07', dateEnd: '2026-11-07', startMinute: 600, endMinute: 720, repeatWeekly: false, repeatUntil: null },
    ];
    expect(daySlots(state({ exceptions }), '2026-11-04')).toHaveLength(0);
    expect(times(daySlots(state({ exceptions }), '2026-11-07'))).toEqual(['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM']);
    const capped = state({ calendar: { ...cal, maxPerDay: 1 }, busy: [{ kind: 'appointment', id: 'x', startMs: at('2026-11-03', 9), endMs: at('2026-11-03', 9, 30) }] });
    expect(daySlots(capped, '2026-11-03')).toHaveLength(0);
    const google = state({ externalBusy: [{ startMs: at('2026-11-03', 13), endMs: at('2026-11-03', 14) }] });
    expect(times(daySlots(google, '2026-11-03'))).not.toContain('1:30 PM');
  });

  it('is DST-safe: 9:00 local is 16:00Z before the change and 17:00Z after', () => {
    const fri = calendarSlots(state({ nowMs: at('2026-10-29', 8) }), at('2026-10-30', 0), at('2026-10-30', 23));
    expect(new Date(fri[0].startMs).toISOString()).toBe('2026-10-30T16:00:00.000Z');
    expect(new Date(daySlots(state(), '2026-11-03')[0].startMs).toISOString()).toBe('2026-11-03T17:00:00.000Z');
  });

  it('returns nothing for an inactive calendar', () => {
    expect(calendarSlots(state({ calendar: { ...cal, active: false } }), NOW, NOW + 86_400_000 * 3)).toEqual([]);
  });
});

describe('slotProblem (same codes as SQL booking_slot_problem)', () => {
  it('names each reason', () => {
    const busy = [{ kind: 'appointment' as const, id: 'a', startMs: at('2026-11-03', 11), endMs: at('2026-11-03', 11, 30) }];
    const s = state({ busy, exceptions: [{ kind: 'blocked', dateStart: '2026-11-05', dateEnd: '2026-11-05', startMinute: 600, endMinute: 660, repeatWeekly: false, repeatUntil: null }] });
    expect(slotProblem(s, at('2026-11-02', 9))).toBe('too_soon');
    expect(slotProblem(s, NOW + 15 * 86_400_000)).toBe('too_far');
    expect(slotProblem(s, at('2026-11-03', 8))).toBe('outside_hours');
    expect(slotProblem(s, at('2026-11-03', 16, 45))).toBe('outside_hours');
    expect(slotProblem(s, at('2026-11-03', 11, 15))).toBe('slot_taken');
    expect(slotProblem(s, at('2026-11-05', 10, 30))).toBe('blocked_time');
    expect(slotProblem(s, at('2026-11-03', 12))).toBeNull();
    expect(slotProblem(state({ externalBusy: [{ startMs: at('2026-11-03', 12), endMs: at('2026-11-03', 13) }] }), at('2026-11-03', 12))).toBe('calendar_busy');
  });

  it('override skips hours and notice but never a real overlap', () => {
    const busy = [{ kind: 'appointment' as const, id: 'a', startMs: at('2026-11-03', 11), endMs: at('2026-11-03', 11, 30) }];
    expect(slotProblem(state({ busy }), at('2026-11-03', 20), { override: true })).toBeNull();
    expect(slotProblem(state({ busy }), at('2026-11-03', 11, 30), { override: true })).toBeNull(); // buffer ignored
    expect(slotProblem(state({ busy }), at('2026-11-03', 11, 15), { override: true })).toBe('slot_taken');
  });
});

describe('grouping, formatting and tokens', () => {
  it('groups by day in the viewer zone', () => {
    const slots = daySlots(state(), '2026-11-03');
    const ny = groupSlotsByDay(slots, 'America/New_York');
    expect(ny).toHaveLength(1);
    expect(ny[0].date).toBe('2026-11-03');
    // 4:30 PM Los Angeles is 7:30 PM New York, still the same day; in Tokyo it is the next day.
    expect(groupSlotsByDay(slots, 'Asia/Tokyo').map((d) => d.date)).toEqual(['2026-11-04']);
  });

  it('always shows the zone', () => {
    const t = at('2026-11-03', 9, 30);
    expect(formatSlot(t, TZ)).toBe('Tue, Nov 3 · 9:30 AM PST');
    expect(formatSlot(at('2026-10-30', 9), TZ)).toContain('PDT');
    expect(formatForHomeowner(t, 'America/New_York', TZ)).toBe('Tue, Nov 3 · 12:30 PM EST');
    expect(formatForHomeowner(t, 'Not/AZone', TZ)).toBe('Tue, Nov 3 · 9:30 AM PST');
    expect(formatRange(t, t + 30 * 60_000, TZ)).toBe('9:30 AM – 10:00 AM PST');
  });

  it('manage tokens: 32 random bytes, only the sha256 is stored', () => {
    const { token, hash } = newManageToken();
    expect(isManageTokenShape(token)).toBe(true);
    expect(hash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(hashManageToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(newManageToken().token).not.toBe(token);
    expect(isManageTokenShape('short')).toBe(false);
    expect(isManageTokenShape(`${token}x`)).toBe(false);
  });
});
