/**
 * Inbound keyword classification — the technical guardrail layer for SMS
 * opt-out. This alone does NOT make HomeQuote compliant (TCPA, CTIA, 10DLC
 * campaign registration, consent records and legal review still apply).
 *
 * Rules:
 *  - Exact keywords (whole message, case/punctuation-insensitive) are
 *    definitive: STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, OPTOUT, REVOKE.
 *  - Natural-language revocations ("stop texting me", "please remove me")
 *    also count: the FCC's 2024 rule requires honoring opt-out requests made
 *    by any reasonable means. When unsure, we opt the person out.
 *  - START / UNSTOP / YES re-opt-in ONLY a contact who is currently opted
 *    out on this sender scope. YES alone never creates consent.
 *  - HELP / INFO get an informational reply (no state change).
 */

export const OPT_OUT_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT', 'REVOKE'] as const;
export const OPT_IN_KEYWORDS = ['START', 'UNSTOP', 'YES'] as const;
export const HELP_KEYWORDS = ['HELP', 'INFO'] as const;

// Matched against the canonical form: lower-case, apostrophes removed.
const OPT_OUT_PHRASES = [
  /\bstop\s+(texting|messaging|sending|contacting|calling)\b/,
  /\b(unsubscribe|opt\s*out|remove)\s+me\b/,
  /\b(dont|do not)\s+(text|message|contact)\s+me\b/,
  /\bno\s+more\s+(texts|messages)\b/,
  /\btake\s+me\s+off\b/,
];

export type KeywordClassification = 'opt_out' | 'opt_in' | 'help' | 'none';

function canonical(body: string): string {
  return body
    .normalize('NFKC')
    .toUpperCase()
    .replace(/['’]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyInboundKeyword(body: string): KeywordClassification {
  const word = canonical(body);
  if (!word) return 'none';
  const compact = word.replace(/ /g, '');
  if ((OPT_OUT_KEYWORDS as readonly string[]).includes(compact)) return 'opt_out';
  if ((OPT_IN_KEYWORDS as readonly string[]).includes(compact)) return 'opt_in';
  if ((HELP_KEYWORDS as readonly string[]).includes(compact)) return 'help';
  const lower = word.toLowerCase();
  if (OPT_OUT_PHRASES.some((p) => p.test(lower))) return 'opt_out';
  return 'none';
}

export type ContactMessagingState = 'opted_out' | 'subscribed' | 'unknown';

/**
 * The state change an inbound keyword causes for (tenant, channel, number).
 * Returns null when nothing changes. YES is only a re-opt-in for someone
 * currently opted out; it never grants first-time consent.
 */
export function optStateAfterInbound(
  current: ContactMessagingState,
  classification: KeywordClassification
): ContactMessagingState | null {
  if (classification === 'opt_out') return current === 'opted_out' ? null : 'opted_out';
  if (classification === 'opt_in') return current === 'opted_out' ? 'subscribed' : null;
  return null;
}
