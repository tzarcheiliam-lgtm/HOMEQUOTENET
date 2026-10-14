import { describe, expect, it } from 'vitest';
import { buildCalendar, escapeText, foldLine, icsDate } from '@/lib/calendar/ics';

const base = { uid: 'appt-1@homequotenet.com', startMs: Date.UTC(2026, 9, 20, 16, 0), endMs: Date.UTC(2026, 9, 20, 17, 0), summary: 'HomeQuote: Pool – Pat' };

describe('ics writer', () => {
  it('formats UTC timestamps', () => {
    expect(icsDate(Date.UTC(2026, 9, 20, 16, 5, 9))).toBe('20261020T160509Z');
  });

  it('escapes text per RFC 5545', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne');
  });

  it('folds long lines at 75 octets without splitting characters', () => {
    const folded = foldLine('DESCRIPTION:' + 'é'.repeat(100));
    for (const line of folded.split('\r\n')) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe('DESCRIPTION:' + 'é'.repeat(100));
  });

  it('builds a valid calendar with CRLF endings, stable UID and SEQUENCE', () => {
    const ics = buildCalendar([{ ...base, description: 'Line1\nLine2', location: '1 Main St, LA', sequence: 7 }], { name: 'Mine', nowMs: Date.UTC(2026, 0, 1) });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('UID:appt-1@homequotenet.com');
    expect(ics).toContain('SEQUENCE:7');
    expect(ics).toContain('DTSTART:20261020T160000Z');
    expect(ics).toContain('DTEND:20261020T170000Z');
    expect(ics).toContain('DESCRIPTION:Line1\\nLine2');
    expect(ics).toContain('LOCATION:1 Main St\\, LA');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true);
  });

  it('marks cancellations so subscribed calendars drop them', () => {
    const ics = buildCalendar([{ ...base, status: 'CANCELLED', sequence: 9 }], { name: 'x' });
    expect(ics).toContain('STATUS:CANCELLED');
  });
});
