/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';
import { FUNNEL_PRESETS, installPresetFunnels, presetConfig } from '@/lib/funnels/presets';
import { funnelSchema, inServiceArea, qualify, serviceAreaValid, validateAnswer, visibleQuestions, type Answers } from '@/lib/funnels/schema';

const DATASET = '29178560738497902';

const qualified: Record<string, Answers> = {
  'bathroom-remodel': { service: 'full_remodel', zip: '90210', homeowner: 'yes', timeline: '3_6_months', address: '12 Main St, Beverly Hills, CA' },
  'kitchen-remodel': { service: 'full_remodel', zip: '90210', homeowner: 'yes', timeline: '3_6_months', address: '12 Main St, Beverly Hills, CA' },
  'roof-replacement': { service: 'roof_replacement', zip: '90210', homeowner: 'yes', timeline: '3_6_months', address: '12 Main St, Beverly Hills, CA' },
};
/** A small job each funnel turns away (a bathroom repair, a kitchen appliance swap, a roof repair). */
const smallJob: Record<string, string> = { 'bathroom-remodel': 'repair', 'kitchen-remodel': 'appliances_flooring', 'roof-replacement': 'roof_repair' };

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
    ['a small repair / fixture swap', { service: smallJob[slug] }],
    ['a project outside the scope', { service: 'other' }],
  ])('does not qualify %s', (_label, change) => {
    expect(qualify(config, { ...qualified[slug], ...change })).toBe(false);
  });

  it('is just five questions: project, ZIP, whether they own the home, when they want to start, and the address', () => {
    expect(config.questions.map((q) => q.id)).toEqual(['service', 'zip', 'homeowner', 'timeline', 'address']);
    expect(visibleQuestions(config, qualified[slug]).map((q) => q.id)).toEqual(['service', 'zip', 'homeowner', 'timeline', 'address']);
    expect(visibleQuestions(config, { ...qualified[slug], homeowner: 'no' }).map((q) => q.id)).toEqual(['service', 'zip', 'homeowner']); // a renter is not asked for an address
    expect(config.qualificationRules.map((r) => r.question).sort()).toEqual(['homeowner', 'service']);
  });

  it('a renter is decided right away (not "still answering")', () => {
    expect(qualify(config, { service: qualified[slug].service, zip: '90210', homeowner: 'no' })).toBe(false);
  });

  it('is not decided until every shown question is answered', () => {
    expect(qualify(config, { service: qualified[slug].service, zip: '90210' })).toBeNull();
    expect(qualify(config, { service: qualified[slug].service, zip: '90210', homeowner: 'yes' })).toBeNull(); // still needs the address
  });

  it('asks how soon they want to start but does not turn anyone away for it', () => {
    for (const timeline of ['asap', '1_3_months', '3_6_months', 'researching']) expect(qualify(config, { ...qualified[slug], timeline })).toBe(true);
  });

  it('requires the address', () => {
    const address = config.questions.find((q) => q.id === 'address')!;
    expect(validateAnswer(address, '').ok).toBe(false);
    expect(validateAnswer(address, '12 Main St, Beverly Hills, CA').ok).toBe(true);
  });

  it('shows no more questions than needed on the qualified path', () => {
    expect(visibleQuestions(config, qualified[slug]).length).toBeLessThanOrEqual(5);
  });
});

describe('installing the two funnels', () => {
  let db: PGlite; let client: any;
  beforeAll(async () => { db = await fullSchema({ supabaseGrants: true }); client = fakeSupabase(db); }, 180_000);
  afterAll(async () => { await db?.close(); });

  it('creates each as an unpublished house funnel carrying the dataset, and does it only once', async () => {
    const first = await installPresetFunnels(client, null);
    expect(first.error).toBeUndefined(); expect(first.created.map((c) => c.slug).sort()).toEqual(['bathroom-remodel', 'kitchen-remodel', 'roof-replacement']); expect(first.existing).toEqual([]);
    const rows = (await db.query<any>(`select slug, status, contractor_id, is_demo, config from public.funnels order by slug`)).rows;
    expect(rows.map((r) => [r.slug, r.status, r.contractor_id, r.is_demo])).toEqual([['bathroom-remodel', 'draft', null, false], ['kitchen-remodel', 'draft', null, false], ['roof-replacement', 'draft', null, false]]);
    expect(rows.every((r) => r.config.trackingPixels.metaPixelId === DATASET)).toBe(true);
    const again = await installPresetFunnels(client, null);
    expect(again.created).toEqual([]); expect(again.existing.sort()).toEqual(['Bathroom remodel', 'Kitchen remodel', 'Roof replacement']);
    expect((await db.query<any>(`select count(*)::int as n from public.funnels`)).rows[0].n).toBe(3);
  });
  it('never overwrites a funnel someone already edited', async () => {
    await db.query(`update public.funnels set config = jsonb_set(config, '{thankYouPage,headline}', '"Custom"') where slug='kitchen-remodel'`);
    await installPresetFunnels(client, null);
    expect((await db.query<any>(`select config->'thankYouPage'->>'headline' as h from public.funnels where slug='kitchen-remodel'`)).rows[0].h).toBe('Custom');
  });
});
