/**
 * Real open times for the texting assistant, so it can offer a homeowner a few
 * specific times in one text and book the one they pick, instead of asking
 * "weekday or weekend?", then "morning or afternoon?", then "which day?".
 *
 * Two kinds, chosen by how the homeowner wants to continue:
 *   visit  they would rather text: the free in-home estimate visit, booked on the
 *          contractor's on-site availability (lib/availability, 60-minute visits)
 *   call   they would rather talk: the quick call on the HomeQuote calendar the
 *          lead books into (lib/booking: the contractor's or the team calendar)
 *
 * Pure (no I/O): picking what to offer, the lines the assistant sees, and the
 * texts sent after a booking.
 */
import { formatTime } from '@/lib/booking/format';

export type BookingKind = 'visit' | 'call';

export interface OpenTime {
  /** What the assistant passes back to book it: v1…, c1… */
  id: string;
  kind: BookingKind;
  startMs: number;
  endMs: number;
  /** "Tue, Nov 3 at 9:00 AM" in the time zone the homeowner is told. */
  label: string;
}

/** Days with open times, and times per day, given to the assistant. */
export const OFFER_DAYS = 6;
const PER_DAY = 3;
/** Never offer anything sooner than this: a visit or call needs a little notice. */
export const MIN_LEAD_MS = 3 * 3_600_000;

const dayFmt = new Map<string, Intl.DateTimeFormat>();
function dayKeyIn(ms: number, timeZone: string): string {
  let f = dayFmt.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    dayFmt.set(timeZone, f);
  }
  return f.format(new Date(ms));
}
const hourIn = (ms: number, timeZone: string) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date(ms)));

/** "Tue, Nov 3 at 9:00 AM" */
export function slotLabel(ms: number, timeZone: string): string {
  const day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(ms));
  return `${day} at ${formatTime(ms, timeZone)}`;
}

/**
 * From every bookable start, a short, varied menu: the first few days that have
 * openings, and on each up to one morning, one midday and one afternoon time
 * (the earliest in each). Enough for the assistant to offer three times that fit
 * whatever the homeowner said ("mornings", "Nov 3 or Nov 6"), small enough to
 * keep the prompt short.
 */
export function pickOpenTimes(
  slots: { startMs: number; endMs: number }[],
  kind: BookingKind,
  timeZone: string,
  nowMs: number,
  opts: { days?: number; perDay?: number } = {}
): OpenTime[] {
  const days = opts.days ?? OFFER_DAYS;
  const perDay = opts.perDay ?? PER_DAY;
  const byDay = new Map<string, { startMs: number; endMs: number }[]>();
  for (const s of [...slots].sort((a, b) => a.startMs - b.startMs)) {
    if (s.startMs < nowMs + MIN_LEAD_MS) continue;
    const k = dayKeyIn(s.startMs, timeZone);
    if (!byDay.has(k) && byDay.size >= days) continue;
    const list = byDay.get(k) ?? [];
    list.push(s);
    byDay.set(k, list);
  }
  const out: OpenTime[] = [];
  const prefix = kind === 'visit' ? 'v' : 'c';
  for (const list of byDay.values()) {
    const bucket = (s: { startMs: number }) => {
      const h = hourIn(s.startMs, timeZone);
      return h < 12 ? 0 : h < 15 ? 1 : 2;
    };
    const chosen: { startMs: number; endMs: number }[] = [];
    for (const b of [0, 1, 2]) {
      const first = list.find((s) => bucket(s) === b);
      if (first) chosen.push(first);
    }
    // A short day (one bucket only): fill with the next starts an hour or more apart.
    for (const s of list) {
      if (chosen.length >= perDay) break;
      if (!chosen.includes(s) && chosen.every((c) => Math.abs(c.startMs - s.startMs) >= 3_600_000)) chosen.push(s);
    }
    for (const s of chosen.slice(0, perDay).sort((a, b) => a.startMs - b.startMs)) {
      out.push({ id: `${prefix}${out.length + 1}`, kind, startMs: s.startMs, endMs: s.endMs, label: slotLabel(s.startMs, timeZone) });
    }
  }
  return out;
}

/** Three times spread over different days where possible, for a reply the server writes itself. */
export function threeSpread(times: OpenTime[], timeZone: string): OpenTime[] {
  const seen = new Set<string>();
  const firstPerDay = times.filter((t) => {
    const k = dayKeyIn(t.startMs, timeZone);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const pick = firstPerDay.slice(0, 3);
  for (const t of times) if (pick.length < 3 && !pick.includes(t)) pick.push(t);
  return pick.sort((a, b) => a.startMs - b.startMs);
}

/** "Tue, Nov 3 at 9:00 AM, Wed, Nov 4 at 11:00 AM or Thu, Nov 5 at 2:00 PM" */
export function joinTimes(times: OpenTime[]): string {
  const labels = times.map((t) => t.label);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} or ${labels.at(-1)}`;
}

export interface BookedCopy {
  firstName: string | null;
  label: string;
  /** visit: the company coming out ("Pool Masters"). call: who calls ("Liam from Pool Masters"). */
  who: string;
  /** call: minutes, and the number they will call from, if known. */
  minutes?: number;
  fromPhone?: string | null;
  callerFirstName?: string | null;
}

const hi = (name: string | null) => (name?.trim() ? ` ${name.trim().split(/\s+/)[0]}` : '');

/** The text sent the moment a visit is booked (in place of the automatic "you're booked" reminder text). */
export function visitBookedText(c: BookedCopy): string {
  return `You're all set${hi(c.firstName)}! Free estimate visit with ${c.who} on ${c.label}. We'll text the day before to confirm. Need a different time? Just reply R.`;
}

/** The text sent the moment a call is booked (in place of the booking system's own confirmation text). */
export function callBookedText(c: BookedCopy): string {
  const mins = c.minutes ?? 10;
  const length = `${mins <= 15 ? 'quick ' : ''}${mins}-minute call`;
  const caller = c.callerFirstName?.trim() || 'We';
  const from = c.fromPhone ? ` from ${c.fromPhone}` : '';
  const verb = caller === 'We' ? "We'll call you" : `${caller} will call you`;
  return `You're booked${hi(c.firstName)}: a ${length} with ${c.who}, ${c.label}. ${verb} at this number${from}. Need a different time? Just reply R.`;
}

/** The pick was taken in the meantime (or no longer fits): offer fresh times. */
export function takenText(times: OpenTime[]): string {
  return times.length
    ? `Ah, that time just got taken. I can do ${joinTimes(times)}. Which works?`
    : `Ah, that time just got taken. Someone from the team will text you shortly with a few new times.`;
}

/**
 * Handed to a person to book a time and still not booked: the assistant re-offers real times, a day later and again
 * three days later (each with half a day of slack for texting hours), then stops. The anchor is the handoff.
 */
export const AWAIT_BOOKING_STEP = 'await_booking';
export type RebookStep = 'rebook_1' | 'rebook_2';
export function planRebook(handoffAt: Date): { step: RebookStep; dueAt: Date; until: Date }[] {
  const h = handoffAt.getTime();
  const DAY = 86_400_000;
  return [
    { step: 'rebook_1', dueAt: new Date(h + DAY), until: new Date(h + 1.5 * DAY) },
    { step: 'rebook_2', dueAt: new Date(h + 3 * DAY), until: new Date(h + 3.5 * DAY) },
  ];
}

/** The re-offer text: real times, one tap to answer. */
export function rebookText(step: RebookStep, c: { kind: BookingKind; times: OpenTime[]; firstName: string | null; sender: string; callWho?: string | null }): string {
  const list = joinTimes(c.times);
  const name = c.firstName?.trim() ? ` ${c.firstName.trim().split(/\s+/)[0]}` : '';
  if (c.kind === 'call') {
    const who = c.callWho?.trim() || 'We';
    return step === 'rebook_1'
      ? `Hi${name}, still want that quick call? ${who} can call you ${list}. Which works?`
      : `Last check-in from ${c.sender}: ${who} can still call you ${list}. Just reply with the one that works.`;
  }
  return step === 'rebook_1'
    ? `Hi${name}, still want to get your free estimate on the calendar? I have ${list}. Any of those work?`
    : `Last check-in from ${c.sender}: I can still do ${list} for your free estimate. Just reply with the one that works.`;
}

/**
 * The never-ending follow-up (keep texting until they reply or text STOP): a different line each time, some with real
 * open times, always ending with how to stop them, which keeps people from reporting the number as junk.
 */
const KEEP_GOING: { withTimes: boolean; text: string }[] = [
  { withTimes: true, text: 'Hi {first}, still want a free estimate for your {project}? I have {times}. Want one?' },
  { withTimes: false, text: "{first}, {sender} here. Happy to set up your free {project} estimate whenever you're ready. Just reply with a day that works." },
  { withTimes: true, text: 'Hey {first}, openings for your free {project} estimate: {times}. Any of those work?' },
  { withTimes: false, text: "Hi {first}, no pressure at all. If you still want to get your {project} going, just reply and we'll get you on the calendar." },
  { withTimes: false, text: '{first}, quick question: are you still planning your {project}? A yes or no is perfect.' },
  { withTimes: true, text: 'Hi {first}, {sender} again. I can still do {times} for a free {project} estimate. Want me to grab one?' },
];
export const KEEP_GOING_STOP = 'Text STOP to stop these.';

export function keepGoingText(n: number, c: { firstName: string | null; project: string | null; sender: string; times: OpenTime[] }): string {
  let t = KEEP_GOING[(Math.max(1, n) - 1) % KEEP_GOING.length];
  // No open times to offer: use the next line that doesn't need them.
  if (t.withTimes && !c.times.length) t = KEEP_GOING.find((x, i) => !x.withTimes && i >= ((Math.max(1, n) - 1) % KEEP_GOING.length)) ?? KEEP_GOING[1];
  const first = c.firstName?.trim() ? c.firstName.trim().split(/\s+/)[0] : 'there';
  const body = t.text
    .replace('{first}', first)
    .replaceAll('{project}', c.project?.trim() || 'project')
    .replace('{sender}', c.sender)
    .replace('{times}', joinTimes(c.times));
  return `${body.charAt(0).toUpperCase()}${body.slice(1)} ${KEEP_GOING_STOP}`;
}
