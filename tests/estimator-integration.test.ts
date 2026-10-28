import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { applyPackage, computeEstimate, validateTemplate } from '@/lib/estimator/engine';
import { getEstimator } from '@/lib/estimator/registry';
import { POOL_TEMPLATE } from '@/lib/estimator/templates/pool';
import { POOL_CATALOG } from '@/lib/estimator/catalog/pool';
import { SWATCH_IDS } from '@/components/estimator/swatches';
import { flowScreens } from '@/components/estimator/use-estimator-flow';
import { POOL_MASTERS_GALLERY, POOL_MASTERS_OPTION_IMAGES } from '@/content/estimators/pool-masters-photos';
import type { Answers, Estimate, EstimatorTemplate } from '@/lib/estimator/types';

const registered = getEstimator('pool-masters')!;
const template: EstimatorTemplate = registered.template;

const BASE: Answers = { project: ['remodel'], shape: ['rectangle'], size: ['medium'] };
const PROPERTY_OK: Answers = { cracks: ['no'], access: ['no'], hillside: ['no'] };

function expectPlausible(e: Estimate, t: EstimatorTemplate) {
  expect(e.low).not.toBeNull();
  expect(e.high).not.toBeNull();
  expect(e.low!).toBeGreaterThanOrEqual(t.minimumJob);
  expect(e.high!).toBeGreaterThanOrEqual(e.low!);
  expect(e.low! % t.roundTo).toBe(0);
  expect(e.high! % t.roundTo).toBe(0);
  expect(e.lines.length).toBeGreaterThan(0);
}

describe('estimator integration: pool-masters', () => {
  it('real template and the merged pool-masters template pass validateTemplate', () => {
    expect(validateTemplate(POOL_TEMPLATE)).toEqual([]);
    expect(validateTemplate(template)).toEqual([]);
  });

  it('reveals the range only after contact, with example prices', () => {
    expect(registered.contractor.revealRange).toBe('after_contact');
    expect(registered.contractor.pricesConfirmed).toBe(false);
    expect(template.pricesConfirmed).toBe(false);
    expect(template.disclaimer).toMatch(/ballpark/i);
  });

  it('prices a package path', () => {
    const answers = applyPackage(template, { ...BASE, ...PROPERTY_OK }, 'signature');
    const e = computeEstimate(template, { answers });
    expectPlausible(e, template);
    expect(e.lines.map((l) => l.questionId)).toEqual(expect.arrayContaining(['surface', 'tile', 'coping']));
    expect(e.unanswered).toEqual([]);
    expect(e.status).toBe('ready');
  });

  it('prices every package, and a bigger package costs more', () => {
    const ranges = ['refresh', 'signature', 'transformation'].map((id) => {
      const e = computeEstimate(template, { answers: applyPackage(template, { ...BASE }, id) });
      expectPlausible(e, template);
      return e;
    });
    expect(ranges[0].high!).toBeLessThan(ranges[1].high!);
    expect(ranges[1].high!).toBeLessThan(ranges[2].high!);
  });

  it('prices a custom path and honors typed dimensions', () => {
    const answers: Answers = { ...BASE, package: ['custom'], scope: ['surface'], surface: ['plaster'] };
    const preset = computeEstimate(template, { answers });
    expectPlausible(preset, template);
    expect(preset.geometry.source).toBe('preset');
    const typed = computeEstimate(template, { answers, dimensions: { lengthFt: 40, widthFt: 20 } });
    expectPlausible(typed, template);
    expect(typed.geometry.source).toBe('dimensions');
    expect(typed.high!).toBeGreaterThan(preset.high!);
  });

  it('respects the minimum job for a tiny custom scope', () => {
    const e = computeEstimate(template, {
      answers: { ...BASE, package: ['custom'], scope: ['equipment'], equipment: ['automation'] },
    });
    expectPlausible(e, template);
  });

  it('flags a site visit for unsure answers and keeps the range', () => {
    const answers = applyPackage(template, { ...BASE, cracks: ['yes'], access: ['no'], hillside: ['no'] }, 'refresh');
    const e = computeEstimate(template, { answers });
    expectPlausible(e, template);
    expect(e.status).toBe('site_visit');
    expect(e.siteVisitItems.length).toBeGreaterThan(0);
  });

  it('gives no range before anything priced is picked', () => {
    const e = computeEstimate(template, { answers: BASE });
    expect(e.low).toBeNull();
    expect(e.high).toBeNull();
    expect(e.status).toBe('incomplete');
  });

  it('uses only swatches that exist, and photos that exist on disk', () => {
    for (const q of template.questions) {
      for (const o of q.options) {
        if (o.swatch) expect(SWATCH_IDS, `${q.id}.${o.id}`).toContain(o.swatch);
        if (o.image) expect(existsSync(`public${o.image}`), `${q.id}.${o.id}`).toBe(true);
      }
    }
    for (const opts of Object.values(POOL_CATALOG)) {
      for (const o of opts) if (o.swatch) expect(SWATCH_IDS).toContain(o.swatch);
    }
    for (const g of POOL_MASTERS_GALLERY) expect(existsSync(`public${g.src}`), g.src).toBe(true);
    for (const src of Object.values(POOL_MASTERS_OPTION_IMAGES)) expect(existsSync(`public${src}`), src).toBe(true);
  });

  it('shows no price in option labels or copy before the result', () => {
    const copy = JSON.stringify(
      template.questions.map((q) => [q.label, q.help, q.options.map((o) => [o.label, o.note])]),
    );
    expect(copy).not.toMatch(/\$/);
  });

  it('groups the real template into edge, deck and property screens, with extras for backyard', () => {
    const picked: Answers = {
      ...BASE,
      package: ['custom'],
      scope: ['surface', 'tile_coping', 'deck'],
    };
    const screens = flowScreens(template, picked, { customize: true, hasGallery: true });
    const edge = screens.find((s) => s.id === 'edge');
    const deck = screens.find((s) => s.id === 'deck');
    const property = screens.find((s) => s.id === 'property');
    expect(edge?.questions.map((q) => q.id)).toEqual(['tile', 'coping']);
    expect(deck?.questions.map((q) => q.id)).toEqual(['deck', 'deckSize']);
    expect(property?.questions.map((q) => q.id)).toEqual(['cracks', 'access', 'hillside']);
    expect(screens.some((s) => s.questions.some((q) => q.id === 'extras'))).toBe(false);

    const backyard = flowScreens(template, { ...picked, project: ['backyard'] }, { customize: true, hasGallery: true });
    expect(backyard.some((s) => s.questions.some((q) => q.id === 'extras'))).toBe(true);
    expect(backyard.slice(-2).map((s) => s.kind)).toEqual(['zip', 'contact']);
  });
});
