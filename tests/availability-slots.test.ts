import { describe, expect, it } from 'vitest';
import {
  bookableSlots,
  DEFAULT_SETTINGS,
  unavailableIntervals,
  unavailableReason,
  type AvailabilityContext,
} from '@/lib/availability/slots';
import { addDays, localParts, parseWallTime, zonedToUtc } from '@/lib/availability/time';

const LA = 'America/Los_Angeles';
const at = (date: string, hhmm: string, tz = LA) => {
  const [h, m] = hhmm.split(':').map(Number);
  return zonedToUtc(date, h * 60 + m, tz);
};
const NOW = at('2026-01-01', '00:00');

function ctx(over: Partial<AvailabilityContext> = {}, settings: Partial<AvailabilityContext['settings']> = {}): AvailabilityContext {
  return {
    settings: { ...DEFAULT_SETTINGS, timezone: LA, ...settings },
    rules: [],
    exceptions: [],
    appointments: [],
    externalBusy: [],
    nowMs: NOW,
    ...over,
  };
}

// Mon-Fri 8-12 and 13-17
const weekdayRules = [1, 2, 3, 4, 5].flatMap((weekday) => [
  { weekday, startMinute: 8 * 60, endMinute: 12 * 60 },
  { weekday, startMinute: 13 * 60, endMinute: 17 * 60 },
]);

describe('time helpers', () => {
  it('round-trips wall time across DST', () => {
    for (const [d, hhmm] of [['2026-03-07', '10:00'], ['2026-03-09', '10:00'], ['2026-11-01', '12:00'], ['2026-07-04', '23:59']]) {
      const ms = at(d, hhmm);
      const lp = localParts(ms, LA);
      expect(lp.date).toBe(d);
      expect(lp.minuteOfDay).toBe(Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)));
    }
  });
  it('uses the right offsets before/after spring forward and fall back', () => {
    expect(at('2026-03-07', '12:00')).toBe(Date.UTC(2026, 2, 7, 20, 0)); // PST -8
    expect(at('2026-03-09', '12:00')).toBe(Date.UTC(2026, 2, 9, 19, 0)); // PDT -7
    expect(at('2026-11-02', '12:00')).toBe(Date.UTC(2026, 10, 2, 20, 0)); // PST again
  });
  it('pushes a nonexistent spring-forward time after the gap', () => {
    const ms = zonedToUtc('2026-03-08', 2 * 60 + 30, LA);
    expect(localParts(ms, LA).minuteOfDay).toBe(3 * 60 + 30);
  });
  it('parses datetime-local as wall time in the given zone', () => {
    expect(parseWallTime('2026-07-04T09:30', LA)).toBe(Date.UTC(2026, 6, 4, 16, 30));
    expect(parseWallTime('2026-07-04T09:30', 'UTC')).toBe(Date.UTC(2026, 6, 4, 9, 30));
    expect(parseWallTime('2026-07-04T09:30:00Z', LA)).toBe(Date.UTC(2026, 6, 4, 9, 30));
    expect(parseWallTime('2026-02-31T09:30', LA)).toBeNull();
    expect(parseWallTime('garbage', LA)).toBeNull();
  });
  it('addDays crosses month and year', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('unavailableReason', () => {
  it('is unrestricted when nothing is configured', () => {
    expect(unavailableReason(ctx(), at('2026-10-17', '03:00'))).toBeNull(); // Saturday 3am
  });

  it('enforces weekly windows', () => {
    const c = ctx({ rules: weekdayRules }, { weeklyScheduleEnabled: true });
    expect(unavailableReason(c, at('2026-10-14', '09:00'))).toBeNull(); // Wed
    expect(unavailableReason(c, at('2026-10-14', '12:30'))).toBe('outside_hours'); // lunch gap
    expect(unavailableReason(c, at('2026-10-14', '11:30'))).toBe('outside_hours'); // 60min runs into lunch
    expect(unavailableReason(c, at('2026-10-14', '11:30'), 30)).toBeNull();
    expect(unavailableReason(c, at('2026-10-17', '09:00'))).toBe('outside_hours'); // Saturday
  });

  it('weekly enabled with no windows means nothing is bookable', () => {
    expect(unavailableReason(ctx({}, { weeklyScheduleEnabled: true }), at('2026-10-14', '09:00'))).toBe('outside_hours');
  });

  it('blocks whole days, partial hours and date ranges', () => {
    const c = ctx({
      exceptions: [
        { kind: 'blocked', dateStart: '2026-10-14', dateEnd: '2026-10-14', startMinute: 600, endMinute: 720, repeatWeekly: false, repeatUntil: null },
        { kind: 'blocked', dateStart: '2026-10-20', dateEnd: '2026-10-22', startMinute: null, endMinute: null, repeatWeekly: false, repeatUntil: null },
      ],
    });
    expect(unavailableReason(c, at('2026-10-14', '09:30'))).toBe('blocked_time'); // 9:30-10:30 overlaps 10:00
    expect(unavailableReason(c, at('2026-10-14', '09:00'))).toBeNull();
    expect(unavailableReason(c, at('2026-10-14', '12:00'))).toBeNull();
    expect(unavailableReason(c, at('2026-10-21', '15:00'))).toBe('blocked_time');
    expect(unavailableReason(c, at('2026-10-23', '09:00'))).toBeNull();
  });

  it('repeats weekly until a date', () => {
    const c = ctx({
      exceptions: [{ kind: 'blocked', dateStart: '2026-10-05', dateEnd: '2026-10-05', startMinute: null, endMinute: null, repeatWeekly: true, repeatUntil: '2026-10-19' }],
    });
    expect(unavailableReason(c, at('2026-10-12', '10:00'))).toBe('blocked_time'); // Monday
    expect(unavailableReason(c, at('2026-10-19', '10:00'))).toBe('blocked_time');
    expect(unavailableReason(c, at('2026-10-26', '10:00'))).toBeNull(); // past until
    expect(unavailableReason(c, at('2026-10-13', '10:00'))).toBeNull(); // Tuesday
  });

  it('extra availability opens a normally-off day, but blocks still win', () => {
    const c = ctx(
      {
        rules: weekdayRules,
        exceptions: [
          { kind: 'available', dateStart: '2026-10-17', dateEnd: '2026-10-17', startMinute: 9 * 60, endMinute: 13 * 60, repeatWeekly: false, repeatUntil: null },
          { kind: 'blocked', dateStart: '2026-10-17', dateEnd: '2026-10-17', startMinute: 11 * 60, endMinute: 12 * 60, repeatWeekly: false, repeatUntil: null },
        ],
      },
      { weeklyScheduleEnabled: true }
    );
    expect(unavailableReason(c, at('2026-10-17', '09:00'))).toBeNull();
    expect(unavailableReason(c, at('2026-10-17', '11:00'))).toBe('blocked_time');
    expect(unavailableReason(c, at('2026-10-17', '14:00'))).toBe('outside_hours');
  });

  it('handles overlapping blocks and a window that ends at midnight', () => {
    const c = ctx(
      {
        rules: [{ weekday: 5, startMinute: 20 * 60, endMinute: 1440 }, { weekday: 6, startMinute: 0, endMinute: 2 * 60 }],
        exceptions: [
          { kind: 'blocked', dateStart: '2026-10-16', dateEnd: '2026-10-16', startMinute: 21 * 60, endMinute: 22 * 60, repeatWeekly: false, repeatUntil: null },
          { kind: 'blocked', dateStart: '2026-10-16', dateEnd: '2026-10-16', startMinute: 21 * 60 + 30, endMinute: 23 * 60, repeatWeekly: false, repeatUntil: null },
        ],
      },
      { weeklyScheduleEnabled: true }
    );
    expect(unavailableReason(c, at('2026-10-16', '20:00'))).toBeNull(); // Fri 8-9pm
    expect(unavailableReason(c, at('2026-10-16', '21:45'))).toBe('blocked_time');
    // Fri 23:30 -> Sat 00:30 spans midnight across two back-to-back windows
    expect(unavailableReason(c, at('2026-10-16', '23:00'), 120)).toBeNull();
  });

  it('applies buffers and conflicts, ignoring the appointment being rescheduled', () => {
    const c = ctx(
      { appointments: [{ id: 'a1', startMs: at('2026-10-14', '10:00'), endMs: at('2026-10-14', '11:00') }] },
      { bufferMinutes: 30 }
    );
    expect(unavailableReason(c, at('2026-10-14', '11:15'))).toBe('conflict');
    expect(unavailableReason(c, at('2026-10-14', '11:30'))).toBeNull();
    expect(unavailableReason(c, at('2026-10-14', '08:45'))).toBe('conflict');
    expect(unavailableReason(c, at('2026-10-14', '10:00'), 60, 'a1')).toBeNull();
  });

  it('caps appointments per local day', () => {
    const c = ctx(
      {
        appointments: [
          { startMs: at('2026-10-14', '08:00'), endMs: at('2026-10-14', '09:00') },
          { startMs: at('2026-10-14', '10:00'), endMs: at('2026-10-14', '11:00') },
        ],
      },
      { maxAppointmentsPerDay: 2 }
    );
    expect(unavailableReason(c, at('2026-10-14', '14:00'))).toBe('daily_cap');
    expect(unavailableReason(c, at('2026-10-15', '14:00'))).toBeNull();
  });

  it('counts the local day, not the UTC day, for the cap', () => {
    // 5pm PST Oct 14 is already Oct 15 in UTC
    const c = ctx({ appointments: [{ startMs: at('2026-10-14', '17:00'), endMs: at('2026-10-14', '18:00') }] }, { maxAppointmentsPerDay: 1 });
    expect(unavailableReason(c, at('2026-10-14', '09:00'))).toBe('daily_cap');
    expect(unavailableReason(c, at('2026-10-15', '09:00'))).toBeNull();
  });

  it('respects minimum notice and external calendar busy time', () => {
    const c = ctx({ nowMs: at('2026-10-14', '09:00'), externalBusy: [{ startMs: at('2026-10-15', '10:00'), endMs: at('2026-10-15', '11:00') }] }, { minNoticeHours: 24 });
    expect(unavailableReason(c, at('2026-10-14', '15:00'))).toBe('too_soon');
    expect(unavailableReason(c, at('2026-10-15', '10:30'))).toBe('calendar_busy');
    expect(unavailableReason(c, at('2026-10-15', '12:00'))).toBeNull();
  });

  it('keeps wall-clock windows correct across the spring-forward day', () => {
    const c = ctx({ rules: [{ weekday: 0, startMinute: 8 * 60, endMinute: 12 * 60 }] }, { weeklyScheduleEnabled: true });
    expect(unavailableReason(c, at('2026-03-08', '08:00'))).toBeNull(); // Sunday, DST starts 2am
    expect(unavailableReason(c, at('2026-03-08', '11:00'))).toBeNull();
    expect(unavailableReason(c, at('2026-03-08', '12:00'))).toBe('outside_hours');
  });
});

describe('bookableSlots / unavailableIntervals', () => {
  it('lists half-hour starts only inside available windows', () => {
    const c = ctx({ rules: [{ weekday: 3, startMinute: 9 * 60, endMinute: 11 * 60 }] }, { weeklyScheduleEnabled: true, defaultDurationMinutes: 60 });
    const slots = bookableSlots(c, at('2026-10-14', '00:00'), at('2026-10-15', '00:00'));
    expect(slots.map((s) => localParts(s.startMs, LA).minuteOfDay)).toEqual([540, 570, 600]);
  });

  it('reports unavailable spans for greying out a day', () => {
    const c = ctx({ rules: [{ weekday: 3, startMinute: 9 * 60, endMinute: 17 * 60 }] }, { weeklyScheduleEnabled: true });
    const from = at('2026-10-14', '00:00');
    const to = at('2026-10-15', '00:00');
    const spans = unavailableIntervals(c, from, to);
    expect(spans).toEqual([
      { startMs: from, endMs: at('2026-10-14', '09:00') },
      { startMs: at('2026-10-14', '17:00'), endMs: to },
    ]);
  });
});

describe('default weekly hours', () => {
  it('opens Sun 9-7, Mon-Thu 9-6:30, Fri 9-3 and leaves Saturday off', async () => {
    const { DEFAULT_WEEKLY_RULES } = await import('@/lib/availability/slots');
    const byDay = Object.fromEntries(DEFAULT_WEEKLY_RULES.map((r) => [r.weekday, [r.startMinute / 60, r.endMinute / 60]]));
    expect(byDay).toEqual({ 0: [9, 19], 1: [9, 18.5], 2: [9, 18.5], 3: [9, 18.5], 4: [9, 18.5], 5: [9, 15] });
    expect(byDay[6]).toBeUndefined();
  });
});
