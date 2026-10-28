/**
 * Pure helpers behind the live pool builder (the scene beside the questions):
 * hover/focus previews, the "Baja shelf added" change chips, the plain-words
 * design summary and description, and the photoreal render's progress copy.
 * No React and no DOM, so they are unit-tested directly
 * (tests/estimator-builder-ui.test.tsx).
 */

import { applyPackage, picksFor } from '@/lib/estimator/engine';
import type { RenderStart } from '@/lib/estimator/render-client';
import type { SceneSpec } from '@/lib/estimator/scene/types';
import type { Answers, EstimatorQuestion, EstimatorTemplate } from '@/lib/estimator/types';

/* ------------------------------------------------------------------ */
/* Option labels                                                       */
/* ------------------------------------------------------------------ */

/** The template's label for an option (contractor catalog swaps included), or undefined. */
export type OptionLabeler = (questionId: string, optionId: string) => string | undefined;

export function optionLabeler(template: EstimatorTemplate): OptionLabeler {
  const labels = new Map<string, string>();
  for (const q of template.questions) for (const o of q.options) labels.set(`${q.id}.${o.id}`, o.label);
  return (questionId, optionId) => labels.get(`${questionId}.${optionId}`);
}

/** "fire_pit" -> "Fire pit": last resort when a template has no label for an id. */
function humanize(id: string): string {
  const words = id.replace(/[_-]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1).toLowerCase() : id;
}

/** Lower-cases the first letter unless the word looks like an acronym ("LED"). */
function lower(text: string): string {
  return /^[A-Z]{2}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
}

const SHAPE_PHRASE: Record<SceneSpec['shape'], string> = {
  rectangle: 'Rectangle pool',
  l_shape: 'L-shaped pool',
  freeform: 'Freeform pool',
};

/** Deck phrases read better hand-written ("Paver deck", not "Pavers deck"). */
const DECK_PHRASE: Record<string, string> = {
  pavers: 'Paver deck',
  concrete: 'Concrete deck',
  porcelain: 'Porcelain deck',
  resurface: 'Resurfaced deck',
};

type FeatureKey = keyof SceneSpec['features'];
type ExtraKey = keyof SceneSpec['extras'];

/** SceneSpec flag -> the template option it comes from, plus a fallback name. */
const FEATURES: ReadonlyArray<{ key: FeatureKey; optionId: string; name: string }> = [
  { key: 'baja', optionId: 'baja', name: 'Baja shelf' },
  { key: 'spa', optionId: 'spa', name: 'Spa' },
  { key: 'waterBowls', optionId: 'water', name: 'Water bowls' },
  { key: 'fireBowls', optionId: 'fire', name: 'Fire bowls' },
  { key: 'lights', optionId: 'lighting', name: 'LED pool lights' },
];
const EXTRAS: ReadonlyArray<{ key: ExtraKey; optionId: string; name: string }> = [
  { key: 'kitchen', optionId: 'kitchen', name: 'Outdoor kitchen' },
  { key: 'patioCover', optionId: 'patio_cover', name: 'Patio cover' },
  { key: 'turfPlanting', optionId: 'turf_planting', name: 'Turf and planting' },
  { key: 'firePit', optionId: 'fire_pit', name: 'Fire pit' },
];

/** "30 × 15 ft" (one decimal at most, so typed 30.25 shows as 30.3). */
export function formatFeet(lengthFt: number, widthFt: number): string {
  const n = (v: number) => String(Math.round(v * 10) / 10);
  return `${n(lengthFt)} × ${n(widthFt)} ft`;
}

/**
 * Short phrase for one picked option, used by the change chip and the preview
 * badge: "Travertine coping", "Glass waterline tile", "Large pool", "Spa".
 */
export function optionPhrase(questionId: string, optionId: string, label: OptionLabeler): string {
  const name = label(questionId, optionId) ?? humanize(optionId);
  switch (questionId) {
    case 'shape':
      return SHAPE_PHRASE[optionId as SceneSpec['shape']] ?? `${name} pool`;
    case 'size':
      return `${name} pool`;
    case 'surface':
      return `${name} finish`;
    case 'tile':
      return `${name} waterline tile`;
    case 'coping':
      return `${name} coping`;
    case 'deck':
      return DECK_PHRASE[optionId] ?? `${name} deck`;
    case 'deckSize':
      return `${name} deck area`;
    case 'package':
      return `${name} package`;
    default:
      return name;
  }
}

/* ------------------------------------------------------------------ */
/* Hover / focus preview                                               */
/* ------------------------------------------------------------------ */

/** Questions whose options change the picture (the rest, like equipment or cracks, never preview). */
const VISUAL_IDS = new Set(['shape', 'size', 'package', 'surface', 'tile', 'coping', 'deck', 'deckSize', 'features', 'extras']);
const VISUAL_ROLES = new Set(['shape', 'size', 'package', 'deckSize']);

export function isVisualQuestion(q: Pick<EstimatorQuestion, 'id' | 'role'>): boolean {
  return VISUAL_IDS.has(q.id) || (q.role !== undefined && VISUAL_ROLES.has(q.role));
}

/**
 * The answers to draw while the homeowner hovers or keyboard-focuses an option,
 * WITHOUT changing their real answers. Null means "nothing new to show": not a
 * visual question, the option is already picked, or (multi) already included.
 * A package previews its whole look (applyPackage); a multi option previews
 * being added.
 */
export function previewAnswers(template: EstimatorTemplate, answers: Answers, q: EstimatorQuestion, optionId: string): Answers | null {
  if (!isVisualQuestion(q) || !q.options.some((o) => o.id === optionId)) return null;
  const current = picksFor(q, answers);
  if (current.includes(optionId)) return null;
  if (q.role === 'package') return applyPackage(template, answers, optionId);
  if (q.kind === 'single') return { ...answers, [q.id]: [optionId] };
  return { ...answers, [q.id]: [...current, optionId] };
}

/* ------------------------------------------------------------------ */
/* Change chips                                                        */
/* ------------------------------------------------------------------ */

/**
 * What became visibly different between two scenes, as short chip messages,
 * most exciting first: added/removed features and extras, then materials, then
 * shape and size. A material that goes back to "not decided" says nothing
 * (the picture just shows the default look).
 */
export function sceneChanges(prev: SceneSpec, next: SceneSpec, label: OptionLabeler = () => undefined): string[] {
  const added: string[] = [];
  const removed: string[] = [];
  for (const f of FEATURES) {
    if (prev.features[f.key] === next.features[f.key]) continue;
    const name = label('features', f.optionId) ?? f.name;
    (next.features[f.key] ? added : removed).push(next.features[f.key] ? `${name} added` : `${name} removed`);
  }
  for (const x of EXTRAS) {
    if (prev.extras[x.key] === next.extras[x.key]) continue;
    const name = label('extras', x.optionId) ?? x.name;
    (next.extras[x.key] ? added : removed).push(next.extras[x.key] ? `${name} added` : `${name} removed`);
  }

  const materials: string[] = [];
  for (const id of ['surface', 'tile', 'coping', 'deck'] as const) {
    const value = next[id];
    if (value && value !== prev[id]) materials.push(optionPhrase(id, value, label));
  }
  if (next.deckSize !== 'none' && next.deckSize !== prev.deckSize && !(next.deck && next.deck !== prev.deck)) {
    materials.push(optionPhrase('deckSize', next.deckSize, label));
  }

  const form: string[] = [];
  if (next.shape !== prev.shape) form.push(SHAPE_PHRASE[next.shape]);
  if (Math.abs(next.lengthFt - prev.lengthFt) >= 0.05 || Math.abs(next.widthFt - prev.widthFt) >= 0.05) {
    form.push(`${formatFeet(next.lengthFt, next.widthFt)} pool`);
  }
  return [...added, ...materials, ...form, ...removed];
}

/** One chip line: "Baja shelf added", "Spa added · Fire bowls added", or "Pebble finish · Glass waterline tile +2 more". */
export function chipText(messages: string[], max = 2): string {
  if (messages.length === 0) return '';
  const head = messages.slice(0, max).join(' · ');
  return messages.length > max ? `${head} +${messages.length - max} more` : head;
}

/* ------------------------------------------------------------------ */
/* Design summary                                                      */
/* ------------------------------------------------------------------ */

export type DesignItem = { label: string; value: string };

/**
 * The visible choices in plain words for the result's "Your design" list.
 * Only what the homeowner actually decided is listed (an undecided material or
 * an untouched deck is left out); the pool line is always there.
 */
export function designSummary(scene: SceneSpec, label: OptionLabeler = () => undefined): DesignItem[] {
  const items: DesignItem[] = [];
  const shape = { rectangle: 'Rectangle', l_shape: 'L-shape', freeform: 'Freeform' }[scene.shape];
  items.push({ label: 'Pool', value: `${shape}, about ${formatFeet(scene.lengthFt, scene.widthFt)}` });
  const name = (q: string, id: string) => label(q, id) ?? humanize(id);
  if (scene.surface) items.push({ label: 'Pool surface', value: name('surface', scene.surface) });
  if (scene.tile) items.push({ label: 'Waterline tile', value: name('tile', scene.tile) });
  if (scene.coping) items.push({ label: 'Coping', value: name('coping', scene.coping) });
  if (scene.deck) {
    const size = scene.deckSize !== 'none' ? `, ${lower(name('deckSize', scene.deckSize))}` : '';
    items.push({ label: 'Deck', value: `${name('deck', scene.deck)}${size}` });
  }
  const features = FEATURES.filter((f) => scene.features[f.key]).map((f) => label('features', f.optionId) ?? f.name);
  if (features.length) items.push({ label: 'Features', value: features.join(', ') });
  const extras = EXTRAS.filter((x) => scene.extras[x.key]).map((x) => label('extras', x.optionId) ?? x.name);
  if (extras.length) items.push({ label: 'Backyard', value: extras.join(', ') });
  return items;
}

/** "a, b and c". */
function listWords(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/**
 * Accessible description of the picture (the PoolScene `label`):
 * "Top-down illustration of a 30 × 15 ft freeform pool with a pebble finish,
 * glass waterline tile, travertine coping and a paver deck. Features: spa."
 */
export function sceneDescription(scene: SceneSpec, label: OptionLabeler = () => undefined): string {
  const shape = { rectangle: 'rectangular', l_shape: 'L-shaped', freeform: 'freeform' }[scene.shape];
  const parts: string[] = [];
  if (scene.surface) parts.push(`a ${lower(optionPhrase('surface', scene.surface, label))}`);
  if (scene.tile) parts.push(lower(optionPhrase('tile', scene.tile, label)));
  if (scene.coping) parts.push(lower(optionPhrase('coping', scene.coping, label)));
  if (scene.deck) parts.push(`a ${lower(optionPhrase('deck', scene.deck, label))}`);
  let text = `Top-down illustration of a ${formatFeet(scene.lengthFt, scene.widthFt)} ${shape} pool`;
  if (parts.length) text += ` with ${listWords(parts)}`;
  text += '.';
  const features = FEATURES.filter((f) => scene.features[f.key]).map((f) => lower(label('features', f.optionId) ?? f.name));
  const extras = EXTRAS.filter((x) => scene.extras[x.key]).map((x) => lower(label('extras', x.optionId) ?? x.name));
  if (features.length) text += ` Features: ${listWords(features)}.`;
  if (extras.length) text += ` Backyard: ${listWords(extras)}.`;
  return text;
}

/* ------------------------------------------------------------------ */
/* Scrolling under the pinned picture                                  */
/* ------------------------------------------------------------------ */

/**
 * How far to scroll so a new screen's top sits just below what is pinned
 * (`topOffset`: the site header, plus the picture on phones), or null when it
 * is already comfortably in view (top between the offset and 60% down the screen).
 */
export function scrollDelta(targetTop: number, viewportHeight: number, topOffset: number): number | null {
  if (targetTop >= topOffset && targetTop <= viewportHeight * 0.6) return null;
  return Math.round(targetTop - topOffset);
}

/* ------------------------------------------------------------------ */
/* Photoreal render progress                                           */
/* ------------------------------------------------------------------ */

/** Typical render time; the bar eases toward 95% around it and never claims 100% early. */
export const RENDER_TYPICAL_MS = 40_000;
/** Stop polling after this long and explain instead of spinning forever. */
export const RENDER_TIMEOUT_MS = 180_000;
export const RENDER_POLL_MS = 4_000;

/** 0..95 percent for an elapsed time: fast at first, then slowing, so a slow render still feels alive. */
export function renderProgress(elapsedMs: number): number {
  if (!(elapsedMs > 0)) return 3;
  const p = 95 * (1 - Math.exp(-elapsedMs / (RENDER_TYPICAL_MS * 0.6)));
  return Math.max(3, Math.min(95, Math.round(p)));
}

const RENDER_STAGES: ReadonlyArray<{ at: number; text: string }> = [
  { at: 0, text: 'Reading your design' },
  { at: 6_000, text: 'Laying the deck and coping' },
  { at: 14_000, text: 'Filling the pool with water' },
  { at: 24_000, text: 'Adding California sunlight and shadows' },
  { at: 36_000, text: 'Planting the yard' },
  { at: 50_000, text: 'Final touches, almost there' },
  { at: 80_000, text: 'Taking a little longer than usual' },
];

/** The progress line for an elapsed time ("Filling the pool with water"). */
export function renderStage(elapsedMs: number): string {
  let text = RENDER_STAGES[0].text;
  for (const s of RENDER_STAGES) if (elapsedMs >= s.at) text = s.text;
  return text;
}

/**
 * What to tell the homeowner when a render cannot start. `retry` false hides
 * the button for good (renders switched off or the limit reached).
 */
export function renderStartProblem(result: Extract<RenderStart, { ok: false }>): { message: string; retry: boolean } {
  switch (result.reason) {
    case 'disabled':
      return { message: 'Realistic previews are not available right now. Your designer will walk you through the look at the free on-site visit.', retry: false };
    case 'limit':
      return { message: 'You have reached the number of realistic previews for now. Your designer can show you more at the free on-site visit.', retry: false };
    default:
      return { message: 'We could not create the realistic preview just now. Please try again.', retry: true };
  }
}
