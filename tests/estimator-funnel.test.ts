import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { POOL_MASTERS_ESTIMATOR } from '@/content/estimators/pool-masters';
import { POOL_MASTERS_CONFIGURATOR } from '@/content/estimators/pool-masters-configurator';
import { POOL_MASTERS_FUNNEL as SPEC } from '@/content/estimators/pool-masters-funnel';
import { estimateSelection } from '@/lib/estimator/configurator/engine';
import { computeEstimate, validateTemplate } from '@/lib/estimator/engine';
import {
  activeSteps,
  allFunnelSelections,
  answeredSteps,
  decodeFunnelSelection,
  defaultFunnelSelection,
  encodeFunnelSelection,
  estimateFunnel,
  funnelAnswers,
  funnelPhoto,
  funnelSpecFor,
  normalizeFunnelSelection,
  photoKey,
  pickedTitles,
  smallVariant,
  stepOptionPhotos,
  toConfiguratorSelection,
} from '@/lib/estimator/funnel/engine';
import type { FunnelSpec } from '@/lib/estimator/funnel/types';
import { getEstimator } from '@/lib/estimator/registry';

const PUBLIC = path.join(process.cwd(), 'public');
const exists = (src: string) => fs.existsSync(path.join(PUBLIC, src));
const { template: T, contractor } = getEstimator('pool-masters')!;
const ALL = allFunnelSelections(SPEC);

describe('pool masters funnel: config', () => {
  it('pool masters runs the funnel with prices revealed after the contact step', () => {
    expect(POOL_MASTERS_ESTIMATOR.experience).toBe('funnel');
    expect(POOL_MASTERS_ESTIMATOR.funnel).toBe(SPEC);
    expect(POOL_MASTERS_ESTIMATOR.revealRange).toBe('after_contact');
    expect(POOL_MASTERS_ESTIMATOR.pricesConfirmed).toBe(false);
    expect(funnelSpecFor(contractor)).toBe(SPEC);
    expect(funnelSpecFor({ ...contractor, experience: 'configurator' })).toBeNull();
    expect(funnelSpecFor({ ...contractor, funnel: undefined })).toBeNull();
    expect(validateTemplate(T)).toEqual([]);
  });

  it('asks three questions plus follow-ups, ids unique, every option mapped to real configurator models/rows or template answers', () => {
    expect(SPEC.steps.map((s) => s.id)).toEqual(['size', 'finish', 'extras', 'spa', 'kitchen', 'fire', 'cabana']);
    expect(SPEC.steps.slice(0, 3).every((s) => !s.showWhen)).toBe(true);
    expect(SPEC.steps.find((s) => s.id === 'spa')!.showWhen).toEqual({ stepId: 'extras', anyOf: ['spa', 'backyard'] });
    for (const id of ['kitchen', 'fire', 'cabana']) expect(SPEC.steps.find((s) => s.id === id)!.showWhen).toEqual({ stepId: 'extras', anyOf: ['backyard'] });
    expect(SPEC.finalCta).toBe('Get my estimate');
    const models = new Set(POOL_MASTERS_CONFIGURATOR.models.map((m) => m.id));
    const rows = new Set(POOL_MASTERS_CONFIGURATOR.groups.flatMap((g) => g.rows.map((r) => r.id)));
    for (const s of SPEC.steps) {
      const ids = s.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(s.options.length).toBeGreaterThanOrEqual(2);
      expect(s.options.length).toBeLessThanOrEqual(4);
      for (const o of s.options) {
        expect(o.title && o.subtitle).toBeTruthy();
        if (o.model) expect(models.has(o.model)).toBe(true);
        for (const r of o.rows ?? []) expect(rows.has(r)).toBe(true);
        for (const a of [o.answers, o.addAnswers]) {
          for (const [qid, picks] of Object.entries(a ?? {})) {
            const q = T.questions.find((x) => x.id === qid);
            expect(q, `${s.id}.${o.id} -> ${qid}`).toBeDefined();
            for (const id of picks) expect(q!.options.some((x) => x.id === id), `${s.id}.${o.id} -> ${qid}.${id}`).toBe(true);
          }
        }
      }
      // Follow-ups: three cards each, every one with its own photo.
      if (s.showWhen) {
        expect(s.options).toHaveLength(3);
        expect(s.photo.kind).toBe('option');
      }
    }
  });

  it('says what Standard and Luxe include (travertine is gone)', () => {
    const finish = SPEC.steps.find((s) => s.id === 'finish')!;
    expect(finish.options.map((o) => [o.title, o.subtitle])).toEqual([
      ['Standard', 'Plaster, standard tile, precast coping'],
      ['Luxe', 'Pebble, glass tile, porcelain coping and deck'],
    ]);
    for (const o of finish.options) expect(o.subtitle).not.toMatch(/travertine/i);
  });

  it('copy is truthful: no written reviews, ratings or monthly payments', () => {
    // The example payment is DEMO ONLY (shown only with ?demo=financing; tests/estimator-demo-financing.test.tsx).
    // landing.reviews is only the switch + Google place lookup for real Google reviews (tests/estimator-reviews.test.tsx).
    const text = JSON.stringify({ ...SPEC, landing: { ...SPEC.landing, reviews: undefined }, configurator: undefined, bookingStep: { ...SPEC.bookingStep, exampleFinancing: undefined } });
    expect(text).not.toMatch(/★|review|\/mo\b|per month|guarantee/i);
    // Its heading never claims a rating or that these are all the reviews.
    expect(SPEC.landing.reviews?.heading).toBe('What Pool Masters customers say');
    expect(JSON.stringify(SPEC.landing.reviews)).not.toMatch(/★|rated|stars?\b|our reviews|\d\.\d/i);
    expect(SPEC.contactStep.trustLine).toContain(POOL_MASTERS_ESTIMATOR.licenseLabel);
    expect(SPEC.landing.headline.length).toBeLessThanOrEqual(42);
  });
});

describe('pool masters funnel: photos', () => {
  it('landing hero (and its phone copy) and project photos exist', () => {
    expect(exists(SPEC.landing.heroPhoto.src)).toBe(true);
    if (SPEC.landing.heroPhoto.srcSm) expect(exists(SPEC.landing.heroPhoto.srcSm)).toBe(true);
    expect(SPEC.landing.projects?.length).toBe(3);
    for (const p of SPEC.landing.projects ?? []) expect(exists(p.src)).toBe(true);
  });

  it('every step x every option combination resolves to an existing photo file (or an existing fallback)', () => {
    for (const sel of ALL) {
      for (const s of SPEC.steps) {
        const photo = funnelPhoto(SPEC, s.id, sel);
        expect(photo.alt).toBeTruthy();
        const ok = exists(photo.src) || (photo.fallback !== undefined && exists(photo.fallback.src));
        expect(ok, `${s.id} ${JSON.stringify(sel)} -> ${photo.src}`).toBe(true);
        if (photo.srcSm && exists(photo.src)) expect(exists(photo.srcSm)).toBe(true);
        if (photo.fallback?.srcSm) expect(exists(photo.fallback.srcSm)).toBe(true);
      }
    }
  });

  it('the photo swaps with the selected option', () => {
    // Every step shown (the full backyard path).
    const base = normalizeFunnelSelection(SPEC, { extras: 'backyard' });
    for (const s of SPEC.steps) {
      const keys = s.options.map((o) => photoKey(SPEC, s.id, { ...base, [s.id]: o.id }));
      expect(new Set(keys).size, s.id).toBe(keys.length);
      expect(Object.keys(stepOptionPhotos(SPEC, s.id, base))).toEqual(s.options.map((o) => o.id));
    }
    expect(photoKey(SPEC, 'size', { size: 'estate' })).toBe('size-estate');
    expect(funnelPhoto(SPEC, 'size', { size: 'estate' }).src).toBe('/estimator/pool-masters/funnel/size-estate.webp');
    expect(photoKey(SPEC, 'finish', { finish: 'standard' })).toBe('poolside-plaster-classic');
    expect(photoKey(SPEC, 'finish', { finish: 'luxe' })).toBe('poolside-pebble-premium');
    expect(photoKey(SPEC, 'extras', { finish: 'standard', extras: 'pool' })).toBe('aerial-resurface');
    expect(photoKey(SPEC, 'extras', { finish: 'luxe', extras: 'spa' })).toBe('aerial-porcelain-pebble-spa');
    expect(photoKey(SPEC, 'extras', { finish: 'luxe', extras: 'backyard' })).toBe('aerial-porcelain-pebble-spa-yard');
    expect(smallVariant('/estimator/pool-masters/configurator/aerial-resurface.webp')).toBe('/estimator/pool-masters/configurator/aerial-resurface-sm.webp');
    expect(smallVariant('/estimator/pool-masters/funnel/size-classic.webp')).toBeUndefined();
    // Follow-ups: one photo per option, the same whatever else was picked.
    expect(funnelPhoto(SPEC, 'spa', { extras: 'spa', spa: 'flush' }).src).toBe('/estimator/pool-masters/funnel/spa-flush.webp');
    expect(funnelPhoto(SPEC, 'spa', { extras: 'spa', spa: 'raised' }).src).toBe('/estimator/pool-masters/configurator/poolside-pebble-premium-spa.webp');
    expect(funnelPhoto(SPEC, 'spa', { extras: 'backyard', spa: 'zero_edge' }).src).toBe('/estimator/pool-masters/funnel/spa-zero-edge.webp');
    expect(funnelPhoto(SPEC, 'fire', { extras: 'backyard', fire: 'fireplace' }).src).toBe('/estimator/pool-masters/funnel/fire-fireplace.webp');
    // Photos of a step not shown on this path are still known (the screen preloads them).
    expect(Object.keys(stepOptionPhotos(SPEC, 'kitchen', { extras: 'pool' }))).toEqual(['grill', 'full', 'chef']);
  });

  it('every follow-up option photo exists, in both sizes when it has a phone copy', () => {
    for (const s of SPEC.steps.filter((x) => x.showWhen)) {
      if (s.photo.kind !== 'option') continue;
      expect(Object.keys(s.photo.photos)).toEqual(s.options.map((o) => o.id));
      for (const [id, p] of Object.entries(s.photo.photos)) {
        expect(exists(p.src), `${s.id}.${id} ${p.src}`).toBe(true);
        if (p.srcSm) expect(exists(p.srcSm), `${s.id}.${id} ${p.srcSm}`).toBe(true);
        expect(p.alt.length).toBeGreaterThan(10);
      }
    }
  });
});

describe('pool masters funnel: conditional follow-up steps', () => {
  const ids = (sel: Record<string, string>) => activeSteps(SPEC, sel).map((s) => s.id);

  it('shows follow-ups only when the extras ask for them', () => {
    expect(ids({ extras: 'pool' })).toEqual(['size', 'finish', 'extras']);
    expect(ids({ extras: 'spa' })).toEqual(['size', 'finish', 'extras', 'spa']);
    expect(ids({ extras: 'backyard' })).toEqual(['size', 'finish', 'extras', 'spa', 'kitchen', 'fire', 'cabana']);
    expect(ids({})).toEqual(['size', 'finish', 'extras']);
  });

  it('drops follow-up picks that no longer apply, and fills in defaults for new ones', () => {
    const full = { size: 'estate', finish: 'luxe', extras: 'backyard', spa: 'zero_edge', kitchen: 'chef', fire: 'pit', cabana: 'pergola' };
    expect(normalizeFunnelSelection(SPEC, full)).toEqual(full);
    expect(normalizeFunnelSelection(SPEC, { ...full, extras: 'spa' })).toEqual({ size: 'estate', finish: 'luxe', extras: 'spa', spa: 'zero_edge' });
    expect(normalizeFunnelSelection(SPEC, { ...full, extras: 'pool' })).toEqual({ size: 'estate', finish: 'luxe', extras: 'pool' });
    expect(normalizeFunnelSelection(SPEC, { extras: 'backyard', spa: 'nope' })).toEqual({
      size: 'classic', finish: 'standard', extras: 'backyard', spa: 'raised', kitchen: 'full', fire: 'bowls', cabana: 'lounge',
    });
    expect(encodeFunnelSelection(SPEC, { ...full, extras: 'pool' })).toBe('size=estate&finish=luxe&extras=pool');
    expect(decodeFunnelSelection(SPEC, 'extras=pool&spa=flush&kitchen=chef')).toEqual({ size: 'classic', finish: 'standard', extras: 'pool' });
  });

  it('enumerates every path: 6 just-the-pool, 18 spa and 486 full-backyard designs', () => {
    expect(ALL).toHaveLength(6 + 18 + 486);
    for (const sel of ALL) expect(normalizeFunnelSelection(SPEC, sel)).toEqual(sel);
  });
});

describe('pool masters funnel: pricing', () => {
  it('every combination yields template answers that price through computeEstimate', () => {
    for (const sel of ALL) {
      const answers = funnelAnswers(SPEC, sel);
      for (const [qid, ids] of Object.entries(answers)) {
        const q = T.questions.find((x) => x.id === qid);
        expect(q, qid).toBeDefined();
        for (const id of ids) expect(q!.options.some((o) => o.id === id), `${qid}.${id}`).toBe(true);
        // Configurator mapping: on a single question the row's pick goes first and wins (the lead route sanitizes the rest).
        if (q!.kind === 'single') expect(ids.length).toBeGreaterThanOrEqual(1);
      }
      const { estimate, total } = estimateFunnel(SPEC, T, sel);
      expect(total).not.toBeNull();
      expect(total!.low).toBeGreaterThanOrEqual(T.minimumJob);
      expect(total!.high).toBeGreaterThan(total!.low);
      // Same figure as the engine on the bare answers (no bundle discount in the funnel).
      const direct = computeEstimate(T, { answers });
      expect([direct.low, direct.high]).toEqual([total!.low, total!.high]);
      expect([estimate.low, estimate.high]).toEqual([direct.low, direct.high]);
      // Nothing the design asks is left open (only the property questions, which the on-site visit answers).
      expect(direct.unanswered, JSON.stringify(sel)).toEqual(['cracks', 'access', 'hillside']);
      // ...and as the configurator on the same answers with Go Luxe off.
      expect(estimateSelection(POOL_MASTERS_CONFIGURATOR, T, toConfiguratorSelection(SPEC, sel)!, answers).total).toEqual(total);
    }
  });

  it('never applies the Go Luxe bundle; Standard is precast coping, Luxe porcelain coping', () => {
    for (const sel of ALL) expect(toConfiguratorSelection(SPEC, sel)!.luxe).toBe(false);
    const std = funnelAnswers(SPEC, { size: 'classic', finish: 'standard', extras: 'pool' });
    expect([std.surface, std.tile, std.coping, std.deck]).toEqual([['plaster'], ['porcelain'], ['concrete'], ['resurface']]);
    expect(T.questions.find((q) => q.id === 'coping')!.options.find((o) => o.id === 'concrete')!.label).toBe('Precast concrete');
    const a = funnelAnswers(SPEC, { size: 'classic', finish: 'luxe', extras: 'pool' });
    expect(a.surface).toEqual(['pebble']);
    expect(a.tile).toEqual(['glass']);
    expect(a.coping).toEqual(['porcelain']);
    expect(a.deck).toEqual(['porcelain']);
    expect(a.features ?? []).not.toContain('spa');
    const full = funnelAnswers(SPEC, { size: 'classic', finish: 'standard', extras: 'backyard' });
    expect(full.features).toEqual(expect.arrayContaining(['spa', 'fire']));
    expect(full.extras).toEqual(expect.arrayContaining(['kitchen', 'patio_cover']));
    expect(full.project?.[0]).toBe('backyard');
    expect(funnelAnswers(SPEC, { size: 'classic', finish: 'luxe', extras: 'spa' }).project).toEqual(['remodel']);
  });

  it('maps every follow-up pick to template answers', () => {
    const base = { size: 'classic', finish: 'standard', extras: 'backyard' };
    const pick = (step: string, option: string) => funnelAnswers(SPEC, { ...base, [step]: option });
    expect(['flush', 'raised', 'zero_edge'].map((o) => pick('spa', o).spaStyle)).toEqual([['flush'], ['raised'], ['zero_edge']]);
    expect(['grill', 'full', 'chef'].map((o) => pick('kitchen', o).kitchenStyle)).toEqual([['grill'], ['full'], ['chef']]);
    expect(['pergola', 'cabana', 'lounge'].map((o) => pick('cabana', o).coverStyle)).toEqual([['pergola'], ['cabana'], ['covered_lounge']]);
    // Fire: exactly one fire feature each.
    const fire = (o: string) => {
      const a = pick('fire', o);
      return [a.features?.includes('fire') ?? false, a.extras?.includes('fire_pit') ?? false, a.extras?.includes('fireplace') ?? false];
    };
    expect(fire('pit')).toEqual([false, true, false]);
    expect(fire('fireplace')).toEqual([false, false, true]);
    expect(fire('bowls')).toEqual([true, false, false]);
    // The spa path alone: no kitchen, fire or shade.
    const spaOnly = funnelAnswers(SPEC, { size: 'classic', finish: 'standard', extras: 'spa', spa: 'flush' });
    expect(spaOnly.spaStyle).toEqual(['flush']);
    expect(spaOnly.extras ?? []).toEqual([]);
    expect(spaOnly.kitchenStyle).toBeUndefined();
  });

  it('prices the follow-ups in tiers (example prices)', () => {
    const range = (extra: Record<string, string>) => estimateFunnel(SPEC, T, { size: 'classic', finish: 'standard', ...extra }).total!;
    const pool = range({ extras: 'pool' });
    const delta = (extra: Record<string, string>) => {
      const r = range(extra);
      return [r.low - pool.low, r.high - pool.high];
    };
    // Spa alone: flush $15k-28k, raised $18k-35k, zero-edge $25k-45k over the pool (rounded to $500).
    expect(delta({ extras: 'spa', spa: 'flush' })).toEqual([15000, 28000]);
    expect(delta({ extras: 'spa', spa: 'raised' })).toEqual([18000, 35000]);
    expect(delta({ extras: 'spa', spa: 'zero_edge' })).toEqual([25000, 45000]);
    const tiers = (step: string, options: string[]) => options.map((o) => range({ extras: 'backyard', [step]: o }).low);
    const rising = (xs: number[]) => xs.every((x, i) => i === 0 || x > xs[i - 1]);
    expect(rising(tiers('spa', ['flush', 'raised', 'zero_edge']))).toBe(true);
    expect(rising(tiers('kitchen', ['grill', 'full', 'chef']))).toBe(true);
    expect(rising(tiers('cabana', ['pergola', 'cabana', 'lounge']))).toBe(true);
    expect(rising(tiers('fire', ['pit', 'bowls', 'fireplace']))).toBe(true);
  });

  it('prices rise with each choice: Luxe > Standard, bigger > smaller, more extras > fewer', () => {
    const low = (size: string, finish: string, extras: string) => estimateFunnel(SPEC, T, { size, finish, extras }).total!;
    for (const size of ['compact', 'classic', 'estate']) {
      for (const extras of ['pool', 'spa', 'backyard']) {
        const std = low(size, 'standard', extras);
        const lux = low(size, 'luxe', extras);
        expect(lux.low).toBeGreaterThan(std.low);
        expect(lux.high).toBeGreaterThan(std.high);
      }
    }
    expect(low('estate', 'standard', 'pool').low).toBeGreaterThan(low('compact', 'standard', 'pool').low);
    expect(low('classic', 'standard', 'spa').low).toBeGreaterThan(low('classic', 'standard', 'pool').low);
    expect(low('classic', 'standard', 'backyard').low).toBeGreaterThan(low('classic', 'standard', 'spa').low);
  });

  it('price card eyebrow names the picks', () => {
    expect(pickedTitles(SPEC, { size: 'classic', finish: 'luxe', extras: 'spa' })).toEqual(['Classic', 'Luxe', 'Add a spa', 'Raised spa']);
    expect(pickedTitles(SPEC, { size: 'classic', finish: 'luxe', extras: 'pool', spa: 'flush' })).toEqual(['Classic', 'Luxe', 'Just the pool']);
    expect(SPEC.bookingStep.priceEyebrow).toContain('{options}');
  });
});

describe('funnel selection encoding', () => {
  it('defaults and normalizes', () => {
    expect(defaultFunnelSelection(SPEC)).toEqual({ size: 'classic', finish: 'standard', extras: 'pool' });
    expect(normalizeFunnelSelection(SPEC, { size: 'huge', finish: 'luxe', junk: 'x' })).toEqual({ size: 'classic', finish: 'luxe', extras: 'pool' });
    expect(normalizeFunnelSelection(SPEC, null)).toEqual(defaultFunnelSelection(SPEC));
  });

  it('round-trips every combination through the URL and a stored JSON object', () => {
    for (const sel of ALL) {
      const qs = encodeFunnelSelection(SPEC, sel);
      expect(decodeFunnelSelection(SPEC, qs)).toEqual(sel);
      expect(decodeFunnelSelection(SPEC, `?${qs}`)).toEqual(sel);
      expect(decodeFunnelSelection(SPEC, new URLSearchParams(qs))).toEqual(sel);
      expect(decodeFunnelSelection(SPEC, JSON.parse(JSON.stringify(sel)) as Record<string, unknown>)).toEqual(sel);
    }
    expect(encodeFunnelSelection(SPEC, { size: 'estate', finish: 'luxe', extras: 'backyard' })).toBe(
      'size=estate&finish=luxe&extras=backyard&spa=raised&kitchen=full&fire=bowls&cabana=lounge',
    );
    expect(encodeFunnelSelection(SPEC, { size: 'estate', finish: 'luxe', extras: 'spa', spa: 'zero_edge' })).toBe('size=estate&finish=luxe&extras=spa&spa=zero_edge');
    expect(decodeFunnelSelection(SPEC, 'size=<script>&finish=luxe&step=2')).toEqual({ size: 'classic', finish: 'luxe', extras: 'pool' });
    expect(answeredSteps(SPEC, 'step=3&size=estate&finish=nope')).toEqual(['size']);
  });
});

describe('funnel without a configurator (generic, e.g. a future bathroom funnel)', () => {
  it('maps options straight to template answers over baseAnswers', () => {
    const generic: FunnelSpec = {
      ...SPEC,
      configurator: undefined,
      baseAnswers: { project: ['remodel'], shape: ['rectangle'], package: ['custom'], scope: ['surface'] },
      steps: [
        {
          id: 'size',
          label: 'Size?',
          options: [
            { id: 's', title: 'S', subtitle: 's', answers: { size: ['small'] } },
            { id: 'l', title: 'L', subtitle: 'l', answers: { size: ['large'] } },
          ],
          photo: { kind: 'option', photos: { s: { src: '/a.webp', alt: 'a' }, l: { src: '/b.webp', alt: 'b' } } },
        },
        {
          id: 'finish',
          label: 'Finish?',
          options: [
            { id: 'p', title: 'P', subtitle: 'p', answers: { surface: ['plaster'] } },
            { id: 'b', title: 'B', subtitle: 'b', answers: { surface: ['pebble'] } },
          ],
          photo: { kind: 'option', photos: { p: { src: '/c.webp', alt: 'c' }, b: { src: '/d.webp', alt: 'd' } } },
        },
      ],
    };
    expect(toConfiguratorSelection(generic, { size: 'l', finish: 'b' })).toBeNull();
    expect(funnelAnswers(generic, { size: 'l', finish: 'b' })).toEqual({ project: ['remodel'], shape: ['rectangle'], package: ['custom'], scope: ['surface'], size: ['large'], surface: ['pebble'] });
    const cheap = estimateFunnel(generic, T, { size: 's', finish: 'p' }).total!;
    const dear = estimateFunnel(generic, T, { size: 'l', finish: 'b' }).total!;
    expect(dear.low).toBeGreaterThan(cheap.low);
    expect(funnelPhoto(generic, 'finish', { finish: 'b' }).src).toBe('/d.webp');
  });
});
