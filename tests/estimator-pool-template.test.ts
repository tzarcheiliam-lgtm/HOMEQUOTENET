import { describe, expect, it } from 'vitest';
import { validateTemplate } from '@/lib/estimator/engine';
import { POOL_CATALOG } from '@/lib/estimator/catalog/pool';
import { POOL_TEMPLATE } from '@/lib/estimator/templates/pool';
import { SWATCH_IDS } from '@/components/estimator/swatches';
import { CUSTOM_PACKAGE_ID, POOL_SHAPES, POOL_SIZES, type EstimatorOption, type EstimatorQuestion, type Price } from '@/lib/estimator/types';

const T = POOL_TEMPLATE;
const q = (id: string): EstimatorQuestion => {
  const found = T.questions.find((x) => x.id === id);
  if (!found) throw new Error(`missing question ${id}`);
  return found;
};
const ids = (id: string) => q(id).options.map((o) => o.id);
const opt = (qid: string, oid: string): EstimatorOption => {
  const found = q(qid).options.find((o) => o.id === oid);
  if (!found) throw new Error(`missing option ${qid}.${oid}`);
  return found;
};
const price = (qid: string, oid: string): Price => {
  const p = opt(qid, oid).price;
  if (!p) throw new Error(`no price on ${qid}.${oid}`);
  return p;
};

describe('pool template: structure', () => {
  it('passes validateTemplate', () => {
    expect(validateTemplate(T)).toEqual([]);
  });

  it('has exactly the fixed question ids, in order', () => {
    expect(T.questions.map((x) => x.id)).toEqual([
      'project', 'shape', 'size', 'package', 'scope', 'surface', 'tile', 'coping', 'deck', 'deckSize',
      'features', 'equipment', 'extras', 'cracks', 'access', 'hillside',
    ]);
  });

  it('has exactly the fixed option ids', () => {
    expect(ids('project')).toEqual(['remodel', 'backyard']);
    expect(ids('shape')).toEqual(['rectangle', 'l_shape', 'freeform', 'unsure']);
    expect(ids('size')).toEqual(['small', 'medium', 'large', 'unsure']);
    expect(ids('package')).toEqual(['refresh', 'signature', 'transformation', 'custom']);
    expect(ids('scope')).toEqual(['surface', 'tile_coping', 'deck', 'features', 'equipment']);
    expect(ids('surface')).toEqual(['plaster', 'quartz', 'pebble', 'unsure']);
    expect(ids('tile')).toEqual(['porcelain', 'glass', 'stone']);
    expect(ids('coping')).toEqual(['concrete', 'travertine', 'stone', 'unsure']);
    expect(ids('deck')).toEqual(['pavers', 'concrete', 'porcelain', 'resurface']);
    expect(ids('deckSize')).toEqual(['small', 'medium', 'large']);
    expect(ids('features')).toEqual(['baja', 'spa', 'water', 'fire', 'lighting']);
    expect(ids('equipment')).toEqual(['pump_filter', 'heater', 'automation', 'salt']);
    expect(ids('extras')).toEqual(['kitchen', 'patio_cover', 'turf_planting', 'fire_pit']);
    for (const id of ['cracks', 'access', 'hillside']) expect(ids(id)).toEqual(['no', 'yes', 'unsure']);
  });

  it('puts roles on the right questions, each at most once', () => {
    const roles = T.questions.filter((x) => x.role).map((x) => [x.role, x.id]);
    expect(roles).toEqual([
      ['project', 'project'], ['shape', 'shape'], ['size', 'size'], ['package', 'package'], ['scope', 'scope'], ['deckSize', 'deckSize'],
    ]);
    expect(ids('shape').every((id) => (POOL_SHAPES as readonly string[]).includes(id))).toBe(true);
    expect(ids('size').every((id) => (POOL_SIZES as readonly string[]).includes(id))).toBe(true);
    expect(ids('deckSize').every((id) => id in T.geometry.deckSizes)).toBe(true);
  });

  it('uses the fixed kinds and showWhen rules', () => {
    const multi = ['scope', 'features', 'equipment', 'extras'];
    for (const x of T.questions) expect(x.kind).toBe(multi.includes(x.id) ? 'multi' : 'single');
    const when = (id: string) => q(id).showWhen;
    for (const id of ['surface', 'tile', 'coping']) expect(when(id)?.questionId).toBe('scope');
    expect(when('surface')?.anyOf).toEqual(['surface']);
    expect(when('tile')?.anyOf).toEqual(['tile_coping']);
    expect(when('coping')?.anyOf).toEqual(['tile_coping']);
    expect(when('deck')).toEqual({ questionId: 'scope', anyOf: ['deck'] });
    expect(when('deckSize')).toEqual({ questionId: 'scope', anyOf: ['deck'] });
    expect(when('features')).toEqual({ questionId: 'scope', anyOf: ['features'] });
    expect(when('equipment')).toEqual({ questionId: 'scope', anyOf: ['equipment'] });
    expect(when('extras')).toEqual({ questionId: 'project', anyOf: ['backyard'] });
    for (const id of ['project', 'shape', 'size', 'package', 'scope', 'cracks', 'access', 'hillside']) expect(when(id)).toBeUndefined();
  });

  it('groups screens as specified', () => {
    expect(q('tile').screen).toBe('edge');
    expect(q('coping').screen).toBe('edge');
    expect(q('tile').screenTitle).toBe('Tile & coping');
    expect(q('deck').screen).toBe('deck');
    expect(q('deckSize').screen).toBe('deck');
    expect(q('deck').screenTitle).toBe('Your deck');
    for (const id of ['cracks', 'access', 'hillside']) expect(q(id).screen).toBe('property');
    expect(q('cracks').screenTitle).toBe('About your property');
  });

  it('respects the option limits', () => {
    expect(T.limits).toEqual({ maxSingleOptions: 4, maxMultiOptions: 5 });
    for (const x of T.questions) {
      expect(x.options.length, x.id).toBeLessThanOrEqual(x.kind === 'single' ? 4 : 5);
      expect(new Set(x.options.map((o) => o.id)).size, `${x.id} duplicate option ids`).toBe(x.options.length);
    }
  });

  it('has unique question ids and non-empty labels', () => {
    expect(new Set(T.questions.map((x) => x.id)).size).toBe(T.questions.length);
    for (const x of T.questions) {
      expect(x.label.trim(), x.id).not.toBe('');
      for (const o of x.options) expect(o.label.trim(), `${x.id}.${o.id}`).not.toBe('');
    }
  });

  it('has the job-level settings', () => {
    expect(T.pricesConfirmed).toBe(false);
    expect(T.minimumJob).toBe(5000);
    expect(T.roundTo).toBe(500);
    expect(T.disclaimer).toBe('This is a ballpark range, not a quote. Your final price is set after a free on-site visit.');
    expect(T.notIncluded.length).toBeGreaterThanOrEqual(4);
  });
});

describe('pool template: prices', () => {
  const priced = T.questions.flatMap((x) => x.options.filter((o) => o.price).map((o) => [x, o] as const));

  it('gives every priced option a unit, whole-dollar low <= high, and a summaryLabel on its question', () => {
    expect(priced.length).toBeGreaterThan(0);
    for (const [x, o] of priced) {
      const p = o.price!;
      const where = `${x.id}.${o.id}`;
      expect(['interior_sqft', 'perimeter_lf', 'deck_sqft', 'linear_ft', 'each', 'flat'], where).toContain(p.unit);
      expect(Number.isInteger(p.low) && Number.isInteger(p.high), where).toBe(true);
      expect(p.low, where).toBeGreaterThan(0);
      expect(p.high, where).toBeGreaterThanOrEqual(p.low);
      if (p.quantity !== undefined) expect(Number.isInteger(p.quantity) && p.quantity > 0, where).toBe(true);
      expect(x.summaryLabel, `${x.id} needs summaryLabel`).toBeTruthy();
    }
  });

  it('only prices the questions that should carry prices, with the right units', () => {
    expect([...new Set(priced.map(([x]) => x.id))]).toEqual(['surface', 'tile', 'coping', 'deck', 'features', 'equipment', 'extras']);
    for (const [x, o] of priced) {
      const expected: Record<string, string> = { surface: 'interior_sqft', tile: 'perimeter_lf', coping: 'perimeter_lf', deck: 'deck_sqft' };
      if (expected[x.id]) expect(o.price!.unit, `${x.id}.${o.id}`).toBe(expected[x.id]);
    }
    for (const id of ['baja', 'spa']) expect(price('features', id).unit).toBe('flat');
    for (const id of ['water', 'fire', 'lighting']) expect(price('features', id)).toMatchObject({ unit: 'each', quantity: 2 });
    for (const id of ['pump_filter', 'heater', 'automation', 'salt']) expect(price('equipment', id).unit).toBe('flat');
    for (const id of ['kitchen', 'patio_cover', 'turf_planting', 'fire_pit']) expect(price('extras', id).unit).toBe('flat');
  });

  it('makes "unsure" span the cheapest to the priciest option of its question', () => {
    for (const id of ['surface', 'coping']) {
      const others = q(id).options.filter((o) => o.id !== 'unsure').map((o) => o.price!);
      expect(price(id, 'unsure').low).toBe(Math.min(...others.map((p) => p.low)));
      expect(price(id, 'unsure').high).toBe(Math.max(...others.map((p) => p.high)));
    }
  });

  it('flags site visits with the specified wording', () => {
    expect(opt('features', 'spa').siteVisit).toBe('New or raised spa (plumbing, electrical and structure)');
    expect(opt('size', 'unsure').siteVisit).toBe('Pool size to be measured');
    expect(opt('extras', 'kitchen').siteVisit).toMatch(/gas/i);
    expect(opt('extras', 'kitchen').siteVisit).toMatch(/electrical/i);
    const labels: Record<string, string> = { cracks: 'Cracks, leaks or water loss', access: 'Narrow backyard access', hillside: 'Hillside lot' };
    for (const [id, label] of Object.entries(labels)) {
      expect(opt(id, 'no').siteVisit).toBeUndefined();
      expect(opt(id, 'yes').siteVisit).toBe(label);
      expect(opt(id, 'unsure').siteVisit).toBe(label);
    }
  });

  it('never shows a monthly payment', () => {
    const text = JSON.stringify({ T, POOL_CATALOG });
    expect(text).not.toMatch(/\/\s?mo\b|per month|monthly|a month/i);
  });
});

describe('pool template: swatches', () => {
  const swatchesOf = (id: string) => Object.fromEntries(q(id).options.filter((o) => o.swatch).map((o) => [o.id, o.swatch]));

  it('uses only known swatch ids', () => {
    for (const x of T.questions) for (const o of x.options) if (o.swatch) expect(SWATCH_IDS as readonly string[], `${x.id}.${o.id}`).toContain(o.swatch);
  });

  it('maps swatches as specified', () => {
    expect(swatchesOf('surface')).toEqual({ plaster: 'plaster', quartz: 'quartz', pebble: 'pebble' });
    expect(swatchesOf('tile')).toEqual({ porcelain: 'tile_porcelain', glass: 'tile_glass', stone: 'stone' });
    expect(swatchesOf('coping')).toEqual({ concrete: 'concrete', travertine: 'travertine', stone: 'stone' });
    expect(swatchesOf('deck')).toEqual({ pavers: 'pavers', concrete: 'concrete', porcelain: 'porcelain_deck', resurface: 'deck_resurface' });
  });
});

describe('pool template: packages', () => {
  it('has refresh, signature (popular) and transformation, each with a description and includes', () => {
    expect(T.packages.map((p) => p.id)).toEqual(['refresh', 'signature', 'transformation']);
    expect(T.packages.filter((p) => p.popular).map((p) => p.id)).toEqual(['signature']);
    for (const p of T.packages) {
      expect(p.description.trim(), p.id).not.toBe('');
      expect(p.includes.length, p.id).toBeGreaterThan(0);
    }
  });

  it('matches package ids to the package question (plus custom)', () => {
    expect(ids('package')).toEqual([...T.packages.map((p) => p.id), CUSTOM_PACKAGE_ID]);
  });

  it('references only valid question and option ids, includes scope, and answers every shown question', () => {
    for (const p of T.packages) {
      expect(p.answers.scope?.length, `${p.id} scope`).toBeGreaterThan(0);
      for (const [qid, picks] of Object.entries(p.answers)) {
        const question = q(qid);
        expect(question.role, `${p.id} must not answer ${qid}`).not.toBe('package');
        if (question.kind === 'single') expect(picks.length, `${p.id}.${qid}`).toBe(1);
        for (const pick of picks) expect(ids(qid), `${p.id}.${qid}.${pick}`).toContain(pick);
      }
      // Every detail question gated by a chosen scope item has an answer, and none is answered while hidden.
      const scope = p.answers.scope;
      for (const x of T.questions) {
        if (x.showWhen?.questionId !== 'scope') continue;
        const shown = x.showWhen.anyOf.some((id) => scope.includes(id));
        expect(Boolean(p.answers[x.id]?.length), `${p.id}.${x.id}`).toBe(shown);
      }
    }
  });

  it('builds the packages from the brochure services', () => {
    const [refresh, signature, transformation] = T.packages;
    expect(refresh.answers).toMatchObject({ surface: ['quartz'], tile: ['porcelain'], coping: ['concrete'] });
    expect(signature.answers).toMatchObject({
      surface: ['pebble'], tile: ['glass'], coping: ['travertine'], equipment: ['pump_filter'], features: ['lighting'],
    });
    expect(transformation.answers).toMatchObject({ deck: ['pavers'], deckSize: ['medium'], equipment: expect.arrayContaining(['pump_filter', 'automation']) });
    expect(transformation.answers.features).toEqual(expect.arrayContaining(['baja', 'water', 'fire', 'lighting']));
    expect(transformation.answers.surface).toEqual(signature.answers.surface);
    expect(transformation.answers.tile).toEqual(signature.answers.tile);
    expect(transformation.answers.coping).toEqual(signature.answers.coping);
  });
});

describe('pool catalog', () => {
  it('covers the priced questions and includes every template option', () => {
    expect(Object.keys(POOL_CATALOG).sort()).toEqual(['coping', 'deck', 'equipment', 'extras', 'features', 'surface', 'tile']);
    for (const [qid, options] of Object.entries(POOL_CATALOG)) {
      expect(options.map((o) => o.id)).toEqual(expect.arrayContaining(ids(qid)));
      expect(new Set(options.map((o) => o.id)).size, `${qid} duplicate ids`).toBe(options.length);
    }
  });

  it('has the specified extra options, each with an example price and unit', () => {
    const extra = (qid: string) => POOL_CATALOG[qid].filter((o) => !ids(qid).includes(o.id));
    const extraIds = (qid: string) => extra(qid).map((o) => o.id);
    expect(extraIds('surface')).toEqual(['colored_plaster', 'mini_pebble', 'polished_pebble', 'glass_bead', 'full_tile']);
    expect(extraIds('tile')).toEqual(['ceramic', 'italian_porcelain', 'glass_mosaic', 'natural_stone']);
    expect(extraIds('coping')).toEqual(['precast', 'poured_in_place', 'porcelain', 'brick', 'bluestone_limestone']);
    expect(extraIds('deck')).toEqual([
      'stamped_concrete', 'exposed_aggregate', 'salt_finish', 'flagstone', 'stepping_stones_turf', 'decomposed_granite', 'wood_composite',
    ]);
    expect(extraIds('features')).toEqual(['bench_steps', 'umbrella_sleeve', 'bubblers', 'sheer_descent', 'deck_jets', 'zero_edge', 'raised_spa_wall']);
    expect(extraIds('equipment')).toEqual(['cartridge_filter', 'de_filter', 'heat_pump', 'uv_ozone']);
    expect(extraIds('extras')).toEqual(['louvered_pergola', 'seating_wall', 'pool_safety_fence', 'landscape_lighting']);
    for (const [qid, options] of Object.entries(POOL_CATALOG)) {
      for (const o of options) {
        const p = o.price!;
        expect(p, `${qid}.${o.id}`).toBeTruthy();
        expect(Number.isInteger(p.low) && p.low > 0 && p.high >= p.low, `${qid}.${o.id}`).toBe(true);
      }
    }
    expect(POOL_CATALOG.extras.find((o) => o.id === 'seating_wall')!.price!.unit).toBe('linear_ft');
    expect(POOL_CATALOG.features.find((o) => o.id === 'zero_edge')!.siteVisit).toBeTruthy();
  });

  it('keeps swatch ids valid and the catalog extras within the swatch set', () => {
    for (const options of Object.values(POOL_CATALOG)) for (const o of options) if (o.swatch) expect(SWATCH_IDS as readonly string[]).toContain(o.swatch);
  });
});

describe('no brand names', () => {
  it('keeps trademarked product names out of the template and catalog', () => {
    const text = JSON.stringify({ T, POOL_CATALOG });
    expect(text).not.toMatch(/pebble\s?tec|diamond\s?brite|wet\s?edge|hydrazzo|pentair|jandy|hayward|aquacal/i);
  });
});

/**
 * Hand-computed quantities for a medium rectangle, independent of the engine:
 * 30 x 15 ft, 5 ft average depth.
 */
describe('medium rectangle sanity (hand-computed)', () => {
  const { lengthFt, widthFt } = T.geometry.sizes.medium;
  const perimeter = 2 * (lengthFt + widthFt); // 90
  const interior = lengthFt * widthFt + perimeter * T.geometry.avgDepthFt; // 450 + 450 = 900
  const deck = T.geometry.deckSizes.medium; // 600
  const total = (qid: string, oid: string, qty: number) => {
    const p = price(qid, oid);
    return [p.low * qty, p.high * qty] as const;
  };

  it('uses the expected quantities', () => {
    expect(perimeter).toBe(90);
    expect(interior).toBe(900);
    expect(deck).toBe(600);
  });

  // "Roughly" targets from the brief; the ends may overshoot by a few percent.
  it.each([
    { name: 'plaster', qid: 'surface', oid: 'plaster', qty: interior, min: 7000, max: 10500 },
    { name: 'quartz', qid: 'surface', oid: 'quartz', qty: interior, min: 9000, max: 13000 },
    { name: 'pebble', qid: 'surface', oid: 'pebble', qty: interior, min: 12000, max: 17500 },
    { name: 'porcelain tile', qid: 'tile', oid: 'porcelain', qty: perimeter, min: 3000, max: 8500 },
    { name: 'glass tile', qid: 'tile', oid: 'glass', qty: perimeter, min: 3000, max: 8500 },
    { name: 'stone tile', qid: 'tile', oid: 'stone', qty: perimeter, min: 3000, max: 8500 },
    { name: 'concrete coping', qid: 'coping', oid: 'concrete', qty: perimeter, min: 3500, max: 9000 },
    { name: 'travertine coping', qid: 'coping', oid: 'travertine', qty: perimeter, min: 3500, max: 9000 },
    { name: 'stone coping', qid: 'coping', oid: 'stone', qty: perimeter, min: 3500, max: 9000 },
    { name: 'pavers deck', qid: 'deck', oid: 'pavers', qty: deck, min: 15000, max: 25000 },
  ])('medium $name stays within $min to $max', ({ qid, oid, qty, min, max }) => {
    const [low, high] = total(qid, oid, qty);
    expect(low).toBeGreaterThanOrEqual(min);
    expect(high).toBeLessThanOrEqual(max);
  });

  it('hits the specified headline ranges exactly', () => {
    expect(total('surface', 'plaster', interior)).toEqual([7200, 9900]);
    expect(total('surface', 'quartz', interior)).toEqual([9000, 12600]);
    expect(total('surface', 'pebble', interior)).toEqual([12600, 17100]);
    expect(total('deck', 'pavers', deck)).toEqual([15000, 24600]);
  });

  it('lands a Signature package in a believable range', () => {
    const parts = [
      total('surface', 'pebble', interior),
      total('tile', 'glass', perimeter),
      total('coping', 'travertine', perimeter),
      total('equipment', 'pump_filter', 1),
      total('features', 'lighting', 2),
    ];
    const low = parts.reduce((t, [l]) => t + l, 0);
    const high = parts.reduce((t, [, h]) => t + h, 0);
    // 12,600 + 5,400 + 5,850 + 2,500 + 1,400 = 27,750 ; 17,100 + 8,100 + 8,550 + 4,500 + 2,400 = 40,650
    expect([low, high]).toEqual([27750, 40650]);
    expect(low).toBeGreaterThan(T.minimumJob);
  });
});
