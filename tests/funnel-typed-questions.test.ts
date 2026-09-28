import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { addQuestion, blankFunnelConfig, changeQuestionType, previewAdvance, updateQuestion } from '@/lib/funnels/builder';
import { funnelSchema, qualify, sanitizeAnswers, validateAnswer, type Question } from '@/lib/funnels/schema';

const base = { headline: 'Q', options: [], showWhen: [] };
const q = (type: Question['type'], extra: Partial<Question> = {}): Question => ({ id: 'q1', type, ...base, ...extra });

describe('validateAnswer', () => {
  it('address: permissive, required by default, optional when required is false', () => {
    expect(validateAnswer(q('address'), '  123 Main St, Burbank, CA 91502 ')).toEqual({ ok: true, value: '123 Main St, Burbank, CA 91502' });
    expect(validateAnswer(q('address'), '1/2 Unit B, PO Box 9')).toMatchObject({ ok: true });
    expect(validateAnswer(q('address'), '   ')).toMatchObject({ ok: false });
    expect(validateAnswer(q('address', { required: false }), '')).toEqual({ ok: true, value: '' });
  });
  it('email and phone validate format; number rejects non-numeric input', () => {
    expect(validateAnswer(q('email'), 'A@B.com')).toEqual({ ok: true, value: 'a@b.com' });
    expect(validateAnswer(q('email'), 'nope')).toMatchObject({ ok: false });
    expect(validateAnswer(q('phone'), '(818) 555-1234')).toMatchObject({ ok: true });
    expect(validateAnswer(q('phone'), '123')).toMatchObject({ ok: false });
    expect(validateAnswer(q('number'), '1,500.5')).toEqual({ ok: true, value: '1500.5' });
    expect(validateAnswer(q('number'), 'abc')).toMatchObject({ ok: false });
    expect(validateAnswer(q('number'), '12abc')).toMatchObject({ ok: false });
  });
  it('short text is single-line, long text keeps line breaks, both are length-capped', () => {
    expect(validateAnswer(q('short_text'), 'a\nb')).toEqual({ ok: true, value: 'a b' });
    expect(validateAnswer(q('long_text'), 'a\nb')).toEqual({ ok: true, value: 'a\nb' });
    expect(validateAnswer(q('short_text'), 'x'.repeat(201))).toMatchObject({ ok: false });
    expect(validateAnswer(q('long_text'), 'x'.repeat(2000))).toMatchObject({ ok: true });
  });
  it('choice and zip keep their original rules', () => {
    const choice = q('choice', { options: [{ value: 'a', label: 'A' }] });
    expect(validateAnswer(choice, 'a')).toMatchObject({ ok: true });
    expect(validateAnswer(choice, 'typed free text')).toMatchObject({ ok: false });
    expect(validateAnswer(q('zip'), '91301')).toMatchObject({ ok: true });
    expect(validateAnswer(q('zip'), '9130')).toMatchObject({ ok: false });
  });
});

describe('typed questions in a funnel', () => {
  const withAddress = () => {
    let config = addQuestion(blankFunnelConfig('Test', 'Roofing'), 'address');
    config = updateQuestion(config, 'address', { headline: 'What is the property address?' });
    return config;
  };
  it('a config with typed questions parses, and existing configs parse unchanged (no required/placeholder added)', () => {
    expect(() => funnelSchema.parse(withAddress())).not.toThrow();
    const pool = funnelSchema.parse(JSON.parse(readFileSync('content/funnels/pool-remodeling.json', 'utf8')));
    expect(pool.questions.every(x => x.required === undefined && x.placeholder === undefined)).toBe(true);
  });
  it('addQuestion creates typed questions with no options editor data', () => {
    const question = withAddress().questions.find(x => x.type === 'address')!;
    expect(question.options).toEqual([]);
    expect(question.required).toBe(true);
  });
  it('changing type keeps options for switching back and reseeds an empty choice', () => {
    const choice = q('choice', { options: [{ value: 'a', label: 'A' }], placeholder: 'x' });
    expect(changeQuestionType(choice, 'address').options).toHaveLength(1);
    expect(changeQuestionType(q('address'), 'choice').options).toHaveLength(2);
    expect(changeQuestionType(q('address', { placeholder: '123 Main' }), 'email').placeholder).toBeUndefined();
  });
  it('typed answers advance the preview, required ones cannot be skipped, and rejects show a message', () => {
    const config = withAddress();
    const step = (config.questions.findIndex(x => x.id === 'address'));
    expect(step).toBeGreaterThan(0);
    const state = { answers: { service: 'option_1', zip: '91301' }, step: 'address', qualified: null };
    expect(previewAdvance(config, state, { answer: { question: 'address', value: '  ' } })).toMatchObject({ error: expect.stringContaining('address') });
    const ok = previewAdvance(config, state, { answer: { question: 'address', value: '123 Main St, Burbank, CA 91502' } });
    expect(ok).toMatchObject({ answers: { address: '123 Main St, Burbank, CA 91502' }, step: 'qualification' });
  });
  it('an optional question can be skipped (stored as empty) and still lets qualification complete', () => {
    let config = withAddress();
    config = updateQuestion(config, 'address', { required: false });
    const answers = sanitizeAnswers(config, { service: 'option_1', zip: '91301', address: '' });
    expect(answers.address).toBe('');
    expect(qualify(config, answers)).not.toBeNull();
    expect(qualify(config, { service: 'option_1', zip: '91301' })).toBeNull();
  });
  it('sanitizeAnswers drops invalid typed values', () => {
    const config = withAddress();
    expect(sanitizeAnswers(config, { service: 'option_1', zip: '91301', address: '   ' }).address).toBeUndefined();
  });
});
