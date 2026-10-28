import { describe, expect, it } from 'vitest';
import {
  badgesFor,
  clampGoal,
  comboCount,
  countByDay,
  countByHour,
  currentStreak,
  dayKey,
  dedupeEvents,
  fastestRun,
  isWorkday,
  lastDays,
  longestStreak,
  milestoneCrossed,
  milestonesFor,
  paceFor,
  paceMessage,
  personalBests,
  shiftDay,
  tierFor,
  type CallEvent,
} from '@/lib/calls/goals';

// 2026-10-27 is a Tuesday. Los Angeles is UTC-7 (PDT) on this date.
const LA = (local: string) => new Date(`${local}-07:00`);
const ev = (local: string, key: string | null = null, outcome: CallEvent['outcome'] = 'no_answer'): CallEvent => ({
  at: LA(local).toISOString(),
  key,
  outcome,
  source: 'prospect',
});

describe('goal basics', () => {
  it('clamps goals into 1–1000 and defaults junk to 100', () => {
    expect(clampGoal(0)).toBe(1);
    expect(clampGoal(5000)).toBe(1000);
    expect(clampGoal('abc')).toBe(100);
    expect(clampGoal('80')).toBe(80);
  });

  it('keys days in Los Angeles, not UTC', () => {
    // 23:30 LA on the 27th is already the 28th in UTC.
    expect(dayKey(LA('2026-10-27T23:30:00'))).toBe('2026-10-27');
    expect(dayKey(LA('2026-10-28T00:10:00'))).toBe('2026-10-28');
  });

  it('shifts days and knows weekends', () => {
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(isWorkday('2026-10-27')).toBe(true);
    expect(isWorkday('2026-10-31')).toBe(false); // Saturday
    expect(isWorkday('2026-11-01')).toBe(false); // Sunday
    expect(lastDays('2026-10-27', 3)).toEqual(['2026-10-25', '2026-10-26', '2026-10-27']);
  });
});

describe('dedupe', () => {
  it('counts a repeat log on the same prospect inside 60s once', () => {
    const out = dedupeEvents([
      ev('2026-10-27T09:00:00', 'p1'),
      ev('2026-10-27T09:00:30', 'p1'),
      ev('2026-10-27T09:00:40', 'p2'),
      ev('2026-10-27T09:01:05', 'p1'),
    ]);
    expect(out.map((e) => e.key)).toEqual(['p1', 'p2', 'p1']);
  });

  it('never merges events without a key', () => {
    expect(dedupeEvents([ev('2026-10-27T09:00:00'), ev('2026-10-27T09:00:01')])).toHaveLength(2);
  });
});

describe('milestones and tiers', () => {
  it('uses 10/25/50/75/100 for the default goal', () => {
    expect(milestonesFor(100)).toEqual([10, 25, 50, 75, 100]);
  });

  it('reports the highest milestone crossed', () => {
    expect(milestoneCrossed(9, 10, 100)).toBe(10);
    expect(milestoneCrossed(10, 11, 100)).toBeNull();
    expect(milestoneCrossed(48, 76, 100)).toBe(75);
    expect(milestoneCrossed(99, 100, 100)).toBe(100);
    expect(milestoneCrossed(100, 101, 100)).toBeNull();
  });

  it('scales with a custom goal', () => {
    expect(milestonesFor(40)).toEqual([4, 10, 20, 30, 40]);
  });

  it('tiers by share of the goal', () => {
    expect(tierFor(0, 100)).toBe(0);
    expect(tierFor(25, 100)).toBe(1);
    expect(tierFor(50, 100)).toBe(2);
    expect(tierFor(120, 100)).toBe(3);
  });
});

describe('pace (8 AM – 5 PM Los Angeles)', () => {
  it('before 8 spreads the goal over the 9-hour day', () => {
    const p = paceFor(0, 100, LA('2026-10-27T07:30:00'));
    expect(p.phase).toBe('before');
    expect(p.perHourNeeded).toBe(12);
    expect(paceMessage(p, 0, 100)).toContain('8 AM');
  });

  it('projects the current rate to 5 PM', () => {
    // 3 hours in, 40 calls → 40/180min × 540min = 120.
    const p = paceFor(40, 100, LA('2026-10-27T11:00:00'));
    expect(p.phase).toBe('during');
    expect(p.projected).toBe(120);
    expect(p.onPace).toBe(true);
    expect(paceMessage(p, 40, 100)).toBe('On pace for 120 by 5 PM');
  });

  it('says what is needed per hour when behind', () => {
    // 6 hours left at 11:00, 70 to go → 12/hr.
    const p = paceFor(30, 100, LA('2026-10-27T11:00:00'));
    expect(p.onPace).toBe(false);
    expect(p.perHourNeeded).toBe(12);
    expect(paceMessage(p, 30, 100)).toBe('Need 12/hr to hit 100');
  });

  it('after 5 PM reports the final count', () => {
    const p = paceFor(90, 100, LA('2026-10-27T18:00:00'));
    expect(p.phase).toBe('after');
    expect(paceMessage(p, 90, 100)).toContain('10 short');
  });

  it('celebrates overflow', () => {
    const p = paceFor(112, 100, LA('2026-10-27T15:00:00'));
    expect(paceMessage(p, 112, 100)).toBe('+12 bonus calls');
  });
});

const counts = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe('streaks', () => {
  it('counts consecutive goal days ending today', () => {
    const c = counts({ '2026-10-23': 100, '2026-10-26': 110, '2026-10-27': 100 });
    // Fri 23, (weekend skipped), Mon 26, Tue 27.
    expect(currentStreak(c, 100, '2026-10-27')).toBe(3);
  });

  it('does not break the streak while today is still in progress', () => {
    const c = counts({ '2026-10-26': 100, '2026-10-27': 20 });
    expect(currentStreak(c, 100, '2026-10-27')).toBe(1);
  });

  it('a missed workday breaks it', () => {
    const c = counts({ '2026-10-22': 100, '2026-10-23': 50, '2026-10-26': 100 });
    expect(currentStreak(c, 100, '2026-10-27')).toBe(1);
  });

  it('finds the longest run anywhere', () => {
    const c = counts({
      '2026-10-12': 100, '2026-10-13': 100, '2026-10-14': 100, '2026-10-15': 100,
      '2026-10-16': 10,
      '2026-10-26': 100,
    });
    expect(longestStreak(c, 100, '2026-10-27')).toBe(4);
  });
});

describe('combos, bests, badges', () => {
  it('counts decision-maker conversations in a row at the end', () => {
    expect(
      comboCount([
        { outcome: 'spoke_with_dm' },
        { outcome: 'no_answer' },
        { outcome: 'interested' },
        { outcome: 'callback_requested' },
        { outcome: 'not_interested' },
      ])
    ).toBe(3);
    expect(comboCount([{ outcome: 'interested' }, { outcome: 'left_voicemail' }])).toBe(0);
    expect(comboCount([{ outcome: null }])).toBe(0);
  });

  it('measures the fastest 25 calls in a day', () => {
    const day = Array.from({ length: 30 }, (_, i) =>
      ev(`2026-10-27T09:${String(i).padStart(2, '0')}:00`)
    );
    expect(fastestRun(day, 25)).toBe(24 * 60_000);
    expect(fastestRun(day.slice(0, 10), 25)).toBeNull();
  });

  it('flags a personal best set today', () => {
    const events = [
      ...Array.from({ length: 5 }, (_, i) => ev(`2026-10-26T09:0${i}:00`, `a${i}`)),
      ...Array.from({ length: 7 }, (_, i) => ev(`2026-10-27T09:0${i}:00`, `b${i}`, 'spoke_with_dm')),
    ];
    const bests = personalBests(events, 100, '2026-10-27');
    const calls = bests.find((b) => b.id === 'calls')!;
    expect(calls.value).toBe(7);
    expect(calls.dayKey).toBe('2026-10-27');
    expect(calls.newToday).toBe(true);
    expect(bests.find((b) => b.id === 'dms')!.newToday).toBe(true);
    expect(bests.find((b) => b.id === 'bookings')!.newToday).toBe(false);
  });

  it('does not call a tie a new best', () => {
    const events = [ev('2026-10-26T09:00:00', 'a'), ev('2026-10-27T09:00:00', 'b')];
    expect(personalBests(events, 100, '2026-10-27').find((b) => b.id === 'calls')!.newToday).toBe(false);
  });

  it('earns badges from real activity only', () => {
    const none = badgesFor({ events: [], goal: 100, todayKey: '2026-10-27', bookingsAllTime: 0 });
    expect(none.every((b) => !b.earned)).toBe(true);

    const early = Array.from({ length: 25 }, (_, i) =>
      ev(`2026-10-27T08:${String(i).padStart(2, '0')}:00`, `p${i}`)
    );
    const got = badgesFor({ events: early, goal: 25, todayKey: '2026-10-27', bookingsAllTime: 1 });
    const earned = got.filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(expect.arrayContaining(['first-goal', 'early-bird', 'first-booking']));
    expect(earned).not.toContain('closer');
  });

  it('buckets by day and hour in the calling zone', () => {
    const events = [ev('2026-10-27T09:10:00'), ev('2026-10-27T09:50:00'), ev('2026-10-27T13:00:00'), ev('2026-10-26T09:00:00')];
    expect(countByDay(events).get('2026-10-27')).toBe(3);
    const hours = countByHour(events, '2026-10-27');
    expect(hours[9]).toBe(2);
    expect(hours[13]).toBe(1);
  });
});

describe('one-tap outcomes', () => {
  it('are only outcomes with nothing else to fill in', async () => {
    const { QUICK_OUTCOMES, OUTCOME_KEYS, LOGGABLE_OUTCOMES } = await import('@/lib/calls/constants');
    const { requiredFieldsFor } = await import('@/lib/calls/rules');
    for (const o of QUICK_OUTCOMES) expect(requiredFieldsFor(o)).toEqual([]);
    // Do not call is one tap, but never on a keyboard key, so a stray keystroke can't block a number.
    expect(QUICK_OUTCOMES).toContain('do_not_call');
    expect(Object.values(OUTCOME_KEYS)).not.toContain('do_not_call');
    for (const o of Object.values(OUTCOME_KEYS)) expect(LOGGABLE_OUTCOMES).toContain(o);
    expect(new Set(Object.values(OUTCOME_KEYS)).size).toBe(Object.keys(OUTCOME_KEYS).length);
  });
});
