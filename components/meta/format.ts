import { formatMoney } from '@/lib/meta/metrics';

export const int = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));
export const pct = (n: number | null) => (n == null ? '—' : `${(n * 100).toFixed(2)}%`);
export const money = (n: number | null, currency: string | null | undefined) => formatMoney(n, currency ?? 'USD');
export const when = (iso: string | null | undefined, tz = 'America/Los_Angeles') =>
  iso ? new Intl.DateTimeFormat('en-US', { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : 'never';

export const STATUS_TONE: Record<string, 'success' | 'warning' | 'muted' | 'secondary'> = {
  ACTIVE: 'success', PAUSED: 'muted', CAMPAIGN_PAUSED: 'muted', ADSET_PAUSED: 'muted', ARCHIVED: 'muted', DELETED: 'muted',
  PENDING_REVIEW: 'warning', DISAPPROVED: 'warning', WITH_ISSUES: 'warning', IN_PROCESS: 'warning',
};
