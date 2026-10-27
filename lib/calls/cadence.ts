import type { ProspectDisposition } from '@/lib/types';
import { zonedToUtc } from '@/lib/availability/time';
import { CALL_TZ, isWorkday, shiftDay, zonedParts } from './goals';

/**
 * The call cadence for prospects we haven't reached. Pure, no I/O: the call
 * log action and the AI-call store both write what this returns, so a
 * prospect rests the same way whoever logged the call.
 *
 * After a call that didn't reach anyone (no answer, voicemail, gatekeeper) the
 * prospect rests out of the "who to call now" queue until its next try. Tries
 * are spaced out and alternate morning/afternoon. After `maxNoConnect` tries in
 * a row it is parked for `parkDays`, then comes back once with a fresh run;
 * after that it is parked for good (a person can still return it).
 * Any call that reaches someone resets everything.
 */

export const NO_CONNECT_OUTCOMES: ProspectDisposition[] = ['no_answer', 'left_voicemail', 'gatekeeper'];

export const CADENCE = {
  /** No-connect calls in a row before the prospect is parked. */
  maxNoConnect: 6,
  /** Days to wait after no-connect call 1, 2, 3 … (the last value repeats). */
  gapDays: [1, 2, 3, 5, 7],
  /** How long a parked prospect is out of the queue before it comes back. */
  parkDays: 90,
  /** Times a prospect comes back from being parked; the next park is for good. */
  maxReturns: 1,
  /** Local hours the next try is scheduled for (prospects are called in Pacific time). */
  morningHour: 9,
  afternoonHour: 13,
} as const;

export interface CadenceState {
  no_connect_streak: number;
  park_count: number;
  next_attempt_at?: string | null;
  parked_at?: string | null;
}

export interface CadencePatch {
  no_connect_streak: number;
  next_attempt_at: string | null;
  parked_at: string | null;
  park_count: number;
}

export function isNoConnect(outcome: ProspectDisposition): boolean {
  return NO_CONNECT_OUTCOMES.includes(outcome);
}

/**
 * The time of the next try `days` after `now`: on a weekday, at the opposite
 * half of the day from this call (a morning call is retried in the afternoon
 * and the other way round), so the prospect is tried at different times.
 */
export function nextTryAt(now: Date, days: number, timeZone = CALL_TZ): Date {
  const { key, hour } = zonedParts(now, timeZone);
  let day = shiftDay(key, days);
  while (!isWorkday(day)) day = shiftDay(day, 1);
  const at = hour < 12 ? CADENCE.afternoonHour : CADENCE.morningHour;
  return new Date(zonedToUtc(day, at * 60, timeZone));
}

/** The cadence fields to write after a call with `outcome` is logged. */
export function cadencePatchFor(
  outcome: ProspectDisposition,
  state: Partial<CadenceState> | null | undefined,
  now = new Date()
): CadencePatch {
  const parks = state?.park_count ?? 0;
  if (outcome === 'calling') {
    // "Calling" is not a result: leave the cadence exactly as it was.
    return {
      no_connect_streak: state?.no_connect_streak ?? 0,
      next_attempt_at: state?.next_attempt_at ?? null,
      parked_at: state?.parked_at ?? null,
      park_count: parks,
    };
  }
  if (!isNoConnect(outcome)) {
    // Reached someone, or a final outcome: back to a clean slate.
    return { no_connect_streak: 0, next_attempt_at: null, parked_at: null, park_count: parks };
  }

  const streak = (state?.no_connect_streak ?? 0) + 1;
  if (streak >= CADENCE.maxNoConnect) {
    const comesBack = parks < CADENCE.maxReturns;
    return {
      no_connect_streak: 0,
      // No return date = parked for good.
      next_attempt_at: comesBack ? nextTryAt(now, CADENCE.parkDays).toISOString() : null,
      parked_at: now.toISOString(),
      park_count: parks + 1,
    };
  }

  const gap = CADENCE.gapDays[Math.min(streak, CADENCE.gapDays.length) - 1];
  return {
    no_connect_streak: streak,
    next_attempt_at: nextTryAt(now, gap).toISOString(),
    parked_at: null,
    park_count: parks,
  };
}

/**
 * Whether a `resting_until` value from the database (0063) still holds the
 * prospect back. Postgres sends 'infinity' for parked for good.
 */
export function isRestingUntil(restingUntil: string | null | undefined, now = new Date()): boolean {
  if (!restingUntil) return false;
  if (restingUntil === 'infinity') return true;
  const t = Date.parse(restingUntil);
  return Number.isNaN(t) ? true : t > now.getTime();
}

export type RestState ='due' | 'resting' | 'parked' | 'parked_for_good';

/** Where a prospect stands in the cadence right now, for labels. */
export function restStateOf(
  p: { next_attempt_at: string | null; parked_at: string | null },
  now = new Date()
): RestState {
  if (p.parked_at && !p.next_attempt_at) return 'parked_for_good';
  if (!p.next_attempt_at || new Date(p.next_attempt_at).getTime() <= now.getTime()) return 'due';
  return p.parked_at ? 'parked' : 'resting';
}
