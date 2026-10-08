import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { rangeBoundsUtc, zonedDate } from '@/lib/meta/metrics';
import { evaluateRule, findRuleConflicts, proposalWithinRule, ruleWindow, type Evaluation, type InsightDay, type RuleDef, type TargetState } from './rules-engine';
import { applyProposal, budgetProposalValues, proposalKey, type ProposalRow } from './proposals';
import { accountGate, loadStudioSettings, logActivity, proposalGate, proposalStore, writerOrNull } from './server';
import { trackingHealth } from './health';

/**
 * Scheduler entry for optimization rules. Order of safety:
 *   1. A lease (meta_studio_settings.rules_lock_until) stops overlapping ticks from evaluating together.
 *   2. Every enabled rule is evaluated by the pure engine; conflicting rules are skipped and recorded.
 *   3. recommend  -> evaluation record only.   approval -> a PROPOSED change a person must approve.
 *      auto       -> only pause/decrease, only when the automation gate is open, via applyProposal (which re-reads
 *                    Meta first and refuses to overwrite an Ads Manager change).
 * With live writes off, no write token, or automation stopped, nothing is ever written to Meta.
 */

export type TickSummary = { skipped?: string; evaluated: number; byOutcome: Record<string, number>; proposals: number; applied: number };

export async function runRulesTick(db: SupabaseClient, now = new Date()): Promise<TickSummary> {
  const out: TickSummary = { evaluated: 0, byOutcome: {}, proposals: 0, applied: 0 };
  const lease = new Date(now.getTime() + 4 * 60_000).toISOString();
  const { data: got } = await db.from('meta_studio_settings').update({ rules_lock_until: lease }).eq('id', true).or(`rules_lock_until.is.null,rules_lock_until.lt.${now.toISOString()}`).select('id');
  if (!got?.length) return { ...out, skipped: 'another evaluation is running' };
  try {
    const settings = await loadStudioSettings(db);
    const { data: ruleRows } = await db.from('meta_rules').select('*').eq('enabled', true);
    const rules = (ruleRows ?? []) as RuleDef[];
    if (!rules.length) return { ...out, skipped: 'no enabled rules' };

    const { data: adsets } = await db.from('meta_adsets').select('id, campaign_id');
    const hierarchy = { adsetToCampaign: new Map(((adsets ?? []) as { id: string; campaign_id: string }[]).map((a) => [a.id, a.campaign_id])) };
    const conflicted = new Set(findRuleConflicts(rules, hierarchy).flatMap((c) => [c.a, c.b]));

    const { data: events } = await db.from('meta_conversion_events').select('status, test_mode').order('created_at', { ascending: false }).limit(40);
    const verifiedAt = (settings.thresholds as { tracking_verified_at?: string }).tracking_verified_at ?? null;
    const tracking = trackingHealth({ now, verifiedAt, recentEvents: (events ?? []) as never });
    const { data: lastRun } = await db.from('meta_sync_runs').select('status, error_code').order('started_at', { ascending: false }).limit(1).maybeSingle();
    const credentialsOk = !(lastRun?.status === 'failed' && (lastRun.error_code ?? '').startsWith('auth'));

    for (const rule of rules) {
      const record = async (e: Pick<Evaluation, 'outcome' | 'reasons' | 'metrics'> | { outcome: 'conflict'; reasons: string[]; metrics: Record<string, never> }, proposalId?: string) => {
        await db.from('meta_rule_evaluations').insert({ rule_id: rule.id, rule_version: rule.version, outcome: e.outcome, reasons: e.reasons, metrics: e.metrics, proposal_id: proposalId ?? null });
        out.evaluated++; out.byOutcome[e.outcome] = (out.byOutcome[e.outcome] ?? 0) + 1;
      };
      if (conflicted.has(rule.id)) { await record({ outcome: 'conflict', reasons: ['Another enabled rule overlaps this one; resolve the conflict in Rules.'], metrics: {} }); continue; }

      const { data: acct } = await db.from('meta_ad_accounts').select('id, currency, timezone_name, last_synced_at, contractor_id').eq('id', rule.account_id).maybeSingle();
      if (!acct) { await record({ outcome: 'suspended', reasons: ['The ad account is not in the latest sync.'], metrics: {} }); continue; }
      const tz = acct.timezone_name || 'UTC';
      const today = zonedDate(now, tz);
      const gate = await accountGate(db, rule.account_id, { automation: true });

      // Insight rows for the rule's scope
      let q = db.from('meta_insights_daily').select('date, spend, impressions, inline_link_clicks, actions').eq('account_id', rule.account_id).gte('date', ruleWindow(rule, today).since).lte('date', today);
      if (rule.scope_type === 'campaign') q = q.eq('campaign_id', rule.scope_id!);
      if (rule.scope_type === 'adset') q = q.eq('adset_id', rule.scope_id!);
      const { data: ins } = await q.limit(20000);
      const byDate = new Map<string, InsightDay>();
      for (const r of (ins ?? []) as { date: string; spend: string | number; impressions: number | string; inline_link_clicks: number | string; actions: Record<string, number> }[]) {
        const d = byDate.get(r.date) ?? { date: r.date, spend: 0, impressions: 0, linkClicks: 0, metaLeads: 0 };
        d.spend = (d.spend ?? 0) + Number(r.spend); d.impressions = (d.impressions ?? 0) + Number(r.impressions); d.linkClicks = (d.linkClicks ?? 0) + Number(r.inline_link_clicks);
        d.metaLeads = (d.metaLeads ?? 0) + Number(r.actions?.lead ?? 0);
        byDate.set(r.date, d);
      }

      // HQN quality cohort for the settled window (only for qualified-lead rules; null if unavailable)
      let hqn: { leads: number; qualified: number } | null = null;
      if (rule.condition.metric === 'cost_per_qualified_lead' && rule.scope_type !== 'account') {
        const w = ruleWindow(rule, today);
        const { startIso, endIso } = rangeBoundsUtc(w, tz);
        const col = rule.scope_type === 'campaign' ? 'campaign_id' : 'ad_set_id';
        const { data: leads, error } = await db.from('leads').select('id, qualification_status').eq(col, rule.scope_id!).gte('created_at', startIso).lt('created_at', endIso).is('archived_at', null).limit(5000);
        if (!error) hqn = { leads: (leads ?? []).length, qualified: (leads ?? []).filter((l: { qualification_status: string | null }) => l.qualification_status === 'qualified').length };
      }

      // Target state + budget ownership
      let target: TargetState | null = null;
      if (rule.scope_type !== 'account') {
        const { data: st } = await db.from('meta_object_state').select('object_type, daily_budget_minor, lifetime_budget_minor, learning_stage, status, campaign_id').eq('object_id', rule.scope_id!).maybeSingle();
        if (st) {
          let campaignOwns = false;
          if (st.object_type === 'adset' && st.campaign_id) {
            const { data: cs } = await db.from('meta_object_state').select('daily_budget_minor, lifetime_budget_minor').eq('object_id', st.campaign_id).maybeSingle();
            campaignOwns = !!cs && (cs.daily_budget_minor != null || cs.lifetime_budget_minor != null);
          }
          target = { object_type: st.object_type, daily_budget_minor: st.daily_budget_minor, lifetime_budget_minor: st.lifetime_budget_minor, currency: acct.currency ?? 'USD', learning_stage: st.learning_stage, status: st.status, campaignOwnsBudget: campaignOwns };
        }
      } else target = { object_type: 'campaign', daily_budget_minor: null, lifetime_budget_minor: null, currency: acct.currency ?? 'USD', learning_stage: null, status: null };

      const targetId = rule.scope_id ?? rule.account_id;
      const dayStart = rangeBoundsUtc({ since: today, until: today }, tz).startIso;
      const [{ data: last }, { count: todayCount }] = await Promise.all([
        db.from('meta_change_proposals').select('applied_at').eq('target_id', targetId).eq('status', 'applied').order('applied_at', { ascending: false }).limit(1).maybeSingle(),
        db.from('meta_change_proposals').select('id', { count: 'exact', head: true }).eq('target_id', targetId).eq('auto_approved_by_rule', rule.id).gte('created_at', dayStart),
      ]);

      const ev = evaluateRule(rule, {
        now, today, days: [...byDate.values()], lastSyncAt: acct.last_synced_at ? new Date(acct.last_synced_at) : null, credentialsOk,
        trackingHealthy: tracking.healthy, hqn, target, lastActionAt: last?.applied_at ? new Date(last.applied_at) : null, actionsToday: todayCount ?? 0,
        automationAllowed: gate.allowed, automationReasons: gate.reasons,
      });
      if (ev.outcome === 'suspended' && tracking.healthy !== true && rule.condition.metric !== 'link_ctr') ev.reasons.push(tracking.reason);
      if (ev.outcome !== 'triggered' || !ev.action) { await record(ev); continue; }

      // ---- triggered ----
      if (rule.mode === 'recommend' || ev.action.type === 'notify') {
        await record({ ...ev, reasons: [...ev.reasons, rule.mode === 'recommend' ? 'Recommendation only: no proposal was created.' : 'Notification only.'] });
        await logActivity(db, { actor_kind: 'rule', action: 'rule.recommendation', target_id: targetId, account_id: rule.account_id, version_ref: `rule:${rule.id}@${rule.version}`, detail: { action: ev.action.type, metrics: ev.metrics } });
        continue;
      }
      const isBudget = ev.action.type === 'budget_decrease' || ev.action.type === 'budget_increase';
      const values = isBudget
        ? budgetProposalValues(ev.action.currentBudgetMinor!, ev.action.proposedBudgetMinor!, acct.currency ?? 'USD')
        : { current_value: { status: 'ACTIVE' }, proposed_value: { status: 'PAUSED' }, budget_impact: null };
      const auto = ev.action.execute;
      const { data: prop, error: perr } = await db.from('meta_change_proposals').insert({
        account_id: rule.account_id, target_type: rule.scope_type === 'adset' ? 'adset' : 'campaign', target_id: targetId,
        change_type: isBudget ? 'budget' : 'pause', current_value: values.current_value, proposed_value: values.proposed_value, budget_impact: values.budget_impact,
        evidence: { rule: { id: rule.id, name: rule.name, version: rule.version }, metrics: ev.metrics, window: ev.window }, rationale: `${rule.name}: ${ev.reasons.join(' ')}`.slice(0, 500),
        learning_note: ev.action.learningNote ?? null, source_kind: 'rule', source_id: rule.id, source_version: `rule@${rule.version}`,
        idempotency_key: proposalKey(['rule', rule.id, targetId, today]), proposed_kind: 'rule',
        status: auto ? 'approved' : 'proposed', auto_approved_by_rule: auto ? rule.id : null, approved_at: auto ? now.toISOString() : null,
      }).select('*').single();
      if (perr || !prop) { await record({ ...ev, outcome: 'no_action', reasons: [...ev.reasons, 'A proposal for this target already exists or could not be saved.'] }); continue; }
      out.proposals++;
      await record(ev, prop.id);
      await logActivity(db, { actor_kind: 'rule', action: 'proposal.created', target_type: 'proposal', target_id: prop.id, account_id: rule.account_id, version_ref: `rule:${rule.id}@${rule.version}`, after: values.proposed_value });
      if (auto) {
        const writer = writerOrNull();
        if (!writer) continue;
        // Re-read the rule and re-check scope + limits at execution time: a person may have disabled or edited it since evaluation.
        const { data: fresh } = await db.from('meta_rules').select('*').eq('id', rule.id).maybeSingle();
        const outOfScope = !fresh ? 'The rule no longer exists.' : proposalWithinRule(fresh as RuleDef, prop as ProposalRow & { target_type: string; account_id: string }, acct.currency ?? 'USD', now);
        if (outOfScope) {
          await db.from('meta_change_proposals').update({ status: 'failed', error_message: `Not applied automatically: ${outOfScope}` }).eq('id', prop.id).eq('status', 'approved');
          await logActivity(db, { actor_kind: 'rule', action: 'proposal.out_of_scope', target_type: 'proposal', target_id: prop.id, account_id: rule.account_id, detail: { reason: outOfScope } });
          continue;
        }
        const res = await applyProposal(prop as ProposalRow, { writer, store: proposalStore(db, { id: null, kind: 'rule' }), gate: () => proposalGate(db, prop as ProposalRow), now });
        if (res.outcome === 'applied') out.applied++;
      }
    }
    return out;
  } finally {
    await db.from('meta_studio_settings').update({ rules_lock_until: null }).eq('id', true);
  }
}
