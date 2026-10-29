/**
 * Pure words for the live bathroom builder: option phrases, the change chips,
 * the "Your design" list and the picture's accessible description. No React,
 * no DOM. The bath builder agents may refine wording; keep the signatures.
 */

import type { BathSceneSpec } from '@/lib/estimator/scene/bath/types';
import type { EstimatorQuestion } from '@/lib/estimator/types';
import type { DesignItem, OptionLabeler } from '../builder';

function humanize(id: string): string {
  const words = id.replace(/[_-]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1).toLowerCase() : id;
}

function lower(text: string): string {
  return /^[A-Z]{2}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
}

function listWords(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

type ExtraKey = keyof BathSceneSpec['extras'];
const EXTRAS: ReadonlyArray<{ key: ExtraKey; optionId: string; name: string }> = [
  { key: 'niche', optionId: 'niche', name: 'Shower niche' },
  { key: 'bench', optionId: 'bench', name: 'Shower bench' },
  { key: 'ledMirror', optionId: 'led_mirror', name: 'LED mirror' },
  { key: 'heatedFloor', optionId: 'heated_floor', name: 'Heated floor' },
  { key: 'rainHead', optionId: 'rain_head', name: 'Rain shower head' },
];

/** Material spec fields and the question each comes from. */
const MATERIALS = [
  ['showerTile', 'showerTile'],
  ['vanityFinish', 'vanityFinish'],
  ['counter', 'counter'],
  ['floor', 'floor'],
  ['paint', 'paint'],
  ['metal', 'metal'],
] as const;

export const BATH_VISUAL_IDS: ReadonlySet<string> = new Set([
  'project',
  'size',
  'package',
  'bathing',
  'showerTile',
  'vanity',
  'vanityFinish',
  'counter',
  'floor',
  'paint',
  'metal',
  'extras',
]);

export function bathIsVisual(q: Pick<EstimatorQuestion, 'id' | 'role'>): boolean {
  return BATH_VISUAL_IDS.has(q.id) || q.role === 'size' || q.role === 'package';
}

/** "Marble shower tile", "Sage green walls", "Brushed gold fixtures", "Signature package". */
export function bathOptionPhrase(questionId: string, optionId: string, label: OptionLabeler): string {
  // "Preview: Not sure bathroom" reads broken.
  if (questionId === 'size' && optionId === 'unsure') return 'Typical-size bathroom';
  const name = label(questionId, optionId) ?? humanize(optionId);
  switch (questionId) {
    case 'size':
      return `${name} bathroom`;
    case 'showerTile':
      return `${name} shower tile`;
    case 'vanityFinish':
      return `${name} cabinet`;
    case 'counter':
      return `${name} counter`;
    case 'floor':
      return `${name} floor`;
    case 'paint':
      return `${name} walls`;
    case 'metal':
      return `${name} fixtures`;
    case 'package':
      return `${name} package`;
    default:
      return name;
  }
}

/** What became visibly different, most exciting first: upgrades, layout, vanity, materials, size. */
export function bathChangeMessages(prev: BathSceneSpec, next: BathSceneSpec, label: OptionLabeler = () => undefined): string[] {
  const added: string[] = [];
  const removed: string[] = [];
  for (const x of EXTRAS) {
    if (prev.extras[x.key] === next.extras[x.key]) continue;
    const name = label('extras', x.optionId) ?? x.name;
    if (next.extras[x.key]) added.push(`${name} added`);
    else removed.push(`${name} removed`);
  }
  const layout: string[] = [];
  if (next.bathing !== prev.bathing && next.bathing !== 'existing') layout.push(bathOptionPhrase('bathing', next.bathing, label));
  if (next.vanity && next.vanity !== prev.vanity) layout.push(bathOptionPhrase('vanity', next.vanity, label));
  const materials: string[] = [];
  for (const [field, questionId] of MATERIALS) {
    const value = next[field];
    if (value && value !== prev[field]) materials.push(bathOptionPhrase(questionId, value, label));
  }
  const form: string[] = [];
  if (Math.abs(next.lengthFt - prev.lengthFt) >= 0.05 || Math.abs(next.widthFt - prev.widthFt) >= 0.05) {
    form.push(`${formatFt(next.widthFt)} × ${formatFt(next.lengthFt)} ft bathroom`);
  }
  return [...added, ...layout, ...materials, ...form, ...removed];
}

function formatFt(n: number): string {
  return String(Math.round(n * 10) / 10);
}

/** The result's "Your design" list: the room line, then only what was decided. */
export function bathDesignSummary(scene: BathSceneSpec, label: OptionLabeler = () => undefined): DesignItem[] {
  const name = (q: string, id: string) => label(q, id) ?? humanize(id);
  const items: DesignItem[] = [{ label: 'Bathroom', value: `About ${formatFt(scene.widthFt)} × ${formatFt(scene.lengthFt)} ft` }];
  if (scene.bathing !== 'existing') items.push({ label: 'Shower/tub', value: name('bathing', scene.bathing) });
  if (scene.showerTile) items.push({ label: 'Shower tile', value: name('showerTile', scene.showerTile) });
  if (scene.vanity) {
    const finish = scene.vanityFinish ? `, ${lower(name('vanityFinish', scene.vanityFinish))}` : '';
    items.push({ label: 'Vanity', value: `${name('vanity', scene.vanity)}${finish}` });
  }
  if (scene.counter) items.push({ label: 'Counter', value: name('counter', scene.counter) });
  if (scene.floor) items.push({ label: 'Floor', value: name('floor', scene.floor) });
  if (scene.paint) items.push({ label: 'Walls', value: name('paint', scene.paint) });
  if (scene.metal) items.push({ label: 'Fixtures', value: name('metal', scene.metal) });
  const extras = EXTRAS.filter((x) => scene.extras[x.key]).map((x) => label('extras', x.optionId) ?? x.name);
  if (extras.length) items.push({ label: 'Upgrades', value: extras.join(', ') });
  return items;
}

/** "Illustration of a 8 × 10 ft bathroom with a walk-in shower with glass, marble shower tile, ... Upgrades: LED mirror." */
export function bathDescription(scene: BathSceneSpec, label: OptionLabeler = () => undefined): string {
  const parts: string[] = [];
  if (scene.bathing !== 'existing') parts.push(`a ${lower(bathOptionPhrase('bathing', scene.bathing, label))}`);
  if (scene.showerTile) parts.push(lower(bathOptionPhrase('showerTile', scene.showerTile, label)));
  if (scene.vanity) parts.push(`a ${lower(bathOptionPhrase('vanity', scene.vanity, label))}`);
  if (scene.counter) parts.push(lower(bathOptionPhrase('counter', scene.counter, label)));
  if (scene.floor) parts.push(lower(bathOptionPhrase('floor', scene.floor, label)));
  if (scene.paint) parts.push(lower(bathOptionPhrase('paint', scene.paint, label)));
  if (scene.metal) parts.push(lower(bathOptionPhrase('metal', scene.metal, label)));
  let text = `Illustration of a ${formatFt(scene.widthFt)} × ${formatFt(scene.lengthFt)} ft bathroom`;
  if (parts.length) text += ` with ${listWords(parts)}`;
  text += '.';
  const extras = EXTRAS.filter((x) => scene.extras[x.key]).map((x) => lower(label('extras', x.optionId) ?? x.name));
  if (extras.length) text += ` Upgrades: ${listWords(extras)}.`;
  return text;
}

/** Upgrades switched on between two pictures, as template option refs (the chip shows the option's photo when it has one). */
export function bathAddedOptions(prev: BathSceneSpec, next: BathSceneSpec): { questionId: string; optionId: string }[] {
  const added = EXTRAS.filter((x) => next.extras[x.key] && !prev.extras[x.key]).map((x) => ({ questionId: 'extras', optionId: x.optionId }));
  if (next.bathing !== prev.bathing && next.bathing !== 'existing') added.unshift({ questionId: 'bathing', optionId: next.bathing });
  if (next.vanity && next.vanity !== prev.vanity) added.push({ questionId: 'vanity', optionId: next.vanity });
  return added;
}

/** What the result heading calls their bathroom, from the picture they made. */
function bathNoun(scene: BathSceneSpec): string {
  if (scene.bathing === 'walk_in') return 'walk-in shower bathroom';
  if (scene.bathing === 'tub_and_shower') return 'spa-style bathroom';
  if (scene.project === 'refresh') return 'refreshed bathroom';
  return 'new bathroom';
}

/** "Sam, here’s your walk-in shower bathroom" (or "Here’s your new bathroom" without a name). */
export function bathResultHeading(firstName: string, scene: BathSceneSpec): string {
  const noun = bathNoun(scene);
  const name = firstName.trim();
  return name ? `${name}, here’s your ${noun}` : `Here’s your ${noun}`;
}
