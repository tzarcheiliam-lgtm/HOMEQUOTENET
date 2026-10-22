/** Pure texting rules: opt-out detection, message hygiene, the opening message. No I/O. */

const STOP_WORDS = new Set(['stop', 'stopall', 'stop all', 'unsubscribe', 'cancel', 'end', 'quit', 'optout', 'opt out', 'remove me', 'do not text', "don't text", 'dont text', 'leave me alone']);
const HELP_WORDS = new Set(['help', 'info']);

const clean = (s: string) => s.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** True when the whole message is an opt-out keyword (carrier-standard), or plainly asks not to be texted. */
export function isOptOut(body: string): boolean {
  const t = clean(body);
  if (!t) return false;
  if (STOP_WORDS.has(t)) return true;
  return /\b(stop (texting|messaging|contacting) me|do not (text|contact) me|don'?t (text|contact) me|take me off|remove me from)\b/.test(t);
}
export const isHelp = (body: string) => HELP_WORDS.has(clean(body));

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;

/** What actually gets sent: no links, no line-break walls, hard length cap. */
export function finalizeOutbound(text: string, max = 320): string {
  let t = text.replace(URL_RE, '').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
  if (t.length > max) {
    const cut = t.slice(0, max);
    const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
    t = stop > max * 0.5 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
  }
  return t;
}

export const SENDER_HOUSE = 'HomeQuote';

/** The first text. Deterministic (not AI). Consent and STOP language are on the form, so it stays short and casual; STOP replies are still honored. */
export function openingMessage(input: { firstName?: string | null; senderName: string; project?: string | null }): string {
  const hi = input.firstName?.trim() ? `Hey ${input.firstName.trim()}` : 'Hey there';
  const what = input.project ? `your ${input.project}` : 'your project';
  return finalizeOutbound(
    `${hi}, it's ${input.senderName}. Just got ${what} request. Easier to hop on a quick call, or want to just knock it out here over text?`, 400);
}

export const optOutConfirmation = (senderName: string) => `You're unsubscribed from ${senderName} texts and won't get any more. Reply START if that was a mistake.`;
export const helpReply = (senderName: string) => `${senderName}: we're following up on your home project request. Reply STOP to stop texts, or just tell us what you need.`;

export const isStart = (body: string) => clean(body) === 'start' || clean(body) === 'unstop';

/** Project label for the opening text from the funnel's industry ("Bathroom remodeling" -> "bathroom remodel"). */
export function projectLabel(industry: string | null | undefined): string | null {
  const t = (industry ?? '').trim().toLowerCase();
  if (!t) return null;
  return t.replace(/remodeling$/, 'remodel').replace(/\s+/g, ' ');
}

/**
 * The exact text a lead gets when they choose a call. Fixed wording (not written by the AI) so we never promise
 * a time we can't keep. `available` = someone is ready to call right now.
 */
export const CALL_REPLY_AVAILABLE = 'Got it. Calling you in a few minutes.';
export const CALL_REPLY_BUSY = "Got it. We'll give you a call a bit later, within 10 minutes or so.";
export const callReply = (available: boolean) => (available ? CALL_REPLY_AVAILABLE : CALL_REPLY_BUSY);
