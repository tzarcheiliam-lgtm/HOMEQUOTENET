import { describe, expect, it } from 'vitest';
import { POOL_MASTERS_CONFIGURATOR as SPEC } from '@/content/estimators/pool-masters-configurator';
import { POOL_MASTERS_ESTIMATOR } from '@/content/estimators/pool-masters';
import { applyPackage, computeEstimate, validateTemplate } from '@/lib/estimator/engine';
import { configuratorSpecFor, getEstimator } from '@/lib/estimator/registry';
import { POOL_TEMPLATE } from '@/lib/estimator/templates/pool';
import {
  bundleQuote,
  decodeSelection,
  defaultSelection,
  effectivePicks,
  encodeSelection,
  estimateSelection,
  isLockedByBundle,
  photoFor,
  photoKeys,
  photoSrc,
  rowDelta,
  selectionToAnswers,
  viewForRow,
  viewsShowingRow,
} from '@/lib/estimator/configurator/engine';
import type { ConfiguratorSelection } from '@/lib/estimator/configurator/types';

const registered = getEstimator('pool-masters')!;
const T = registered.template;
const allRows = SPEC.groups.flatMap((g) => g.rows.map((r) => r.id));

/** Rows a photo can show: the resolver only ever looks at these. */
const visualRows = new Set(SPEC.views.flatMap((v) => v.dimensions.flatMap((d) => d.options.flatMap((o) => o.rows))));

/**
 * Selections: each model x each single-group row x every subset of the chosen
 * multi rows x luxe on/off. `every` keeps one combination in N (deterministic).
 */
function* everySelection(multi: 'visual' | 'all' = 'visual', every = 1): Generator<ConfiguratorSelection> {
  const singles = SPEC.groups.filter((g) => g.kind === 'single');
  const multiRows = SPEC.groups
    .filter((g) => g.kind === 'multi')
    .flatMap((g) => g.rows.map((r) => ({ group: g.id, id: r.id })))
    .filter((r) => multi === 'all' || visualRows.has(r.id));
  const singleCombos = singles.reduce<Record<string, string>[]>(
    (acc, g) => acc.flatMap((c) => g.rows.map((r) => ({ ...c, [g.id]: r.id }))),
    [{}],
  );
  let i = 0;
  for (const model of SPEC.models)
    for (const combo of singleCombos)
      for (let mask = 0; mask < 1 << multiRows.length; mask++)
        for (const luxe of [false, true]) {
          if (i++ % every !== 0) continue;
          const sel = defaultSelection(SPEC);
          sel.model = model.id;
          sel.luxe = luxe;
          for (const [g, id] of Object.entries(combo)) sel.picks[g] = [id];
          multiRows.forEach((r, b) => {
            if (mask & (1 << b)) sel.picks[r.group].push(r.id);
          });
          yield sel;
        }
}

describe('configurator spec: structure', () => {
  it('pool template and merged pool-masters template still validate', () => {
    expect(validateTemplate(POOL_TEMPLATE)).toEqual([]);
    expect(validateTemplate(T)).toEqual([]);
  });

  it('pool masters opts into the configurator with prices shown immediately', () => {
    expect(POOL_MASTERS_ESTIMATOR.experience).toBe('configurator');
    expect(POOL_MASTERS_ESTIMATOR.configurator).toBe(SPEC);
    expect(POOL_MASTERS_ESTIMATOR.revealRange).toBe('immediately');
    expect(POOL_MASTERS_ESTIMATOR.pricesConfirmed).toBe(false);
  });

  it('row ids are unique and every row maps to real template question/option ids', () => {
    expect(new Set(allRows).size).toBe(allRows.length);
    for (const g of SPEC.groups) {
      if (g.kind === 'single') expect(g.rows.filter((r) => r.included)).toHaveLength(1);
      else expect(g.rows.some((r) => r.included)).toBe(false);
      for (const r of g.rows)
        for (const [q, ids] of Object.entries(r.answers)) {
          const question = T.questions.find((x) => x.id === q);
          expect(question, `${r.id} -> ${q}`).toBeDefined();
          for (const id of ids) expect(question!.options.some((o) => o.id === id), `${r.id} -> ${q}.${id}`).toBe(true);
        }
    }
    for (const id of SPEC.bundle!.rows) expect(allRows).toContain(id);
    for (const g of SPEC.groups) if (g.view) expect(SPEC.views.map((v) => v.id)).toContain(g.view);
  });

  it('is plain JSON (safe to pass from a server page to the client)', () => {
    expect(JSON.parse(JSON.stringify(SPEC))).toEqual(SPEC);
  });
});

describe('configurator: photo matrix', () => {
  it('has a photo entry for every key the views can produce, and nothing else', () => {
    const keys = photoKeys(SPEC);
    expect(new Set(keys).size).toBe(keys.length);
    expect(Object.keys(SPEC.photos).sort()).toEqual([...keys].sort());
    expect(keys.length).toBe(78);
    for (const k of keys) expect(SPEC.photos[k].src).toBe(`/estimator/pool-masters/configurator/${k}.webp`);
  });

  it('resolves every selection combination to an existing key in every view', () => {
    let n = 0;
    for (const sel of everySelection()) {
      for (const v of SPEC.views) expect(SPEC.photos[photoFor(SPEC, v.id, sel)]).toBeDefined();
      n++;
    }
    expect(n).toBeGreaterThan(1000);
  });

  it('resolves the visual dimensions', () => {
    const sel = defaultSelection(SPEC);
    expect(photoFor(SPEC, 'aerial', sel)).toBe('aerial-resurface');
    expect(photoFor(SPEC, 'poolside', sel)).toBe('poolside-plaster-classic');
    expect(photoFor(SPEC, 'evening', sel)).toBe('evening');
    // Go Luxe shows in every view: pebble and the spa everywhere, the deck from above, the edge poolside, fire at dusk.
    expect(photoFor(SPEC, 'aerial', { ...sel, luxe: true })).toBe('aerial-porcelain-pebble-spa');
    expect(photoFor(SPEC, 'poolside', { ...sel, luxe: true })).toBe('poolside-pebble-premium-spa');
    expect(photoFor(SPEC, 'evening', { ...sel, luxe: true })).toBe('evening-pebble-fire-spa');
    const custom = decodeSelection(SPEC, 'm=large&o=deck_pavers,patio_cover,led_lights,fire_bowls,quartz,edge_stone');
    expect(photoFor(SPEC, 'aerial', custom)).toBe('aerial-pavers-cover');
    expect(photoFor(SPEC, 'poolside', custom)).toBe('poolside-quartz-stone');
    expect(photoFor(SPEC, 'evening', custom)).toBe('evening-led-fire');
  });

  it('shows the kitchen and the patio cover as separate pictures, and both together', () => {
    const sel = defaultSelection(SPEC);
    const yard = (rows: string[]) => photoFor(SPEC, 'aerial', { ...sel, picks: { ...sel.picks, backyard: rows } });
    expect(yard(['outdoor_kitchen'])).toBe('aerial-resurface-kitchen');
    expect(yard(['patio_cover'])).toBe('aerial-resurface-cover');
    expect(yard(['patio_cover', 'outdoor_kitchen'])).toBe('aerial-resurface-yard');
    expect(yard(['fire_pit'])).toBe('aerial-resurface');
  });

  it('LED lights set the evening water over a pebble finish', () => {
    const sel = decodeSelection(SPEC, 'm=medium&o=pebble,led_lights');
    expect(photoFor(SPEC, 'evening', sel)).toBe('evening-led');
    expect(photoFor(SPEC, 'evening', decodeSelection(SPEC, 'm=medium&o=pebble'))).toBe('evening-pebble');
  });

  it('falls back to the view real photo for an unknown key', () => {
    expect(photoSrc(SPEC, 'aerial-nope').src).toBe(SPEC.views[0].fallback.src);
    expect(photoSrc(SPEC, 'evening-led').src).toBe('/estimator/pool-masters/configurator/evening-led.webp');
  });

  it('switches view by row only when the current view does not picture it', () => {
    expect(viewForRow(SPEC, 'pebble')).toBe('poolside');
    expect(viewForRow(SPEC, 'fire_bowls')).toBe('evening');
    expect(viewForRow(SPEC, 'spa')).toBe('aerial');
    expect(viewForRow(SPEC, 'heater')).toBeUndefined();
    // Pictured in the current view: stay.
    expect(viewForRow(SPEC, 'spa', 'evening')).toBe('evening');
    expect(viewForRow(SPEC, 'pebble', 'aerial')).toBe('aerial');
    expect(viewForRow(SPEC, 'deck_pavers', 'evening')).toBe('aerial');
    // Price-only rows are pictured nowhere.
    for (const id of ['baja', 'water_bowls', 'fire_pit', 'turf_planting', 'heater', 'automation', 'salt']) expect(viewsShowingRow(SPEC, id)).toEqual([]);
    expect(viewsShowingRow(SPEC, 'spa')).toEqual(['aerial', 'poolside', 'evening']);
  });
});

describe('configurator: pricing', () => {
  it('the base design equals the hand-built template answers', () => {
    const answers = selectionToAnswers(SPEC, defaultSelection(SPEC));
    const manual = {
      project: ['remodel'],
      package: ['custom'],
      shape: ['rectangle'],
      size: ['medium'],
      deckSize: ['medium'],
      scope: ['surface', 'tile_coping', 'deck', 'equipment'],
      surface: ['plaster'],
      tile: ['porcelain'],
      coping: ['concrete'],
      deck: ['resurface'],
      equipment: ['pump_filter'],
    };
    expect(answers).toEqual(manual);
    const { total, estimate } = estimateSelection(SPEC, T, defaultSelection(SPEC));
    const direct = computeEstimate(T, { answers: manual });
    expect(total).toEqual({ low: direct.low, high: direct.high });
    expect(estimate.lines.map((l) => `${l.questionId}.${l.optionId}`).sort()).toEqual(
      ['coping.concrete', 'deck.resurface', 'equipment.pump_filter', 'surface.plaster', 'tile.porcelain'].sort(),
    );
    // Medium: plaster 900 sq ft x $8-11, tile+coping 90 ft x $75-115, resurface 600 x $6-12, pump $2.5-4.5k.
    expect(total).toEqual({ low: 20000, high: 32000 });
  });

  it('matches computeEstimate on the same answers as the Signature package', () => {
    const sel = decodeSelection(SPEC, 'o=pebble,edge_glass_travertine,led_lights');
    const viaPackage = applyPackage(T, { project: ['remodel'], shape: ['rectangle'], size: ['medium'] }, 'signature');
    const a = estimateSelection(SPEC, T, sel).estimate;
    const b = computeEstimate(T, { answers: { ...viaPackage, scope: [...viaPackage.scope, 'deck'], deck: ['resurface'], deckSize: ['medium'] } });
    expect(a.low).toBe(b.low);
    expect(a.high).toBe(b.high);
  });

  it('backyard rows switch the project so extras are priced', () => {
    const sel = decodeSelection(SPEC, 'o=outdoor_kitchen,fire_pit');
    const answers = selectionToAnswers(SPEC, sel);
    expect(answers.project[0]).toBe('backyard');
    const e = estimateSelection(SPEC, T, sel).estimate;
    expect(e.lines.map((l) => `${l.questionId}.${l.optionId}`)).toEqual(expect.arrayContaining(['extras.kitchen', 'extras.fire_pit']));
    expect(e.siteVisitItems.map((s) => s.label)).toContain('Outdoor kitchen (gas and electrical)');
  });

  it('always shows a range above the minimum job', () => {
    for (const sel of everySelection('all', 97)) {
      const { total } = estimateSelection(SPEC, T, sel);
      expect(total.high).toBeGreaterThan(total.low);
      expect(total.low).toBeGreaterThanOrEqual(T.minimumJob);
      expect(total.low % T.roundTo).toBe(0);
      expect(total.high % T.roundTo).toBe(0);
    }
  });

  it('row deltas: included rows are 0, upgrades positive, and add up with the base', () => {
    const sel = defaultSelection(SPEC);
    expect(rowDelta(SPEC, T, sel, 'plaster')).toEqual({ low: 0, high: 0 });
    // Pebble vs plaster at medium: 900 sq ft x $6-8.
    expect(rowDelta(SPEC, T, sel, 'pebble')).toEqual({ low: 5400, high: 7200 });
    expect(rowDelta(SPEC, T, sel, 'spa')).toEqual({ low: 18000, high: 35000 });
    expect(rowDelta(SPEC, T, sel, 'heater')).toEqual({ low: 3500, high: 6500 });
    // Size-based rows follow the model.
    const large = rowDelta(SPEC, T, { ...sel, model: 'large' }, 'deck_porcelain');
    expect(large.low).toBeGreaterThan(rowDelta(SPEC, T, sel, 'deck_porcelain').low);
    for (const id of allRows) {
      const d = rowDelta(SPEC, T, sel, id);
      expect(d.high).toBeGreaterThanOrEqual(d.low);
    }
  });

  it('Go Luxe costs less than its rows bought one by one, for every model', () => {
    for (const m of SPEC.models) {
      const q = bundleQuote(SPEC, T, m.id);
      const sel = { ...defaultSelection(SPEC), model: m.id };
      const sumRows = SPEC.bundle!.rows.reduce(
        (t, id) => {
          const d = rowDelta(SPEC, T, sel, id);
          return { low: t.low + d.low, high: t.high + d.high };
        },
        { low: 0, high: 0 },
      );
      expect(q.price.low).toBeLessThan(sumRows.low);
      expect(q.price.high).toBeLessThan(sumRows.high);
      expect(q.saving.low).toBeGreaterThan(0);
      expect(q.price.low + q.saving.low).toBe(q.full.low);
      const luxe = estimateSelection(SPEC, T, { ...sel, luxe: true }).total;
      const picked = estimateSelection(SPEC, T, decodeSelection(SPEC, `m=${m.id}&o=${SPEC.bundle!.rows.join(',')}`)).total;
      expect(luxe.low).toBeLessThan(picked.low);
      expect(luxe.high).toBeLessThan(picked.high);
    }
  });

  it('luxe forces and locks the bundle rows but keeps the homeowner picks underneath', () => {
    const sel = decodeSelection(SPEC, 'o=quartz,heater&lx=1');
    const picks = effectivePicks(SPEC, sel);
    expect(picks.finish).toEqual(['pebble']);
    expect(picks.features).toEqual(expect.arrayContaining(['spa', 'fire_bowls']));
    expect(picks.equipment).toEqual(['heater']);
    expect(sel.picks.finish).toEqual(['quartz']);
    expect(isLockedByBundle(SPEC, sel, 'plaster')).toBe(true);
    expect(isLockedByBundle(SPEC, sel, 'baja')).toBe(false);
    expect(isLockedByBundle(SPEC, { ...sel, luxe: false }, 'pebble')).toBe(false);
  });
});

describe('configurator: shareable URL', () => {
  it('round-trips every selection', () => {
    for (const sel of everySelection('all', 89)) {
      const decoded = decodeSelection(SPEC, encodeSelection(SPEC, sel));
      expect(decoded.model).toBe(sel.model);
      expect(decoded.luxe).toBe(sel.luxe);
      for (const g of SPEC.groups) expect([...decoded.picks[g.id]].sort()).toEqual([...sel.picks[g.id]].sort());
    }
  });

  it('encodes compactly and ignores junk', () => {
    expect(encodeSelection(SPEC, defaultSelection(SPEC))).toBe('m=medium');
    expect(encodeSelection(SPEC, decodeSelection(SPEC, '?m=large&o=pebble,spa&lx=1'))).toBe('m=large&o=pebble,spa&lx=1');
    expect(decodeSelection(SPEC, 'm=huge&o=nope,<script>&lx=yes')).toEqual(defaultSelection(SPEC));
    expect(decodeSelection(SPEC, new URLSearchParams('o=quartz,pebble')).picks.finish).toEqual(['pebble']);
  });
});

describe('configurator opt-in', () => {
  it('is used only with revealRange immediately (else prices are stripped): the pages fall back to the builder', () => {
    expect(configuratorSpecFor(POOL_MASTERS_ESTIMATOR)).toBe(SPEC);
    expect(configuratorSpecFor({ ...POOL_MASTERS_ESTIMATOR, revealRange: 'after_contact' })).toBeNull();
    expect(configuratorSpecFor({ ...POOL_MASTERS_ESTIMATOR, configurator: undefined })).toBeNull();
    expect(configuratorSpecFor({ ...POOL_MASTERS_ESTIMATOR, experience: 'builder' })).toBeNull();
  });
});
