/**
 * Pure metric and date math for the Meta Ads section. No I/O, so every definition here is unit-tested.
 *
 * Rules enforced here (and surfaced in the UI as definitions):
 *  - Spend, impressions, link clicks and action counts are ADDITIVE and are summed.
 *  - Reach (and frequency) are NOT additive: unique people overlap across days, ads and ad sets. They are
 *    only ever shown for a single ad on a single day, never summed or averaged.
 *  - Ratios (CTR, CPM, CPC, cost per X) are always recomputed from summed numerators/denominators.
 *  - Money is never summed across currencies; rollups are keyed by currency.
 *  - A cost-per metric is `null` (shown as "—") when its denominator is zero or the data can't support it.
 */

// --------------------------------------------------------------------------------------------------
// Meta "actions"
// --------------------------------------------------------------------------------------------------
export type ActionMap = Record<string, number>;

/** [{action_type, value}] -> {action_type: number}; ignores malformed entries, never throws. */
export function actionsToMap(actions: { action_type?: string; value?: string | number }[] | null | undefined): ActionMap {
  const out: ActionMap = {};
  for (const a of actions ?? []) {
    const n = Number(a?.value);
    if (a?.action_type && Number.isFinite(n)) out[a.action_type] = (out[a.action_type] ?? 0) + n;
  }
  return out;
}

/**
 * "Leads (Meta-reported)": action_type `lead` is Meta's total across Instant Forms, on-Facebook leads and
 * Pixel/CAPI Lead events. `onsite_conversion.lead_grouped` is the Instant-Form subset of that same total, so
 * the two are never added together.
 */
export const META_LEAD_ACTION = 'lead';
export const META_INSTANT_FORM_ACTION = 'onsite_conversion.lead_grouped';

export function reportedLeads(a: ActionMap): number { return a[META_LEAD_ACTION] ?? 0; }

// --------------------------------------------------------------------------------------------------
// Rollups
// --------------------------------------------------------------------------------------------------
export type InsightRow = {
  date: string; currency: string; spend: number; impressions: number; inline_link_clicks: number;
  reach?: number | null; actions: ActionMap;
};

export type Rollup = {
  currency: string;
  spend: number; impressions: number; linkClicks: number; actions: ActionMap;
  ctr: number | null;    // link clicks / impressions
  cpm: number | null;    // spend per 1,000 impressions
  cpc: number | null;    // spend per link click
  /** Only set for exactly one day of one ad's data; otherwise null by definition (see header). */
  reach: number | null;
  days: number;
};

const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);

/** Sums additive metrics per currency. `singleAd` lets reach through when the caller is looking at one ad. */
export function rollup(rows: InsightRow[], opts: { singleAd?: boolean } = {}): Rollup[] {
  const by = new Map<string, { r: Rollup; dates: Set<string>; reach: number | null }>();
  for (const row of rows) {
    let e = by.get(row.currency);
    if (!e) {
      e = { r: { currency: row.currency, spend: 0, impressions: 0, linkClicks: 0, actions: {}, ctr: null, cpm: null, cpc: null, reach: null, days: 0 }, dates: new Set(), reach: null };
      by.set(row.currency, e);
    }
    e.r.spend += row.spend; e.r.impressions += row.impressions; e.r.linkClicks += row.inline_link_clicks;
    for (const [k, v] of Object.entries(row.actions)) e.r.actions[k] = (e.r.actions[k] ?? 0) + v;
    e.dates.add(row.date);
    e.reach = row.reach ?? null;
  }
  return [...by.values()].map(({ r, dates, reach }) => ({
    ...r, days: dates.size,
    reach: opts.singleAd && dates.size === 1 ? reach : null,
    ctr: div(r.linkClicks, r.impressions),
    cpm: div(r.spend * 1000, r.impressions),
    cpc: div(r.spend, r.linkClicks),
  }));
}

/** Cost per outcome. Null unless there is at least one outcome. */
export function costPer(spend: number, count: number): number | null { return div(spend, count); }

// --------------------------------------------------------------------------------------------------
// Timezones and date ranges
// --------------------------------------------------------------------------------------------------
/** YYYY-MM-DD of an instant as seen in `tz`. */
export function zonedDate(instant: Date | string | number, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant));
}

/** Offset (ms) of `tz` from UTC at `instant`. */
function tzOffsetMs(instant: number, tz: string): number {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(instant)).reduce<Record<string, string>>((m, x) => { m[x.type] = x.value; return m; }, {});
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The UTC instant at which calendar day `ymd` begins in `tz` (DST-safe). */
export function zonedDayStart(ymd: string, tz: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  let t = guess - tzOffsetMs(guess, tz);
  t = guess - tzOffsetMs(t, tz); // second pass lands correctly across a DST change
  return new Date(t);
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export type DateRange = { since: string; until: string }; // inclusive calendar days

export const RANGE_PRESETS = ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month'] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export function resolvePreset(preset: RangePreset, tz: string, now: Date = new Date()): DateRange {
  const today = zonedDate(now, tz);
  switch (preset) {
    case 'today': return { since: today, until: today };
    case 'yesterday': { const y = addDays(today, -1); return { since: y, until: y }; }
    case 'last_7d': return { since: addDays(today, -6), until: today };
    case 'last_14d': return { since: addDays(today, -13), until: today };
    case 'last_30d': return { since: addDays(today, -29), until: today };
    case 'this_month': return { since: `${today.slice(0, 8)}01`, until: today };
    case 'last_month': {
      const first = `${today.slice(0, 8)}01`;
      const lastPrev = addDays(first, -1);
      return { since: `${lastPrev.slice(0, 8)}01`, until: lastPrev };
    }
  }
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
/** Validates user-supplied dates; falls back to the last 30 days. Caps the span at 366 days. */
export function parseRange(since: string | undefined, until: string | undefined, tz: string, now: Date = new Date()): DateRange {
  const fallback = resolvePreset('last_30d', tz, now);
  if (!since || !until || !YMD.test(since) || !YMD.test(until) || since > until) return fallback;
  if (Number.isNaN(Date.parse(since)) || Number.isNaN(Date.parse(until))) return fallback;
  const span = (Date.parse(until) - Date.parse(since)) / 86_400_000;
  return span > 366 ? fallback : { since, until };
}

/** UTC [start, end) bounds of an inclusive calendar range as seen in `tz`, for filtering timestamptz columns. */
export function rangeBoundsUtc(range: DateRange, tz: string): { startIso: string; endIso: string } {
  return { startIso: zonedDayStart(range.since, tz).toISOString(), endIso: zonedDayStart(addDays(range.until, 1), tz).toISOString() };
}

// --------------------------------------------------------------------------------------------------
// Freshness
// --------------------------------------------------------------------------------------------------
export type Freshness = 'never' | 'fresh' | 'stale';
/** Reporting data older than `maxAgeHours` (default 26: a daily sync plus slack) is stale. */
export function freshness(lastSyncedAt: string | null | undefined, now: Date = new Date(), maxAgeHours = 26): Freshness {
  if (!lastSyncedAt) return 'never';
  return now.getTime() - new Date(lastSyncedAt).getTime() > maxAgeHours * 3_600_000 ? 'stale' : 'fresh';
}

export function formatMoney(amount: number | null, currency: string): string {
  if (amount === null) return '—';
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency}`; }
}
