import { addDays } from '@/lib/meta/metrics';

/**
 * Optimization rule evaluation. Pure: the server layer loads the inputs and persists the outcome.
 *
 * Design rules (from the product brief), each enforced here and covered by tests/meta-studio-rules.test.ts:
 *  - Thresholds are owner-defined per rule. There are no built-in "winning ad" numbers.
 *  - Rules look only at settled data: the most recent `conversion_lag_days` are excluded from the window.
 *  - A rule never acts without minimum evidence, fresh data, healthy tracking and working credentials. When any
 *    is missing it is SUSPENDED (with the reasons) - it never degrades to a different metric. In particular a
 *    rule written on qualified leads does not fall back to clicks or Meta-reported leads when quality data is
 *    missing.
 *  - Cooldown and a per-day change limit apply per target; budget changes are bounded by max_adjust_pct and an
 *    explicit floor/ceiling, respect which object owns the budget, and lifetime budgets are never auto-adjusted.
 *  - 'recommend' only records; 'approval' creates a proposal a human must approve; 'auto' may execute only when the
 *    automation gate (global stop + per-account switch + write gate) allows it - otherwise it is suspended.
 *  - Stopping HQN automation does not pause anything already running in Meta.
 */

export type RuleMode = 'recommend' | 'approval' | 'auto';
export type RuleAction = 'notify' | 'pause' | 'budget_decrease' | 'budget_increase';
export type RuleMetric = 'cost_per_meta_lead' | 'cost_per_qualified_lead' | 'spend_without_meta_leads' | 'link_ctr';

export type RuleDef = {
  id: string; name: string; version: number; enabled: boolean; mode: RuleMode;
  account_id: string; scope_type: 'account' | 'campaign' | 'adset'; scope_id: string | null;
  action_type: RuleAction;
  condition: { metric: RuleMetric; op: 'gt' | 'lt'; threshold: number };
  eval_window_days: number;
  min_evidence: { min_spend: number; min_impressions: number; min_leads?: number };
  max_data_age_hours: number; conversion_lag_days: number; cooldown_hours: number;
  max_adjust_pct: number | null; max_changes_per_day: number;
  budget_floor: number | null; budget_ceiling: number | null;
  review_at: string | null; expires_at: string | null;
};

export type InsightDay = { date: string; spend: number | null; impressions: number | null; linkClicks: number | null; metaLeads: number | null };
export type TargetState = {
  object_type: 'campaign' | 'adset';
  daily_budget_minor: number | null; lifetime_budget_minor: number | null;
  currency: string; learning_stage: string | null; status: string | null;
  /** Budget owner for this target when it is an ad set: the campaign may own it instead. */
  campaignOwnsBudget?: boolean;
};

export type RuleContext = {
  now: Date;
  today: string; // account-timezone date YYYY-MM-DD
  days: InsightDay[]; // daily rows for the target scope (any range; filtered here)
  lastSyncAt: Date | null;
  credentialsOk: boolean;
  /** null = unknown (treated as unhealthy for rules that depend on conversion data) */
  trackingHealthy: boolean | null;
  /** HQN cohort for leads acquired in the (lag-adjusted) window; null when not loadable. */
  hqn: { leads: number; qualified: number } | null;
  target: TargetState | null;
  lastActionAt: Date | null;
  actionsToday: number;
  automationAllowed: boolean; // checkAutomationGate().allowed
  automationReasons: string[];
};

export type Outcome = 'triggered' | 'no_action' | 'suspended' | 'insufficient_evidence' | 'cooldown' | 'limit_reached' | 'expired';
export type Evaluation = {
  outcome: Outcome;
  reasons: string[];
  metrics: Record<string, number | string | null>;
  window: { since: string; until: string };
  /** Present only when outcome === 'triggered'. */
  action?: {
    type: RuleAction;
    execute: boolean; // true = may be applied without a human click (mode auto and gate open)
    proposedBudgetMinor?: number;
    currentBudgetMinor?: number;
    learningNote?: string;
  };
};

/** Settled window: ends `conversion_lag_days` before today; `eval_window_days` long. */
export function ruleWindow(rule: Pick<RuleDef, 'eval_window_days' | 'conversion_lag_days'>, today: string) {
  const until = addDays(today, -rule.conversion_lag_days);
  const since = addDays(until, -(rule.eval_window_days - 1));
  return { since, until };
}

const sum = (xs: (number | null)[]) => {
  let t = 0, n = 0;
  for (const x of xs) if (x != null) { t += x; n++; }
  return { total: n ? t : null, missing: xs.length - n };
};

export function evaluateRule(rule: RuleDef, ctx: RuleContext): Evaluation {
  const window = ruleWindow(rule, ctx.today);
  const base = (outcome: Outcome, reasons: string[], metrics: Evaluation['metrics'] = {}): Evaluation => ({ outcome, reasons, metrics, window });

  if (rule.expires_at && new Date(rule.expires_at) <= ctx.now) return base('expired', ['This rule passed its expiry date and no longer acts. Review and extend it deliberately.']);

  // ---- health suspensions (apply to every mode: bad data makes bad recommendations too) ----
  const suspend: string[] = [];
  if (!ctx.credentialsOk) suspend.push('Meta credentials are failing; HQN cannot read or change this account.');
  if (!ctx.lastSyncAt) suspend.push('No successful Meta data sync yet.');
  else {
    const ageH = (ctx.now.getTime() - ctx.lastSyncAt.getTime()) / 3_600_000;
    if (ageH > rule.max_data_age_hours) suspend.push(`Meta data is ${ageH.toFixed(1)}h old; this rule requires data under ${rule.max_data_age_hours}h.`);
  }
  const usesConversionData = rule.condition.metric === 'cost_per_meta_lead' || rule.condition.metric === 'cost_per_qualified_lead' || rule.condition.metric === 'spend_without_meta_leads';
  if (usesConversionData && ctx.trackingHealthy !== true) suspend.push(ctx.trackingHealthy === false ? 'Conversion tracking is reporting problems.' : 'Conversion tracking health is unknown.');
  if (rule.mode === 'auto' && !ctx.automationAllowed) suspend.push(...(ctx.automationReasons.length ? ctx.automationReasons : ['Automation is not allowed for this account.']));
  if (rule.mode === 'auto' && rule.review_at && new Date(rule.review_at) <= ctx.now) suspend.push('The review date has passed; a person must re-confirm this rule before it can act automatically.');
  if (rule.action_type !== 'notify' && !ctx.target) suspend.push('The target is not in the latest Meta sync.');
  if (suspend.length) return base('suspended', suspend);

  // ---- evidence in the settled window -------------------------------------------------------------
  const inWin = ctx.days.filter((d) => d.date >= window.since && d.date <= window.until);
  const spend = sum(inWin.map((d) => d.spend));
  const impressions = sum(inWin.map((d) => d.impressions));
  const clicks = sum(inWin.map((d) => d.linkClicks));
  const leads = sum(inWin.map((d) => d.metaLeads));
  const metrics: Evaluation['metrics'] = { spend: spend.total, impressions: impressions.total, link_clicks: clicks.total, meta_leads: leads.total, window_since: window.since, window_until: window.until, rows: inWin.length };

  const need: string[] = [];
  if (spend.total == null || spend.total < rule.min_evidence.min_spend) need.push(`Spend in the window is ${spend.total ?? 'unknown'}; this rule needs at least ${rule.min_evidence.min_spend}.`);
  if (impressions.total == null || impressions.total < rule.min_evidence.min_impressions) need.push(`Impressions in the window are ${impressions.total ?? 'unknown'}; this rule needs at least ${rule.min_evidence.min_impressions}.`);
  if (spend.missing > 0 && spend.total != null) need.push(`${spend.missing} day(s) in the window have no spend figure; missing days are not treated as zero.`);

  let value: number | null = null;
  switch (rule.condition.metric) {
    case 'link_ctr':
      value = clicks.total != null && impressions.total ? clicks.total / impressions.total : null;
      break;
    case 'cost_per_meta_lead':
      if (leads.total == null) need.push('Meta reported no lead figures for this window.');
      else value = leads.total === 0 ? Infinity : (spend.total ?? 0) / leads.total;
      break;
    case 'spend_without_meta_leads':
      if (leads.total == null) need.push('Meta reported no lead figures for this window.');
      else value = leads.total === 0 ? (spend.total ?? 0) : 0;
      break;
    case 'cost_per_qualified_lead': {
      // Quality-based rule: NEVER falls back to another metric when quality data is missing.
      const minLeads = rule.min_evidence.min_leads ?? 1;
      if (!ctx.hqn) need.push('HQN lead-quality data could not be loaded, so a qualified-lead rule cannot be judged. It will not fall back to clicks or form fills.');
      else if (ctx.hqn.leads < minLeads) need.push(`Only ${ctx.hqn.leads} HQN lead(s) in the window; this rule needs at least ${minLeads} before judging lead quality.`);
      else value = ctx.hqn.qualified === 0 ? Infinity : (spend.total ?? 0) / ctx.hqn.qualified;
      metrics.hqn_leads = ctx.hqn?.leads ?? null;
      metrics.hqn_qualified = ctx.hqn?.qualified ?? null;
      break;
    }
  }
  metrics.value = value === Infinity ? 'no results' : value;
  if (need.length) return base('insufficient_evidence', need, metrics);

  // ---- cooldown / frequency ---------------------------------------------------------------------------
  if (ctx.lastActionAt && ctx.now.getTime() - ctx.lastActionAt.getTime() < rule.cooldown_hours * 3_600_000) {
    return base('cooldown', [`Last change on this target was ${((ctx.now.getTime() - ctx.lastActionAt.getTime()) / 3_600_000).toFixed(1)}h ago; cooldown is ${rule.cooldown_hours}h.`], metrics);
  }
  if (ctx.actionsToday >= rule.max_changes_per_day) return base('limit_reached', [`Already made ${ctx.actionsToday} change(s) today; the limit is ${rule.max_changes_per_day}.`], metrics);

  // ---- condition --------------------------------------------------------------------------------------------
  const hit = value != null && (rule.condition.op === 'gt' ? value > rule.condition.threshold : value < rule.condition.threshold);
  if (!hit) return base('no_action', [`Condition not met (${rule.condition.metric} ${value === Infinity ? 'has no results' : value?.toFixed(4)} vs ${rule.condition.op === 'gt' ? '>' : '<'} ${rule.condition.threshold}).`], metrics);

  // ---- build the action ---------------------------------------------------------------------------------------
  const execute = rule.mode === 'auto' && rule.action_type !== 'notify' && ctx.automationAllowed;
  if (rule.action_type === 'notify' || rule.action_type === 'pause') {
    return { outcome: 'triggered', reasons: ['Condition met.'], metrics, window, action: { type: rule.action_type, execute } };
  }

  // budget actions
  const t = ctx.target!;
  if (t.campaignOwnsBudget) return base('suspended', ['The campaign owns this budget; use a campaign-scoped rule instead of an ad-set rule.'], metrics);
  if (t.daily_budget_minor == null) return base('suspended', [t.lifetime_budget_minor != null ? 'Lifetime budgets are not adjusted by rules.' : 'This target has no budget of its own to adjust.'], metrics);
  if (rule.max_adjust_pct == null) return base('suspended', ['No maximum adjustment is configured.'], metrics);
  const cur = t.daily_budget_minor;
  const dir = rule.action_type === 'budget_increase' ? 1 : -1;
  let next = Math.round(cur * (1 + (dir * rule.max_adjust_pct) / 100));
  if (rule.budget_floor != null) next = Math.max(next, Math.round(rule.budget_floor * minorFactor(t.currency)));
  if (rule.budget_ceiling != null) next = Math.min(next, Math.round(rule.budget_ceiling * minorFactor(t.currency)));
  if (dir === 1 && next < cur) next = cur;
  if (dir === -1 && next > cur) next = cur;
  if (next === cur) return base('no_action', ['Already at the configured floor/ceiling.'], metrics);
  return {
    outcome: 'triggered', reasons: ['Condition met.'], metrics, window,
    action: {
      type: rule.action_type, execute: execute && dir === -1, // budget INCREASES are never executed without a human approval
      proposedBudgetMinor: next, currentBudgetMinor: cur,
      learningNote: t.learning_stage && t.learning_stage !== 'SUCCESS' ? `This ad set's learning status is ${t.learning_stage}; changing budget can affect learning and delivery.` : 'Large budget changes can affect delivery and learning; results are not guaranteed.',
    },
  };
}

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'HUF', 'TWD', 'UGX', 'PYG']);
const minorFactor = (cur: string) => (ZERO_DECIMAL.has(cur.toUpperCase()) ? 1 : 100);

// ---- conflicts between rules ---------------------------------------------------------------------------
export type Hierarchy = { adsetToCampaign: Map<string, string> };
const covers = (r: RuleDef, other: RuleDef, h: Hierarchy): boolean => {
  if (r.account_id !== other.account_id) return false;
  if (r.scope_type === 'account') return true;
  if (r.scope_type === other.scope_type) return r.scope_id === other.scope_id;
  if (r.scope_type === 'campaign' && other.scope_type === 'adset') return h.adsetToCampaign.get(other.scope_id!) === r.scope_id;
  return false;
};
const kind = (a: RuleAction) => (a === 'notify' ? 'notify' : a === 'pause' ? 'pause' : 'budget');

/**
 * Two enabled rules conflict when their scopes overlap and both would act on the same thing (two budget rules,
 * or a pause rule and a budget rule). Notify-only rules never conflict. The caller refuses to enable a rule that
 * has conflicts and the tick skips any rule that does.
 */
export function findRuleConflicts(rules: RuleDef[], h: Hierarchy): { a: string; b: string; reason: string }[] {
  const live = rules.filter((r) => r.enabled && r.action_type !== 'notify');
  const out: { a: string; b: string; reason: string }[] = [];
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      if (!(covers(a, b, h) || covers(b, a, h))) continue;
      if (kind(a.action_type) === 'budget' && kind(b.action_type) === 'budget') out.push({ a: a.id, b: b.id, reason: 'Both rules adjust budgets on overlapping targets.' });
      else if (kind(a.action_type) !== kind(b.action_type)) out.push({ a: a.id, b: b.id, reason: 'A pause rule and a budget rule overlap on the same target.' });
      else if (a.action_type === b.action_type) out.push({ a: a.id, b: b.id, reason: 'Two rules with the same action overlap on the same target.' });
    }
  }
  return out;
}

/**
 * Rule definitions are validated before saving. Auto mode must be bounded: expiry, a cap, no unbounded increase.
 */
export function validateRuleDef(r: Pick<RuleDef, 'mode' | 'action_type' | 'expires_at' | 'max_adjust_pct' | 'budget_ceiling' | 'scope_type' | 'scope_id' | 'condition' | 'min_evidence'>): string[] {
  const e: string[] = [];
  if (r.scope_type === 'account' ? r.scope_id !== null : !r.scope_id) e.push('Scope id is required for campaign/ad set rules and must be empty for account rules.');
  if (!Number.isFinite(r.condition.threshold) || r.condition.threshold < 0) e.push('The threshold must be a number of zero or more.');
  if (!(r.min_evidence.min_spend > 0)) e.push('Minimum spend must be above zero so a rule cannot act on no evidence.');
  if (!(r.min_evidence.min_impressions > 0)) e.push('Minimum impressions must be above zero.');
  if (r.mode === 'auto' && !r.expires_at) e.push('Automatic rules must have an expiry date.');
  if ((r.action_type === 'budget_decrease' || r.action_type === 'budget_increase') && !r.max_adjust_pct) e.push('Budget rules need a maximum adjustment percentage.');
  if (r.action_type === 'budget_increase' && r.budget_ceiling == null) e.push('Budget increases need a ceiling.');
  if (r.mode === 'auto' && r.action_type === 'budget_increase') e.push('Automatic budget increases are not allowed; use approval mode for increases.');
  return e;
}
