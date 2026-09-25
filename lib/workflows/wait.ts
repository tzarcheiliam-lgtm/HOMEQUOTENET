import { z } from 'zod';

/**
 * Wait / delay contract. A wait never sleeps in memory: the engine computes an
 * absolute wake time with computeWaitUntil(), stores it in
 * workflow_runs.resume_at (status 'waiting'), and a scheduled worker picks the
 * run up when it is due — so waits survive deploys, restarts and crashes.
 *
 *   wait 5 minutes                 { mode: 'duration', amount: 5, unit: 'minutes' }
 *   wait 2 hours                   { mode: 'duration', amount: 2, unit: 'hours' }
 *   wait 1 day                     { mode: 'duration', amount: 1, unit: 'days' }
 *   wait until next day at 10 AM   { mode: 'until_time_of_day', time: '10:00', dayOffset: 1, timezone: 'America/Los_Angeles' }
 *   24h before the appointment     { mode: 'relative_to_field', field: 'appointment.scheduled_at', offsetMinutes: -1440 }
 */

export const WAIT_UNITS = ['minutes', 'hours', 'days'] as const;
export type WaitUnit = (typeof WAIT_UNITS)[number];
const UNIT_MS: Record<WaitUnit, number> = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };

/** Upper bound on any single wait. Longer journeys chain several waits. */
export const MAX_WAIT_MS = 90 * 86_400_000;
export const DEFAULT_WORKFLOW_TIMEZONE = 'America/Los_Angeles';

/** Date-time fields a relative wait can anchor to. */
export const WAIT_ANCHOR_FIELDS = ['appointment.scheduled_at', 'lead.created_at', 'event.occurred_at'] as const;
export type WaitAnchorField = (typeof WAIT_ANCHOR_FIELDS)[number];

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const timezone = z.string().min(1).max(64).refine(isValidTimeZone, 'Unknown IANA time zone');

export const waitConfigurationSchema = z.discriminatedUnion('mode', [
  z
    .object({
      mode: z.literal('duration'),
      amount: z.number().int().positive(),
      unit: z.enum(WAIT_UNITS),
    })
    .strict(),
  z
    .object({
      mode: z.literal('until_time_of_day'),
      time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM'),
      // 0 = the next time the clock reads `time` (today if still ahead, else tomorrow).
      // n >= 1 = n calendar days after today (in `timezone`), at `time`.
      dayOffset: z.number().int().min(0).max(30).default(0),
      timezone: timezone.default(DEFAULT_WORKFLOW_TIMEZONE),
    })
    .strict(),
  z
    .object({
      mode: z.literal('relative_to_field'),
      field: z.enum(WAIT_ANCHOR_FIELDS),
      // Negative = before the anchor (reminders), positive = after.
      offsetMinutes: z.number().int().min(-43_200).max(43_200),
      // When the computed time has already passed: continue now, or skip the rest of the run.
      ifPast: z.enum(['continue', 'skip']).default('continue'),
    })
    .strict(),
]).superRefine((w, ctx) => {
  if (w.mode === 'duration' && w.amount * UNIT_MS[w.unit] > MAX_WAIT_MS) {
    ctx.addIssue({ code: 'custom', path: ['amount'], message: 'A single wait is at most 90 days' });
  }
});

export type WaitConfiguration = z.input<typeof waitConfigurationSchema>;
export type ParsedWaitConfiguration = z.output<typeof waitConfigurationSchema>;

export type WaitResolution =
  | { kind: 'resume_at'; resumeAt: Date }
  | { kind: 'continue' } // already past: run the next step now
  | { kind: 'skip'; reason: 'anchor_missing' | 'anchor_past' };

function wallClock(instant: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const n = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { year: n('year'), month: n('month'), day: n('day'), hour: n('hour'), minute: n('minute'), second: n('second') };
}

/** Milliseconds `tz` is ahead of UTC at `instant`. */
function tzOffsetMs(instant: Date, tz: string): number {
  const w = wallClock(instant, tz);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The UTC instant at which the wall clock in `tz` reads the given local time. */
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let utc = guess - tzOffsetMs(new Date(guess), tz);
  // Re-check once across a DST boundary.
  const second = guess - tzOffsetMs(new Date(utc), tz);
  if (second !== utc) utc = second;
  return new Date(utc);
}

/**
 * Pure: turns a wait into an absolute wake time. `now` is the moment the wait
 * step starts; `anchors` supplies the entity date-times for relative waits.
 */
export function computeWaitUntil(
  config: WaitConfiguration,
  now: Date,
  anchors: Partial<Record<WaitAnchorField, string | Date | null>> = {}
): WaitResolution {
  const w = waitConfigurationSchema.parse(config);
  switch (w.mode) {
    case 'duration':
      return { kind: 'resume_at', resumeAt: new Date(now.getTime() + w.amount * UNIT_MS[w.unit]) };
    case 'until_time_of_day': {
      const [hour, minute] = w.time.split(':').map(Number);
      const today = wallClock(now, w.timezone);
      const at = (offset: number) => {
        // Calendar arithmetic on a UTC date, then map the wall time back through the zone.
        const d = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
        return zonedTimeToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hour, minute, w.timezone);
      };
      if (w.dayOffset > 0) return { kind: 'resume_at', resumeAt: at(w.dayOffset) };
      const sameDay = at(0);
      return { kind: 'resume_at', resumeAt: sameDay.getTime() > now.getTime() ? sameDay : at(1) };
    }
    case 'relative_to_field': {
      const raw = anchors[w.field];
      if (raw == null) return { kind: 'skip', reason: 'anchor_missing' };
      const anchor = raw instanceof Date ? raw : new Date(raw);
      if (Number.isNaN(anchor.getTime())) return { kind: 'skip', reason: 'anchor_missing' };
      const resumeAt = new Date(anchor.getTime() + w.offsetMinutes * 60_000);
      if (resumeAt.getTime() > now.getTime()) return { kind: 'resume_at', resumeAt };
      return w.ifPast === 'skip' ? { kind: 'skip', reason: 'anchor_past' } : { kind: 'continue' };
    }
  }
}
