/** Minimal RFC 5545 writer. Times are emitted in UTC so no VTIMEZONE block is needed. */

export interface IcsEvent {
  uid: string;
  startMs: number;
  endMs: number;
  summary: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  status?: 'CONFIRMED' | 'CANCELLED';
  /** Monotonic revision (e.g. updated_at seconds) so clients accept changes. */
  sequence?: number;
  lastModifiedMs?: number;
}

export function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\;').replace(/,/g, '\\,');
}

/** Fold to 75 octets per line (counting UTF-8 bytes, never splitting a character). */
export function foldLine(line: string): string {
  if (Buffer.byteLength(line, 'utf8') <= 75) return line;
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, 'utf8');
    if (bytes + size > limit) {
      out.push(current);
      current = ' ';
      bytes = 1;
      limit = 75;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n');
}

export function icsDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getUTCFullYear(), 4)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

export function buildCalendar(events: IcsEvent[], opts: { name: string; nowMs?: number; method?: 'PUBLISH' | 'REQUEST' | 'CANCEL' }): string {
  const now = opts.nowMs ?? Date.now();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HomeQuote Network//Appointments//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${opts.method ?? 'PUBLISH'}`,
    `X-WR-CALNAME:${escapeText(opts.name)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(e.startMs)}`,
      `DTEND:${icsDate(e.endMs)}`,
      `SEQUENCE:${e.sequence ?? 0}`,
      `STATUS:${e.status ?? 'CONFIRMED'}`,
      `SUMMARY:${escapeText(e.summary)}`
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.lastModifiedMs) lines.push(`LAST-MODIFIED:${icsDate(e.lastModifiedMs)}`);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Appointment', 'TRIGGER:-PT1H', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
