import { defaultSelection, estimateSelection, photoFor as configuratorPhotoKey, photoSrc as configuratorPhotoSrc, selectionToAnswers } from '../configurator/engine.ts';
import type { ConfiguratorSelection, Range } from '../configurator/types.ts';
import { computeEstimate } from '../engine.ts';
import type { Answers, ContractorEstimatorConfig, Estimate, EstimatorTemplate } from '../types.ts';
import type { FunnelOption, FunnelPhoto, FunnelSelection, FunnelSpec, FunnelStep } from './types.ts';

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

/** Every step on its default option. */
export function defaultFunnelSelection(spec: FunnelSpec): FunnelSelection {
  return Object.fromEntries(spec.steps.map((s) => [s.id, defaultOptionOf(s)]));
}

/** A selection with unknown steps dropped and unknown / missing picks set to the step default. */
export function normalizeFunnelSelection(spec: FunnelSpec, raw: unknown): FunnelSelection {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: FunnelSelection = {};
  for (const s of spec.steps) {
    const v = obj[s.id];
    out[s.id] = typeof v === 'string' && s.options.some((o) => o.id === v) ? v : defaultOptionOf(s);
  }
  return out;
}

/** The picked option of each step, in step order. */
export function pickedOptions(spec: FunnelSpec, selection: FunnelSelection): FunnelOption[] {
  const sel = normalizeFunnelSelection(spec, selection);
  return spec.steps.map((s) => s.options.find((o) => o.id === sel[s.id])!);
}

/** Picked option titles in step order, e.g. ["Classic", "Luxe", "Add a spa"] (the price card eyebrow). */
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

/** Template answers for a selection (feed computeEstimate on the trade template, or send them to the lead route). */
export function funnelAnswers(spec: FunnelSpec, selection: FunnelSelection): Answers {
  const overlay = overlayAnswers(spec, selection);
  const cfgSel = toConfiguratorSelection(spec, selection);
  if (spec.configurator && cfgSel) return selectionToAnswers(spec.configurator, cfgSel, overlay);
  const out: Answers = {};
  for (const [q, ids] of Object.entries(spec.baseAnswers ?? {})) out[q] = [...ids];
  for (const [q, ids] of Object.entries(overlay ?? {})) out[q] = [...ids];
  return out;
}

export type FunnelEstimate = {
  estimate: Estimate;
  /** The range shown (minimum job and rounding applied), or null when nothing priced was picked. */
  total: Range | null;
};

/** Price a selection on the (merged) trade template. With a configurator this is estimateSelection with the bundle off. */
export function estimateFunnel(spec: FunnelSpec, template: EstimatorTemplate, selection: FunnelSelection): FunnelEstimate {
  const cfgSel = toConfiguratorSelection(spec, selection);
  if (spec.configurator && cfgSel) {
    const { estimate, total } = estimateSelection(spec.configurator, template, cfgSel, overlayAnswers(spec, selection));
    return { estimate, total };
  }
  const estimate = computeEstimate(template, { answers: funnelAnswers(spec, selection) });
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
 * option rule (e.g. "size-classic"), the configurator image key for a view
 * rule (e.g. "aerial-porcelain-pebble-spa").
 */
export function photoKey(spec: FunnelSpec, stepId: string, selection: FunnelSelection): string {
  const step = stepOf(spec, stepId) ?? spec.steps[0];
  const sel = normalizeFunnelSelection(spec, selection);
  if (step.photo.kind === 'option') return `${step.id}-${sel[step.id]}`;
  const cfg = spec.configurator;
  const cfgSel = toConfiguratorSelection(spec, sel);
  if (!cfg || !cfgSel) return step.photo.view;
  return configuratorPhotoKey(cfg, step.photo.view, cfgSel);
}

/** The photo a step shows for a selection (src, phone-size src, alt and a fallback for a missing file). */
export function funnelPhoto(spec: FunnelSpec, stepId: string, selection: FunnelSelection): FunnelPhoto {
  const step = stepOf(spec, stepId) ?? spec.steps[0];
  const sel = normalizeFunnelSelection(spec, selection);
  const rule = step.photo;
  if (rule.kind === 'option') return rule.photos[sel[step.id]] ?? Object.values(rule.photos)[0];
  const cfg = spec.configurator;
  const view = cfg?.views.find((v) => v.id === rule.view);
  if (!cfg || !view) return { src: spec.landing.heroPhoto.src, srcSm: spec.landing.heroPhoto.srcSm, alt: spec.landing.heroAlt };
  const photo = configuratorPhotoSrc(cfg, photoKey(spec, step.id, sel));
  return { src: photo.src, srcSm: smallVariant(photo.src), alt: photo.alt, fallback: { src: view.fallback.src, alt: view.fallback.alt } };
}

/** The photo for each option of a step with the rest of the selection unchanged (preload these so a tap swaps instantly). */
export function stepOptionPhotos(spec: FunnelSpec, stepId: string, selection: FunnelSelection): Record<string, FunnelPhoto> {
  const step = stepOf(spec, stepId) ?? spec.steps[0];
  const sel = normalizeFunnelSelection(spec, selection);
  return Object.fromEntries(step.options.map((o) => [o.id, funnelPhoto(spec, step.id, { ...sel, [step.id]: o.id })]));
}

/** Every possible selection (the product of all steps' options); small by design (3 × 2 × 3 for pool). */
export function allFunnelSelections(spec: FunnelSpec): FunnelSelection[] {
  return spec.steps.reduce<FunnelSelection[]>((acc, s) => acc.flatMap((sel) => s.options.map((o) => ({ ...sel, [s.id]: o.id }))), [{}]);
}

/* ------------------------------------------------------------------ */
/* URL / sessionStorage                                                */
/* ------------------------------------------------------------------ */

/** Query string (no leading "?") with one param per step id, e.g. "size=classic&finish=luxe&extras=spa". */
export function encodeFunnelSelection(spec: FunnelSpec, selection: FunnelSelection): string {
  const sel = normalizeFunnelSelection(spec, selection);
  return new URLSearchParams(spec.steps.map((s) => [s.id, sel[s.id]])).toString();
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

