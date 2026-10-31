import { defaultSelection, photoFor as configuratorPhotoKey, photoSrc as configuratorPhotoSrc, selectionToAnswers } from '../configurator/engine.ts';
import type { ConfiguratorSelection, Range } from '../configurator/types.ts';
import { computeEstimate } from '../engine.ts';
import type { Answers, ContractorEstimatorConfig, Estimate, EstimatorTemplate, PoolDimensions } from '../types.ts';
import type { FunnelOption, FunnelPhoto, FunnelPhotoFrame, FunnelPhotoRule, FunnelPhotoVariant, FunnelSelection, FunnelSpec, FunnelStep } from './types.ts';

/*
 * Pure helpers for the simple mobile funnel: default selection, selection ->
 * template answers (reusing the configurator mapping when the spec has one),
 * the estimate, the photo per step and the URL / sessionStorage encoding.
 * No React, server- and client-safe.
 */

function stepOf(spec: FunnelSpec, stepId: string): FunnelStep | undefined {
  return spec.steps.find((s) => s.id === stepId);
}

function defaultOptionOf(step: FunnelStep): string {
  return (step.options.find((o) => o.id === step.defaultOption) ?? step.options[0]).id;
}

/** Is this step shown, given the picks of the steps before it? */
function shownFor(step: FunnelStep, picks: Record<string, string | undefined>): boolean {
  return !step.showWhen || step.showWhen.anyOf.includes(picks[step.showWhen.stepId] ?? '');
}

/**
 * A selection with unknown steps dropped, unknown / missing picks set to the
 * step default, and the picks of follow-up steps that are not shown on this
 * path dropped (so changing "Add the extras." forgets a spa pick that no
 * longer applies).
 */
export function normalizeFunnelSelection(spec: FunnelSpec, raw: unknown): FunnelSelection {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: FunnelSelection = {};
  for (const s of spec.steps) {
    if (!shownFor(s, out)) continue;
    const v = obj[s.id];
    out[s.id] = typeof v === 'string' && s.options.some((o) => o.id === v) ? v : defaultOptionOf(s);
  }
  return out;
}

/** Every shown step on its default option. */
export function defaultFunnelSelection(spec: FunnelSpec): FunnelSelection {
  return normalizeFunnelSelection(spec, {});
}

/** The steps shown for a selection, in order (follow-up steps only when an earlier pick asks for them). */
export function activeSteps(spec: FunnelSpec, selection: FunnelSelection): FunnelStep[] {
  const sel = normalizeFunnelSelection(spec, selection);
  return spec.steps.filter((s) => sel[s.id] !== undefined);
}

/** The picked option of each shown step, in step order. */
export function pickedOptions(spec: FunnelSpec, selection: FunnelSelection): FunnelOption[] {
  const sel = normalizeFunnelSelection(spec, selection);
  return activeSteps(spec, sel).map((s) => s.options.find((o) => o.id === sel[s.id])!);
}

/**
 * The "Your design: ..." recap on the step at `index` of the path: the short titles
 * (else titles; '' left out) of the picks on the steps up to and including this one.
 * Empty on the first step or when the spec has no designRecap.
 */
export function designRecap(spec: FunnelSpec, selection: FunnelSelection, index: number): string[] {
  if (!spec.designRecap || index < 1) return [];
  return pickedOptions(spec, selection)
    .slice(0, index + 1)
    .map((o) => o.short ?? o.title)
    .filter((t) => t.trim() !== '');
}

/** Picked option titles in step order, e.g. ["Classic", "Luxe", "Add a spa", "Zero-edge spa"]. */
export function pickedTitles(spec: FunnelSpec, selection: FunnelSelection): string[] {
  return pickedOptions(spec, selection).map((o) => o.title);
}

/**
 * The configurator design a funnel selection stands for (Go Luxe bundle off):
 * the configurator's default design, then each picked option's model and rows
 * (a row replaces its single group's pick or is added to its multi group).
 * Null when the spec has no configurator.
 */
export function toConfiguratorSelection(spec: FunnelSpec, selection: FunnelSelection): ConfiguratorSelection | null {
  const cfg = spec.configurator;
  if (!cfg) return null;
  const sel = defaultSelection(cfg);
  for (const o of pickedOptions(spec, selection)) {
    if (o.model) sel.model = o.model;
    for (const rowId of o.rows ?? []) {
      const g = cfg.groups.find((gr) => gr.rows.some((r) => r.id === rowId));
      if (!g) continue;
      sel.picks[g.id] = g.kind === 'single' ? [rowId] : [...new Set([...sel.picks[g.id], rowId])];
    }
  }
  return { ...sel, luxe: false };
}

/** Option `answers` of every pick, laid over each other in step order (each replaces the questions it names). */
function overlayAnswers(spec: FunnelSpec, selection: FunnelSelection): Answers | undefined {
  const out: Answers = {};
  for (const o of pickedOptions(spec, selection)) for (const [q, ids] of Object.entries(o.answers ?? {})) out[q] = [...ids];
  return Object.keys(out).length ? out : undefined;
}

/** Option `addAnswers` of every pick, added (union) to `answers` in step order. */
function addPicked(spec: FunnelSpec, selection: FunnelSelection, answers: Answers): Answers {
  for (const o of pickedOptions(spec, selection)) {
    for (const [q, ids] of Object.entries(o.addAnswers ?? {})) answers[q] = [...new Set([...(answers[q] ?? []), ...ids])];
  }
  return answers;
}

/** Template answers for a selection (feed computeEstimate on the trade template, or send them to the lead route). */
export function funnelAnswers(spec: FunnelSpec, selection: FunnelSelection): Answers {
  const overlay = overlayAnswers(spec, selection);
  const cfgSel = toConfiguratorSelection(spec, selection);
  if (spec.configurator && cfgSel) return addPicked(spec, selection, selectionToAnswers(spec.configurator, cfgSel, overlay));
  const out: Answers = {};
  for (const [q, ids] of Object.entries(spec.baseAnswers ?? {})) out[q] = [...ids];
  for (const [q, ids] of Object.entries(overlay ?? {})) out[q] = [...ids];
  return addPicked(spec, selection, out);
}

export type FunnelEstimate = {
  estimate: Estimate;
  /** The range shown (minimum job and rounding applied), or null when nothing priced was picked. */
  total: Range | null;
};

/**
 * Price a selection on the (merged) trade template: computeEstimate on
 * funnelAnswers. With a configurator this is the same figure as
 * estimateSelection with the bundle off (the Go Luxe discount never applies).
 * `dimensions`: a measured size the picks cannot carry (the roofing funnel's
 * roof, lib/estimator/roofing/roof.ts roofDimensions), else the size preset.
 */
export function estimateFunnel(spec: FunnelSpec, template: EstimatorTemplate, selection: FunnelSelection, dimensions?: PoolDimensions): FunnelEstimate {
  const estimate = computeEstimate(template, { answers: funnelAnswers(spec, selection), ...(dimensions ? { dimensions } : {}) });
  return { estimate, total: estimate.low !== null && estimate.high !== null ? { low: estimate.low, high: estimate.high } : null };
}

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

/** The configurator's 1200 px copy of a pre-rendered photo ("x.webp" -> "x-sm.webp"); undefined for other files. */
export function smallVariant(src: string): string | undefined {
  return /\/configurator\/[^/]+\.webp$/.test(src) && !src.endsWith('-sm.webp') ? src.replace(/\.webp$/, '-sm.webp') : undefined;
}

/**
 * The image key a step shows for a selection: "<stepId>-<optionId>" for an
 * option rule (e.g. "size-classic"), "<stepId>-<optionId>-<otherPick>" for a
 * matrix rule (e.g. "layout-walkin-luxe"), the photo's file name for a
 * variants rule (e.g. "layout-walkin-luxe-guest"), the configurator image key
 * for a view rule (e.g. "aerial-porcelain-pebble-spa").
 */
export function photoKey(spec: FunnelSpec, stepId: string, selection: FunnelSelection): string {
  const step = stepOf(spec, stepId) ?? spec.steps[0];
  const sel = normalizeFunnelSelection(spec, selection);
  if (step.photo.kind === 'option') return `${step.id}-${optionPick(step, selection)}`;
  if (step.photo.kind === 'matrix') return `${step.id}-${optionPick(step, selection)}-${otherPick(spec, step.photo.stepId, selection)}`;
  if (step.photo.kind === 'variants') return fileKey(bestVariant(spec, step, step.photo, selection).photo.src);
  const cfg = spec.configurator;
  const cfgSel = toConfiguratorSelection(spec, sel);
  if (!cfg || !cfgSel) return step.photo.view;
  return configuratorPhotoKey(cfg, step.photo.view, cfgSel);
}

/** A step's own pick (valid even while the step is hidden on this path), else its default. */
function optionPick(step: FunnelStep, selection: FunnelSelection | null | undefined): string {
  const v = selection?.[step.id];
  return typeof v === 'string' && step.options.some((o) => o.id === v) ? v : defaultOptionOf(step);
}

/** Another step's pick for a matrix photo (its default when it has none yet, e.g. a later step). */
function otherPick(spec: FunnelSpec, stepId: string, selection: FunnelSelection | null | undefined): string {
  const other = stepOf(spec, stepId);
  return other ? optionPick(other, selection) : '';
}

/** "/estimator/x/funnel/layout-walkin-luxe-guest.webp" -> "layout-walkin-luxe-guest". */
function fileKey(src: string): string {
  return src.replace(/^.*\//, '').replace(/\.[a-z0-9]+$/i, '');
}

/**
 * How far a variant is from the picks, one number per `by` step (lower is
 * closer): 0 the same pick, 1 a wildcard (the variant does not name the step),
 * 1 + distance for a different pick of an ordered step, 1000 for a different
 * pick of an unordered step (or an unknown option).
 */
function variantDistance(spec: FunnelSpec, rule: Extract<FunnelPhotoRule, { kind: 'variants' }>, v: FunnelPhotoVariant, selection: FunnelSelection | null | undefined): number[] {
  return rule.by.map(({ stepId, ordered }) => {
    const want = v.when[stepId];
    if (want === undefined) return 1;
    const pick = otherPick(spec, stepId, selection);
    if (want === pick) return 0;
    if (!ordered) return 1000;
    const opts = stepOf(spec, stepId)?.options.map((o) => o.id) ?? [];
    const a = opts.indexOf(want);
    const b = opts.indexOf(pick);
    return a < 0 || b < 0 ? 1000 : 1 + Math.abs(a - b);
  });
}

/** The variant shown for THIS step's option and the other picks: the nearest by `by` order (see FunnelPhotoRule 'variants'). */
function bestVariant(spec: FunnelSpec, step: FunnelStep, rule: Extract<FunnelPhotoRule, { kind: 'variants' }>, selection: FunnelSelection | null | undefined): FunnelPhotoVariant {
  const own = optionPick(step, selection);
  const mine = rule.photos.filter((v) => v.when[step.id] === own);
  const pool = mine.length ? mine : rule.photos;
  let best = pool[0];
  let bestD = variantDistance(spec, rule, best, selection);
  for (const v of pool.slice(1)) {
    const d = variantDistance(spec, rule, v, selection);
    const i = d.findIndex((x, k) => x !== bestD[k]);
    if (i >= 0 && d[i] < bestD[i]) {
      best = v;
      bestD = d;
    }
  }
  return best;
}

/** The photo a step shows for a selection (src, phone-size src, alt and a fallback for a missing file). */
export function funnelPhoto(spec: FunnelSpec, stepId: string, selection: FunnelSelection): FunnelPhoto {
  const step = stepOf(spec, stepId) ?? spec.steps[0];
  const sel = normalizeFunnelSelection(spec, selection);
  const rule = step.photo;
  if (rule.kind === 'option') return rule.photos[optionPick(step, selection)] ?? Object.values(rule.photos)[0];
  if (rule.kind === 'matrix') {
    const row = rule.photos[optionPick(step, selection)] ?? Object.values(rule.photos)[0];
    return row[otherPick(spec, rule.stepId, selection)] ?? Object.values(row)[0];
  }
  if (rule.kind === 'variants') return bestVariant(spec, step, rule, selection).photo;
  const cfg = spec.configurator;
  const view = cfg?.views.find((v) => v.id === rule.view);
  if (!cfg || !view) return { src: spec.landing.heroPhoto.src, srcSm: spec.landing.heroPhoto.srcSm, alt: spec.landing.heroAlt };
  const photo = configuratorPhotoSrc(cfg, photoKey(spec, step.id, sel));
  return { src: photo.src, srcSm: smallVariant(photo.src), alt: photo.alt, fallback: { src: view.fallback.src, alt: view.fallback.alt } };
}

/** The pool's plan drawings and follow-up photos: contained, zoomed in past their white margins. */
export const DEFAULT_CONTAIN_ZOOM = 1.3;

/**
 * How a step's photo sits in its card: the step's own photoFit / photoZoom /
 * photoBackdrop, else the spec's photoFrame, else the pool's look (option
 * rules contain at 1.3 on white, view and matrix rules cover). `zoom` is 1
 * for 'cover'.
 */
export function stepPhotoFrame(spec: FunnelSpec, step: FunnelStep): Required<FunnelPhotoFrame> {
  const d = spec.photoFrame ?? {};
  const fit = step.photoFit ?? d.fit ?? (step.photo.kind === 'option' ? 'contain' : 'cover');
  const rawZoom = fit === 'contain' ? step.photoZoom ?? d.zoom ?? DEFAULT_CONTAIN_ZOOM : 1;
  const zoom = Number.isFinite(rawZoom) && rawZoom > 0 ? rawZoom : 1;
  return { fit, zoom, backdrop: step.photoBackdrop ?? d.backdrop ?? 'white' };
}

/** The photo for each option of a step with the rest of the selection unchanged (preload these so a tap swaps instantly). */
export function stepOptionPhotos(spec: FunnelSpec, stepId: string, selection: FunnelSelection): Record<string, FunnelPhoto> {
  const step = stepOf(spec, stepId) ?? spec.steps[0];
  // Raw picks (not normalized first): a follow-up step's photos are still asked for while the step is hidden.
  const base = { ...selection };
  return Object.fromEntries(step.options.map((o) => [o.id, funnelPhoto(spec, step.id, { ...base, [step.id]: o.id })]));
}

/** Every possible selection: the product of the shown steps' options on each path (pool: 6 + 6 + 162). */
export function allFunnelSelections(spec: FunnelSpec): FunnelSelection[] {
  return spec.steps.reduce<FunnelSelection[]>(
    (acc, s) => acc.flatMap((sel) => (shownFor(s, sel) ? s.options.map((o) => ({ ...sel, [s.id]: o.id })) : [sel])),
    [{}],
  );
}

/* ------------------------------------------------------------------ */
/* URL / sessionStorage                                                */
/* ------------------------------------------------------------------ */

/** Query string (no leading "?") with one param per shown step, e.g. "size=classic&finish=luxe&extras=spa&spa=zero_edge". */
export function encodeFunnelSelection(spec: FunnelSpec, selection: FunnelSelection): string {
  const sel = normalizeFunnelSelection(spec, selection);
  return new URLSearchParams(activeSteps(spec, sel).map((s) => [s.id, sel[s.id]])).toString();
}

/** A selection from a query string, URLSearchParams or a stored JSON object; anything unknown falls back to the step default. */
export function decodeFunnelSelection(spec: FunnelSpec, query: string | URLSearchParams | Record<string, unknown>): FunnelSelection {
  if (typeof query === 'string' || query instanceof URLSearchParams) {
    const params = typeof query === 'string' ? new URLSearchParams(query.replace(/^\?/, '')) : query;
    return normalizeFunnelSelection(spec, Object.fromEntries(spec.steps.map((s) => [s.id, params.get(s.id) ?? undefined])));
  }
  return normalizeFunnelSelection(spec, query);
}

/** Which steps a query string answers explicitly (the others are still on their defaults). */
export function answeredSteps(spec: FunnelSpec, query: string | URLSearchParams): string[] {
  const params = typeof query === 'string' ? new URLSearchParams(query.replace(/^\?/, '')) : query;
  return spec.steps.filter((s) => s.options.some((o) => o.id === params.get(s.id))).map((s) => s.id);
}

/** The funnel spec when a contractor opts in to the funnel, else null. */
export function funnelSpecFor(contractor: ContractorEstimatorConfig): FunnelSpec | null {
  return contractor.experience === 'funnel' && contractor.funnel ? contractor.funnel : null;
}

