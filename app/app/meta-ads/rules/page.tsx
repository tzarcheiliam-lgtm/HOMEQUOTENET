import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { when } from '@/components/meta/format';
import { EvaluateNow, RuleControls, RuleForm } from '@/components/meta/studio/rule-forms';
import { findRuleConflicts, type RuleDef } from '@/lib/meta/studio/rules-engine';
import { SlidersHorizontal } from 'lucide-react';

export const metadata = { title: 'Optimization Rules · HomeQuote Network' };
export const dynamic = 'force-dynamic';

const MODE: Record<string, string> = { recommend: 'Recommend only', approval: 'Needs my approval', auto: 'Automatic' };
const OUTCOME_VARIANT: Record<string, Parameters<typeof Badge>[0]['variant']> = { triggered: 'warning', no_action: 'muted', suspended: 'danger', insufficient_evidence: 'info', cooldown: 'muted', limit_reached: 'muted', conflict: 'danger', expired: 'muted', error: 'danger' };

export default async function RulesPage() {
  await requireRole(['admin']);
  const db = await createClient();
  const [{ data: s }, { data: rules }, { data: accounts }, { data: campaigns }, { data: adsets }] = await Promise.all([
    db.from('meta_studio_settings').select('automation_enabled, live_writes_enabled').eq('id', true).maybeSingle(),
    db.from('meta_rules').select('*').order('created_at', { ascending: false }),
    db.from('meta_ad_accounts').select('id, name').order('name'),
    db.from('meta_campaigns').select('id, account_id, name').order('name').limit(500),
    db.from('meta_adsets').select('id, account_id, campaign_id, name').order('name').limit(1000),
  ]);
  const list = (rules ?? []) as (RuleDef & { created_at: string })[];
  const ids = list.map((r) => r.id);
  const { data: evs } = ids.length ? await db.from('meta_rule_evaluations').select('id, rule_id, rule_version, evaluated_at, outcome, reasons').in('rule_id', ids).order('evaluated_at', { ascending: false }).limit(300) : { data: [] };
  const byRule = new Map<string, { id: string; rule_version: number; evaluated_at: string; outcome: string; reasons: string[] }[]>();
  for (const e of (evs ?? []) as { id: string; rule_id: string; rule_version: number; evaluated_at: string; outcome: string; reasons: string[] }[]) { const a = byRule.get(e.rule_id) ?? []; if (a.length < 3) a.push(e); byRule.set(e.rule_id, a); }
  const conflicts = findRuleConflicts(list, { adsetToCampaign: new Map(((adsets ?? []) as { id: string; campaign_id: string }[]).map((a) => [a.id, a.campaign_id])) });
  const name = (r: RuleDef) => (r.scope_type === 'account' ? 'whole account' : `${r.scope_type} ${r.scope_id}`);
  const auto = s?.automation_enabled ?? false;
  return (
    <div className="space-y-6">
      <PageHeader title="Optimization Rules" description="Rules you define, with limits you choose. They start OFF and recommend only. HQN never ranks a &ldquo;winning ad&rdquo; with built-in numbers." />
      <div className={`rounded-md border p-3 text-sm ${auto ? 'border-amber-300 bg-amber-50 text-amber-900' : 'bg-muted/40'}`}>
        <b>HQN automation is {auto ? 'RUNNING' : 'STOPPED'}.</b> {auto ? 'Automatic rules may act where their ad account allows it.' : 'Automatic rules cannot act. Recommendation and approval rules still evaluate and record.'} Stopping HQN automation does not pause ads already running in Meta. Change this in Activity &amp; settings.
      </div>
      {conflicts.length > 0 && <div role="alert" className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">Conflicting enabled rules are skipped until resolved: {conflicts.map((c) => c.reason).join(' ')}</div>}
      <EvaluateNow />

      <section className="space-y-3" aria-labelledby="rules-h">
        <h2 id="rules-h" className="text-lg font-semibold">Your rules</h2>
        {list.length === 0 ? <EmptyState icon={SlidersHorizontal} title="No rules yet" description="Create one below. It will be saved switched off." /> : list.map((r) => {
          const expired = !!r.expires_at && new Date(r.expires_at) <= new Date();
          return (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">{r.name}<Badge variant={r.enabled ? 'success' : 'muted'}>{r.enabled ? 'On' : 'Off'}</Badge><Badge variant="outline">{MODE[r.mode]}</Badge>{expired && <Badge variant="danger">Expired</Badge>}</CardTitle>
                <CardDescription>{r.account_id} · {name(r)} · version {r.version}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{r.action_type.replace('_', ' ')} when <b>{r.condition.metric.replace(/_/g, ' ')}</b> is {r.condition.op === 'gt' ? 'above' : 'below'} <b>{r.condition.threshold}</b>, looking back {r.eval_window_days}d and skipping the last {r.conversion_lag_days}d. Needs at least {r.min_evidence.min_spend} spend and {r.min_evidence.min_impressions} impressions{r.min_evidence.min_leads ? ` and ${r.min_evidence.min_leads} HQN leads` : ''}; data under {r.max_data_age_hours}h old. Cooldown {r.cooldown_hours}h, max {r.max_changes_per_day}/day{r.max_adjust_pct ? `, max ${r.max_adjust_pct}% per change` : ''}{r.budget_floor != null ? `, floor ${r.budget_floor}` : ''}{r.budget_ceiling != null ? `, ceiling ${r.budget_ceiling}` : ''}.{r.expires_at ? ` Expires ${r.expires_at.slice(0, 10)}.` : ''}{r.review_at ? ` Review by ${r.review_at.slice(0, 10)}.` : ''}</p>
                {(byRule.get(r.id) ?? []).length > 0 && (
                  <ul className="space-y-1">{(byRule.get(r.id) ?? []).map((e) => <li key={e.id} className="flex flex-wrap items-baseline gap-2 text-xs"><Badge variant={OUTCOME_VARIANT[e.outcome] ?? 'muted'}>{e.outcome.replace('_', ' ')}</Badge><span className="text-muted-foreground">{when(e.evaluated_at)} · v{e.rule_version}</span><span>{(e.reasons ?? []).join(' ')}</span></li>)}</ul>
                )}
                <RuleControls id={r.id} enabled={r.enabled} mode={r.mode} expired={expired} />
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader><CardTitle>New rule</CardTitle><CardDescription>Changing what an existing rule does switches it off and bumps its version, so you re-confirm the new definition.</CardDescription></CardHeader>
        <CardContent><RuleForm accounts={(accounts ?? []) as { id: string; name: string | null }[]} campaigns={(campaigns ?? []) as never} adsets={(adsets ?? []) as never} /></CardContent>
      </Card>
    </div>
  );
}
