// SIMULATED: pure-logic tests with fixtures and a fake Meta. They prove HQN's rules, not Meta's behaviour.
import { describe, expect, it } from 'vitest';
import { evaluateRule, findRuleConflicts, ruleWindow, validateRuleDef, type InsightDay, type RuleContext, type RuleDef } from '@/lib/meta/studio/rules-engine';
import { applyProposal, budgetProposalValues, driftBetween, type ProposalRow, type ProposalStore } from '@/lib/meta/studio/proposals';
import { AUDIT_VERSION, runAudit, type AuditInput } from '@/lib/meta/studio/audit';
import type { MetaWriter, WriteResult } from '@/lib/meta/studio/write-api';

const NOW = new Date('2026-10-10T12:00:00Z');
const rule = (o: Partial<RuleDef> = {}): RuleDef => ({
  id: 'r1', name: 'Pause waste', version: 1, enabled: true, mode: 'approval', account_id: 'act_1', scope_type: 'campaign', scope_id: '111111',
  action_type: 'pause', condition: { metric: 'spend_without_meta_leads', op: 'gt', threshold: 50 }, eval_window_days: 7,
  min_evidence: { min_spend: 100, min_impressions: 1000 }, max_data_age_hours: 12, conversion_lag_days: 2, cooldown_hours: 72,
  max_adjust_pct: null, max_changes_per_day: 1, budget_floor: null, budget_ceiling: null, review_at: null, expires_at: null, ...o,
});
const days = (n: number, per: Partial<InsightDay> = {}): InsightDay[] => Array.from({ length: n }, (_, k) => ({
  date: new Date(Date.UTC(2026, 9, 8 - k)).toISOString().slice(0, 10), spend: 30, impressions: 3000, linkClicks: 60, metaLeads: 0, ...per,
}));
const ctx = (o: Partial<RuleContext> = {}): RuleContext => ({
  now: NOW, today: '2026-10-10', days: days(7), lastSyncAt: new Date('2026-10-10T08:00:00Z'), credentialsOk: true, trackingHealthy: true,
  hqn: { leads: 20, qualified: 4 }, target: { object_type: 'campaign', daily_budget_minor: 10000, lifetime_budget_minor: null, currency: 'USD', learning_stage: null, status: 'ACTIVE' },
  lastActionAt: null, actionsToday: 0, automationAllowed: true, automationReasons: [], ...o,
});

describe('rule window', () => {
  it('excludes the conversion-lag days', () => expect(ruleWindow({ eval_window_days: 7, conversion_lag_days: 2 }, '2026-10-10')).toEqual({ since: '2026-10-02', until: '2026-10-08' }));
});

describe('rule evaluation', () => {
  it('triggers a pause proposal when the owner-set condition is met with enough evidence', () => {
    const r = evaluateRule(rule(), ctx());
    expect(r.outcome).toBe('triggered');
    expect(r.action).toMatchObject({ type: 'pause', execute: false }); // approval mode never executes by itself
  });
  it('does nothing without minimum evidence (spend and impressions)', () => {
    expect(evaluateRule(rule({ min_evidence: { min_spend: 10_000, min_impressions: 1000 } }), ctx()).outcome).toBe('insufficient_evidence');
    expect(evaluateRule(rule(), ctx({ days: [] })).outcome).toBe('insufficient_evidence');
  });
  it('does not treat days with missing spend as zero', () => {
    const r = evaluateRule(rule(), ctx({ days: days(7).map((d, k) => (k < 3 ? { ...d, spend: null } : d)) }));
    expect(r.reasons.join(' ')).toMatch(/no spend figure/);
  });
  it('is suspended when data is stale, tracking is unhealthy/unknown, or credentials fail', () => {
    expect(evaluateRule(rule(), ctx({ lastSyncAt: new Date('2026-10-08T00:00:00Z') })).outcome).toBe('suspended');
    expect(evaluateRule(rule(), ctx({ trackingHealthy: false })).outcome).toBe('suspended');
    expect(evaluateRule(rule(), ctx({ trackingHealthy: null })).outcome).toBe('suspended');
    expect(evaluateRule(rule(), ctx({ credentialsOk: false })).outcome).toBe('suspended');
    expect(evaluateRule(rule(), ctx({ lastSyncAt: null })).outcome).toBe('suspended');
  });
  it('never falls back to clicks/leads when quality data is missing for a qualified-lead rule', () => {
    const q = rule({ condition: { metric: 'cost_per_qualified_lead', op: 'gt', threshold: 100 }, min_evidence: { min_spend: 100, min_impressions: 1000, min_leads: 10 } });
    const none = evaluateRule(q, ctx({ hqn: null }));
    expect(none.outcome).toBe('insufficient_evidence');
    expect(none.reasons.join(' ')).toMatch(/will not fall back/);
    expect(evaluateRule(q, ctx({ hqn: { leads: 3, qualified: 0 } })).outcome).toBe('insufficient_evidence');
    expect(evaluateRule(q, ctx({ hqn: { leads: 20, qualified: 0 } })).outcome).toBe('triggered'); // genuinely zero qualified
  });
  it('honours cooldown and the per-day limit', () => {
    expect(evaluateRule(rule(), ctx({ lastActionAt: new Date('2026-10-09T12:00:00Z') })).outcome).toBe('cooldown');
    expect(evaluateRule(rule(), ctx({ actionsToday: 1 })).outcome).toBe('limit_reached');
  });
  it('expired rules do not act; auto rules need an automation gate and an in-date review', () => {
    expect(evaluateRule(rule({ expires_at: '2026-10-01T00:00:00Z' }), ctx()).outcome).toBe('expired');
    const auto = rule({ mode: 'auto', expires_at: '2027-01-01T00:00:00Z' });
    expect(evaluateRule(auto, ctx({ automationAllowed: false, automationReasons: ['HQN automation is stopped globally.'] })).outcome).toBe('suspended');
    expect(evaluateRule({ ...auto, review_at: '2026-10-01T00:00:00Z' }, ctx()).outcome).toBe('suspended');
    expect(evaluateRule(auto, ctx()).action?.execute).toBe(true);
  });
  it('bounds budget decreases by max_adjust_pct and the floor, and respects budget ownership', () => {
    const dec = rule({ action_type: 'budget_decrease', max_adjust_pct: 20, budget_floor: 90, scope_type: 'adset', scope_id: '222222' });
    const t = { object_type: 'adset' as const, daily_budget_minor: 10000, lifetime_budget_minor: null, currency: 'USD', learning_stage: 'LEARNING', status: 'ACTIVE' };
    const r = evaluateRule(dec, ctx({ target: t }));
    expect(r.action).toMatchObject({ proposedBudgetMinor: 9000, currentBudgetMinor: 10000 }); // 20% would be 8000 but floor is $90
    expect(r.action?.learningNote).toMatch(/learning/i);
    expect(evaluateRule(dec, ctx({ target: { ...t, campaignOwnsBudget: true } })).outcome).toBe('suspended');
    expect(evaluateRule(dec, ctx({ target: { ...t, daily_budget_minor: null, lifetime_budget_minor: 50000 } })).reasons.join(' ')).toMatch(/Lifetime/);
  });
  it('never auto-executes a budget increase', () => {
    const inc = rule({ mode: 'auto', expires_at: '2027-01-01T00:00:00Z', action_type: 'budget_increase', max_adjust_pct: 10, budget_ceiling: 500 });
    expect(evaluateRule(inc, ctx()).action?.execute).toBe(false);
    expect(validateRuleDef({ ...inc, scope_type: 'campaign', scope_id: '1' }).join(' ')).toMatch(/Automatic budget increases are not allowed/);
  });
});

describe('rule definition + conflicts', () => {
  it('requires bounded auto rules and real evidence minimums', () => {
    const errs = validateRuleDef({ ...rule({ mode: 'auto', expires_at: null, min_evidence: { min_spend: 0, min_impressions: 0 } }) });
    expect(errs.join(' ')).toMatch(/expiry/);
    expect(errs.join(' ')).toMatch(/Minimum spend/);
    expect(validateRuleDef({ ...rule({ action_type: 'budget_decrease', max_adjust_pct: null }) }).join(' ')).toMatch(/maximum adjustment/);
  });
  it('detects overlapping budget rules and pause-vs-budget overlap across the campaign/ad set hierarchy', () => {
    const h = { adsetToCampaign: new Map([['222222', '111111']]) };
    const a = rule({ id: 'a', action_type: 'budget_decrease', max_adjust_pct: 10, scope_type: 'campaign', scope_id: '111111' });
    const b = rule({ id: 'b', action_type: 'budget_decrease', max_adjust_pct: 10, scope_type: 'adset', scope_id: '222222' });
    const c = rule({ id: 'c', action_type: 'pause', scope_type: 'account', scope_id: null });
    expect(findRuleConflicts([a, b], h)).toHaveLength(1);
    expect(findRuleConflicts([a, c], h)).toHaveLength(1);
    expect(findRuleConflicts([a, { ...b, scope_id: '999999' }], h)).toHaveLength(0);
    expect(findRuleConflicts([a, { ...b, enabled: false }], h)).toHaveLength(0);
    expect(findRuleConflicts([rule({ id: 'n', action_type: 'notify' }), c], h)).toHaveLength(0);
  });
});

// ---- proposals ----------------------------------------------------------------------------------------------
class FakeWriter implements MetaWriter {
  live: Record<string, unknown> = { status: 'ACTIVE', effective_status: 'ACTIVE', daily_budget: '10000', lifetime_budget: undefined };
  writes: Record<string, unknown>[] = [];
  failWrite: 'none' | 'reject' | 'ambiguous' = 'none';
  failRead = false;
  async post<T>(_p: string, body: Record<string, unknown>): Promise<WriteResult<T>> {
    if (this.failWrite === 'reject') return { ok: false, ambiguous: false, failure: { kind: 'invalid', retryable: false, httpStatus: 400, code: 100, subcode: null, message: 'bad', fbtraceId: null } };
    if (this.failWrite === 'ambiguous') return { ok: false, ambiguous: true, failure: { kind: 'transient', retryable: true, httpStatus: null, code: null, subcode: null, message: 'timeout', fbtraceId: null } };
    this.writes.push(body);
    return { ok: true, data: { success: true } as T };
  }
  async get<T>() {
    if (this.failRead) return { ok: false as const, failure: { kind: 'auth' as const, retryable: false, httpStatus: 401, code: 190, subcode: null, message: 'token expired', fbtraceId: null } };
    return { ok: true as const, data: this.live as T };
  }
}
class FakeStore implements ProposalStore {
  claimed = false; final: { status: string; error_message?: string | null; previous_state?: unknown } | null = null; expected: unknown = null; logs: string[] = [];
  async claim() { if (this.claimed) return false; this.claimed = true; return true; }
  async finish(_id: string, patch: { status: string; error_message?: string | null; previous_state?: unknown }) { this.final = patch; }
  async recordExpected(_t: unknown, f: Record<string, unknown>) { this.expected = f; }
  async log(e: { action: string }) { this.logs.push(e.action); }
}
const proposal = (o: Partial<ProposalRow> = {}): ProposalRow => ({
  id: 'p1', account_id: 'act_1', target_type: 'campaign', target_id: '111111', change_type: 'pause',
  current_value: { status: 'ACTIVE' }, proposed_value: { status: 'PAUSED' }, status: 'approved', approved_by: 'user-1', auto_approved_by_rule: null,
  expires_at: '2026-10-20T00:00:00Z', ...o,
});

describe('applying proposals', () => {
  it('re-checks live state, writes only the proposed change, and records previous state + provider result', async () => {
    const w = new FakeWriter(); const s = new FakeStore();
    const r = await applyProposal(proposal(), { writer: w, store: s, now: NOW });
    expect(r.outcome).toBe('applied');
    expect(w.writes).toEqual([{ status: 'PAUSED' }]);
    expect(s.final).toMatchObject({ status: 'applied', previous_state: expect.objectContaining({ status: 'ACTIVE' }) });
    expect(s.expected).toEqual({ status: 'PAUSED' });
    expect(s.logs).toContain('proposal.applied');
  });
  it('marks the proposal stale and writes nothing when Meta changed since review (Ads Manager edit)', async () => {
    const w = new FakeWriter(); w.live.status = 'PAUSED';
    const s = new FakeStore();
    const r = await applyProposal(proposal(), { writer: w, store: s, now: NOW });
    expect(r.outcome).toBe('stale');
    expect(w.writes).toHaveLength(0);
    expect(s.final?.status).toBe('stale');
  });
  it('requires approval, and a human for budget increases', async () => {
    const w = new FakeWriter();
    expect((await applyProposal(proposal({ approved_by: null }), { writer: w, store: new FakeStore(), now: NOW })).outcome).toBe('not_approved');
    const v = budgetProposalValues(10000, 12000, 'USD');
    const inc = proposal({ change_type: 'budget', ...v, approved_by: null, auto_approved_by_rule: 'rule-1' });
    expect((await applyProposal(inc, { writer: w, store: new FakeStore(), now: NOW })).outcome).toBe('not_approved');
    expect(w.writes).toHaveLength(0);
    const ok = await applyProposal({ ...inc, approved_by: 'user-1' }, { writer: w, store: new FakeStore(), now: NOW });
    expect(ok.outcome).toBe('applied');
    expect(w.writes).toEqual([{ daily_budget: '12000' }]);
  });
  it('cannot be applied twice and ignores expired proposals', async () => {
    const w = new FakeWriter(); const s = new FakeStore();
    await applyProposal(proposal(), { writer: w, store: s, now: NOW });
    expect((await applyProposal(proposal(), { writer: w, store: s, now: NOW })).outcome).toBe('not_claimable');
    expect((await applyProposal(proposal({ expires_at: '2026-10-01T00:00:00Z' }), { writer: new FakeWriter(), store: new FakeStore(), now: NOW })).outcome).toBe('expired');
  });
  it('fails closed with a clear message on credential failure or an unconfirmed write', async () => {
    const w1 = new FakeWriter(); w1.failRead = true; const s1 = new FakeStore();
    expect((await applyProposal(proposal(), { writer: w1, store: s1, now: NOW })).outcome).toBe('failed');
    expect(s1.final?.error_message).toMatch(/Could not re-check/);
    const w2 = new FakeWriter(); w2.failWrite = 'ambiguous'; const s2 = new FakeStore();
    await applyProposal(proposal(), { writer: w2, store: s2, now: NOW });
    expect(s2.final?.status).toBe('failed');
    expect(s2.final?.error_message).toMatch(/did not confirm/);
  });
  it('drift ignores key order but catches value changes', () => {
    expect(driftBetween({ a: { x: 1, y: 2 } }, { a: { y: 2, x: 1 } })).toEqual([]);
    expect(driftBetween({ daily_budget: '10000' }, { daily_budget: '9000' })).toHaveLength(1);
  });
});

// ---- audit ---------------------------------------------------------------------------------------------------------
const audit = (o: Partial<AuditInput> = {}): AuditInput => ({
  now: NOW, range: { since: '2026-09-01', until: '2026-09-30' }, tz: 'America/Los_Angeles', accountId: 'act_1', accountName: 'Pool Masters', currency: 'USD',
  lastSyncAt: new Date('2026-10-10T08:00:00Z'), delivery: { mode: 'off', datasetId: null, accepted: 0, failed: 0, pending: 0, skipped: 0 },
  campaigns: [{ id: '111111', name: 'Spring', objective: 'OUTCOME_LEADS', effective_status: 'ACTIVE' }],
  adsets: [{ id: '222222', campaign_id: '111111', effective_status: 'ACTIVE' }], ads: [{ id: '333333', adset_id: '222222', effective_status: 'ACTIVE' }],
  state: new Map(), insights: [{ ad_id: '333333', campaign_id: '111111', date: '2026-09-10', spend: 400, impressions: 50000, inline_link_clicks: 900, actions: { lead: 20 } }],
  leads: [{ id: 'l1', created_at: '2026-09-05T18:00:00Z', qualification_status: 'qualified', campaign_id: '111111', ad_set_id: '222222', ad_id: '333333' }, { id: 'l2', created_at: '2026-09-06T18:00:00Z', qualification_status: 'not_qualified', campaign_id: '111111', ad_set_id: '222222', ad_id: null }],
  outcomes: [], thresholds: {}, ...o,
});

describe('audit', () => {
  it('is versioned and never invents a score', () => {
    const r = runAudit(audit());
    expect(r.version).toBe(AUDIT_VERSION);
    expect(JSON.stringify(r)).not.toMatch(/"score"/);
  });
  it('marks unsupported checks Not assessed instead of guessing', () => {
    const byId = (id: string) => runAudit(audit()).findings.find((f) => f.control_id === id)!;
    for (const id of ['M03', 'M04', 'M28', 'H-C1', 'H-F1']) expect(byId(id).status).toBe('not_assessed');
  });
  it('does not grade controls that need an owner threshold, and lists which thresholds are missing', () => {
    const r = runAudit(audit());
    expect(r.findings.find((f) => f.control_id === 'H-L1')!.status).toBe('not_assessed');
    expect(r.summary.thresholds_missing.length).toBeGreaterThan(0);
  });
  it('grades against owner thresholds and offers a reviewable pause hint only with evidence', () => {
    const r = runAudit(audit({ thresholds: { target_cost_per_lead: 10, min_spend_for_judgement: 100 } }));
    const l1 = r.findings.find((f) => f.control_id === 'H-L1')!;
    expect(l1.status).toBe('attention');
    expect(l1.kind).toBe('hypothesis');
    const hint = r.findings.find((f) => f.proposal)?.proposal;
    expect(hint).toMatchObject({ change_type: 'pause', target_id: '111111' });
    expect(runAudit(audit({ thresholds: { target_cost_per_lead: 100, min_spend_for_judgement: 100 } })).findings.find((f) => f.control_id === 'H-L1')!.status).toBe('pass');
  });
  it('every actionable finding carries observation, data, why, action, confidence, limitations and an evaluation', () => {
    const r = runAudit(audit({ thresholds: { target_cost_per_lead: 10, min_spend_for_judgement: 100 }, lastSyncAt: null }));
    for (const f of r.findings.filter((x) => x.proposed_action)) {
      expect(f.observation).toBeTruthy(); expect(f.why_it_matters).toBeTruthy(); expect(f.confidence).toBeTruthy(); expect(f.evaluation).toBeTruthy(); expect(f.data).toBeTruthy();
    }
    expect(r.findings.find((f) => f.control_id === 'M10')!.status).toBe('fail');
    expect(r.summary.next_actions.length).toBeLessThanOrEqual(3);
  });
  it('refuses to judge lead quality on immature cohorts', () => {
    const young = audit({ now: new Date('2026-09-08T00:00:00Z'), range: { since: '2026-09-01', until: '2026-09-07' } });
    const q = runAudit(young).findings.find((f) => f.control_id === 'H-Q1')!;
    expect(q.status).toBe('not_assessed');
  });
  it('M02 says acceptance is not attribution', () => {
    const r = runAudit(audit({ delivery: { mode: 'live', datasetId: '123456', accepted: 4, failed: 0, pending: 0, skipped: 0 } }));
    expect(r.findings.find((f) => f.control_id === 'M02')!.observation).toMatch(/not that it matched or used/);
  });
});
