import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { funnelSchema, resolveStep, visibleQuestions, type FunnelConfig } from '@/lib/funnels/schema';
import { previewAdvance, previewAnswersForStep } from '@/lib/funnels/builder';

const load = (file: string) => funnelSchema.parse(JSON.parse(readFileSync(`content/funnels/${file}.json`, 'utf8')));
const PRESETS = ['kitchen-remodel', 'bathroom-remodel'];

describe('conditional steps never render blank', () => {
  it.each(PRESETS)('%s: the builder preview can open every question', (file) => {
    const config = load(file);
    // The bug: with no answers most steps are hidden, so opening one directly showed nothing.
    expect(visibleQuestions(config, {}).length).toBeLessThan(config.questions.length);
    for (const q of config.questions) {
      const answers = previewAnswersForStep(config, q.id);
      expect(visibleQuestions(config, answers).map((v) => v.id), `${q.id} should be visible in preview`).toContain(q.id);
      expect(resolveStep(config, answers, q.id)).toBe(q.id);
      // the previewed question itself is not pre-answered, so the visitor can answer it
      expect(answers[q.id]).toBeUndefined();
    }
  });

  it.each(PRESETS)('%s: previewing a step, then answering it, keeps moving forward', (file) => {
    const config = load(file);
    for (const q of config.questions) {
      const answers = previewAnswersForStep(config, q.id);
      const value = q.type === 'choice' ? q.options[0].value : q.type === 'zip' ? '90001' : q.type === 'email' ? 'a@b.co' : q.type === 'phone' ? '3105550123' : q.type === 'number' ? '5' : 'x';
      const next = previewAdvance(config, { answers, step: q.id, qualified: null }, { answer: { question: q.id, value } });
      expect('error' in next, `${q.id}: ${'error' in next ? next.error : ''}`).toBe(false);
      if (!('error' in next)) expect(resolveStep(config, next.answers, next.step)).toBe(next.step);
    }
  });

  it('non-question steps preview as a fully answered funnel', () => {
    const config = load('kitchen-remodel');
    const answers = previewAnswersForStep(config, 'contact');
    for (const q of visibleQuestions(config, answers)) expect(answers[q.id]).toBeDefined();
  });

  it('picks values that satisfy "not_equals", "in" and chained conditions', () => {
    const config = funnelSchema.parse({
      version: 1, clientName: 'T', industry: 'T', serviceArea: { label: 'T' },
      questions: [
        { id: 'a', type: 'choice', headline: 'A', options: [{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }, { value: 'z', label: 'Z' }] },
        { id: 'b', type: 'choice', headline: 'B', options: [{ value: 'b1', label: 'B1' }, { value: 'b2', label: 'B2' }], showWhen: [{ question: 'a', operator: 'not_equals', values: ['x'] }] },
        { id: 'c', type: 'choice', headline: 'C', options: [{ value: 'c1', label: 'C1' }], showWhen: [{ question: 'b', operator: 'equals', values: ['b2'] }] },
        { id: 'z', type: 'zip', headline: 'Z', options: [] },
      ],
      thankYouPage: { headline: 'T', message: 'T' },
    } as unknown) as FunnelConfig;
    const answers = previewAnswersForStep(config, 'c');
    expect(answers.a).not.toBe('x');
    expect(answers.b).toBe('b2');
    expect(visibleQuestions(config, answers).map((q) => q.id)).toContain('c');
  });

  it('resolveStep repairs a step that names a hidden or missing question', () => {
    const config = load('kitchen-remodel');
    // 'budget' only shows once homeowner = yes; with no answers it is hidden.
    expect(resolveStep(config, {}, 'budget')).toBe('service');
    expect(resolveStep(config, { service: 'full_remodel' }, 'does_not_exist')).toBe('kitchen_size');
    expect(resolveStep(config, { service: 'full_remodel', kitchen_size: config.questions[1].options[0].value, zip: '90001', homeowner: 'no' }, 'budget')).toBe('qualification');
    // real screens and visible questions are left alone
    expect(resolveStep(config, {}, 'contact')).toBe('contact');
    expect(resolveStep(config, {}, 'service')).toBe('service');
  });
});
