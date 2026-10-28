import { describe, expect, it } from 'vitest';
import { gridRange, groupByDay, initialDay, monthFrom, monthGrid, monthLabel, shiftMonth, weekdayOf } from '@/lib/calls/calendar-grid';

describe('sales appointments calendar grid', () => {
  it('shows whole Sunday-first weeks around the month', () => {
    const days = monthGrid('2026-10'); // Oct 1 2026 is a Thursday, Oct 31 a Saturday
    expect(days[0]).toBe('2026-09-27');
    expect(days.at(-1)).toBe('2026-10-31');
    expect(days).toHaveLength(35);
    expect(weekdayOf(days[0])).toBe(0);
    expect(monthGrid('2026-02')).toHaveLength(28); // Feb 2026 starts on a Sunday and ends on a Saturday
    expect(monthGrid('2026-08')).toHaveLength(42); // six rows
  });

  it('moves between months across years and reads ?month= safely', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthLabel('2026-10')).toBe('October 2026');
    expect(monthFrom('2026-11')).toBe('2026-11');
    expect(monthFrom('2026-13', new Date('2026-10-28T18:00:00Z'))).toBe('2026-10');
    expect(monthFrom(undefined, new Date('2026-11-01T05:00:00Z'))).toBe('2026-10'); // still Oct 31 in Los Angeles
  });

  it('puts a meeting on its Los Angeles day, sorted by time', () => {
    const by = groupByDay([
      { id: 'late', scheduled_at: '2026-10-29T04:30:00Z' }, // 9:30 PM Oct 28 in LA
      { id: 'early', scheduled_at: '2026-10-28T16:30:00Z' },
    ]);
    expect(by.get('2026-10-28')?.map((x) => x.id)).toEqual(['early', 'late']);
    expect(by.has('2026-10-29')).toBe(false);
  });

  it('loads a range that covers every visible day in any zone', () => {
    const r = gridRange(monthGrid('2026-10'));
    expect(r.from <= '2026-09-27T07:00:00.000Z').toBe(true);
    expect(r.to >= '2026-11-01T07:00:00.000Z').toBe(true);
  });

  it('opens today, else the first busy day, else the 1st', () => {
    const busy = new Map([['2026-11-12', [1]]]);
    expect(initialDay('2026-10', '2026-10-28', busy)).toBe('2026-10-28');
    expect(initialDay('2026-11', '2026-10-28', busy)).toBe('2026-11-12');
    expect(initialDay('2026-12', '2026-10-28', busy)).toBe('2026-12-01');
    expect(initialDay('2026-11', '2026-10-28', busy, '2026-11-20')).toBe('2026-11-20');
  });
});
