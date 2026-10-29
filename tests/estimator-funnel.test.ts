import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { POOL_MASTERS_ESTIMATOR } from '@/content/estimators/pool-masters';
import { POOL_MASTERS_CONFIGURATOR } from '@/content/estimators/pool-masters-configurator';
import { POOL_MASTERS_FUNNEL as SPEC } from '@/content/estimators/pool-masters-funnel';
import { estimateSelection } from '@/lib/estimator/configurator/engine';
import { computeEstimate, validateTemplate } from '@/lib/estimator/engine';
import {
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

  it('asks exactly three questions, ids unique, every option mapped to real configurator models/rows', () => {
    expect(SPEC.steps.map((s) => s.id)).toEqual(['size', 'finish', 'extras']);
    expect(SPEC.steps.at(-1)!.cta).toBe('Get my estimate');
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
      }
    }
  });

  it('copy is truthful: no reviews, ratings or monthly payments', () => {
    const text = JSON.stringify({ ...SPEC, configurator: undefined });
    expect(text).not.toMatch(/★|review|\/mo\b|per month|guarantee/i);
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
    const base = defaultFunnelSelection(SPEC);
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
      // ...and as the configurator on the same design with Go Luxe off.
      expect(estimateSelection(POOL_MASTERS_CONFIGURATOR, T, toConfiguratorSelection(SPEC, sel)!).total).toEqual(total);
    }
  });

  it('never applies the Go Luxe bundle; luxe maps to its finish rows only', () => {
    for (const sel of ALL) expect(toConfiguratorSelection(SPEC, sel)!.luxe).toBe(false);
    const a = funnelAnswers(SPEC, { size: 'classic', finish: 'luxe', extras: 'pool' });
    expect(a.surface).toEqual(['pebble']);
    expect(a.tile).toEqual(['glass']);
    expect(a.coping).toEqual(['travertine']);
    expect(a.deck).toEqual(['porcelain']);
    expect(a.features ?? []).not.toContain('spa');
    const full = funnelAnswers(SPEC, { size: 'classic', finish: 'standard', extras: 'backyard' });
    expect(full.features).toEqual(expect.arrayContaining(['spa', 'fire']));
    expect(full.extras).toEqual(expect.arrayContaining(['kitchen', 'patio_cover']));
    expect(full.project?.[0]).toBe('backyard');
    expect(funnelAnswers(SPEC, { size: 'classic', finish: 'luxe', extras: 'spa' }).project).toEqual(['remodel']);
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
    expect(pickedTitles(SPEC, { size: 'classic', finish: 'luxe', extras: 'spa' })).toEqual(['Classic', 'Luxe', 'Add a spa']);
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
    expect(encodeFunnelSelection(SPEC, { size: 'estate', finish: 'luxe', extras: 'backyard' })).toBe('size=estate&finish=luxe&extras=backyard');
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
