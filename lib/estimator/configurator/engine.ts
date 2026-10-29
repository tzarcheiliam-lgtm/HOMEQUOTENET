import { computeEstimate } from '../engine.ts';
import type { Answers, Estimate, EstimatorTemplate } from '../types.ts';
import type { ConfiguratorGroup, ConfiguratorSelection, ConfiguratorSpec, Range } from './types.ts';

/*
 * Pure helpers for the one-page configurator: selection -> template answers ->
 * computeEstimate, row price deltas, the Go Luxe bundle, the photo matrix and
 * the shareable "Save your design" URL. No React, server- and client-safe.
 */

function groupOf(spec: ConfiguratorSpec, rowId: string): ConfiguratorGroup | undefined {
  return spec.groups.find((g) => g.rows.some((r) => r.id === rowId));
}

function includedRow(group: ConfiguratorGroup): string {
  return (group.rows.find((r) => r.included) ?? group.rows[0]).id;
}

/** The design every page load starts from: default model, every single group on its included row, no add-ons. */
export function defaultSelection(spec: ConfiguratorSpec): ConfiguratorSelection {
  const picks: Record<string, string[]> = {};
  for (const g of spec.groups) picks[g.id] = g.kind === 'single' ? [includedRow(g)] : [];
  return { model: spec.defaultModel, picks, luxe: false };
}

/** A selection with unknown ids dropped: unknown model -> default, single groups keep one valid row (else included). */
export function normalizeSelection(spec: ConfiguratorSpec, selection: ConfiguratorSelection): ConfiguratorSelection {
  const model = spec.models.some((m) => m.id === selection.model) ? selection.model : spec.defaultModel;
  const picks: Record<string, string[]> = {};
  for (const g of spec.groups) {
    const raw = selection.picks?.[g.id] ?? [];
    const valid = [...new Set(raw.filter((id) => g.rows.some((r) => r.id === id)))];
    picks[g.id] = g.kind === 'single' ? [valid[0] ?? includedRow(g)] : valid;
  }
  return { model, picks, luxe: Boolean(selection.luxe && spec.bundle) };
}

/** Picks per group with the bundle applied (bundle rows win in single groups and are added in multi groups). */
export function effectivePicks(spec: ConfiguratorSpec, selection: ConfiguratorSelection): Record<string, string[]> {
  const sel = normalizeSelection(spec, selection);
  const picks: Record<string, string[]> = {};
  for (const g of spec.groups) picks[g.id] = [...sel.picks[g.id]];
  if (sel.luxe && spec.bundle) {
    for (const rowId of spec.bundle.rows) {
      const g = groupOf(spec, rowId);
      if (!g) continue;
      picks[g.id] = g.kind === 'single' ? [rowId] : [...new Set([...picks[g.id], rowId])];
    }
  }
  return picks;
}

/** Every selected row id (bundle applied). */
export function selectedRows(spec: ConfiguratorSpec, selection: ConfiguratorSelection): Set<string> {
  return new Set(Object.values(effectivePicks(spec, selection)).flat());
}

/** True when the row is forced on by the active bundle (show "Luxe selected" and lock it). */
export function isLockedByBundle(spec: ConfiguratorSpec, selection: ConfiguratorSelection, rowId: string): boolean {
  if (!selection.luxe || !spec.bundle) return false;
  const g = groupOf(spec, rowId);
  if (!g) return false;
  // In a single group every row is locked (the bundle row is forced); in a multi group only the bundle's rows.
  return g.kind === 'single' ? g.rows.some((r) => spec.bundle!.rows.includes(r.id)) : spec.bundle.rows.includes(rowId);
}

/**
 * Template answers for a selection, in this order: baseAnswers, then the model's
 * answers and each single group's row (both replace the questions they name),
 * then multi-group rows (their picks go in front of existing picks, so on a
 * single-kind question such as `project` the row's pick wins, and on a multi
 * question they are simply added). `extra` (e.g. the property questions) is laid
 * over the top. The result feeds computeEstimate on the trade template.
 */
export function selectionToAnswers(spec: ConfiguratorSpec, selection: ConfiguratorSelection, extra?: Answers): Answers {
  const sel = normalizeSelection(spec, selection);
  const picks = effectivePicks(spec, sel);
  const out: Answers = {};
  const replace = (a: Answers) => {
    for (const [q, ids] of Object.entries(a)) out[q] = [...ids];
  };
  replace(spec.baseAnswers);
  replace(spec.models.find((m) => m.id === sel.model)!.answers);
  for (const g of spec.groups) {
    if (g.kind !== 'single') continue;
    const row = g.rows.find((r) => r.id === picks[g.id][0])!;
    replace(row.answers);
  }
  for (const g of spec.groups) {
    if (g.kind !== 'multi') continue;
    for (const rowId of picks[g.id]) {
      const row = g.rows.find((r) => r.id === rowId)!;
      for (const [q, ids] of Object.entries(row.answers)) out[q] = [...new Set([...ids, ...(out[q] ?? [])])];
    }
  }
  if (extra) replace(extra);
  return out;
}

/** Unrounded sum of the estimate's lines. */
function lineSum(e: Estimate): Range {
  return e.lines.reduce((t, l) => ({ low: t.low + l.low, high: t.high + l.high }), { low: 0, high: 0 });
}

function roundRange(r: Range, step: number): Range {
  if (!(step > 0)) return { low: Math.round(r.low), high: Math.round(r.high) };
  return { low: Math.floor(r.low / step) * step, high: Math.ceil(r.high / step) * step };
}

/** Rounding step for price deltas (row and bundle figures): $100 keeps small add-ons readable. */
export const DELTA_STEP = 100;

export type SelectionEstimate = {
  /** computeEstimate on the selection's answers (lines, site-visit items, status). */
  estimate: Estimate;
  /** The total shown: lines minus the bundle saving, minimum job applied, rounded out to roundTo. Always low < high. */
  total: Range;
  /** The bundle saving included in `total`, or null when Go Luxe is off. */
  bundleSaving: Range | null;
};

/**
 * Price a selection. With the bundle on, the saving (bundle discount x the
 * bundle rows' summed deltas at this model) comes off the line total. Same
 * rounding and minimum-job rules as computeEstimate.
 */
export function estimateSelection(
  spec: ConfiguratorSpec,
  template: EstimatorTemplate,
  selection: ConfiguratorSelection,
  extra?: Answers,
): SelectionEstimate {
  const sel = normalizeSelection(spec, selection);
  const estimate = computeEstimate(template, { answers: selectionToAnswers(spec, sel, extra) });
  const sum = lineSum(estimate);
  const bundleSaving = sel.luxe && spec.bundle ? bundleQuote(spec, template, sel.model).saving : null;
  const step = template.roundTo > 0 ? template.roundTo : 0;
  const floor = Math.max(0, template.minimumJob || 0);
  const low = Math.max(floor, sum.low - (bundleSaving?.low ?? 0));
  const high = Math.max(floor, sum.high - (bundleSaving?.high ?? 0));
  const total = roundRange({ low, high }, step);
  total.low = Math.max(floor, total.low);
  if (total.high <= total.low) total.high = total.low + (step || Math.max(1, Math.ceil(total.low * 0.1)));
  return { estimate, total, bundleSaving };
}

/**
 * What a row adds over its group's baseline (single: vs the included row; multi:
 * vs not having it), with everything else as in `selection` (bundle off), so
 * size-based prices follow the chosen model. Rounded out to DELTA_STEP. The
 * included row and unknown rows return { low: 0, high: 0 }.
 */
export function rowDelta(spec: ConfiguratorSpec, template: EstimatorTemplate, selection: ConfiguratorSelection, rowId: string): Range {
  const g = groupOf(spec, rowId);
  if (!g) return { low: 0, high: 0 };
  const base = normalizeSelection(spec, { ...selection, luxe: false });
  const without = structuredClone(base);
  const withRow = structuredClone(base);
  if (g.kind === 'single') {
    without.picks[g.id] = [includedRow(g)];
    withRow.picks[g.id] = [rowId];
  } else {
    without.picks[g.id] = without.picks[g.id].filter((id) => id !== rowId);
    withRow.picks[g.id] = [...without.picks[g.id], rowId];
  }
  const a = lineSum(computeEstimate(template, { answers: selectionToAnswers(spec, without) }));
  const b = lineSum(computeEstimate(template, { answers: selectionToAnswers(spec, withRow) }));
  return roundRange({ low: Math.max(0, b.low - a.low), high: Math.max(0, b.high - a.high) }, DELTA_STEP);
}

export type BundleQuote = {
  /** Sum of the bundle rows' deltas over the base design ("crossed-out" figure). */
  full: Range;
  /** What the bundle adds: full minus saving. */
  price: Range;
  saving: Range;
};

/** Go Luxe figures for a model, measured on that model's base design. */
export function bundleQuote(spec: ConfiguratorSpec, template: EstimatorTemplate, modelId: string): BundleQuote {
  if (!spec.bundle) return { full: { low: 0, high: 0 }, price: { low: 0, high: 0 }, saving: { low: 0, high: 0 } };
  const base = { ...defaultSelection(spec), model: modelId };
  const a = lineSum(computeEstimate(template, { answers: selectionToAnswers(spec, base) }));
  const b = lineSum(computeEstimate(template, { answers: selectionToAnswers(spec, { ...base, luxe: true }) }));
  const fullRaw = { low: b.low - a.low, high: b.high - a.high };
  const pct = Math.min(Math.max(spec.bundle.discountPct, 0), 1);
  const saving = roundRange({ low: fullRaw.low * pct, high: fullRaw.high * pct }, DELTA_STEP);
  // Saving rounds out (low down, high up) and the price is what is left, so price + saving = full.
  const full = roundRange(fullRaw, DELTA_STEP);
  return { full, price: { low: full.low - saving.low, high: full.high - saving.high }, saving };
}

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

/** The view a row's photo lives in (switch to it when the row is clicked). */
export function viewForRow(spec: ConfiguratorSpec, rowId: string): string | undefined {
  const g = groupOf(spec, rowId);
  return g?.rows.find((r) => r.id === rowId)?.view ?? g?.view;
}

function keyOf(viewId: string, tokens: string[]): string {
  return [viewId, ...tokens.filter(Boolean)].join('-');
}

/** Image key for a view and selection, from the view's visual dimensions only (bundle applied). */
export function photoFor(spec: ConfiguratorSpec, viewId: string, selection: ConfiguratorSelection): string {
  const view = spec.views.find((v) => v.id === viewId) ?? spec.views[0];
  const rows = selectedRows(spec, selection);
  const tokens = view.dimensions.map((d) => {
    const hit = d.options.find((o) => o.rows.length === 0 || o.rows.some((r) => rows.has(r)));
    return hit?.token ?? '';
  });
  return keyOf(view.id, tokens);
}

/** Every key a view (or every view) can resolve to: the product of its dimension tokens. */
export function photoKeys(spec: ConfiguratorSpec, viewId?: string): string[] {
  const views = viewId ? spec.views.filter((v) => v.id === viewId) : spec.views;
  return views.flatMap((v) =>
    v.dimensions
      .reduce<string[][]>((acc, d) => acc.flatMap((t) => d.options.map((o) => [...t, o.token])), [[]])
      .map((tokens) => keyOf(v.id, tokens)),
  );
}

/** src/alt for a key, falling back to the view's real photo when the key has no entry. */
export function photoSrc(spec: ConfiguratorSpec, key: string): { src: string; alt: string } {
  const photo = spec.photos[key];
  if (photo) return photo;
  const view = spec.views.find((v) => key === v.id || key.startsWith(`${v.id}-`)) ?? spec.views[0];
  return view.fallback;
}

/* ------------------------------------------------------------------ */
/* Shareable URL                                                       */
/* ------------------------------------------------------------------ */

/**
 * Query string for a design ("Save your design" link), without the leading "?":
 * m=<model>&o=<non-baseline row ids, comma-separated>&lx=1. Baseline rows are left
 * out, so the default design encodes to just m=<model>.
 */
export function encodeSelection(spec: ConfiguratorSpec, selection: ConfiguratorSelection): string {
  const sel = normalizeSelection(spec, selection);
  const rows: string[] = [];
  for (const g of spec.groups) {
    for (const id of sel.picks[g.id]) if (!(g.kind === 'single' && id === includedRow(g))) rows.push(id);
  }
  const params = new URLSearchParams({ m: sel.model });
  if (rows.length) params.set('o', rows.join(','));
  if (sel.luxe) params.set('lx', '1');
  return params.toString().replace(/%2C/g, ',');
}

/** A selection from a query string or URLSearchParams; anything unknown is ignored (falls back to the default design). */
export function decodeSelection(spec: ConfiguratorSpec, query: string | URLSearchParams): ConfiguratorSelection {
  const params = typeof query === 'string' ? new URLSearchParams(query.replace(/^\?/, '')) : query;
  const sel = defaultSelection(spec);
  const model = params.get('m');
  if (model) sel.model = model;
  for (const id of (params.get('o') ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const g = groupOf(spec, id);
    if (!g) continue;
    sel.picks[g.id] = g.kind === 'single' ? [id] : [...sel.picks[g.id], id];
  }
  sel.luxe = params.get('lx') === '1';
  return normalizeSelection(spec, sel);
}
