/**
 * Display helpers for the calling workspace. Dates render in the caller's
 * zone (Los Angeles by default) because a callback "at 2 PM" means the
 * contractor's 2 PM, not the server's.
 */

export const DEFAULT_TZ = 'America/Los_Angeles';

export function fmtDateTime(iso: string | null | undefined, timeZone = DEFAULT_TZ): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function fmtDate(iso: string | null | undefined, timeZone = DEFAULT_TZ): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

/** "3h ago", "2d ago" — for last-contacted columns. */
export function fmtRelative(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'Never';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Math.max(0, now - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}

/** (818) 555-0123 for a 10-digit US number; otherwise as entered. */
export function fmtPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const d = phone.replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  if (ten.length !== 10) return phone;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

/** The href for click-to-call. Null when the record has no usable number. */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  if (d.length < 10) return null;
  return `tel:+${d.length === 10 ? '1' + d : d}`;
}

/** A website as a clickable, host-only label. */
export function siteLabel(website: string | null | undefined): string {
  if (!website) return '—';
  return website.replace(/^[a-z]+:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '');
}

export function siteHref(website: string | null | undefined): string | null {
  if (!website) return null;
  return /^[a-z]+:\/\//i.test(website) ? website : `https://${website}`;
}

/** Whether a callback is due now (or overdue). */
export function isDue(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t <= now;
}
