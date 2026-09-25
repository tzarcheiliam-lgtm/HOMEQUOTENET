import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  addOption, addQuestion, blankFunnelConfig, duplicateQuestion, idify, moveOption, moveQuestion,
  previewAdvance, removeOption, removeQuestion, slugify, uniqueId, updateQuestion,
} from '@/lib/funnels/builder';
import { funnelSchema, qualify } from '@/lib/funnels/schema';

const pool = funnelSchema.parse(JSON.parse(readFileSync('content/funnels/pool-remodeling.json', 'utf8')));

describe('slugs and ids', () => {
  it('slugify makes a URL-safe, lowercase slug and never starts with a symbol', () => {
    expect(slugify('Ethan / Pool Masters LA!')).toBe('ethan-pool-masters-la');
    expect(slugify('   ')).toBe('funnel');
  });
  it('idify makes a valid question/option identifier and uniqueId avoids collisions', () => {
    expect(idify('What type of project?')).toBe('what_type_of_project');
    const used = new Set(['service', 'service_2']);
    expect(uniqueId('Service', used)).toBe('service_3');
  });
});

describe('step (question) editing', () => {
  it('blank config always parses (a fresh funnel is never invalid)', () => {
    expect(() => blankFunnelConfig('New Client', 'Roofing')).not.toThrow();
  });
  it('adds, duplicates, reorders and removes questions, keeping ids unique and branches valid', () => {
    let config = blankFunnelConfig('Test', 'Roofing');
    config = addQuestion(config, 'choice');
    expect(config.questions).toHaveLength(3);
    expect(new Set(config.questions.map(q => q.id)).size).toBe(3);

    const dup = duplicateQuestion(config, config.questions[0].id);
    expect(dup.questions).toHaveLength(4);
    expect(dup.questions[1].id).not.toBe(dup.questions[0].id);
    expect(funnelSchema.safeParse(dup).success).toBe(true);

    const moved = moveQuestion(config, config.questions[2].id, 'up');
    expect(moved.questions[1].id).toBe(config.questions[2].id);
    expect(funnelSchema.safeParse(moved).success).toBe(true);

    // Remove a choice question (not the ZIP question — exactly one is required).
    const choiceId = config.questions.find(q => q.type === 'choice' && q.id !== config.questions[0].id)!.id;
    const removed = removeQuestion(config, choiceId);
    expect(removed.questions).toHaveLength(2);
    expect(funnelSchema.safeParse(removed).success).toBe(true);
  });
  it('dropping a branched question also drops its now-dangling showWhen conditions', () => {
    let config = blankFunnelConfig('Test', 'Roofing');
    config = updateQuestion(config, config.questions[1].id, {
      showWhen: [{ question: config.questions[0].id, operator: 'equals', values: ['option_1'] }],
    });
    const removed = removeQuestion(config, config.questions[0].id);
    expect(removed.questions.find(q => q.id === config.questions[1].id)?.showWhen).toEqual([]);
    expect(funnelSchema.safeParse(removed).success).toBe(true);
  });
  it('moving a question above one it branches on drops the now-invalid branch', () => {
    let config = blankFunnelConfig('Test', 'Roofing');
    config = addQuestion(config, 'choice'); // [service, zip, extra]
    const branchedId = config.questions[2].id;
    const parentId = config.questions[0].id;
    config = updateQuestion(config, branchedId, { showWhen: [{ question: parentId, operator: 'equals', values: ['option_1'] }] });
    // One "up" swaps [zip, extra] -> the branch on `service` is still earlier and stays valid.
    let moved = moveQuestion(config, branchedId, 'up');
    expect(moved.questions.find(q => q.id === branchedId)?.showWhen).toHaveLength(1);
    // A second "up" swaps extra above `service` itself -> the branch is now invalid and dropped.
    moved = moveQuestion(moved, branchedId, 'up');
    const movedIndex = moved.questions.findIndex(q => q.id === branchedId);
    expect(movedIndex).toBeLessThan(moved.questions.findIndex(q => q.id === parentId));
    expect(moved.questions[movedIndex].showWhen).toEqual([]);
    expect(funnelSchema.safeParse(moved).success).toBe(true);
  });
  it('option add/remove/reorder keeps values unique and the config valid', () => {
    let config = blankFunnelConfig('Test', 'Roofing');
    const q0 = addOption(config.questions[0]);
    expect(new Set(q0.options.map(o => o.value)).size).toBe(q0.options.length);
    config = updateQuestion(config, config.questions[0].id, q0);
    expect(funnelSchema.safeParse(config).success).toBe(true);

    const withoutFirst = removeOption(config.questions[0], config.questions[0].options[0].value);
    expect(withoutFirst.options).toHaveLength(q0.options.length - 1);

    const reordered = moveOption(config.questions[0], config.questions[0].options[1].value, 'up');
    expect(reordered.options[0].value).toBe(config.questions[0].options[1].value);
  });
});

describe('previewAdvance (builder live preview, no network)', () => {
  const answers = { service: 'full_remodel', remodel_scope: 'pool_spa', timeline: 'asap', budget: 'budget_25_50k', homeowner: 'yes', zip: '91301' };
  it('advances one answer at a time and refuses an answer for the wrong step', () => {
    const state = { answers: {}, step: 'service', qualified: null };
    const r1 = previewAdvance(pool, state, { answer: { question: 'service', value: 'full_remodel' } });
    if ('error' in r1) throw r1;
    expect(r1.step).toBe('remodel_scope');
    const wrong = previewAdvance(pool, r1, { answer: { question: 'timeline', value: 'asap' } });
    expect('error' in wrong).toBe(true);
  });
  it('reaches qualification once every visible question is answered, honoring conditional branches', () => {
    let state = { answers: {}, step: pool.questions[0].id, qualified: null as boolean | null };
    for (const [id, value] of Object.entries(answers)) {
      const q = pool.questions.find(q => q.id === id);
      if (!q || state.step !== id) continue;
      const r = previewAdvance(pool, state, { answer: { question: id, value } });
      if ('error' in r) throw r;
      state = r;
    }
    expect(state.step).toBe('qualification');
    expect(state.qualified).toBe(true);
    expect(state.qualified).toBe(qualify(pool, state.answers));
  });
  it('lets a jump go straight to "contact" only once qualification is resolved', () => {
    expect('error' in previewAdvance(pool, { answers: {}, step: 'service', qualified: null }, { step: 'contact' })).toBe(true);
    const qualifiedState = { answers, step: 'qualification', qualified: true };
    const r = previewAdvance(pool, qualifiedState, { step: 'contact' });
    if ('error' in r) throw r;
    expect(r.step).toBe('contact');
  });
});
