/**
 * Reminder and follow-up settings (sms_settings.reminder_config) with the built-in wording. Pure, so the Texting page
 * can preview it. Anything missing or invalid in the stored JSON falls back to the defaults below.
 */
import { finalizeOutbound } from './rules';
import type { FollowUpStep, MeetingStep } from './reminder-plan';

export const REMINDER_PLACEHOLDERS = ['{first_name}', '{host}', '{brand}', '{business}', '{how}', '{when}', '{day}', '{time}', '{project}', '{sender}'] as const;
export const MAX_REMINDER_TEMPLATE = 320;

export interface ReminderConfig {
  contractor: { enabled: boolean; host: string; brand: string; templates: Record<MeetingStep, string> };
  homeowner: { enabled: boolean; templates: Record<MeetingStep, string> };
  /** keepGoing: after the follow-up days, keep texting every `everyDays` until they reply, book or text STOP. */
  followups: { enabled: boolean; days: number[]; keepGoing: boolean; everyDays: number; templates: Record<FollowUpStep, string> };
  /** Push an alert to call them when a meeting isn't confirmed by 8:00 on the day. */
  unconfirmedAlert: boolean;
  /** Lead recovery (lib/booking/recovery.server.ts); each switch on by default. */
  recovery: RecoveryConfig;
}

export interface RecoveryConfig {
  /** Push + email to the owner and calendar hosts the moment a funnel / estimator lead comes in, and again when they book. */
  speedAlert: boolean;
  /** One "sorry we missed you" text + email (with a link to pick a new time) after a no-show. */
  noShow: boolean;
  /** Push the host when a calendar call is still "scheduled" 30 minutes after it ended. */
  heldPrompt: boolean;
  /** The "Couldn't reach them" button on a call (text + email with a link to pick a new time). */
  missedCall: boolean;
  /** One text + email to a lead who gave their details but didn't book a call within 2 hours. */
  unbooked: boolean;
}

export const RECOVERY_KEYS = ['speedAlert', 'noShow', 'heldPrompt', 'missedCall', 'unbooked'] as const satisfies readonly (keyof RecoveryConfig)[];

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  contractor: {
    enabled: true,
    host: 'Liam',
    brand: 'HomeQuote',
    templates: {
      booked: "Hi {first_name}, it's {host} with {brand}. You're all set for our {how} {when}. Looking forward to it! If anything changes, just reply R and we'll find a new time.",
      four_days: "Hi {first_name}, {host} from {brand} here. Quick heads-up that our {how} is coming up {when}. Still good on your end?",
      day_before: "Hi {first_name}, {host} from {brand}. Just confirming our {how} {when}. Reply YES to confirm or R if you need to reschedule.",
      morning_of: 'Good morning {first_name}! Looking forward to our {how} {when}. - {host}, {brand}',
      two_hours: "Hi {first_name}, {host} here. Talk to you {when}!",
      no_show: "Hi {first_name}, {host} from {brand}. Sorry we missed each other {when}. Want to pick a new time? Just reply with a day that works for you.",
    },
  },
  homeowner: {
    enabled: true,
    // {how} is "free estimate visit" for an on-site visit, or e.g. "quick 10-minute call" for a call booked on a
    // HomeQuote calendar (lib/sms/reminders.ts homeownerHow).
    templates: {
      booked: "Hi {first_name}, it's {host}. Your {how} is set for {when}. Reply R anytime if you need a different time.",
      four_days: 'Hi {first_name}, {host} here. Just a reminder that your {how} is coming up {when}.',
      day_before: 'Hi {first_name}, {host} here. Confirming your {how} {when}. Reply YES to confirm or R to reschedule.',
      morning_of: 'Good morning {first_name}! Just a reminder about your {how} {when}. - {host}',
      two_hours: "Hi {first_name}, {host} here. Your {how} is {when}. Talk soon!",
      no_show: 'Hi {first_name}, {host} here. Sorry we missed you {when}. Want to set up a new time? Just reply with a day that works.',
    },
  },
  followups: {
    enabled: true,
    days: [1, 3, 7],
    // Owner decision (2026-10-29): keep texting every few days until they reply or text STOP.
    keepGoing: true,
    everyDays: 3,
    templates: {
      first: 'Hi {first_name}, just following up on your {project} request. Would a quick call or text be easier?',
      second: '{first_name}, {sender} here. Still thinking about your {project}? Happy to answer questions or set up a free estimate.',
      final: "Hi {first_name}, I'll close out your {project} request for now. If you'd still like a free estimate, just reply here anytime.",
      nudge: 'Hi {first_name}, just checking in. Still interested in setting up your free estimate?',
      nudge_last: "Last check-in from {sender}. Reply anytime if you'd like to set up your free estimate.",
    },
  },
  unconfirmedAlert: true,
  recovery: { speedAlert: true, noShow: true, heldPrompt: true, missedCall: true, unbooked: true },
};

/** Why a reminder template can't be used, or null. Blank means "use the default". */
export function reminderTemplateProblem(t: string): string | null {
  const v = t.trim();
  if (!v) return null;
  if (v.length > MAX_REMINDER_TEMPLATE) return `Keep each text under ${MAX_REMINDER_TEMPLATE} characters.`;
  const unknown = (v.match(/\{[^}]*\}/g) ?? []).filter((x) => !(REMINDER_PLACEHOLDERS as readonly string[]).includes(x));
  if (unknown.length) return `Unknown fill-in ${unknown[0]}. Use ${REMINDER_PLACEHOLDERS.join(', ')}.`;
  return null;
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const text = (v: unknown, d: string, max = 60) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : d);
function templates<K extends string>(raw: unknown, defaults: Record<K, string>): Record<K, string> {
  const r = obj(raw);
  const out = { ...defaults };
  for (const k of Object.keys(defaults) as K[]) {
    const v = r[k];
    if (typeof v === 'string' && v.trim() && !reminderTemplateProblem(v)) out[k] = v.trim();
  }
  return out;
}

/** The stored config merged over the defaults. */
export function reminderConfig(raw: unknown): ReminderConfig {
  const r = obj(raw);
  const c = obj(r.contractor), h = obj(r.homeowner), f = obj(r.followups), rc = obj(r.recovery);
  const d = DEFAULT_REMINDER_CONFIG;
  const days = Array.isArray(f.days) ? f.days.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 30) : [];
  const sortedDays = [...new Set(days)].sort((a, b) => a - b).slice(0, 3);
  return {
    contractor: { enabled: bool(c.enabled, d.contractor.enabled), host: text(c.host, d.contractor.host, 40), brand: text(c.brand, d.contractor.brand, 40), templates: templates(c.templates, d.contractor.templates) },
    homeowner: { enabled: bool(h.enabled, d.homeowner.enabled), templates: templates(h.templates, d.homeowner.templates) },
    followups: {
      enabled: bool(f.enabled, d.followups.enabled), days: sortedDays.length ? sortedDays : d.followups.days,
      keepGoing: bool(f.keepGoing, d.followups.keepGoing),
      everyDays: Number.isInteger(f.everyDays) && (f.everyDays as number) >= 2 && (f.everyDays as number) <= 30 ? (f.everyDays as number) : d.followups.everyDays,
      templates: templates(f.templates, d.followups.templates),
    },
    unconfirmedAlert: bool(r.unconfirmedAlert, d.unconfirmedAlert),
    recovery: Object.fromEntries(RECOVERY_KEYS.map((k) => [k, bool(rc[k], d.recovery[k])])) as unknown as RecoveryConfig,
  };
}

export type ReminderVars = Partial<Record<'first_name' | 'host' | 'brand' | 'business' | 'how' | 'when' | 'day' | 'time' | 'project' | 'sender', string | null>>;

/** Fill a template. Missing values read naturally ("there", "project"); links are removed and the text is capped. */
export function renderReminder(template: string, vars: ReminderVars): string {
  const fallback: Record<string, string> = { first_name: 'there', project: 'project', how: 'call' };
  const out = template.replace(/\{([a-z_]+)\}/g, (_m, k: string) => {
    const v = (vars as Record<string, string | null | undefined>)[k];
    return v && v.trim() ? v.trim() : fallback[k] ?? '';
  });
  return finalizeOutbound(out.replace(/\s{2,}/g, ' ').trim());
}

/** How a sales meeting is described: "call", "video call" or "meeting". */
export const meetingHow = (type: string | null | undefined) => (type === 'video' ? 'video call' : type === 'in_person' ? 'meeting' : 'call');

export const firstName = (full: string | null | undefined) => (full ?? '').trim().split(/\s+/)[0] || null;

const CONFIRM = /^(y|ya|yes|yep|yeah|yup|confirm|confirmed|ok|okay|k|sure|sounds good|see you( then| there)?|will be there|i('| wi)ll be there|perfect|great|👍|✅)[.! ]*$/i;
const RESCHEDULE = /^(r|resched|reschedule|re-schedule|can'?t make it|cant make it|need (to|a) (reschedule|new time|different time)|different time|new time|change (the )?time|move it)[.! ]*$/i;
/** A short "yes" to a reminder. */
export const isConfirmReply = (body: string) => CONFIRM.test(body.trim());
/** A short "need to reschedule" to a reminder (a longer message is passed on as-is). */
export const isRescheduleReply = (body: string) => RESCHEDULE.test(body.trim()) || /\b(reschedule|can'?t make it|cant make it)\b/i.test(body);
