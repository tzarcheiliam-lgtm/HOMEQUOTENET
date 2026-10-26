import { cohortCounts, type HqnCounts, type LeadFact, type OutcomeFact } from '@/lib/meta/hqn-metrics';

/**
 * HQN Meta audit - versioned, deterministic, evidence-first.
 *
 * Methodology adapted from the "claude-ads" skill (MIT License, Copyright (c) 2026 agricidaniel;
 * ads/references/meta-audit.md and scoring-system.md, v2.0.1). What was kept is the CONTRACT, not its scores:
 *   - a control returns `not_assessed` / `not_applicable` when evidence is absent (never a guessed pass/fail);
 *   - no platform-wide thresholds, benchmarks or "winning" rules: thresholds come from the owner (below);
 *   - a recommendation names the observation, baseline, mechanism, confidence, next step, measurement window and
 *     how to tell whether it worked, and facts are separated from hypotheses.
 * Control ids (M10, M02, M39 ...) follow that catalog where one applies; "H-" ids are HQN-specific (first-party
 * lead-quality and outcome controls the generic catalog cannot know). The skill's scripts were NOT executed.
 *
 * There is no numeric account "score": the skill's weighted score depends on benchmarks this system does not have.
 * Changing any control's logic requires bumping AUDIT_VERSION so stored reports stay interpretable.
 */
export const AUDIT_VERSION = 'hqn-meta-audit/1.0.0';

export type Thresholds = {
  max_data_age_hours?: number;
  min_attribution_coverage_pct?: number;
  min_spend_for_judgement?: number; // account currency
  target_cost_per_lead?: number; // account currency (Meta-reported leads)
  min_qualified_rate_pct?: number;
  min_leads_for_comparison?: number;
  min_ads_per_adset?: number;
  max_top_campaign_spend_share_pct?: number;
  lead_maturity_days?: number; // how old a lead cohort must be before outcomes are judged
};
export const THRESHOLD_LABELS: Record<keyof Thresholds, string> = {
  max_data_age_hours: 'Maximum acceptable data age (hours)',
  min_attribution_coverage_pct: 'Minimum share of leads that must carry an ad id (%)',
  min_spend_for_judgement: 'Minimum spend before judging a campaign',
  target_cost_per_lead: 'Target cost per Meta-reported lead',
  min_qualified_rate_pct: 'Minimum qualified-lead rate (%)',
  min_leads_for_comparison: 'Minimum leads before comparing campaigns',
  min_ads_per_adset: 'Minimum active ads per active ad set',
  max_top_campaign_spend_share_pct: 'Maximum share of spend in one campaign (%)',
  lead_maturity_days: 'Days before a lead cohort counts as mature',
};

export type ObjState = { daily_budget_minor: number | null; lifetime_budget_minor: number | null; learning_stage: string | null; object_type: 'campaign' | 'adset'; external_change_at: string | null };
export type AuditInput = {
  now: Date;
  range: { since: string; until: string };
  tz: string;
  accountId: string;
  accountName: string | null;
  currency: string | null;
  lastSyncAt: Date | null;
  delivery: { mode: 'off' | 'test' | 'live'; datasetId: string | null; accepted: number; failed: number; pending: number; skipped: number };
  campaigns: { id: string; name: string | null; objective: string | null; effective_status: string | null }[];
  adsets: { id: string; campaign_id: string; effective_status: string | null }[];
  ads: { id: string; adset_id: string; effective_status: string | null }[];
  state: Map<string, ObjState>;
  insights: { ad_id: string; campaign_id: string; date: string; spend: number; impressions: number; inline_link_clicks: number; actions: Record<string, number> }[];
  leads: LeadFact[]; // leads CREATED in range
  outcomes: OutcomeFact[];
  thresholds: Thresholds;
};

export type Finding = {
  control_id: string;
  status: 'pass' | 'attention' | 'fail' | 'info' | 'not_assessed' | 'not_applicable';
  severity: 'high' | 'medium' | 'low' | 'info';
  kind: 'fact' | 'hypothesis';
  title: string;
  observation: string;
  data: Record<string, unknown>;
  why_it_matters: string | null;
  proposed_action: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  limitations: string | null;
  evaluation: string | null;
  /** Optional machine-readable change the UI can turn into a reviewable proposal. */
  proposal?: { change_type: 'pause'; target_type: 'campaign'; target_id: string; evidence: Record<string, unknown> };
};

const period = (i: AuditInput) => `${i.range.since} to ${i.range.until} (${i.tz})`;
const money = (n: number, cur: string | null) => `${n.toFixed(2)} ${cur ?? ''}`.trim();
const notAssessed = (control_id: string, title: string, why: string, limitations: string): Finding => ({
  control_id, status: 'not_assessed', severity: 'info', kind: 'fact', title, observation: why, data: {}, why_it_matters: null, proposed_action: null, confidence: null, limitations, evaluation: null,
});

export type AuditResult = {
  version: string;
  findings: Finding[];
  summary: {
    headline: string;
    counts: Record<Finding['status'], number>;
    next_actions: { control_id: string; title: string; action: string; confidence: Finding['confidence'] }[];
    thresholds_missing: string[];
  };
};

export function runAudit(i: AuditInput): AuditResult {
  const t = i.thresholds;
  const f: Finding[] = [];
  const missing = new Set<keyof Thresholds>();
  const needT = (k: keyof Thresholds) => { if (t[k] == null) missing.add(k); return t[k]; };

  // ---- M10 data freshness (fact) -------------------------------------------------------------------------
  {
    const maxH = t.max_data_age_hours ?? 26;
    if (!i.lastSyncAt) {
      f.push({ control_id: 'M10', status: 'fail', severity: 'high', kind: 'fact', title: 'Data freshness', observation: 'No successful Meta sync has run for this account.', data: {}, why_it_matters: 'Every number below depends on imported Meta data; without it nothing can be judged.', proposed_action: 'Run Sync now on Meta Ads > Setup, then fix any connection error shown there.', confidence: 'high', limitations: null, evaluation: 'A successful sync appears under Setup > recent syncs.' });
    } else {
      const age = (i.now.getTime() - i.lastSyncAt.getTime()) / 3_600_000;
      const stale = age > maxH;
      f.push({ control_id: 'M10', status: stale ? 'fail' : 'pass', severity: stale ? 'high' : 'info', kind: 'fact', title: 'Data freshness', observation: `Last successful sync was ${age.toFixed(1)} hours ago (limit ${maxH}h${t.max_data_age_hours == null ? ', default' : ''}).`, data: { age_hours: Number(age.toFixed(1)), limit_hours: maxH }, why_it_matters: stale ? 'Stale data can show last week\'s picture as today\'s; automation is suspended while data is stale.' : null, proposed_action: stale ? 'Check the Marketing API token (Setup) and the scheduler workflow.' : null, confidence: 'high', limitations: null, evaluation: stale ? 'Data age drops under the limit after the next successful sync.' : null });
    }
  }

  // ---- M02 outcome feedback (fact) -------------------------------------------------------------------------
  {
    const d = i.delivery;
    if (d.mode === 'off') {
      f.push({ control_id: 'M02', status: 'attention', severity: 'medium', kind: 'fact', title: 'Outcome events sent to Meta', observation: 'Delivery of HQN outcomes (qualified, booked, won) to Meta is OFF. Meta only sees the original form fill or Lead event.', data: { mode: d.mode }, why_it_matters: 'Without downstream outcomes Meta cannot learn which leads become qualified or appointments. This is a limitation of the signal, not proof of poor performance.', proposed_action: 'When ready, enable Test mode on Setup, verify events in Events Manager > Test events, then decide on Live.', confidence: 'high', limitations: 'Whether Meta would use the events for optimization depends on campaign setup and volume; acceptance is not attribution.', evaluation: 'Compare cost per qualified lead over a period after enabling, using the same cohort basis.' });
    } else {
      const bad = d.failed > 0;
      f.push({ control_id: 'M02', status: bad ? 'attention' : 'pass', severity: bad ? 'medium' : 'info', kind: 'fact', title: 'Outcome events sent to Meta', observation: `Mode ${d.mode}: ${d.accepted} accepted, ${d.failed} failed, ${d.pending} pending, ${d.skipped} skipped. "Accepted" means Meta's API returned success - not that it matched or used the event.`, data: { ...d }, why_it_matters: bad ? 'Failed events are missing signal that Meta will not receive unless retried within its 7-day window.' : null, proposed_action: bad ? 'Open Meta Ads > Delivery and review failure reasons.' : null, confidence: 'high', limitations: 'Test-mode events never count toward reporting or optimization.', evaluation: bad ? 'Failed count returns to zero.' : null });
    }
  }
  f.push(notAssessed('M03', 'Event deduplication', 'Browser/server deduplication health is shown in Meta Events Manager diagnostics, which HQN does not import.', 'HQN uses a shared event_id for web events, but Meta\'s own deduplication report was not read.'));
  f.push(notAssessed('M04', 'Event match quality', 'Event Match Quality is reported by Events Manager and is not imported.', 'No EMQ score was available.'));

  // ---- M39 attribution coverage -------------------------------------------------------------------------------
  {
    const total = i.leads.length;
    const withAd = i.leads.filter((l) => l.ad_id).length;
    const knownAds = new Set(i.ads.map((a) => a.id));
    const unmatched = i.leads.filter((l) => l.ad_id && !knownAds.has(l.ad_id)).length;
    const pct = total ? (withAd / total) * 100 : null;
    const th = needT('min_attribution_coverage_pct');
    if (total === 0) f.push({ ...notAssessed('M39', 'Lead attribution coverage', 'No HQN leads were created in this period.', 'Nothing to measure.'), status: 'not_applicable' });
    else {
      const base: Finding = { control_id: 'M39', status: 'info', severity: 'info', kind: 'fact', title: 'Lead attribution coverage', observation: `${withAd} of ${total} HQN leads (${pct!.toFixed(0)}%) carry an ad id; ${unmatched} carry an ad id not found in this account's synced ads.`, data: { leads: total, with_ad_id: withAd, unmatched_ad_ids: unmatched }, why_it_matters: 'Leads without an ad id cannot be tied to spend, so cost-per-outcome figures understate or misplace results.', proposed_action: null, confidence: 'high', limitations: 'Organic and direct leads are expected to have no ad id; ids in another ad account will show as unmatched.', evaluation: null };
      if (th == null) f.push({ ...base, status: 'not_assessed', limitations: `${base.limitations} Set a minimum coverage threshold to grade this.` });
      else if (pct! < th) f.push({ ...base, status: 'attention', severity: 'medium', proposed_action: 'Check that every ad has the HQN URL-parameter string (Meta Ads > Create Ad adds it automatically for new ads; existing ads need it pasted once).', evaluation: 'Coverage over the next period of new leads.' });
      else f.push({ ...base, status: 'pass' });
    }
  }

  // ---- budget / structure facts ---------------------------------------------------------------------------------
  {
    let campBudget = 0, adsetBudget = 0, lifetime = 0;
    for (const c of i.campaigns) { const s = i.state.get(c.id); if (!s) continue; if (s.daily_budget_minor != null || s.lifetime_budget_minor != null) campBudget++; if (s.lifetime_budget_minor != null) lifetime++; }
    for (const a of i.adsets) { const s = i.state.get(a.id); if (s && (s.daily_budget_minor != null || s.lifetime_budget_minor != null)) adsetBudget++; if (s?.lifetime_budget_minor != null) lifetime++; }
    const haveState = i.state.size > 0;
    if (!haveState) f.push(notAssessed('M12', 'Campaign vs ad set budget control', 'Live budget settings have not been imported yet.', 'Run a Studio sync (Settings) to read budgets.'));
    else f.push({ control_id: 'M12', status: 'info', severity: 'info', kind: 'fact', title: 'Where budgets are set', observation: `${campBudget} campaign(s) own their budget, ${adsetBudget} ad set(s) own theirs, ${lifetime} object(s) use lifetime budgets.`, data: { campaigns_with_budget: campBudget, adsets_with_budget: adsetBudget, lifetime }, why_it_matters: 'Rules and proposals can only adjust a budget at the object that owns it, and lifetime budgets are never auto-adjusted.', proposed_action: null, confidence: 'high', limitations: 'Reflects the last Studio sync.', evaluation: null });
  }
  {
    const learn = i.adsets.map((a) => ({ id: a.id, stage: i.state.get(a.id)?.learning_stage ?? null }));
    const known = learn.filter((l) => l.stage);
    if (!known.length) f.push(notAssessed('M13', 'Learning phase status', 'No ad-set learning status was imported.', 'Requires the Studio sync.'));
    else {
      const failing = known.filter((l) => l.stage === 'FAIL');
      f.push({ control_id: 'M13', status: failing.length ? 'attention' : 'info', severity: failing.length ? 'medium' : 'info', kind: 'fact', title: 'Learning status', observation: `${known.filter((l) => l.stage === 'LEARNING').length} learning, ${known.filter((l) => l.stage === 'SUCCESS').length} out of learning, ${failing.length} reported as not exiting learning.`, data: { failing: failing.map((x) => x.id), checked: known.length }, why_it_matters: failing.length ? 'Meta reports these ad sets are not getting enough optimization events; the cause (budget, audience size, event volume) is not determined here.' : null, proposed_action: failing.length ? 'Review those ad sets in Ads Manager: consider fewer ad sets or a different optimization event. This is a hypothesis to test, not a diagnosis.' : null, confidence: 'medium', limitations: 'Status is Meta\'s own at the last sync.', evaluation: 'Re-check learning status after the change has run for the period Meta indicates.' });
    }
  }

  // ---- spend + results ---------------------------------------------------------------------------------------------
  const spendBy = new Map<string, number>();
  const metaLeadsBy = new Map<string, number>();
  let spendTotal = 0, metaLeadsTotal = 0;
  for (const r of i.insights) {
    spendBy.set(r.campaign_id, (spendBy.get(r.campaign_id) ?? 0) + r.spend);
    metaLeadsBy.set(r.campaign_id, (metaLeadsBy.get(r.campaign_id) ?? 0) + (r.actions.lead ?? 0));
    spendTotal += r.spend; metaLeadsTotal += r.actions.lead ?? 0;
  }
  const name = (id: string) => i.campaigns.find((c) => c.id === id)?.name ?? id;

  if (i.insights.length === 0) {
    f.push(notAssessed('H-S1', 'Spend and performance', 'No Meta insight rows exist for this account and period.', 'Either there was no delivery or the import has not run.'));
  } else {
    // M17 spend concentration
    const top = [...spendBy.entries()].sort((a, b) => b[1] - a[1])[0];
    const share = spendTotal > 0 ? (top[1] / spendTotal) * 100 : null;
    const th = needT('max_top_campaign_spend_share_pct');
    const base: Finding = { control_id: 'M17', status: 'info', severity: 'info', kind: 'fact', title: 'Budget distribution', observation: `${money(spendTotal, i.currency)} spent across ${spendBy.size} campaign(s). The largest, "${name(top[0])}", took ${share == null ? 'n/a' : share.toFixed(0) + '%'}.`, data: { spend: spendTotal, campaigns: spendBy.size, top_campaign: top[0], top_share_pct: share }, why_it_matters: 'Concentration is only a problem if the concentrated campaign performs worse than alternatives; compare with lead quality below.', proposed_action: null, confidence: 'high', limitations: 'Spend is Meta-reported in the account currency; dates are account-timezone days.', evaluation: null };
    f.push(th == null ? { ...base, status: 'not_assessed', limitations: `${base.limitations} Set a maximum concentration to grade this.` } : share != null && share > th ? { ...base, status: 'attention', severity: 'low', proposed_action: 'Consider a small, approved test of budget in a second campaign.', evaluation: 'Compare cost per qualified lead for both campaigns over equal windows.' } : { ...base, status: 'pass' });

    // H-L1 cost per Meta lead
    const costTarget = needT('target_cost_per_lead');
    const minSpend = needT('min_spend_for_judgement');
    const rows = [...spendBy.entries()].map(([id, s]) => ({ id, spend: s, leads: metaLeadsBy.get(id) ?? 0, cpl: (metaLeadsBy.get(id) ?? 0) > 0 ? s / (metaLeadsBy.get(id) ?? 1) : null }));
    const overall = metaLeadsTotal > 0 ? spendTotal / metaLeadsTotal : null;
    const lBase: Finding = { control_id: 'H-L1', status: 'info', severity: 'info', kind: 'fact', title: 'Cost per Meta-reported lead', observation: `${metaLeadsTotal} Meta-reported lead(s) for ${money(spendTotal, i.currency)}${overall != null ? ` = ${money(overall, i.currency)} each` : ''}. Meta-reported leads are not HQN-confirmed leads.`, data: { spend: spendTotal, meta_leads: metaLeadsTotal, cost_per_lead: overall, by_campaign: rows.map((r) => ({ id: r.id, name: name(r.id), spend: r.spend, meta_leads: r.leads, cpl: r.cpl })) }, why_it_matters: 'Cost per lead says nothing about whether the leads were any good - see H-Q1.', proposed_action: null, confidence: 'medium', limitations: 'Attribution window and reporting lag affect recent days; reach/frequency are not used.', evaluation: null };
    if (costTarget == null || minSpend == null) f.push({ ...lBase, status: 'not_assessed', limitations: `${lBase.limitations} Set a target cost per lead and a minimum spend to grade campaigns.` });
    else {
      const over = rows.filter((r) => r.spend >= minSpend && (r.cpl == null || r.cpl > costTarget));
      if (!over.length) f.push({ ...lBase, status: 'pass' });
      else {
        f.push({ ...lBase, status: 'attention', severity: 'medium', kind: 'hypothesis', observation: `${over.length} campaign(s) with at least ${money(minSpend, i.currency)} spend are above the ${money(costTarget, i.currency)} target or have no reported leads: ${over.map((o) => `"${name(o.id)}"`).join(', ')}.`, proposed_action: 'Review these campaigns; if the lead quality below is also weak, propose pausing or lowering budget (requires approval).', confidence: 'medium', evaluation: 'Re-measure cost per lead after the settling lag (conversions can arrive days later).' });
        for (const o of over.slice(0, 3)) f.push({ control_id: 'H-L2', status: 'attention', severity: 'medium', kind: 'hypothesis', title: `Campaign over target: ${name(o.id)}`, observation: `Spend ${money(o.spend, i.currency)}, ${o.leads} Meta-reported lead(s)${o.cpl != null ? ` (${money(o.cpl, i.currency)} each)` : ''} vs target ${money(costTarget, i.currency)}.`, data: { campaign_id: o.id, spend: o.spend, leads: o.leads }, why_it_matters: 'Spend is going to a campaign that is not meeting the target you set.', proposed_action: 'Pause this campaign (proposal requires approval).', confidence: 'medium', limitations: 'Does not account for lead quality or conversions still arriving; the cause is unknown.', evaluation: 'If paused, watch total lead volume and cost per qualified lead for the same period.', proposal: { change_type: 'pause', target_type: 'campaign', target_id: o.id, evidence: { spend: o.spend, meta_leads: o.leads, target_cpl: costTarget, window: i.range } } });
      }
    }
  }

  // ---- H-Q1 / H-O1 lead quality + outcomes (HQN first-party, cohort basis) -------------------------------------------------
  {
    const maturity = t.lead_maturity_days ?? 7;
    const cutoff = new Date(i.now.getTime() - maturity * 86_400_000).toISOString();
    const mature = i.leads.filter((l) => l.created_at <= cutoff);
    const byCampaign = cohortCounts(mature, i.outcomes, 'campaign_id');
    const all = [...byCampaign.entries()].filter(([k]) => k !== '__unattributed__');
    if (i.leads.length === 0) {
      f.push({ ...notAssessed('H-Q1', 'Lead quality by campaign', 'No HQN leads were created in this period.', 'Nothing to measure.'), status: 'not_applicable' });
    } else if (mature.length === 0) {
      f.push(notAssessed('H-Q1', 'Lead quality by campaign', `All ${i.leads.length} lead(s) are under ${maturity} days old, so outcomes (qualification, appointments, jobs) are still arriving.`, 'Judging immature cohorts would make recent spend look worse than it is.'));
    } else {
      const minRate = needT('min_qualified_rate_pct');
      const minLeads = needT('min_leads_for_comparison');
      const minSpend = t.min_spend_for_judgement;
      const lines = all.map(([id, c]: [string, HqnCounts]) => ({ id, name: name(id), leads: c.leads, qualified: c.qualified, appointments: c.appointments, won: c.won, rate: c.leads ? (c.qualified / c.leads) * 100 : null, spend: spendBy.get(id) ?? null }));
      const base: Finding = { control_id: 'H-Q1', status: 'info', severity: 'info', kind: 'fact', title: 'Lead quality by campaign', observation: lines.length ? lines.map((l) => `"${l.name}": ${l.qualified}/${l.leads} qualified, ${l.appointments} booked, ${l.won} won`).join('; ') + '.' : `${mature.length} mature lead(s), none attributed to a campaign.`, data: { maturity_days: maturity, leads: mature.length, campaigns: lines }, why_it_matters: 'Qualification, appointments and won jobs are the outcomes the business is paid for; cost per form fill is only a proxy.', proposed_action: null, confidence: 'medium', limitations: `Cohort basis: leads created in ${period(i)} and older than ${maturity} days, with outcomes recorded to date. Qualification is a human judgement and may be unevenly applied. Small samples are noisy.`, evaluation: null };
      if (minRate == null || minLeads == null) f.push({ ...base, status: 'not_assessed', limitations: `${base.limitations} Set a minimum qualified rate and minimum lead count to grade this.` });
      else {
        const weak = lines.filter((l) => l.leads >= minLeads && l.rate != null && l.rate < minRate && (minSpend == null || (l.spend ?? 0) >= minSpend));
        f.push(weak.length ? { ...base, status: 'attention', severity: 'medium', kind: 'hypothesis', observation: `${base.observation} Below the ${minRate}% qualified-rate floor with at least ${minLeads} leads: ${weak.map((w) => `"${w.name}" (${w.rate!.toFixed(0)}%)`).join(', ')}.`, proposed_action: 'Look at the offer, targeting and form questions for those campaigns, or shift test budget toward campaigns above the floor (approval required).', confidence: 'low', evaluation: 'Compare qualified rate for the next mature cohort of equal size.' } : { ...base, status: 'pass' });
      }
      const wonValue: Record<string, number> = {};
      for (const [, c] of all) for (const [cur, v] of Object.entries(c.wonValue)) wonValue[cur] = (wonValue[cur] ?? 0) + v;
      f.push({ control_id: 'H-O1', status: 'info', severity: 'info', kind: 'fact', title: 'Appointments and recorded job value', observation: `Mature cohort: ${all.reduce((a, [, c]) => a + c.appointments, 0)} booked, ${all.reduce((a, [, c]) => a + c.won, 0)} won; recorded value ${Object.keys(wonValue).length ? Object.entries(wonValue).map(([c, v]) => money(v, c)).join(', ') : 'none recorded'}.`, data: { won_value_by_currency: wonValue }, why_it_matters: 'Shows whether leads turn into work. Jobs without a recorded value are counted but contribute no value.', proposed_action: null, confidence: 'medium', limitations: 'Job values are HQN-recorded, not Meta-reported, and are never combined with Meta spend across currencies.', evaluation: null });
    }
  }

  // ---- creative breadth ---------------------------------------------------------------------------------------------------
  {
    const activeAdsets = i.adsets.filter((a) => a.effective_status === 'ACTIVE');
    if (!activeAdsets.length) f.push({ ...notAssessed('M25', 'Creative breadth', 'No active ad sets.', ''), status: 'not_applicable' });
    else {
      const counts = activeAdsets.map((a) => ({ id: a.id, ads: i.ads.filter((x) => x.adset_id === a.id && x.effective_status === 'ACTIVE').length }));
      const th = needT('min_ads_per_adset');
      const base: Finding = { control_id: 'M25', status: 'info', severity: 'info', kind: 'fact', title: 'Active ads per active ad set', observation: `${activeAdsets.length} active ad set(s); ads per ad set: ${counts.map((c) => c.ads).join(', ')}.`, data: { counts }, why_it_matters: 'Very few ads per ad set limits what can be compared or rotated when one tires.', proposed_action: null, confidence: 'medium', limitations: 'Counts ads, not how different their concepts are; creative quality was not assessed.', evaluation: null };
      f.push(th == null ? { ...base, status: 'not_assessed', limitations: `${base.limitations} Set a minimum to grade this.` } : counts.some((c) => c.ads < th) ? { ...base, status: 'attention', severity: 'low', kind: 'hypothesis', proposed_action: `Add creative variants so each active ad set has at least ${th} (Meta Ads > Create Ad).`, evaluation: 'Compare cost per lead and quality between variants after enough spend.' } : { ...base, status: 'pass' });
    }
  }
  f.push(notAssessed('M28', 'Creative fatigue', 'Frequency is not imported, and reach cannot be added across days, so fatigue cannot be measured from HQN data.', 'Requires frequency or ad-level trend data.'));
  f.push(notAssessed('H-C1', 'Creative and offer quality', 'No creative assets, copy review or call transcripts were analyzed.', 'This audit never invents observations about creative it did not examine.'));
  f.push(notAssessed('H-F1', 'Funnel performance', 'Landing-page and form step conversion is not joined to ads in this audit.', 'Funnel step data exists in HQN but was not part of this version.'));

  // ---- reconciliation with Ads Manager ----------------------------------------------------------------------------------------
  {
    const changed = [...i.state.entries()].filter(([, s]) => s.external_change_at);
    if (changed.length) f.push({ control_id: 'H-R1', status: 'attention', severity: 'medium', kind: 'fact', title: 'Changed outside HQN', observation: `${changed.length} campaign/ad set(s) differ from what HQN last set (edited in Ads Manager or by another tool).`, data: { ids: changed.map(([id]) => id) }, why_it_matters: 'HQN will not overwrite these; related proposals are marked stale.', proposed_action: 'Review the listed objects and re-create any proposal from the current state.', confidence: 'high', limitations: null, evaluation: null });
  }

  // ---- summary --------------------------------------------------------------------------------------------------------------------
  const rank = (x: Finding) => (x.status === 'fail' ? 0 : x.status === 'attention' ? 1 : 2) * 10 + ({ high: 0, medium: 1, low: 2, info: 3 }[x.severity]);
  f.sort((a, b) => rank(a) - rank(b));
  const counts = { pass: 0, attention: 0, fail: 0, info: 0, not_assessed: 0, not_applicable: 0 } as Record<Finding['status'], number>;
  for (const x of f) counts[x.status]++;
  const next = f.filter((x) => x.proposed_action && (x.status === 'fail' || x.status === 'attention')).slice(0, 3)
    .map((x) => ({ control_id: x.control_id, title: x.title, action: x.proposed_action!, confidence: x.confidence }));
  const thresholds_missing = [...missing].map((k) => THRESHOLD_LABELS[k]);
  const headline = counts.fail + counts.attention === 0
    ? `No issues found among the ${counts.pass + counts.info} check(s) that could be assessed; ${counts.not_assessed} could not be assessed.`
    : `${counts.fail} failing and ${counts.attention} needing attention out of ${f.length - counts.not_assessed - counts.not_applicable} assessed check(s); ${counts.not_assessed} could not be assessed.`;
  return { version: AUDIT_VERSION, findings: f, summary: { headline, counts, next_actions: next, thresholds_missing } };
}
