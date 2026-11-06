/**
 * The ready-to-send invite for a meeting link (/app/meetings): one short,
 * friendly message the rep can text, email or paste anywhere. Pure, so the
 * page and the tests use the same words.
 */

export interface InviteInput {
  url: string;
  guestName?: string | null;
  /** The rep's first name ("Liam"); falls back to "HomeQuote". */
  hostFirstName?: string | null;
  /** Null = "now" (the room is open already). */
  startsAtMs?: number | null;
  timeZone?: string | null;
  nowMs?: number;
}

function when(startsAtMs: number, timeZone: string, nowMs: number): string {
  const tz = timeZone || 'America/Los_Angeles';
  const opts = { timeZone: tz } as const;
  const day = (ms: number) => new Intl.DateTimeFormat('en-US', { ...opts, year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(ms));
  const time = new Intl.DateTimeFormat('en-US', { ...opts, hour: 'numeric', minute: '2-digit' }).format(new Date(startsAtMs));
  const zone = new Intl.DateTimeFormat('en-US', { ...opts, timeZoneName: 'short' }).formatToParts(new Date(startsAtMs)).find((p) => p.type === 'timeZoneName')?.value ?? '';
  if (day(startsAtMs) === day(nowMs)) return `today at ${time} ${zone}`;
  if (day(startsAtMs) === day(nowMs + 86_400_000)) return `tomorrow at ${time} ${zone}`;
  const date = new Intl.DateTimeFormat('en-US', { ...opts, weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(startsAtMs));
  return `${date} at ${time} ${zone}`;
}

export function inviteMessage(i: InviteInput): string {
  const first = i.guestName?.trim().split(/\s+/)[0];
  const hi = first ? `Hi ${first}, ` : 'Hi, ';
  const from = i.hostFirstName?.trim() ? `${i.hostFirstName.trim()} from HomeQuote` : 'HomeQuote';
  const now = i.nowMs ?? Date.now();
  const timing = i.startsAtMs && i.startsAtMs > now + 5 * 60_000 ? ` for ${when(i.startsAtMs, i.timeZone ?? '', now)}` : '';
  return `${hi}it's ${from}. Here's the link for our video call${timing}: ${i.url}\n\nNo app or download needed. Just tap the link on your phone or computer.`;
}

export const inviteSubject = (hostFirstName?: string | null) =>
  hostFirstName?.trim() ? `Video call with ${hostFirstName.trim()} from HomeQuote` : 'Your HomeQuote video call';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Splits what the rep typed into a phone or an email (or neither). */
export function contactKind(v: string | null | undefined): { phone: string | null; email: string | null } {
  const s = (v ?? '').trim();
  if (EMAIL_RE.test(s)) return { phone: null, email: s };
  const digits = s.replace(/[^\d+]/g, '');
  const bare = digits.replace(/^\+/, '');
  if (bare.length >= 10 && bare.length <= 15) return { phone: digits.startsWith('+') ? digits : bare.length === 10 ? `+1${bare}` : `+${bare}`, email: null };
  return { phone: null, email: null };
}

/** sms: link with the message prefilled (works on iPhone and Android). */
export function smsHref(phone: string | null, message: string): string {
  return `sms:${phone ?? ''}?&body=${encodeURIComponent(message)}`;
}

export function mailtoHref(email: string | null, subject: string, message: string): string {
  return `mailto:${email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
