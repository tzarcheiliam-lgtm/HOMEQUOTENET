import type { DateFormat } from '@/lib/signing/constants';

/** Valid IANA zone or 'UTC'. Signers report theirs from the browser; never trust it blindly. */
export function safeTimeZone(tz: unknown): string {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

export function formatSigningDate(date: Date, format: DateFormat | string | null | undefined, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: safeTimeZone(timeZone), year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const { year, month, day } = parts;
  switch (format) {
    case 'MM/dd/yyyy': return `${month}/${day}/${year}`;
    case 'dd/MM/yyyy': return `${day}/${month}/${year}`;
    case 'yyyy-MM-dd': return `${year}-${month}-${day}`;
    default: {
      const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${names[Number(month) - 1]} ${Number(day)}, ${year}`;
    }
  }
}

/** UTC timestamp for audit output, e.g. 2026-10-07 14:03:09 UTC. */
export function formatUtc(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

/** Short human device string from a User-Agent, without storing more than needed in the certificate. */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'unknown OS';
  return `${browser} on ${os}`;
}
