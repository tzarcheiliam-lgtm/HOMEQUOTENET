import {
  bundleQuote,
  defaultSelection,
  encodeSelection,
  estimateSelection,
  isLockedByBundle,
  normalizeSelection,
  rowDelta,
  selectedRows,
  viewForRow,
  type BundleQuote,
  type SelectionEstimate,
} from '@/lib/estimator/configurator/engine';
import type { ConfiguratorSelection, ConfiguratorSpec, Range } from '@/lib/estimator/configurator/types';
import type { EstimatorTemplate } from '@/lib/estimator/types';

/*
 * Pure state for the one-page configurator (no React): what a click does to the
 * selection, the money formats, the cost breakdown and the "Save your design"
 * URL. The component (configurator.tsx) only wires these to the page, so the
 * behaviour is unit-tested without a DOM (tests/estimator-configurator-ui.test.tsx).
 */

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** "$64,000". */
export const money = (n: number) => usd.format(Math.round(n));

/** "$64,000 – $105,500" (en dash with thin spacing; a single figure when both ends match). */
export const moneyRange = (r: Range) => (r.low === r.high ? money(r.low) : `${money(r.low)} – ${money(r.high)}`);

/** 1800 -> "1.8k", 18000 -> "18k", 120000 -> "120k". Deltas are rounded to $100, so one decimal is exact. */
function kilo(n: number): string {
  if (n < 1000) return String(Math.round(n));
  const k = n / 1000;
  return `${k >= 100 ? Math.round(k) : Number(k.toFixed(1))}k`;
}

/** Compact range for option rows and cards: "$1.8k–2.7k", "$18k–35k", "$900–1.2k". */
export function compactRange(r: Range): string {
  const lo = `$${kilo(r.low)}`;
  return r.low === r.high ? lo : `${lo}–${kilo(r.high)}`;
}

/** "+$1.8k–2.7k" for an upgrade row. */
export const deltaLabel = (r: Range) => `+${compactRange(r)}`;

/* ------------------------------------------------------------------ */
/* Selection changes                                                   */
/* ------------------------------------------------------------------ */

export type ConfiguratorAction =
  | { type: 'model'; model: string }
  | { type: 'row'; rowId: string; on?: boolean }
  | { type: 'luxe'; on: boolean }
  | { type: 'replace'; selection: ConfiguratorSelection };

/**
 * The next selection after a click. Single groups switch to the row; multi
 * groups toggle it (or set it with `on`). Rows the active bundle locks do not
 * change. Always returns a normalized selection.
 */
export function reduceSelection(spec: ConfiguratorSpec, current: ConfiguratorSelection, action: ConfiguratorAction): ConfiguratorSelection {
  const sel = normalizeSelection(spec, current);
  switch (action.type) {
    case 'replace':
      return normalizeSelection(spec, action.selection);
    case 'model':
      return normalizeSelection(spec, { ...sel, model: action.model });
    case 'luxe':
      return normalizeSelection(spec, { ...sel, luxe: action.on });
    case 'row': {
      const group = spec.groups.find((g) => g.rows.some((r) => r.id === action.rowId));
      if (!group || isLockedByBundle(spec, sel, action.rowId)) return sel;
      const picks = { ...sel.picks };
      if (group.kind === 'single') {
        picks[group.id] = [action.rowId];
      } else {
        const has = picks[group.id].includes(action.rowId);
        const on = action.on ?? !has;
        picks[group.id] = on ? (has ? picks[group.id] : [...picks[group.id], action.rowId]) : picks[group.id].filter((id) => id !== action.rowId);
      }
      return normalizeSelection(spec, { ...sel, picks });
    }
  }
}

/** The photo view to show after an action (undefined: keep the current one). */
export function viewAfter(spec: ConfiguratorSpec, action: ConfiguratorAction): string | undefined {
  if (action.type === 'row') return viewForRow(spec, action.rowId);
  if (action.type === 'luxe' && action.on && spec.bundle) return viewForRow(spec, spec.bundle.rows.find((id) => viewForRow(spec, id)) ?? '');
  return undefined;
}

/**
 * A short, calm confirmation for the photo ("Spa added", "Pebble finish"), or
 * null when nothing visible changed. Read by sighted users only: the total's
 * live region already announces the change.
 */
export function toastFor(spec: ConfiguratorSpec, before: ConfiguratorSelection, after: ConfiguratorSelection, action: ConfiguratorAction): string | null {
  if (action.type === 'luxe') return action.on && spec.bundle ? `${spec.bundle.label} applied` : null;
  if (action.type !== 'row') return null;
  const group = spec.groups.find((g) => g.rows.some((r) => r.id === action.rowId));
  const row = group?.rows.find((r) => r.id === action.rowId);
  if (!group || !row) return null;
  const was = selectedRows(spec, before).has(row.id);
  const is = selectedRows(spec, after).has(row.id);
  if (was === is) return null;
  if (group.kind === 'single') return row.label;
  return `${row.label} ${is ? 'added' : 'removed'}`;
}

/* ------------------------------------------------------------------ */
/* Cost breakdown                                                      */
/* ------------------------------------------------------------------ */

export type UpgradeLine = { rowId: string; group: string; label: string; range: Range };

export type CostBreakdown = {
  /** e.g. "Classic · 30 × 15 ft". */
  modelLabel: string;
  /** The model's base design ("Included" rows only). */
  base: Range;
  /** Go Luxe, when on. */
  luxe: (BundleQuote & { label: string }) | null;
  /** Picked upgrades outside the bundle, each vs its group's included row. */
  upgrades: UpgradeLine[];
  /** Sum of `upgrades`. */
  upgradesTotal: Range;
  /** The figure the page shows (whole design priced together, bundle saving applied). */
  total: Range;
  quote: SelectionEstimate;
};

const add = (a: Range, b: Range): Range => ({ low: a.low + b.low, high: a.high + b.high });

/**
 * Lines for the bar's breakdown, the cost summary and the result. The lines
 * are rounded separately, so they can differ from the total by a rounding
 * step; the total is always priced from the whole design.
 */
export function costBreakdown(spec: ConfiguratorSpec, template: EstimatorTemplate, selection: ConfiguratorSelection): CostBreakdown {
  const sel = normalizeSelection(spec, selection);
  const model = spec.models.find((m) => m.id === sel.model)!;
  const base = estimateSelection(spec, template, { ...defaultSelection(spec), model: sel.model }).total;
  const luxe = sel.luxe && spec.bundle ? { ...bundleQuote(spec, template, sel.model), label: spec.bundle.label } : null;
  const upgrades: UpgradeLine[] = [];
  const rows = selectedRows(spec, sel);
  for (const g of spec.groups) {
    for (const r of g.rows) {
      if (!rows.has(r.id) || r.included || isLockedByBundle(spec, sel, r.id)) continue;
      upgrades.push({ rowId: r.id, group: g.title, label: r.label, range: rowDelta(spec, template, sel, r.id) });
    }
  }
  const upgradesTotal = upgrades.reduce((t, u) => add(t, u.range), { low: 0, high: 0 });
  const quote = estimateSelection(spec, template, sel);
  return { modelLabel: `${model.name} · ${model.dimensions}`, base, luxe, upgrades, upgradesTotal, total: quote.total, quote };
}

/* ------------------------------------------------------------------ */
/* URL                                                                 */
/* ------------------------------------------------------------------ */

/** Query keys the configurator owns; every other parameter (utm_*, fbclid...) is kept. */
export const SELECTION_PARAMS = ['m', 'o', 'lx'] as const;

/**
 * The page URL for a design: the current URL with m / o / lx replaced and
 * everything else (other parameters, the hash) kept. Used with
 * history.replaceState, so "Save your design" is just the address bar.
 */
export function designUrl(spec: ConfiguratorSpec, href: string, selection: ConfiguratorSelection): string {
  const url = new URL(href);
  const params = new URLSearchParams(url.search);
  for (const k of SELECTION_PARAMS) params.delete(k);
  const own = new URLSearchParams(encodeSelection(spec, selection));
  for (const [k, v] of own) params.set(k, v);
  const query = params.toString().replace(/%2C/g, ',');
  return `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
}

/** True when a query string carries a saved design (so the page should load it). */
export function hasSavedDesign(search: string): boolean {
  const params = new URLSearchParams(search.replace(/^\?/, ''));
  return SELECTION_PARAMS.some((k) => params.has(k));
}

/** Steps of the page; the hash keeps browser Back working between them. */
export type ConfiguratorStep = 'design' | 'summary' | 'book';

export function stepFromHash(hash: string): ConfiguratorStep {
  const h = hash.replace(/^#/, '');
  return h === 'summary' || h === 'book' ? h : 'design';
}
