import { describe, expect, it } from 'vitest';
import { actionsToMap, addDays, costPer, freshness, parseRange, rangeBoundsUtc, reportedLeads, resolvePreset, rollup, zonedDate, zonedDayStart, type InsightRow } from '@/lib/meta/metrics';
import { activityCounts, cohortCounts, costsFromCohort, reconcile, sumCounts, type LeadFact, type OutcomeFact } from '@/lib/meta/hqn-metrics';

const row = (p: Partial<InsightRow>): InsightRow => ({ date: '2026-10-01', currency: 'USD', spend: 10, impressions: 1000, inline_link_clicks: 20, reach: 900, actions: {}, ...p });

describe('actions', () => {
  it('maps Meta actions and ignores malformed entries', () => {
    expect(actionsToMap([{ action_type: 'lead', value: '3' }, { action_type: 'lead', value: '2' }, { action_type: 'bad', value: 'x' }, { value: '1' }])).toEqual({ lead: 5 });
    expect(actionsToMap(undefined)).toEqual({});
  });
  it('reports leads from the total `lead` action, never adding the Instant Form subset on top', () => {
    expect(reportedLeads({ lead: 7, 'onsite_conversion.lead_grouped': 4 })).toBe(7);
  });
});

describe('rollup', () => {
  it('sums additive metrics and recomputes ratios from the sums', () => {
    const [r] = rollup([row({ spend: 10, impressions: 1000, inline_link_clicks: 10 }), row({ date: '2026-10-02', spend: 30, impressions: 3000, inline_link_clicks: 50, actions: { lead: 2 } })]);
    expect(r).toMatchObject({ spend: 40, impressions: 4000, linkClicks: 60, actions: { lead: 2 } });
    expect(r.ctr).toBeCloseTo(0.015); expect(r.cpm).toBeCloseTo(10); expect(r.cpc).toBeCloseTo(40 / 60);
  });
  it('never sums or averages reach: only a single ad on a single day shows it', () => {
    expect(rollup([row({}), row({ date: '2026-10-02' })], { singleAd: true })[0].reach).toBeNull();
    expect(rollup([row({}), row({ ad: 'b' } as never)])[0].reach).toBeNull();
    expect(rollup([row({ reach: 900 })], { singleAd: true })[0].reach).toBe(900);
  });
  it('keeps currencies apart', () => {
    const r = rollup([row({ spend: 10 }), row({ currency: 'CAD', spend: 99 })]);
    expect(r.map((x) => [x.currency, x.spend]).sort()).toEqual([['CAD', 99], ['USD', 10]]);
  });
  it('returns null ratios instead of dividing by zero', () => {
    const [r] = rollup([row({ impressions: 0, inline_link_clicks: 0 })]);
    expect([r.ctr, r.cpm, r.cpc]).toEqual([null, null, null]);
    expect(costPer(50, 0)).toBeNull();
    expect(costPer(50, 5)).toBe(10);
  });
});

describe('timezones and ranges', () => {
  it('computes the calendar day in the given timezone', () => {
    expect(zonedDate('2026-10-02T03:30:00Z', 'America/Los_Angeles')).toBe('2026-10-01');
    expect(zonedDate('2026-10-02T03:30:00Z', 'UTC')).toBe('2026-10-02');
  });
  it('finds day starts across DST changes (LA falls back 2026-11-01)', () => {
    expect(zonedDayStart('2026-10-31', 'America/Los_Angeles').toISOString()).toBe('2026-10-31T07:00:00.000Z');
    expect(zonedDayStart('2026-11-01', 'America/Los_Angeles').toISOString()).toBe('2026-11-01T07:00:00.000Z');
    expect(zonedDayStart('2026-11-02', 'America/Los_Angeles').toISOString()).toBe('2026-11-02T08:00:00.000Z');
    const b = rangeBoundsUtc({ since: '2026-11-01', until: '2026-11-01' }, 'America/Los_Angeles');
    expect((Date.parse(b.endIso) - Date.parse(b.startIso)) / 3_600_000).toBe(25); // the 25-hour day
  });
  it('resolves presets in the reporting timezone', () => {
    const now = new Date('2026-10-02T03:30:00Z'); // still Oct 1 in LA
    expect(resolvePreset('today', 'America/Los_Angeles', now)).toEqual({ since: '2026-10-01', until: '2026-10-01' });
    expect(resolvePreset('last_7d', 'America/Los_Angeles', now)).toEqual({ since: '2026-09-25', until: '2026-10-01' });
    expect(resolvePreset('last_month', 'UTC', now)).toEqual({ since: '2026-09-01', until: '2026-09-30' });
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('rejects malformed, inverted or huge ranges', () => {
    const now = new Date('2026-10-15T12:00:00Z');
    const fb = resolvePreset('last_30d', 'UTC', now);
    expect(parseRange('x', '2026-10-01', 'UTC', now)).toEqual(fb);
    expect(parseRange('2026-10-05', '2026-10-01', 'UTC', now)).toEqual(fb);
    expect(parseRange('2020-01-01', '2026-10-01', 'UTC', now)).toEqual(fb);
    expect(parseRange('2026-10-01', '2026-10-05', 'UTC', now)).toEqual({ since: '2026-10-01', until: '2026-10-05' });
  });
  it('flags missing and stale syncs', () => {
    const now = new Date('2026-10-02T12:00:00Z');
    expect(freshness(null, now)).toBe('never');
    expect(freshness('2026-10-02T00:00:00Z', now)).toBe('fresh');
    expect(freshness('2026-09-30T00:00:00Z', now)).toBe('stale');
  });
});

describe('HQN outcome metrics', () => {
  const lead = (id: string, over: Partial<LeadFact> = {}): LeadFact => ({ id, created_at: '2026-10-01T10:00:00Z', qualification_status: 'needs_qualification', campaign_id: 'c1', ad_set_id: 's1', ad_id: 'a1', ...over });
  const ev = (id: string, lead_id: string, outcome: string, occurred_at: string, over: Partial<OutcomeFact> = {}): OutcomeFact => ({ id, lead_id, outcome, occurred_at, amount: null, currency: null, corrects_id: null, ...over });
  const leads = [lead('L1', { qualification_status: 'qualified' }), lead('L2'), lead('L3', { ad_id: null, campaign_id: null, ad_set_id: null })];
  const events = [
    ev('e1', 'L1', 'qualified', '2026-10-02T10:00:00Z'),
    ev('e2', 'L1', 'appointment_booked', '2026-10-03T10:00:00Z'),
    ev('e3', 'L1', 'won', '2026-11-05T10:00:00Z', { amount: 12000, currency: 'USD' }),
    ev('e4', 'L2', 'won', '2026-10-04T10:00:00Z', { amount: 500, currency: 'USD' }),
    ev('e5', 'L2', 'correction', '2026-10-06T10:00:00Z', { corrects_id: 'e4' }),
  ];

  it('COHORT basis follows the leads acquired in the period, whenever the outcome happened', () => {
    const m = cohortCounts(leads, events, 'ad_id');
    expect(m.get('a1')).toMatchObject({ leads: 2, qualified: 1, appointments: 1, won: 1, wonValue: { USD: 12000 } });
    expect(m.get('__unattributed__')).toMatchObject({ leads: 1 });
  });
  it('a refunded/cancelled sale no longer counts as won', () => {
    expect(cohortCounts(leads, events, 'ad_id').get('a1')!.won).toBe(1);
  });
  it('ACTIVITY basis counts outcomes by when they occurred, not when the lead arrived', () => {
    const oct = activityCounts(leads, events, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z');
    expect(oct).toMatchObject({ leadsReceived: 3, qualified: 1, appointments: 1, won: 0 });
    const nov = activityCounts(leads, events, '2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z');
    expect(nov).toMatchObject({ leadsReceived: 0, won: 1, wonValue: { USD: 12000 } });
  });
  it('counts a won sale with no recorded value separately, never as $0 value', () => {
    const c = cohortCounts([lead('L9')], [ev('x', 'L9', 'won', '2026-10-05T00:00:00Z')], 'ad_id').get('a1')!;
    expect(c).toMatchObject({ won: 1, wonValue: {}, wonWithoutValue: 1 });
  });
  it('keeps won value per currency', () => {
    const t = sumCounts([{ leads: 1, qualified: 0, appointments: 0, won: 1, wonValue: { USD: 10 }, wonWithoutValue: 0 }, { leads: 1, qualified: 0, appointments: 0, won: 1, wonValue: { CAD: 5 }, wonWithoutValue: 0 }]);
    expect(t.wonValue).toEqual({ USD: 10, CAD: 5 });
  });
  it('computes cost per outcome only where the denominator exists', () => {
    expect(costsFromCohort(100, { leads: 4, qualified: 2, appointments: 0, won: 0, wonValue: {}, wonWithoutValue: 0 })).toEqual({ perLead: 25, perQualified: 50, perAppointment: null, perWon: null });
  });
  it('explains a Meta vs HQN lead discrepancy instead of forcing agreement', () => {
    const r = reconcile(10, 6, 3);
    expect(r.difference).toBe(4);
    expect(r.notes[0]).toMatch(/3 HQN lead/);
  });
});
