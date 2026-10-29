import { describe, expect, it } from 'vitest';
import { applyPackage, computeEstimate, validateTemplate } from '@/lib/estimator/engine';
import { getEstimator } from '@/lib/estimator/registry';
import { BATHROOM_CATALOG } from '@/lib/estimator/catalog/bathroom';
import { buildBathScene, EXAMPLE_BATH_SCENE } from '@/lib/estimator/scene/bath/scene';
import { BATH_TEXTURES, BATH_SPRITES, bathOptionTexture } from '@/lib/estimator/scene/bath/textures';
import { BATH_SPRITE_IDS, BATH_TEXTURE_IDS } from '@/lib/estimator/scene/bath/types';
import { BATHROOM_TEMPLATE } from '@/lib/estimator/templates/bathroom';
import { POOL_TEMPLATE } from '@/lib/estimator/templates/pool';
import type { Answers } from '@/lib/estimator/types';

const T = BATHROOM_TEMPLATE;

describe('bathroom template', () => {
  it('is valid and keeps the catalog in sync', () => {
    expect(validateTemplate(T)).toEqual([]);
    for (const [questionId, options] of Object.entries(BATHROOM_CATALOG)) {
      const q = T.questions.find((x) => x.id === questionId)!;
      expect(q, questionId).toBeTruthy();
      for (const o of q.options) expect(options.map((x) => x.id)).toContain(o.id);
    }
  });

  it('prices the floor by room area', () => {
    const answers: Answers = { project: ['refresh'], size: ['medium'], scope: ['floor'], floor: ['lvp'] };
    const e = computeEstimate(T, { answers });
    const floor = e.lines.find((l) => l.questionId === 'floor')!;
    expect(floor).toMatchObject({ unit: 'floor_sqft', quantity: 80, low: 720, high: 1200 });
    const typed = computeEstimate(T, { answers, dimensions: { lengthFt: 12, widthFt: 10 } });
    expect(typed.lines.find((l) => l.questionId === 'floor')!.quantity).toBe(120);
  });

  it('flags a freestanding tub plus shower only in a small room', () => {
    const base: Answers = { project: ['full'], scope: ['bathing'], bathing: ['tub_and_shower'] };
    const small = computeEstimate(T, { answers: { ...base, size: ['small'] } });
    const large = computeEstimate(T, { answers: { ...base, size: ['large'] } });
    expect(small.siteVisitItems.map((i) => i.questionId)).toContain('bathing');
    expect(large.siteVisitItems.map((i) => i.questionId)).not.toContain('bathing');
  });

  it('lands the Signature package for a medium room in a realistic range', () => {
    const answers = { ...applyPackage(T, { project: ['full'], size: ['medium'] }, 'signature'), plumbing: ['no'], damage: ['no'], location: ['no'] };
    const e = computeEstimate(T, { answers });
    expect(e.status).toBe('ready');
    expect(e.low!).toBeGreaterThanOrEqual(20000);
    expect(e.high!).toBeLessThanOrEqual(60000);
  });

  it('is published as bathroom-remodel for HomeQuote Network', () => {
    const r = getEstimator('bathroom-remodel')!;
    expect(r.template.trade).toBe('bathroom');
    expect(r.contractor.funnelSlug).toBe('bathroom-remodel');
    expect(r.contractor.financingNote).toBeUndefined();
    expect(validateTemplate(r.template)).toEqual([]);
    expect(getEstimator('pool-masters')!.template.trade).toBe('pool');
  });
});

describe('buildBathScene', () => {
  it('draws a medium room with tasteful defaults before any pick', () => {
    expect(buildBathScene(T, { answers: {} })).toEqual({
      project: 'full',
      room: 'medium',
      lengthFt: 10,
      widthFt: 8,
      bathing: 'existing',
      showerTile: null,
      glass: false,
      floor: null,
      paint: null,
      vanity: null,
      vanityFinish: null,
      counter: null,
      metal: null,
      extras: { niche: false, bench: false, ledMirror: false, heatedFloor: false, rainHead: false },
    });
  });

  it('follows a package and only visible answers', () => {
    const answers = applyPackage(T, { project: ['full'], size: ['large'] }, 'spa');
    const s = buildBathScene(T, { answers });
    expect(s).toMatchObject({ room: 'large', lengthFt: 14, widthFt: 12, bathing: 'tub_and_shower', glass: true, showerTile: 'marble' });
    expect(s.extras).toEqual({ niche: true, bench: true, ledMirror: true, heatedFloor: true, rainHead: true });
    // Dropping bathing from the scope hides the shower answers (and tile).
    const fewer = buildBathScene(T, { answers: { ...answers, scope: ['vanity'] } });
    expect(fewer).toMatchObject({ bathing: 'existing', showerTile: null, glass: false, floor: null, vanity: 'floating', metal: 'brushed_gold' });
    expect(fewer.extras.rainHead).toBe(false);
  });

  it('keeps the current tub, and shows a walk-in for an unanswered tub-to-shower', () => {
    expect(buildBathScene(T, { answers: { scope: ['bathing'], bathing: ['keep'] } }).bathing).toBe('existing');
    expect(buildBathScene(T, { answers: { project: ['tub_to_shower'] } })).toMatchObject({ project: 'tub_to_shower', bathing: 'walk_in', glass: true });
    expect(buildBathScene(T, { answers: { scope: ['bathing'], bathing: ['tub_shower'] } }).glass).toBe(false);
  });

  it('classes typed dimensions by floor area', () => {
    const room = (lengthFt: number, widthFt: number) => buildBathScene(T, { answers: { size: ['medium'] }, dimensions: { lengthFt, widthFt } }).room;
    expect(room(8, 5)).toBe('small');
    expect(room(10, 9)).toBe('medium');
    expect(room(15, 12)).toBe('large');
    // Out of limits: the preset wins.
    expect(buildBathScene(T, { answers: { size: ['small'] }, dimensions: { lengthFt: 40, widthFt: 5 } })).toMatchObject({ room: 'small', lengthFt: 8, widthFt: 5 });
  });

  it('has a texture for every material option and complete manifests', () => {
    for (const id of ['showerTile', 'floor', 'paint', 'counter', 'vanityFinish']) {
      for (const o of T.questions.find((q) => q.id === id)!.options) expect(bathOptionTexture(id, o.id), `${id}.${o.id}`).not.toBeNull();
    }
    expect(Object.keys(BATH_TEXTURES).sort()).toEqual([...BATH_TEXTURE_IDS].sort());
    expect(Object.keys(BATH_SPRITES).sort()).toEqual([...BATH_SPRITE_IDS].sort());
    expect(EXAMPLE_BATH_SCENE.room).toBe('medium');
  });

  it('leaves the pool template valid', () => {
    expect(validateTemplate(POOL_TEMPLATE)).toEqual([]);
  });
});
