import type { ProspectDisposition } from '@/lib/types';
import { DM_REACHED_OUTCOMES } from './constants';

/**
 * Caller metrics, defined once and used for both the per-caller dashboard and
 * the admin comparison so the two can never be computed differently.
 *
 *   contact rate     = decision-maker conversations / call attempts
 *   interest rate    = interested outcomes           / decision-maker conversations
 *   booking rate     = appointments booked           / decision-maker conversations
 *
 * "Decision-maker conversation" means an attempt whose outcome implies the
 * caller actually spoke to the decision-maker — see DM_REACHED_OUTCOMES. A
 * voicemail or a gatekeeper is not a conversation. Rates are null (not 0)
 * when the denominator is zero, so an empty day reads as "no data" rather
 * than "0%".
 */

export interface AttemptLike {
  outcome: ProspectDisposition;
  created_at: string;
}

export interface CallerMetrics {
  attempts: number;
  dmConversations: number;
  interested: number;
  appointmentsBooked: number;
  contactRate: number | null;
  interestRate: number | null;
  bookingRate: number | null;
}

function ratio(num: number, den: number): number | null {
  return den === 0 ? null : num / den;
}

export function computeMetrics(attempts: AttemptLike[]): CallerMetrics {
  let dm = 0;
  let interested = 0;
  let booked = 0;
  for (const a of attempts) {
    if (DM_REACHED_OUTCOMES.includes(a.outcome)) dm += 1;
    if (a.outcome === 'interested') interested += 1;
    if (a.outcome === 'appointment_booked') booked += 1;
  }
  return {
    attempts: attempts.length,
    dmConversations: dm,
    interested,
    appointmentsBooked: booked,
    contactRate: ratio(dm, attempts.length),
    interestRate: ratio(interested, dm),
    bookingRate: ratio(booked, dm),
  };
}

/** Formats a 0-1 ratio as a whole-number percentage, or an em dash for no data. */
export function formatRate(r: number | null): string {
  if (r === null) return '—';
  return `${Math.round(r * 100)}%`;
}

/**
 * Start/end of "today" for a caller, in the given IANA zone. Metrics are
 * per-day and callers are in Los Angeles, so the day boundary must be theirs,
 * not the server's.
 */
export function dayBoundsInZone(
  now: Date,
  timeZone = 'America/Los_Angeles'
): { start: Date; end: Date } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value])
  ) as Record<string, string>;
  // The wall-clock time in the zone, then the UTC offset implied by it.
  const hour = parts.hour === '24' ? 0 : Number(parts.hour);
  const wall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMs = wall - now.getTime();
  const startWall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day)
  );
  const start = new Date(startWall - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
