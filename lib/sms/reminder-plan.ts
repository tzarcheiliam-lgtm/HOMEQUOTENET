/**
 * When reminder texts go out. Pure (no I/O) so the schedule is easy to test and the settings page can show it.
 *
 * Meetings (contractor sales meetings and homeowner appointments), in the meeting's own time zone:
 *   booked      right after booking (only if the meeting is 2+ hours away)
 *   four_days   4 days before at 10:00 (only when booked 7+ days ahead)
 *   day_before  the day before at 10:00, asking them to reply YES to confirm
 *   morning_of  8:00 on the day (only for meetings at 9:30 or later)
 *   two_hours   2 hours before
 * A step is dropped when it would land within an hour of an earlier one (90 minutes for two_hours after morning_of),
 * or when the meeting was booked after it was due. Each step has a last useful moment (`until`); a step not sent by
 * then is skipped rather than sent late.
 */
import { addDays, localParts, zonedToUtc } from '@/lib/availability/time';

export const MEETING_STEPS = ['booked', 'four_days', 'day_before', 'morning_of', 'two_hours', 'no_show'] as const;
export type MeetingStep = (typeof MEETING_STEPS)[number];
export const FOLLOW_UP_STEPS = ['first', 'second', 'final', 'nudge', 'nudge_last'] as const;
export type FollowUpStep = (typeof FOLLOW_UP_STEPS)[number];

export interface PlannedStep<S extends string = MeetingStep> { step: S; dueAt: Date; until: Date }

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function planMeetingReminders(m: { scheduledAt: Date; bookedAt: Date; timeZone: string }): PlannedStep[] {
  const s = m.scheduledAt.getTime();
  const b = m.bookedAt.getTime();
  const tz = m.timeZone;
  const local = localParts(s, tz);
  const at = (date: string, minuteOfDay: number) => zonedToUtc(date, minuteOfDay, tz);
  const out: { step: MeetingStep; due: number; until: number }[] = [];

  if (s - b >= 2 * HOUR) out.push({ step: 'booked', due: b, until: Math.min(b + 6 * HOUR, s - 2 * HOUR) });
  if (s - b >= 7 * DAY) {
    const due = at(addDays(local.date, -4), 10 * 60);
    out.push({ step: 'four_days', due, until: Math.min(due + DAY, s) });
  }
  const dayBefore = at(addDays(local.date, -1), 10 * 60);
  if (dayBefore > b + HOUR) out.push({ step: 'day_before', due: dayBefore, until: at(local.date, 0) });
  const morning = at(local.date, 8 * 60);
  if (local.minuteOfDay >= 9 * 60 + 30 && morning > b + 30 * MIN) out.push({ step: 'morning_of', due: morning, until: s - 30 * MIN });
  const twoHours = s - 2 * HOUR;
  if (twoHours > b + 30 * MIN) out.push({ step: 'two_hours', due: twoHours, until: s - 15 * MIN });

  out.sort((x, y) => x.due - y.due);
  const kept: typeof out = [];
  for (const p of out) {
    const prev = kept[kept.length - 1];
    const gap = p.step === 'two_hours' && prev?.step === 'morning_of' ? 90 * MIN : HOUR;
    if (prev && p.due - prev.due < gap) continue;
    kept.push(p);
  }
  return kept.map((p) => ({ step: p.step, dueAt: new Date(p.due), until: new Date(p.until) }));
}

/** One "sorry we missed you" text, 30 minutes after a meeting marked as a no-show. */
export function planNoShow(m: { scheduledAt: Date; markedAt: Date }): PlannedStep {
  const due = Math.max(m.scheduledAt.getTime(), m.markedAt.getTime()) + 30 * MIN;
  return { step: 'no_show', dueAt: new Date(due), until: new Date(due + 2 * DAY) };
}

/**
 * Follow-ups for a homeowner conversation.
 * - They never replied to the first text: texts on the configured days after it (default 1, 3, 7); the last one says
 *   the request will be closed.
 * - They replied, then went quiet while we were waiting on them: a nudge after a day, a last one on day 3.
 * Each step is only useful for 12 hours after it is due, so turning this on never sends a pile of old follow-ups.
 */
export function planFollowUps(c: { openedAt: Date; lastInboundAt: Date | null; lastOutboundAt: Date | null; days: number[] }): { anchor: Date; steps: PlannedStep<FollowUpStep>[] } {
  const grace = 12 * HOUR;
  if (!c.lastInboundAt) {
    const names: FollowUpStep[] = ['first', 'second', 'final'];
    const days = c.days.slice(0, 3);
    return {
      anchor: c.openedAt,
      steps: days.map((d, i) => {
        const due = c.openedAt.getTime() + d * DAY;
        return { step: i === days.length - 1 ? 'final' : names[i], dueAt: new Date(due), until: new Date(due + grace) };
      }),
    };
  }
  // Waiting on them only if our message came after their last one.
  if (!c.lastOutboundAt || c.lastOutboundAt <= c.lastInboundAt) return { anchor: c.lastInboundAt, steps: [] };
  const base = c.lastInboundAt.getTime();
  return {
    anchor: c.lastInboundAt,
    steps: [
      { step: 'nudge', dueAt: new Date(base + DAY), until: new Date(base + DAY + grace) },
      { step: 'nudge_last', dueAt: new Date(base + 3 * DAY), until: new Date(base + 3 * DAY + grace) },
    ],
  };
}

/** "today at 2:00 PM", "tomorrow at 2:00 PM" or "Thursday, Oct 30 at 2:00 PM", seen from `from`, in `timeZone`. */
export function describeWhen(meeting: Date, from: Date, timeZone: string): { when: string; day: string; time: string } {
  const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(meeting);
  const day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'short', day: 'numeric' }).format(meeting);
  const md = localParts(meeting.getTime(), timeZone).date;
  const fd = localParts(from.getTime(), timeZone).date;
  const rel = md === fd ? 'today' : md === addDays(fd, 1) ? 'tomorrow' : md === addDays(fd, -1) ? 'yesterday' : day;
  return { when: `${rel} at ${time}`, day, time };
}
