/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';
import { FUNNEL_PRESETS, installPresetFunnels, presetConfig } from '@/lib/funnels/presets';
import { funnelSchema, inServiceArea, qualify, serviceAreaValid, validateAnswer, visibleQuestions, type Answers } from '@/lib/funnels/schema';

const DATASET = '29178560738497902';

const qualified: Record<string, Answers> = {
  'bathroom-remodel': { service: 'full_remodel', bathroom_count: 'one', zip: '90210', homeowner: 'yes', decision_maker: 'sole', timeline: '1_3_months', budget: 'budget_10_20k', payment: 'cash', home_type: 'single_family', address: '12 Main St, Beverly Hills, CA', notes: '' },
  'kitchen-remodel': { service: 'full_remodel', kitchen_size: 'medium', zip: '90210', homeowner: 'yes', decision_maker: 'joint', timeline: 'asap', budget: 'budget_25_40k', payment: 'need_financing', home_type: 'single_family', address: '12 Main St, Beverly Hills, CA', notes: '' },
};

describe.each(FUNNEL_PRESETS.map((p) => [p.slug, p] as const))('%s funnel', (slug) => {
  const config = presetConfig(slug);

  it('is a valid funnel wired to the shared dataset, with no calendar step', () => {
    expect(funnelSchema.safeParse(config).success).toBe(true);
    expect(config.trackingPixels.metaPixelId).toBe(DATASET);
    expect(config.trackingPixels.consentMode).toBe('opt_out');
    expect(config.calendarUrl).toBeUndefined();
    expect(config.clientName).toBe('HomeQuote Network');
    expect(JSON.stringify(config.trust)).toBe('{}'); // no invented ratings, licences or testimonials
    expect(new Set(config.questions.map((q) => q.id)).size).toBe(config.questions.length);
    expect(config.questions.filter((q) => q.type === 'zip')).toHaveLength(1);
  });

  it('takes any ZIP the ad delivers to (no ZIP list to maintain) and still lets the Lead event fire', () => {
    expect(inServiceArea(config, '10001')).toBe(true);
    expect(serviceAreaValid(config, '10001')).toBe(true);
  });

  it('qualifies a genuinely strong lead', () => {
    expect(qualify(config, qualified[slug])).toBe(true);
  });

  it.each([
    ['a renter', { homeowner: 'no' }],
    ['someone who is not the decision-maker', { decision_maker: 'other' }],
    ['someone just researching', { timeline: 'researching' }],
    ['a start date 3–6 months away', { timeline: '3_6_months' }],
    ['someone who is not sure how they will pay', { payment: 'unsure' }],
    ['a small repair / fixture swap', { service: slug === 'bathroom-remodel' ? 'repair' : 'appliances_flooring' }],
    ['a project outside the scope', { service: 'other' }],
    ['a budget below the threshold', { budget: slug === 'bathroom-remodel' ? 'budget_5_10k' : 'budget_15_25k' }],
    ['the smallest budget', { budget: slug === 'bathroom-remodel' ? 'budget_under_5k' : 'budget_under_15k' }],
  ])('does not qualify %s', (_label, change) => {
    expect(qualify(config, { ...qualified[slug], ...change })).toBe(false);
  });

  it('asks a renter only the first few questions, then reaches a decision instead of 8 pointless ones', () => {
    const visible = visibleQuestions(config, { service: 'full_remodel', zip: '90210', homeowner: 'no' }).map((q) => q.id);
    expect(visible).not.toContain('budget'); expect(visible).not.toContain('timeline');
    expect(qualify(config, { service: 'full_remodel', zip: '90210', homeowner: 'no', ...(slug === 'bathroom-remodel' ? { bathroom_count: 'one' } : { kitchen_size: 'medium' }) })).toBe(false); // decided, not "still answering"
  });

  it('is not decided until every shown question is answered', () => {
    expect(qualify(config, { service: 'full_remodel', zip: '90210' })).toBeNull();
  });

  it('keeps the optional notes question optional and the address required', () => {
    const notes = config.questions.find((q) => q.id === 'notes')!; const address = config.questions.find((q) => q.id === 'address')!;
    expect(validateAnswer(notes, '').ok).toBe(true);
    expect(validateAnswer(address, '').ok).toBe(false);
    expect(validateAnswer(address, '12 Main St, Beverly Hills, CA').ok).toBe(true);
  });

  it('shows no more questions than needed on the qualified path', () => {
    expect(visibleQuestions(config, qualified[slug]).length).toBeLessThanOrEqual(12);
  });
});

describe('installing the two funnels', () => {
  let db: PGlite; let client: any;
  beforeAll(async () => { db = await fullSchema({ supabaseGrants: true }); client = fakeSupabase(db); }, 180_000);
  afterAll(async () => { await db?.close(); });

  it('creates both as unpublished house funnels carrying the dataset, and does it only once', async () => {
    const first = await installPresetFunnels(client, null);
    expect(first.error).toBeUndefined(); expect(first.created.map((c) => c.slug).sort()).toEqual(['bathroom-remodel', 'kitchen-remodel']); expect(first.existing).toEqual([]);
    const rows = (await db.query<any>(`select slug, status, contractor_id, is_demo, config from public.funnels order by slug`)).rows;
    expect(rows.map((r) => [r.slug, r.status, r.contractor_id, r.is_demo])).toEqual([['bathroom-remodel', 'draft', null, false], ['kitchen-remodel', 'draft', null, false]]);
    expect(rows.every((r) => r.config.trackingPixels.metaPixelId === DATASET)).toBe(true);
    const again = await installPresetFunnels(client, null);
    expect(again.created).toEqual([]); expect(again.existing.sort()).toEqual(['Bathroom remodel', 'Kitchen remodel']);
    expect((await db.query<any>(`select count(*)::int as n from public.funnels`)).rows[0].n).toBe(2);
  });
  it('never overwrites a funnel someone already edited', async () => {
    await db.query(`update public.funnels set config = jsonb_set(config, '{thankYouPage,headline}', '"Custom"') where slug='kitchen-remodel'`);
    await installPresetFunnels(client, null);
    expect((await db.query<any>(`select config->'thankYouPage'->>'headline' as h from public.funnels where slug='kitchen-remodel'`)).rows[0].h).toBe('Custom');
  });
});
