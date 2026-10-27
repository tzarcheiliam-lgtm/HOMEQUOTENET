import { describe, expect, it } from 'vitest';
import {
  bookedBetween,
  bookingStreak,
  closeRate,
  earnedBetween,
  formatMoney,
  isPending,
  records,
  setterBadges,
  weekPace,
  weekPaceMessage,
  weekStart,
  type Meeting,
} from '@/lib/setter/money';
import { chancesToBook, rankQueue, type QueueItem } from '@/lib/setter/queue';

// 2026-10-27 is a Tuesday; Los Angeles is UTC-7 then.
const LA = (local: string) => new Date(`${local}-07:00`).toISOString();
let n = 0;
const meeting = (over: Partial<Meeting> = {}): Meeting => ({
  id: `m${++n}`,
  prospectId: `p${n}`,
  companyName: `Pool Co ${n}`,
  partnerId: 'setter',
  bookedAt: LA('2026-10-27T10:00:00'),
  scheduledAt: LA('2026-10-29T10:00:00'),
  status: 'scheduled',
  saleOutcome: null,
  saleDecidedAt: null,
  payAmount: null,
  ...over,
});
const sold = (decidedLocal: string, pay: number, over: Partial<Meeting> = {}) =>
  meeting({ saleOutcome: 'sold', saleDecidedAt: LA(decidedLocal), payAmount: pay, status: 'completed', ...over });

describe('earned and pending', () => {
  it('earns only sold meetings, at their pay snapshot, by decision date', () => {
    const ms = [
      sold('2026-10-05T12:00:00', 150),
      sold('2026-10-27T09:00:00', 200),
      sold('2026-09-30T12:00:00', 999), // last month
      meeting({ saleOutcome: 'not_sold', saleDecidedAt: LA('2026-10-10T12:00:00'), status: 'completed' }),
      meeting(),
    ];
    expect(earnedBetween(ms, '2026-10-01', '2026-10-31')).toBe(350);
    expect(earnedBetween(ms, '2026-10-26', '2026-11-01')).toBe(200);
  });

  it('a no-show or cancellation is not pending; an undecided meeting is', () => {
    expect(isPending(meeting())).toBe(true);
    expect(isPending(meeting({ status: 'completed' }))).toBe(true);
    expect(isPending(meeting({ status: 'no_show' }))).toBe(false);
    expect(isPending(meeting({ status: 'cancelled' }))).toBe(false);
    expect(isPending(sold('2026-10-27T09:00:00', 100))).toBe(false);
  });

  it('close rate counts decided meetings only', () => {
    expect(closeRate([meeting()])).toBeNull();
    expect(
      closeRate([
        sold('2026-10-27T09:00:00', 100),
        meeting({ saleOutcome: 'not_sold', saleDecidedAt: LA('2026-10-27T09:00:00') }),
        meeting(),
      ])
    ).toBe(0.5);
  });

  it('formats money without stray cents', () => {
    expect(formatMoney(1250)).toBe('$1,250');
    expect(formatMoney(62.5)).toBe('$62.50');
  });
});

describe('weeks, pace and streaks', () => {
  it('weeks start on Monday', () => {
    expect(weekStart('2026-10-27')).toBe('2026-10-26');
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
    expect(weekStart('2026-11-01')).toBe('2026-10-26'); // Sunday
  });

  it('counts bookings by the day they were booked', () => {
    const ms = [meeting({ bookedAt: LA('2026-10-25T10:00:00') }), meeting(), meeting()];
    expect(bookedBetween(ms, '2026-10-26', '2026-11-01')).toHaveLength(2);
  });

  it('paces the week over Mon–Fri, 8–5', () => {
    // Tuesday noon: 1 full day + 4/9 of today used.
    const p = weekPace(3, 10, new Date(LA('2026-10-27T12:00:00')));
    expect(p.daysUsed).toBeCloseTo(1 + 4 / 9, 5);
    expect(p.projected).toBe(Math.round((3 / (1 + 4 / 9)) * 5)); // 10
    expect(p.onPace).toBe(true);
    expect(weekPaceMessage(p, 3, 10)).toBe('On pace for 10 this week');

    const behind = weekPace(1, 10, new Date(LA('2026-10-27T12:00:00')));
    expect(behind.onPace).toBe(false);
    expect(behind.perDayNeeded).toBe(Math.ceil(9 / (5 - (1 + 4 / 9))));
    expect(weekPaceMessage(behind, 1, 10)).toMatch(/^Book \d+ a day to hit 10$/);

    expect(weekPaceMessage(weekPace(12, 10, new Date(LA('2026-10-27T12:00:00'))), 12, 10)).toBe('2 over your goal this week 🔥');
    // Saturday: the work week is over.
    expect(weekPaceMessage(weekPace(4, 10, new Date(LA('2026-10-31T12:00:00'))), 4, 10)).toContain('6 short');
  });

  it('streaks workdays with at least one booking', () => {
    const ms = [
      meeting({ bookedAt: LA('2026-10-23T10:00:00') }), // Fri
      meeting({ bookedAt: LA('2026-10-26T10:00:00') }), // Mon
    ];
    expect(bookingStreak(ms, '2026-10-27')).toBe(2); // today (no booking yet) does not break it
    expect(bookingStreak([...ms, meeting()], '2026-10-27')).toBe(3);
  });

  it('finds the best week and best month', () => {
    const ms = [
      meeting({ bookedAt: LA('2026-10-12T10:00:00') }),
      meeting({ bookedAt: LA('2026-10-13T10:00:00') }),
      meeting({ bookedAt: LA('2026-10-14T10:00:00') }),
      meeting(),
      sold('2026-09-15T12:00:00', 500),
      sold('2026-10-15T12:00:00', 300),
    ];
    const r = records(ms);
    expect(r.bestWeekKey).toBe('2026-10-12');
    expect(r.bestWeekBookings).toBe(3);
    expect(r.bestMonthKey).toBe('2026-09');
    expect(r.bestMonthEarned).toBe(500);
  });
});

describe('badges', () => {
  it('start unearned and come from real meetings', () => {
    expect(setterBadges([]).every((b) => !b.earned)).toBe(true);
    const ms = [
      meeting(),
      meeting(),
      meeting(),
      ...Array.from({ length: 5 }, () => sold('2026-10-20T12:00:00', 250)),
    ];
    const earned = setterBadges(ms).filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(expect.arrayContaining(['first-booking', 'first-sale', 'triple', 'closer', 'quality', 'thousand']));
    expect(earned).not.toContain('big-week');
  });
});

describe('money on the table queue', () => {
  const item = (kind: QueueItem['kind'], at: string | null, id = `${kind}-${at}`): QueueItem => ({ kind, id, title: id, detail: '', href: '#', at });
  it('ranks by kind, then soonest first', () => {
    const ranked = rankQueue([
      item('fresh', null),
      item('hot', '2026-10-27T10:00:00Z'),
      item('callback', '2026-10-27T09:00:00Z'),
      item('confirm', '2026-10-28T18:00:00Z'),
      item('confirm', '2026-10-27T20:00:00Z'),
      item('callback', '2026-10-26T09:00:00Z'),
    ]);
    expect(ranked.map((r) => r.id)).toEqual([
      'confirm-2026-10-27T20:00:00Z',
      'confirm-2026-10-28T18:00:00Z',
      'callback-2026-10-26T09:00:00Z',
      'callback-2026-10-27T09:00:00Z',
      'hot-2026-10-27T10:00:00Z',
      'fresh-null',
    ]);
  });

  it('counts only rows that can become a booking', () => {
    expect(chancesToBook([item('confirm', null), item('callback', null), item('hot', null), item('rescue', null), item('slipped', null), item('fresh', null)])).toBe(4);
  });
});
