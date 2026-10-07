'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CTA_TYPES, FB_POSITIONS, IG_POSITIONS, eligibleGoals, type DraftConfig } from '@/lib/meta/studio/draft';
import { buildDestination } from '@/lib/meta/studio/url-params';
import { zonedLocalToIso } from '@/lib/meta/studio/time';
import { saveDraft } from '@/lib/actions/meta-studio';
import { Msg } from './ui';

export type WizardData = {
  contractors: { id: string; name: string }[];
  accounts: { id: string; name: string | null; currency: string | null; timezone_name: string | null; contractor_id: string | null }[];
  assets: { kind: 'page' | 'instagram' | 'dataset' | 'lead_form'; meta_id: string; name: string | null; parent_meta_id: string | null; account_id: string | null; contractor_id: string | null }[];
  campaigns: { id: string; account_id: string; name: string | null }[];
  adsets: { id: string; account_id: string; campaign_id: string; name: string | null }[];
  creatives: { id: string; name: string; kind: 'image' | 'video'; contractor_id: string | null }[];
};
export type WizardInitial = { id?: string; name: string; contractor_id: string | null; account_id: string; creative_id: string | null; config: DraftConfig } | null;

const FB_LABEL: Record<string, string> = { feed: 'Facebook Feed', story: 'Facebook Stories', video_feeds: 'Facebook video feeds', marketplace: 'Marketplace', right_hand_column: 'Right column', search: 'Facebook Search' };
const IG_LABEL: Record<string, string> = { stream: 'Instagram Feed', story: 'Instagram Stories', reels: 'Instagram Reels' };
const GOAL_LABEL: Record<string, string> = {
  LEAD_GENERATION: 'Maximize number of leads', QUALITY_LEAD: 'Maximize quality leads (needs outcome events)', OFFSITE_CONVERSIONS: 'Website conversions (Lead event)',
  LINK_CLICKS: 'Link clicks', LANDING_PAGE_VIEWS: 'Landing page views',
};

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{n}</span>{title}</CardTitle>{hint && <CardDescription>{hint}</CardDescription>}</CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}
function Field({ id, label, hint, children, wide }: { id: string; label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={`space-y-1.5 ${wide ? 'sm:col-span-2' : ''}`}><Label htmlFor={id}>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}

export function AdWizard({ data, initial }: { data: WizardData; initial: WizardInitial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: string } | undefined>();
  const c0 = initial?.config;
  const [f, setF] = useState({
    name: initial?.name ?? '', contractor_id: initial?.contractor_id ?? '', account_id: initial?.account_id ?? '', creative_id: initial?.creative_id ?? '',
    page_id: c0?.page_id ?? '', instagram_user_id: c0?.instagram_user_id ?? '', dataset_id: c0?.dataset_id ?? '',
    mode: c0?.structure.mode ?? 'new', campaign_id: c0 && c0.structure.mode !== 'new' ? c0.structure.campaign_id : '', adset_id: c0?.structure.mode === 'existing_adset' ? c0.structure.adset_id : '',
    objective: c0?.objective ?? 'OUTCOME_LEADS', location: c0?.conversion_location ?? 'instant_form', goal: c0?.optimization_goal ?? 'LEAD_GENERATION',
    lead_form_id: c0?.ad.lead_form_id ?? '', destination_url: c0?.ad.destination_url ?? '',
    budget_level: c0?.budget.level ?? 'adset', budget_type: c0?.budget.type ?? 'daily', budget_amount: c0 ? String(c0.budget.amount) : '',
    bid_strategy: c0?.bid.strategy ?? 'LOWEST_COST_WITHOUT_CAP', bid_amount: c0?.bid.amount ? String(c0.bid.amount) : '',
    start: '', end: '', countries: c0?.targeting.countries.join(', ') ?? 'US', age_min: String(c0?.targeting.age_min ?? 18), age_max: String(c0?.targeting.age_max ?? 65),
    gender: c0?.targeting.genders.length === 1 ? String(c0.targeting.genders[0]) : '', regions: c0?.targeting.regions.join(', ') ?? '',
    placements: c0?.placements.mode ?? 'automatic', fb: c0?.placements.mode === 'manual' ? c0.placements.facebook : ([] as string[]), ig: c0?.placements.mode === 'manual' ? c0.placements.instagram : ([] as string[]),
    primary_text: c0?.ad.primary_text ?? '', headline: c0?.ad.headline ?? '', description: c0?.ad.description ?? '', cta: c0?.ad.cta ?? 'GET_QUOTE',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const contractorId = f.contractor_id || null;
  const accounts = data.accounts.filter((a) => a.contractor_id === contractorId);
  const account = data.accounts.find((a) => a.id === f.account_id);
  const tz = account?.timezone_name ?? 'UTC';
  const pages = data.assets.filter((a) => a.kind === 'page' && a.contractor_id === contractorId);
  const igs = data.assets.filter((a) => a.kind === 'instagram' && a.parent_meta_id === f.page_id);
  const forms = data.assets.filter((a) => a.kind === 'lead_form' && a.parent_meta_id === f.page_id);
  const datasets = data.assets.filter((a) => a.kind === 'dataset' && a.account_id === f.account_id);
  const camps = data.campaigns.filter((c) => c.account_id === f.account_id);
  const sets = data.adsets.filter((s) => s.campaign_id === f.campaign_id);
  const creatives = data.creatives.filter((c) => c.contractor_id === contractorId);
  const goals = eligibleGoals(f.objective as 'OUTCOME_LEADS' | 'OUTCOME_TRAFFIC', f.location as 'instant_form' | 'website');
  const dest = useMemo(() => (f.location === 'website' && f.destination_url ? buildDestination(f.destination_url) : null), [f.location, f.destination_url]);

  function toggle(list: 'fb' | 'ig', v: string) { set(list, f[list].includes(v) ? f[list].filter((x) => x !== v) : [...f[list], v]); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const startIso = f.start ? zonedLocalToIso(f.start, tz) : null;
    const endIso = f.end ? zonedLocalToIso(f.end, tz) : null;
    if (!startIso) { setResult({ error: 'Choose a start date and time.' }); return; }
    const num = (s: string) => (s.trim() === '' ? null : Number(s));
    const config = {
      structure: f.mode === 'new' ? { mode: 'new' } : f.mode === 'existing_campaign' ? { mode: 'existing_campaign', campaign_id: f.campaign_id } : { mode: 'existing_adset', campaign_id: f.campaign_id, adset_id: f.adset_id },
      objective: f.objective, conversion_location: f.location, optimization_goal: f.goal, special_ad_categories: [],
      page_id: f.page_id, instagram_user_id: f.instagram_user_id || null, dataset_id: f.dataset_id || null,
      budget: { level: f.budget_level, type: f.budget_type, amount: Number(f.budget_amount) },
      bid: { strategy: f.bid_strategy, amount: num(f.bid_amount) },
      schedule: { start: startIso, end: endIso },
      targeting: { countries: f.countries.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean), age_min: Number(f.age_min), age_max: Number(f.age_max), genders: f.gender ? [Number(f.gender)] : [], regions: f.regions.split(',').map((s) => s.trim()).filter(Boolean) },
      placements: f.placements === 'automatic' ? { mode: 'automatic' } : { mode: 'manual', facebook: f.fb, instagram: f.ig },
      ad: { primary_text: f.primary_text, headline: f.headline, description: f.description, cta: f.cta, destination_url: f.location === 'website' ? f.destination_url : null, lead_form_id: f.location === 'instant_form' ? f.lead_form_id || null : null },
    };
    start(async () => {
      const r = await saveDraft({ id: initial?.id, name: f.name, contractor_id: contractorId, account_id: f.account_id, creative_id: f.creative_id || null, config });
      if (r?.error) { setResult(r); return; }
      router.push(`/app/meta-ads/create/${r?.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Section n={1} title="Who is this for?" hint="Only Pages, accounts and datasets mapped to the contractor can be used. Map them in Activity & settings.">
        <Field id="w-name" label="Ad name" wide><Input id="w-name" value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={120} required placeholder="e.g. Spring pool quotes" /></Field>
        <Field id="w-con" label="Contractor"><Select id="w-con" value={f.contractor_id} onChange={(e) => setF((p) => ({ ...p, contractor_id: e.target.value, account_id: '', page_id: '', instagram_user_id: '', dataset_id: '', creative_id: '', lead_form_id: '' }))}>
          <option value="">HomeQuote network</option>{data.contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field id="w-acct" label="Ad account" hint={account ? `${account.currency ?? '?'} · ${tz}` : undefined}><Select id="w-acct" required value={f.account_id} onChange={(e) => setF((p) => ({ ...p, account_id: e.target.value, dataset_id: '', campaign_id: '', adset_id: '' }))}>
          <option value="">{accounts.length ? 'Choose…' : 'No account mapped to this contractor'}</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name ?? a.id}</option>)}</Select></Field>
        <Field id="w-page" label="Facebook Page"><Select id="w-page" required value={f.page_id} onChange={(e) => setF((p) => ({ ...p, page_id: e.target.value, instagram_user_id: '', lead_form_id: '' }))}>
          <option value="">{pages.length ? 'Choose…' : 'No Page mapped to this contractor'}</option>{pages.map((p) => <option key={p.meta_id} value={p.meta_id}>{p.name ?? p.meta_id}</option>)}</Select></Field>
        <Field id="w-ig" label="Instagram account (optional)"><Select id="w-ig" value={f.instagram_user_id} onChange={(e) => set('instagram_user_id', e.target.value)}>
          <option value="">Use the Page&rsquo;s identity</option>{igs.map((p) => <option key={p.meta_id} value={p.meta_id}>{p.name ?? p.meta_id}</option>)}</Select></Field>
      </Section>

      <Section n={2} title="Campaign and goal" hint="Supported: lead and traffic campaigns. Everything is created paused.">
        <Field id="w-mode" label="Campaign"><Select id="w-mode" value={f.mode} onChange={(e) => set('mode', e.target.value as typeof f.mode)}>
          <option value="new">Create a new campaign and ad set</option><option value="existing_campaign">New ad set in an existing campaign</option><option value="existing_adset">New ad in an existing ad set</option></Select></Field>
        {f.mode !== 'new' && <Field id="w-camp" label="Existing campaign"><Select id="w-camp" value={f.campaign_id} onChange={(e) => setF((p) => ({ ...p, campaign_id: e.target.value, adset_id: '' }))}><option value="">Choose…</option>{camps.map((c) => <option key={c.id} value={c.id}>{c.name ?? c.id}</option>)}</Select></Field>}
        {f.mode === 'existing_adset' && <Field id="w-set" label="Existing ad set"><Select id="w-set" value={f.adset_id} onChange={(e) => set('adset_id', e.target.value)}><option value="">Choose…</option>{sets.map((s) => <option key={s.id} value={s.id}>{s.name ?? s.id}</option>)}</Select></Field>}
        <Field id="w-obj" label="Objective"><Select id="w-obj" value={f.objective} onChange={(e) => { const o = e.target.value; const loc = o === 'OUTCOME_TRAFFIC' ? 'website' : f.location; setF((p) => ({ ...p, objective: o as typeof f.objective, location: loc, goal: eligibleGoals(o as 'OUTCOME_LEADS', loc as 'website')[0] ?? p.goal })); }}>
          <option value="OUTCOME_LEADS">Leads</option><option value="OUTCOME_TRAFFIC">Traffic</option></Select></Field>
        <Field id="w-loc" label="Where do people convert?"><Select id="w-loc" value={f.location} onChange={(e) => { const l = e.target.value; setF((p) => ({ ...p, location: l as typeof f.location, goal: eligibleGoals(p.objective as 'OUTCOME_LEADS', l as 'website')[0] ?? p.goal })); }}>
          <option value="instant_form" disabled={f.objective === 'OUTCOME_TRAFFIC'}>Instant Form (on Facebook/Instagram)</option><option value="website">My website</option></Select></Field>
        <Field id="w-goal" label="Optimize for" hint="Only goals that fit the choices above are listed."><Select id="w-goal" value={f.goal} onChange={(e) => set('goal', e.target.value as typeof f.goal)}>{goals.map((g) => <option key={g} value={g}>{GOAL_LABEL[g] ?? g}</option>)}</Select></Field>
        {f.location === 'website' && f.goal === 'OFFSITE_CONVERSIONS' && <Field id="w-ds" label="Dataset (Pixel)"><Select id="w-ds" value={f.dataset_id} onChange={(e) => set('dataset_id', e.target.value)}><option value="">Choose…</option>{datasets.map((d) => <option key={d.meta_id} value={d.meta_id}>{d.name ?? d.meta_id}</option>)}</Select></Field>}
      </Section>

      <Section n={3} title="Budget, schedule and audience" hint={account ? `Amounts are in ${account.currency ?? 'the account currency'}; times are in ${tz}.` : 'Choose an ad account first.'}>
        <Field id="w-bt" label="Budget type"><Select id="w-bt" value={f.budget_type} onChange={(e) => set('budget_type', e.target.value as typeof f.budget_type)}><option value="daily">Daily</option><option value="lifetime">Lifetime (needs an end date)</option></Select></Field>
        <Field id="w-ba" label={`Budget amount (${account?.currency ?? ''})`}><Input id="w-ba" type="number" inputMode="decimal" min="1" step="0.01" required value={f.budget_amount} onChange={(e) => set('budget_amount', e.target.value)} /></Field>
        {f.mode === 'new' && <Field id="w-bl" label="Who controls the budget?" hint="Budgets live on either the campaign or the ad set, not both."><Select id="w-bl" value={f.budget_level} onChange={(e) => set('budget_level', e.target.value as typeof f.budget_level)}><option value="adset">The ad set</option><option value="campaign">The campaign</option></Select></Field>}
        <Field id="w-bid" label="Bidding"><Select id="w-bid" value={f.bid_strategy} onChange={(e) => set('bid_strategy', e.target.value as typeof f.bid_strategy)}><option value="LOWEST_COST_WITHOUT_CAP">Lowest cost (no cap)</option><option value="COST_CAP">Cost cap</option><option value="LOWEST_COST_WITH_BID_CAP">Bid cap</option></Select></Field>
        {f.bid_strategy !== 'LOWEST_COST_WITHOUT_CAP' && <Field id="w-bida" label="Cap amount"><Input id="w-bida" type="number" inputMode="decimal" min="0.01" step="0.01" value={f.bid_amount} onChange={(e) => set('bid_amount', e.target.value)} /></Field>}
        <Field id="w-s" label="Start"><Input id="w-s" type="datetime-local" required value={f.start} onChange={(e) => set('start', e.target.value)} /></Field>
        <Field id="w-e" label="End (optional)"><Input id="w-e" type="datetime-local" value={f.end} onChange={(e) => set('end', e.target.value)} /></Field>
        <Field id="w-co" label="Countries" hint="Two-letter codes, comma separated."><Input id="w-co" required value={f.countries} onChange={(e) => set('countries', e.target.value)} /></Field>
        <Field id="w-reg" label="Meta region keys (optional)" hint="Numeric keys from Meta targeting search, comma separated."><Input id="w-reg" value={f.regions} onChange={(e) => set('regions', e.target.value)} inputMode="numeric" /></Field>
        <Field id="w-amin" label="Minimum age"><Input id="w-amin" type="number" min="18" max="65" value={f.age_min} onChange={(e) => set('age_min', e.target.value)} /></Field>
        <Field id="w-amax" label="Maximum age"><Input id="w-amax" type="number" min="18" max="65" value={f.age_max} onChange={(e) => set('age_max', e.target.value)} /></Field>
        <Field id="w-g" label="Gender"><Select id="w-g" value={f.gender} onChange={(e) => set('gender', e.target.value)}><option value="">All</option><option value="1">Men</option><option value="2">Women</option></Select></Field>
        <Field id="w-pl" label="Placements"><Select id="w-pl" value={f.placements} onChange={(e) => set('placements', e.target.value as typeof f.placements)}><option value="automatic">Automatic (recommended by Meta)</option><option value="manual">Choose placements</option></Select></Field>
        {f.placements === 'manual' && (
          <fieldset className="space-y-2 sm:col-span-2"><legend className="text-sm font-medium">Placements</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {FB_POSITIONS.map((p) => <label key={p} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={f.fb.includes(p)} onChange={() => toggle('fb', p)} />{FB_LABEL[p]}</label>)}
              {IG_POSITIONS.map((p) => <label key={p} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={f.ig.includes(p)} onChange={() => toggle('ig', p)} />{IG_LABEL[p]}</label>)}
            </div></fieldset>
        )}
      </Section>

      <Section n={4} title="Creative" hint="Choose an uploaded file that passed validation. Upload new ones in the Creative Library.">
        <Field id="w-cr" label="Creative" wide><Select id="w-cr" required value={f.creative_id} onChange={(e) => set('creative_id', e.target.value)}><option value="">{creatives.length ? 'Choose…' : 'No ready creatives for this contractor'}</option>{creatives.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.kind})</option>)}</Select></Field>
      </Section>

      <Section n={5} title="Ad content">
        <Field id="w-pt" label="Primary text" wide hint={`${f.primary_text.length} characters. Over 125 may be cut off behind “See more”.`}><Textarea id="w-pt" required rows={4} maxLength={2200} value={f.primary_text} onChange={(e) => set('primary_text', e.target.value)} /></Field>
        <Field id="w-h" label="Headline" hint={`${f.headline.length}/40 recommended`}><Input id="w-h" maxLength={255} value={f.headline} onChange={(e) => set('headline', e.target.value)} /></Field>
        <Field id="w-d" label="Description (where shown)" hint={`${f.description.length}/30 recommended`}><Input id="w-d" maxLength={255} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <Field id="w-cta" label="Button"><Select id="w-cta" value={f.cta} onChange={(e) => set('cta', e.target.value as typeof f.cta)}>{CTA_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())}</option>)}</Select></Field>
        {f.location === 'instant_form'
          ? <Field id="w-form" label="Instant Form" hint="Forms are created in Meta; pick an existing one for this Page."><Select id="w-form" required value={f.lead_form_id} onChange={(e) => set('lead_form_id', e.target.value)}><option value="">{forms.length ? 'Choose…' : 'No forms found for this Page'}</option>{forms.map((x) => <option key={x.meta_id} value={x.meta_id}>{x.name ?? x.meta_id}</option>)}</Select></Field>
          : <Field id="w-url" label="Destination URL" wide><Input id="w-url" type="url" required inputMode="url" placeholder="https://…" value={f.destination_url} onChange={(e) => set('destination_url', e.target.value)} />
              {dest && !dest.ok && <p role="alert" className="text-xs text-destructive">{dest.error}</p>}
              {dest?.ok && <p className="text-xs text-muted-foreground">HQN adds {dest.added.length} tracking parameter(s) as URL tags{dest.keptExisting.length ? `; kept your existing ${dest.keptExisting.join(', ')}` : ''}. Nothing already on your link is overwritten.</p>}</Field>}
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save draft and review'}</Button>
        <Msg s={result} />
        <p className="text-xs text-muted-foreground">Saving a draft does not contact Meta.</p>
      </div>
    </form>
  );
}
