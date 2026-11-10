/**
 * vCard 3.0 for a booking calendar's host contact ("Save Liam's number"), so
 * the homeowner recognises the call. Pure: the route
 * (app/api/booking/contact/[file]/route.ts) adds the photo bytes.
 * Lines are CRLF and folded at 75 octets (RFC 2425 §5.8.1 / RFC 6350 §3.2):
 * each continuation line starts with one space, multi-byte characters are
 * never split.
 */
import { vcardPhone } from '@/lib/funnels/vcard';
import { hostNote, type HostContact } from './host-contact';

/** Text value escaping (backslash, newline, comma, semicolon). */
export const vcardEscape = (v: string) => v.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');

const encoder = new TextEncoder();

/** One content line folded to at most 75 octets per physical line. */
export function foldLine(line: string, limit = 75): string {
  if (encoder.encode(line).length <= limit) return line;
  const out: string[] = [];
  let current = '';
  let size = 0;
  let max = limit;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (size + n > max) {
      out.push(current);
      current = '';
      size = 0;
      max = limit - 1; // the leading space of a continuation line counts
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join('\r\n ');
}

export interface HostVCardInput {
  host: HostContact;
  /** Call length, for the NOTE. */
  minutes: number;
  /** URL line (the contractor's site, else HomeQuote's). */
  url?: string | null;
  /** Base64 image (no data: prefix). */
  photo?: { type: 'JPEG' | 'PNG'; base64: string } | null;
}

/** The card, or null without a usable phone number (a card that can't ring is no use). */
export function buildHostVCard({ host, minutes, url, photo }: HostVCardInput): string | null {
  const tel = host.phone ? vcardPhone(host.phone) : null;
  if (!tel) return null;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'PRODID:-//HomeQuote Network//Booking contact//EN',
    `FN:${vcardEscape(host.displayName)}`,
    // Whole display name as the given name: the phone then shows "Liam from Pool Masters" on the call, in any name order.
    `N:;${vcardEscape(host.displayName)};;;`,
    `ORG:${vcardEscape(host.org)}`,
    `TEL;TYPE=CELL,VOICE:${tel}`,
  ];
  if (host.email) lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(host.email)}`);
  if (url && /^https?:\/\//.test(url)) lines.push(`URL:${url}`);
  lines.push(`NOTE:${vcardEscape(hostNote(host, minutes))}`);
  if (photo?.base64) lines.push(`PHOTO;ENCODING=b;TYPE=${photo.type}:${photo.base64}`);
  lines.push('END:VCARD');
  return lines.map((l) => foldLine(l)).join('\r\n') + '\r\n';
}
