import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { captureAttribution, contactSchema, funnelSchema, qualify, sanitizeAnswers, visibleQuestions } from '@/lib/funnels/schema';
import example from '@/content/funnels/pool-demo.json';
import { conversion } from '@/lib/funnels/analytics';

const poolExample = funnelSchema.parse(example);
const answers = { service: 'full_remodel', remodel_scope: 'pool_spa', timeline: 'asap', budget: 'budget_25_50k', homeowner: 'yes', zip: '91301' };
describe('funnel engine', () => {
  it('branches and removes stale branch answers after changing service', () => {
    expect(visibleQuestions(poolExample, { service: 'resurfacing' }).map(q => q.id)).toContain('surface');
    expect(sanitizeAnswers(poolExample, { ...answers, surface: 'worn' })).not.toHaveProperty('surface');
    expect(visibleQuestions(poolExample, { service: 'full_remodel' }).map(q => q.id)).toContain('remodel_scope');
    expect(sanitizeAnswers(poolExample, { ...answers, service: 'resurfacing', surface: 'worn' })).not.toHaveProperty('remodel_scope');
    expect(qualify(poolExample, { ...answers, service: 'resurfacing' })).toBeNull();
    expect(qualify(poolExample, { ...answers, service: 'resurfacing', surface: 'worn' })).toBe(true);
  });
  it('requires complete answers, service-area ZIP, homeowner and timeline', () => {
    expect(qualify(poolExample, answers)).toBe(true);
    expect(qualify(poolExample, { ...answers, zip: '10001' })).toBe(false);
    expect(qualify(poolExample, { ...answers, homeowner: 'no' })).toBe(false);
    expect(qualify(poolExample, { ...answers, timeline: 'researching' })).toBe(false);
    expect(qualify(poolExample, {})).toBeNull();
  });
  it('rejects invalid choices, unknown answer keys, loops and ambiguous IDs', () => {
    expect(sanitizeAnswers(poolExample, { service: 'forged', secret: 'test' })).toEqual({});
    const bad = structuredClone(poolExample);
    bad.questions[0].showWhen = [{ question: 'service', operator: 'equals', values: ['full_remodel'] }];
    expect(funnelSchema.safeParse(bad).success).toBe(false);
    expect(funnelSchema.safeParse({ ...poolExample, questions: [...poolExample.questions, poolExample.questions[0]] }).success).toBe(false);
  });
  it('allows a different niche through configuration alone', () => {
    const roofing = funnelSchema.parse({ ...poolExample, industry: 'Roofing', questions: poolExample.questions.filter(q => q.id !== 'surface').map(q => q.id === 'service' ? { ...q, options: [{ value: 'roof', label: 'Replace my roof' }] } : q) });
    expect(qualify(roofing, { ...answers, service: 'roof' })).toBe(true);
  });
  it('ships a valid, completable starter template for every niche', () => {
    const dir = 'content/funnels/templates';
    const files = readdirSync(dir).filter(f => f.endsWith('.json'));
    expect(files.length).toBeGreaterThanOrEqual(10);
    for (const file of files) {
      const config = funnelSchema.parse({ ...JSON.parse(readFileSync(`${dir}/${file}`, 'utf8')), serviceArea: { label: 'Test', zipCodes: ['91301'] } });
      // Walk the first option of every visible question; a qualifying path must exist.
      const walk: Record<string, string> = {};
      for (let q = visibleQuestions(config, walk).find(q => !walk[q.id]); q; q = visibleQuestions(config, walk).find(q => !walk[q.id])) {
        walk[q.id] = q.type === 'zip' ? '91301' : q.options[0].value;
      }
      expect(qualify(config, walk), file).toBe(true);
      expect(config.questions.some(q => q.showWhen.length), `${file} has a branch question`).toBe(true);
    }
  });
  it('preserves attribution but strips unrelated query strings and referrer tokens', () => {
    expect(captureAttribution('https://example.com/estimate/test?utm_source=facebook&utm_campaign=pool&fbclid=abc&gclid=xyz&email=private', 'https://facebook.com/path?token=secret', 'mobile')).toEqual({ landing_page_url: 'https://example.com/estimate/test', utm_source: 'facebook', utm_campaign: 'pool', fbclid: 'abc', gclid: 'xyz', referrer: 'https://facebook.com/path', device_type: 'mobile' });
  });
  it('validates contact and consent without accepting a honeypot', () => {
    const contact = { firstName: 'A', lastName: 'B', email: 'a@example.test', phone: '8185550123', consent: true };
    expect(contactSchema.safeParse(contact).success).toBe(true);
    for (const override of [{ consent: false }, { phone: '123' }, { email: 'invalid' }, { website: 'spam' }]) expect(contactSchema.safeParse({ ...contact, ...override }).success).toBe(false);
  });
  it('calculates conversion with an honest empty denominator', () => {
    expect(conversion(410, 1000)).toBe('41.0%');
    expect(conversion(0, 0)).toBe('—');
  });
});
