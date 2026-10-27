import { describe, expect, it } from 'vitest';
import {
  CADENCE,
  cadencePatchFor,
  isRestingUntil,
  nextTryAt,
  restStateOf,
  type CadenceState,
} from '@/lib/calls/cadence';
import { zonedParts } from '@/lib/calls/goals';
import { DISPOSITIONS } from '@/lib/calls/constants';

// Wall-clock helpers in the calling time zone (Los Angeles).
const la = (iso: string) => zonedParts(new Date(iso));
const fresh: CadenceState = { no_connect_streak: 0, park_count: 0 };
// Tue 2026-10-27 10:00 PDT (17:00Z): a morning call on a weekday.
const tueMorning = new Date('2026-10-27T17:00:00Z');
// Tue 2026-10-27 15:00 PDT: an afternoon call.
const tueAfternoon = new Date('2026-10-27T22:00:00Z');

describe('nextTryAt', () => {
  it('retries a morning call in the afternoon and an afternoon call in the morning', () => {
    expect(la(nextTryAt(tueMorning, 1).toISOString())).toEqual({ key: '2026-10-28', hour: 13, minute: 0 });
    expect(la(nextTryAt(tueAfternoon, 1).toISOString())).toEqual({ key: '2026-10-28', hour: 9, minute: 0 });
  });
  it('moves a try that lands on a weekend to Monday', () => {
    // Fri 2026-10-30 + 1 day = Saturday -> Monday 2026-11-02.
    const fri = new Date('2026-10-30T17:00:00Z');
    expect(la(nextTryAt(fri, 1).toISOString()).key).toBe('2026-11-02');
  });
  it('keeps the local hour across the end of daylight saving time', () => {
    // Fri 2026-10-30 afternoon (PDT) -> Monday 2026-11-02 09:00 PST (17:00Z).
    const fri = new Date('2026-10-30T22:00:00Z');
    expect(nextTryAt(fri, 1).toISOString()).toBe('2026-11-02T17:00:00.000Z');
  });
});

describe('cadencePatchFor', () => {
  it('rests a prospect after a call that reached nobody', () => {
    for (const outcome of ['no_answer', 'left_voicemail', 'gatekeeper'] as const) {
      const p = cadencePatchFor(outcome, fresh, tueMorning);
      expect(p.no_connect_streak).toBe(1);
      expect(p.parked_at).toBeNull();
      expect(la(p.next_attempt_at!).key).toBe('2026-10-28');
    }
  });

  it('spaces the tries out further each time', () => {
    const days = [1, 2, 3, 4, 5].map((n) => {
      const p = cadencePatchFor('no_answer', { no_connect_streak: n - 1, park_count: 0 }, tueMorning);
      return (Date.parse(p.next_attempt_at!) - tueMorning.getTime()) / 86_400_000;
    });
    for (let i = 1; i < days.length; i++) expect(days[i]).toBeGreaterThan(days[i - 1]);
  });

  it(`parks after ${CADENCE.maxNoConnect} misses in a row and brings it back after ${CADENCE.parkDays} days`, () => {
    const p = cadencePatchFor('no_answer', { no_connect_streak: CADENCE.maxNoConnect - 1, park_count: 0 }, tueMorning);
    expect(p.parked_at).toBe(tueMorning.toISOString());
    expect(p.park_count).toBe(1);
    expect(p.no_connect_streak).toBe(0); // a fresh run when it comes back
    const days = (Date.parse(p.next_attempt_at!) - tueMorning.getTime()) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(CADENCE.parkDays);
    expect(days).toBeLessThan(CADENCE.parkDays + 4);
  });

  it('parks for good the second time', () => {
    const p = cadencePatchFor('gatekeeper', { no_connect_streak: CADENCE.maxNoConnect - 1, park_count: 1 }, tueMorning);
    expect(p.parked_at).not.toBeNull();
    expect(p.next_attempt_at).toBeNull();
    expect(p.park_count).toBe(2);
    expect(restStateOf(p, tueMorning)).toBe('parked_for_good');
  });

  it('clears everything once someone is reached, but remembers past parks', () => {
    for (const outcome of ['spoke_with_dm', 'callback_requested', 'interested', 'appointment_booked', 'not_interested', 'do_not_call'] as const) {
      expect(cadencePatchFor(outcome, { no_connect_streak: 4, park_count: 1 }, tueMorning)).toEqual({
        no_connect_streak: 0,
        next_attempt_at: null,
        parked_at: null,
        park_count: 1,
      });
    }
  });

  it('leaves the cadence alone for "calling", which is not a result', () => {
    const state = { no_connect_streak: 3, park_count: 0, next_attempt_at: '2026-10-29T20:00:00.000Z', parked_at: null };
    expect(cadencePatchFor('calling', state, tueMorning)).toEqual(state);
  });

  it('treats a missing state (older rows) as a fresh start', () => {
    expect(cadencePatchFor('no_answer', null, tueMorning).no_connect_streak).toBe(1);
  });

  it('every outcome a caller can log is covered without throwing', () => {
    for (const d of DISPOSITIONS) expect(() => cadencePatchFor(d.value, fresh, tueMorning)).not.toThrow();
  });
});

describe('restStateOf / isRestingUntil', () => {
  it('reads due, resting, parked and parked for good', () => {
    const now = tueMorning;
    expect(restStateOf({ next_attempt_at: null, parked_at: null }, now)).toBe('due');
    expect(restStateOf({ next_attempt_at: '2026-10-26T17:00:00Z', parked_at: null }, now)).toBe('due');
    expect(restStateOf({ next_attempt_at: '2026-10-28T20:00:00Z', parked_at: null }, now)).toBe('resting');
    expect(restStateOf({ next_attempt_at: '2027-01-25T20:00:00Z', parked_at: '2026-10-27T17:00:00Z' }, now)).toBe('parked');
    // Back from a park whose date has passed: due again.
    expect(restStateOf({ next_attempt_at: '2026-10-01T17:00:00Z', parked_at: '2026-07-01T17:00:00Z' }, now)).toBe('due');
  });
  it("treats Postgres 'infinity' as resting forever", () => {
    expect(isRestingUntil('infinity', tueMorning)).toBe(true);
    expect(isRestingUntil(null, tueMorning)).toBe(false);
    expect(isRestingUntil('2026-10-26T00:00:00Z', tueMorning)).toBe(false);
    expect(isRestingUntil('2026-10-28T00:00:00Z', tueMorning)).toBe(true);
  });
});
