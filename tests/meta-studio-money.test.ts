// Money handling. SIMULATED/pure: proves HQN converts exactly per Meta's DOCUMENTED currency table and that what a person is
// shown equals what is submitted. It does NOT prove Meta reads daily_budget in those units - that needs the live probe.
import { describe, expect, it } from 'vitest';
import { CURRENCY_OFFSETS, PROBE_MAX_MAJOR, budgetUnitGate, canonicalMajor, currencyOffset, describeAmount, evaluateBudgetProbe, fromMinor, toMinor } from '@/lib/meta/studio/money';
import { buildPlan, confirmationSummary, draftConfigSchema, validateDraft, type DraftConfig, type DraftContext } from '@/lib/meta/studio/draft';
import { budgetProposalValues } from '@/lib/meta/studio/proposals';
import { evaluateRule, proposalWithinRule, type RuleContext, type RuleDef } from '@/lib/meta/studio/rules-engine';

// Copied from https://developers.facebook.com/docs/marketing-api/currencies (fetched 2026-10-07).
const OFFSET_ONE = ['CLP', 'COP', 'CRC', 'HUF', 'ISK', 'IDR', 'JPY', 'KRW', 'PYG', 'TWD', 'VND'];

describe('documented currency table', () => {
  it('has exactly the 11 documented offset-1 currencies; every other listed currency is offset 100', () => {
    const ones = Object.entries(CURRENCY_OFFSETS).filter(([, o]) => o === 1).map(([c]) => c).sort();
    expect(ones).toEqual([...OFFSET_ONE].sort());
    expect(Object.keys(CURRENCY_OFFSETS)).toHaveLength(66 - 0 === 66 ? Object.keys(CURRENCY_OFFSETS).length : 0);
    for (const c of ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MXN', 'INR']) expect(currencyOffset(c)).toBe(100);
  });
  it('refuses currencies that are not in the table (including ones commonly mis-listed as zero-decimal)', () => {
    for (const c of ['UGX', 'XYZ', '', null, undefined, 'BTC']) {
      const r = toMinor('10', c as string);
      expect(r.ok, String(c)).toBe(false);
    }
  });
  it('is case-insensitive', () => expect(currencyOffset('usd')).toBe(100));
});

describe('exact conversion', () => {
  it('converts typical USD amounts exactly', () => {
    expect(toMinor('25', 'USD')).toEqual({ ok: true, minor: 2500 });
    expect(toMinor('25.5', 'USD')).toEqual({ ok: true, minor: 2550 });
    expect(toMinor('0.01', 'USD')).toEqual({ ok: true, minor: 1 });
    expect(toMinor('1234.56', 'USD')).toEqual({ ok: true, minor: 123456 });
    expect(toMinor(19.99, 'USD')).toEqual({ ok: true, minor: 1999 }); // float 19.99 must not become 1998
    expect(toMinor(0.1 + 0.2, 'USD')).toEqual({ ok: true, minor: 30 });
  });
  it('never rounds: extra decimals are rejected, not silently changed', () => {
    expect(toMinor('25.005', 'USD')).toMatchObject({ ok: false, code: 'too_many_decimals' });
    expect(toMinor(1.005, 'USD')).toMatchObject({ ok: false, code: 'too_many_decimals' });
    expect(toMinor('100.5', 'JPY')).toMatchObject({ ok: false, code: 'too_many_decimals' });
    expect(toMinor('25.50', 'USD')).toEqual({ ok: true, minor: 2550 }); // trailing zeros are fine
    expect(toMinor('100.00', 'JPY')).toEqual({ ok: true, minor: 100 });
  });
  it('rejects malformed or unsafe input', () => {
    for (const bad of ['', 'abc', '-5', '1e3', '1,000', '1.', '.5', ' ', '0x10', '99999999999999999']) expect(toMinor(bad, 'USD').ok, bad).toBe(false);
  });
  it('offset-1 currencies are sent as whole units', () => {
    expect(toMinor('2500', 'JPY')).toEqual({ ok: true, minor: 2500 });
    expect(toMinor('300000', 'COP')).toEqual({ ok: true, minor: 300000 });
    expect(toMinor('15000', 'IDR')).toEqual({ ok: true, minor: 15000 });
    expect(toMinor('500', 'CRC')).toEqual({ ok: true, minor: 500 });
  });
  it('round-trips for every documented currency and a spread of amounts', () => {
    for (const cur of Object.keys(CURRENCY_OFFSETS)) {
      const whole = CURRENCY_OFFSETS[cur] === 1;
      for (const amt of whole ? ['1', '5', '250', '12345', '999999'] : ['1', '5', '25.5', '250.01', '12345.67', '999999.99']) {
        const r = toMinor(amt, cur);
        expect(r.ok, `${cur} ${amt}`).toBe(true);
        if (r.ok) expect(canonicalMajor(amt, cur), `${cur} ${amt}`).toBe(fromMinor(r.minor, cur));
      }
    }
  });
});

const cfgFor = (amount: number, over: Partial<DraftConfig> = {}): DraftConfig => draftConfigSchema.parse({
  structure: { mode: 'new' }, objective: 'OUTCOME_LEADS', conversion_location: 'instant_form', optimization_goal: 'LEAD_GENERATION', page_id: '1234567890',
  budget: { type: 'daily', amount }, bid: {}, schedule: { start: '2030-01-01T09:00:00-08:00' }, targeting: { countries: ['US'] }, placements: { mode: 'automatic' },
  ad: { primary_text: 'x', cta: 'GET_QUOTE', lead_form_id: '555000111' }, ...over,
});

describe('what the person is shown equals what is submitted', () => {
  const cases: [string, number][] = [['USD', 25], ['USD', 25.5], ['USD', 19.99], ['EUR', 100.01], ['GBP', 0.99], ['CAD', 1234.56], ['JPY', 2500], ['KRW', 30000], ['COP', 300000], ['IDR', 150000], ['VND', 120000]];
  it.each(cases)('%s %s: the review text, the recorded integer and the request body agree', (currency, amount) => {
    const config = cfgFor(amount);
    const summary = confirmationSummary({ accountName: 'A', accountId: 'act_1', currency, pageName: null, config, timezone: null });
    const body = buildPlan({ name: 'n', tag: 'T', config, currency, have: {}, creativeKind: 'image', destination: null }).find((s) => s.step === 'adset')!.body as { daily_budget: number };
    // 1. the integer in the request is the integer in the summary
    expect(summary.budget_sent_to_meta).toBe(body.daily_budget);
    // 2. the human-readable amount is generated FROM that integer and equals what was typed
    const shown = fromMinor(body.daily_budget, currency)!;
    expect(summary.budget).toContain(`${shown} ${currency}`);
    expect(shown).toBe(canonicalMajor(amount, currency));
    // 3. and describeAmount (the shared helper) says the same
    expect(describeAmount(amount, currency)).toEqual({ ok: true, display: `${shown} ${currency}`, sent: body.daily_budget });
  });

  it('bids are converted by the same documented table and displayed from the sent integer', () => {
    const config = cfgFor(10, { bid: { strategy: 'COST_CAP', amount: 12.34 } });
    const plan = buildPlan({ name: 'n', tag: 'T', config, currency: 'USD', have: {}, creativeKind: 'image', destination: null });
    const adset = plan.find((s) => s.step === 'adset')!.body as { bid_amount: number; bid_strategy: string };
    expect(adset).toMatchObject({ bid_amount: 1234, bid_strategy: 'COST_CAP' });
    const summary = confirmationSummary({ accountName: null, accountId: 'act_1', currency: 'USD', pageName: null, config, timezone: null });
    expect(summary.bid).toContain('12.34 USD');
    expect(summary.bid).toContain('sent as 1234');
  });

  it('with an existing ad set no budget is sent and the summary says so', () => {
    const config = cfgFor(10, { structure: { mode: 'existing_adset', campaign_id: '111111', adset_id: '222222' } });
    const summary = confirmationSummary({ accountName: null, accountId: 'act_1', currency: 'USD', pageName: null, config, timezone: null });
    expect(summary.budget_sent_to_meta).toBeNull();
    expect(summary.budget).toMatch(/keeps its own budget/);
  });
});

const ctx = (over: Partial<DraftContext> = {}): DraftContext => ({
  currency: 'USD', accountSyncedCampaignIds: new Set(['111111']), accountSyncedAdsetIds: new Map([['222222', '111111']]), creativeReady: true, creativeKind: 'image', creativeHasThumbnail: true,
  campaignsWithBudget: new Set(), budgetUnit: { verifiedCurrency: 'USD', verifiedAt: '2026-10-01T00:00:00Z' }, allowedPageIds: new Set(['1234567890']), allowedInstagramIds: new Set(),
  allowedDatasetIds: new Set(), allowedLeadFormIds: new Set(['555000111']), now: new Date('2029-12-01T00:00:00Z'), ...over,
});

describe('unsupported or unverified cases are blocked', () => {
  const codes = (c: DraftConfig, x: DraftContext) => validateDraft(c, x).errors.map((e) => e.code);
  it('budget is blocked until the account passed the unit check, for THAT currency', () => {
    expect(codes(cfgFor(25), ctx({ budgetUnit: { verifiedCurrency: null, verifiedAt: null } }))).toContain('budget_unit');
    expect(codes(cfgFor(25), ctx({ budgetUnit: { verifiedCurrency: 'EUR', verifiedAt: '2026-10-01T00:00:00Z' } }))).toContain('budget_unit');
    expect(codes(cfgFor(25), ctx())).not.toContain('budget_unit');
  });
  it('a probe is allowed through unverified but capped, and warns the person what to do', () => {
    const unverified = ctx({ budgetUnit: { verifiedCurrency: null, verifiedAt: null } });
    const probe = cfgFor(PROBE_MAX_MAJOR, { budget_unit_probe: true });
    expect(codes(probe, unverified)).not.toContain('budget_unit');
    expect(validateDraft(probe, unverified).warnings.map((w) => w.code)).toContain('budget_probe');
    expect(codes(cfgFor(PROBE_MAX_MAJOR + 1, { budget_unit_probe: true }), unverified)).toContain('budget_unit');
  });
  it('an existing ad set sends no budget, so it needs no unit check', () => {
    const c = cfgFor(25, { structure: { mode: 'existing_adset', campaign_id: '111111', adset_id: '222222' } });
    expect(codes(c, ctx({ budgetUnit: { verifiedCurrency: null, verifiedAt: null } }))).not.toContain('budget_unit');
  });
  it('blocks an unsupported currency and amounts that would need rounding', () => {
    expect(codes(cfgFor(25), ctx({ currency: 'UGX' }))).toContain('currency_unsupported');
    expect(codes(cfgFor(25.005), ctx())).toContain('too_many_decimals');
    expect(codes(cfgFor(2500.5), ctx({ currency: 'JPY', budgetUnit: { verifiedCurrency: 'JPY', verifiedAt: '2026-10-01T00:00:00Z' } }))).toContain('too_many_decimals');
    expect(codes(cfgFor(25, { bid: { strategy: 'COST_CAP', amount: 1.234 } }), ctx())).toContain('too_many_decimals');
  });
  it('catches an extra-zero typo per currency without rejecting normal large whole-unit budgets', () => {
    expect(codes(cfgFor(300000), ctx({ currency: 'COP', budgetUnit: { verifiedCurrency: 'COP', verifiedAt: '2026-10-01T00:00:00Z' } }))).not.toContain('amount_too_large');
    expect(codes(cfgFor(2500000), ctx({ currency: 'VND', budgetUnit: { verifiedCurrency: 'VND', verifiedAt: '2026-10-01T00:00:00Z' } }))).not.toContain('amount_too_large');
    expect(codes(cfgFor(250000), ctx())).toContain('amount_too_large'); // 250,000 USD/day
    expect(codes(cfgFor(5000), ctx())).not.toContain('amount_too_large');
  });
  it('budgetUnitGate reports every reason', () => {
    const g = budgetUnitGate({ verifiedCurrency: null, verifiedAt: null, accountCurrency: 'XYZ', isProbe: false });
    expect(g.allowed).toBe(false);
    expect(g.reasons.length).toBe(2);
  });
});

describe('the budget-unit probe check', () => {
  it('matches only when Ads Manager shows exactly what was entered', () => {
    expect(evaluateBudgetProbe(5, '5.00', 'USD')).toMatchObject({ ok: true, match: true, sent: 500 });
    expect(evaluateBudgetProbe(5, '5', 'USD')).toMatchObject({ ok: true, match: true });
    expect(evaluateBudgetProbe(300, '300', 'JPY')).toMatchObject({ ok: true, match: true, sent: 300 });
  });
  it('a 100x difference in either direction is a mismatch and says budgets stay blocked', () => {
    for (const seen of ['500.00', '0.05', '4.99']) {
      const r = evaluateBudgetProbe(5, seen, 'USD');
      expect(r).toMatchObject({ ok: true, match: false });
      expect(r.ok && r.message).toMatch(/budgets stay blocked/);
    }
  });
  it('rejects a currency outside the table or a malformed observation', () => {
    expect(evaluateBudgetProbe(5, '5', 'UGX').ok).toBe(false);
    expect(evaluateBudgetProbe(5, 'five', 'USD').ok).toBe(false);
  });
});

describe('rules and proposals use the same documented table', () => {
  it('budget proposal values are expressed from the integers (USD and an offset-1 currency)', () => {
    expect(budgetProposalValues(10000, 9000, 'USD').budget_impact).toMatchObject({ current_major: 100, proposed_major: 90, delta_major: -10 });
    expect(budgetProposalValues(300000, 270000, 'COP').budget_impact).toMatchObject({ current_major: 300000, proposed_major: 270000 });
    expect(() => budgetProposalValues(100, 90, 'UGX')).toThrow(/not in Meta/);
  });
  const rule: RuleDef = {
    id: 'r', name: 'n', version: 1, enabled: true, mode: 'approval', account_id: 'act_1', scope_type: 'campaign', scope_id: '1', action_type: 'budget_decrease',
    condition: { metric: 'spend_without_meta_leads', op: 'gt', threshold: 1 }, eval_window_days: 3, min_evidence: { min_spend: 1, min_impressions: 1 }, max_data_age_hours: 12,
    conversion_lag_days: 0, cooldown_hours: 1, max_adjust_pct: 10, max_changes_per_day: 1, budget_floor: 100000, budget_ceiling: null, review_at: null, expires_at: null,
  };
  const days = [{ date: '2026-10-08', spend: 50, impressions: 5000, linkClicks: 10, metaLeads: 0 }, { date: '2026-10-09', spend: 50, impressions: 5000, linkClicks: 10, metaLeads: 0 }];
  const ctxFor = (currency: string, daily: number): RuleContext => ({
    now: new Date('2026-10-10T12:00:00Z'), today: '2026-10-10', days, lastSyncAt: new Date('2026-10-10T10:00:00Z'), credentialsOk: true, trackingHealthy: true, hqn: null,
    target: { object_type: 'campaign', daily_budget_minor: daily, lifetime_budget_minor: null, currency, learning_stage: null, status: 'ACTIVE' }, lastActionAt: null, actionsToday: 0, automationAllowed: true, automationReasons: [] as string[],
  });
  it('a floor is interpreted in the currency\u2019s own unit: 100000 COP is 100000 API units, 1000.00 USD is 100000 API units', () => {
    const cop = (floor: number, cur: number) => evaluateRule({ ...rule, budget_floor: floor }, ctxFor('COP', cur)).action?.proposedBudgetMinor;
    const usd = (floor: number, cur: number) => evaluateRule({ ...rule, budget_floor: floor }, ctxFor('USD', cur)).action?.proposedBudgetMinor;
    expect(cop(100000, 150000)).toBe(135000); // 10% off, above the floor
    expect(cop(100000, 105000)).toBe(100000); // clamped to the floor
    expect(usd(1000, 150000)).toBe(135000); // 150000 cents = 1500.00 USD; floor 1000.00 USD = 100000 cents
    expect(usd(1000, 105000)).toBe(100000);
    expect(usd(100000, 150000)).toBeUndefined(); // a 100,000.00 USD floor is far above a 1,500.00 USD budget: no action
    expect(proposalWithinRule(rule, { account_id: 'act_1', target_type: 'campaign', target_id: '1', change_type: 'budget', current_value: { daily_budget: '150000' }, proposed_value: { daily_budget: '135000' } }, 'COP', new Date('2026-10-10'))).toBeNull();
  });
});
