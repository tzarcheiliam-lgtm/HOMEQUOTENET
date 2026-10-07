'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Msg } from './ui';
import { deleteRule, evaluateRulesNow, saveRule, setRuleEnabled, type StudioState } from '@/lib/actions/meta-studio';

function F({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}

export function RuleForm({ accounts, campaigns, adsets }: { accounts: { id: string; name: string | null }[]; campaigns: { id: string; account_id: string; name: string | null }[]; adsets: { id: string; account_id: string; name: string | null }[] }) {
  const [state, action, pending] = useActionState<StudioState, FormData>(saveRule, undefined);
  const [acct, setAcct] = useState('');
  const [scope, setScope] = useState<'account' | 'campaign' | 'adset'>('campaign');
  const [act, setAct] = useState('pause');
  const [mode, setMode] = useState('recommend');
  const [metric, setMetric] = useState('spend_without_meta_leads');
  const budget = act === 'budget_decrease' || act === 'budget_increase';
  const scopeOptions = scope === 'campaign' ? campaigns.filter((c) => c.account_id === acct) : scope === 'adset' ? adsets.filter((c) => c.account_id === acct) : [];
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <F id="r-name" label="Rule name"><Input id="r-name" name="name" required maxLength={120} /></F>
        <F id="r-acct" label="Ad account"><Select id="r-acct" name="account_id" required value={acct} onChange={(e) => setAcct(e.target.value)}><option value="">Choose…</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name ?? a.id}</option>)}</Select></F>
        <F id="r-st" label="Applies to"><Select id="r-st" name="scope_type" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}><option value="campaign">One campaign</option><option value="adset">One ad set</option><option value="account">The whole account</option></Select></F>
        {scope !== 'account' && <F id="r-si" label={scope === 'campaign' ? 'Campaign' : 'Ad set'}><Select id="r-si" name="scope_id" required><option value="">Choose…</option>{scopeOptions.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}</Select></F>}
        <F id="r-mode" label="Mode" hint="Recommendation only is the default and changes nothing."><Select id="r-mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value)}><option value="recommend">Recommend only</option><option value="approval">Create a proposal I must approve</option><option value="auto">Act automatically (pause / decrease only)</option></Select></F>
        <F id="r-act" label="Action"><Select id="r-act" name="action_type" value={act} onChange={(e) => setAct(e.target.value)}><option value="notify">Notify only</option><option value="pause">Pause</option><option value="budget_decrease">Decrease budget</option><option value="budget_increase" disabled={mode === 'auto'}>Increase budget (approval only)</option></Select></F>
      </div>

      <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3"><legend className="px-1 text-sm font-medium">When</legend>
        <F id="r-m" label="Measure" hint={metric === 'cost_per_qualified_lead' ? 'Uses HQN lead quality. If that data is missing the rule waits; it does not fall back to clicks or form fills.' : undefined}>
          <Select id="r-m" name="metric" value={metric} onChange={(e) => setMetric(e.target.value)}><option value="spend_without_meta_leads">Spend while Meta reports no leads</option><option value="cost_per_meta_lead">Cost per Meta-reported lead</option><option value="cost_per_qualified_lead">Cost per HQN-qualified lead</option><option value="link_ctr">Link click-through rate (fraction, e.g. 0.01)</option></Select></F>
        <F id="r-op" label="is"><Select id="r-op" name="op"><option value="gt">above</option><option value="lt">below</option></Select></F>
        <F id="r-th" label="Your threshold" hint="No built-in numbers: you decide."><Input id="r-th" name="threshold" type="number" step="any" min="0" required inputMode="decimal" /></F>
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3"><legend className="px-1 text-sm font-medium">Evidence required before it can act</legend>
        <F id="r-w" label="Look back (days)"><Input id="r-w" name="eval_window_days" type="number" min="1" max="30" defaultValue={7} /></F>
        <F id="r-lag" label="Conversion lag to exclude (days)" hint="Recent days are skipped while conversions are still arriving."><Input id="r-lag" name="conversion_lag_days" type="number" min="0" max="28" defaultValue={2} /></F>
        <F id="r-age" label="Max data age (hours)"><Input id="r-age" name="max_data_age_hours" type="number" min="1" max="72" defaultValue={12} /></F>
        <F id="r-ms" label="Minimum spend in window"><Input id="r-ms" name="min_spend" type="number" step="any" min="0.01" required inputMode="decimal" /></F>
        <F id="r-mi" label="Minimum impressions"><Input id="r-mi" name="min_impressions" type="number" min="1" required inputMode="numeric" /></F>
        {metric === 'cost_per_qualified_lead' && <F id="r-ml" label="Minimum HQN leads"><Input id="r-ml" name="min_leads" type="number" min="1" inputMode="numeric" /></F>}
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3"><legend className="px-1 text-sm font-medium">Limits</legend>
        <F id="r-cd" label="Cooldown per target (hours)"><Input id="r-cd" name="cooldown_hours" type="number" min="1" max="720" defaultValue={72} /></F>
        <F id="r-mc" label="Max changes per day"><Input id="r-mc" name="max_changes_per_day" type="number" min="1" max="10" defaultValue={1} /></F>
        {budget && <F id="r-pct" label="Max change per action (%)"><Input id="r-pct" name="max_adjust_pct" type="number" min="1" max="50" required /></F>}
        {budget && <F id="r-fl" label="Budget floor"><Input id="r-fl" name="budget_floor" type="number" step="any" min="0" inputMode="decimal" /></F>}
        {act === 'budget_increase' && <F id="r-ce" label="Budget ceiling (required)"><Input id="r-ce" name="budget_ceiling" type="number" step="any" min="0" required inputMode="decimal" /></F>}
        <F id="r-rv" label="Review date" hint="Auto rules stop acting after this until re-confirmed."><Input id="r-rv" name="review_at" type="date" /></F>
        <F id="r-ex" label={mode === 'auto' ? 'Expires (required)' : 'Expires (optional)'}><Input id="r-ex" name="expires_at" type="date" required={mode === 'auto'} /></F>
      </fieldset>
      <p className="text-xs text-muted-foreground">Rules only look at campaigns/ad sets that own their budget, never adjust lifetime budgets, and cannot raise a budget automatically. A periodic job cannot promise an exact spend ceiling; use Meta&rsquo;s own account or campaign spending limits for that.</p>
      <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save rule (starts OFF)'}</Button><Msg s={state} /></div>
    </form>
  );
}

export function RuleControls({ id, enabled, mode, expired }: { id: string; enabled: boolean; mode: string; expired: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState<StudioState>();
  const run = (fn: () => Promise<StudioState>) => start(async () => { setMsg(await fn()); router.refresh(); });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        {!enabled && mode === 'auto' && <div className="space-y-1"><Label htmlFor={`auto-${id}`} className="text-xs">Type ENABLE AUTO</Label><Input id={`auto-${id}`} value={typed} onChange={(e) => setTyped(e.target.value)} className="h-9 w-40" autoComplete="off" /></div>}
        {enabled ? <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => setRuleEnabled(id, false))}>Disable</Button>
          : <Button type="button" size="sm" disabled={pending || expired} onClick={() => run(() => setRuleEnabled(id, true, typed))}>Enable</Button>}
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteRule(id))}>Delete</Button>
      </div>
      <Msg s={msg} />
    </div>
  );
}

export function EvaluateNow() {
  const [state, action, pending] = useActionState<StudioState, FormData>(async () => evaluateRulesNow(), undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>{pending ? 'Evaluating…' : 'Evaluate rules now'}</Button>
      <Msg s={state} />
    </form>
  );
}
