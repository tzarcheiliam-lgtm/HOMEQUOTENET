import { CheckCircle2, Circle, ShieldAlert } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { listContractors } from '@/lib/data/contractors';
import { loadAccountsWithControls, loadAssets, studioReadiness } from '@/lib/data/meta-studio';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { when } from '@/components/meta/format';
import { AccountControlsForm, AssetMapRow, DiscoveryButton, SwitchForm, ThresholdsForm, VerifyTrackingButton } from '@/components/meta/studio/settings-forms';
import type { Thresholds } from '@/lib/meta/studio/audit';

export const metadata = { title: 'Meta Ads settings · HomeQuote Network' };
export const dynamic = 'force-dynamic';

const KIND_LABEL = { page: 'Facebook Page', instagram: 'Instagram account', dataset: 'Dataset (Pixel)', lead_form: 'Instant Form' } as const;

export default async function StudioSettingsPage() {
  await requireRole(['admin']);
  const db = await createClient();
  const [{ data: s }, accounts, assets, contractorsAll, { data: activity }] = await Promise.all([
    db.from('meta_studio_settings').select('live_writes_enabled, automation_enabled, audit_thresholds').eq('id', true).maybeSingle(),
    loadAccountsWithControls(db),
    loadAssets(db),
    listContractors(),
    db.from('meta_activity_log').select('id, at, actor_kind, action, target_type, target_id, account_id, version_ref, detail').order('at', { ascending: false }).limit(40),
  ]);
  const contractors = contractorsAll.map((c) => ({ id: c.id, name: c.name }));
  const live = s?.live_writes_enabled ?? false;
  const auto = s?.automation_enabled ?? false;
  const thresholds = (s?.audit_thresholds ?? {}) as Thresholds & { tracking_verified_at?: string };
  const readiness = studioReadiness({ liveWritesEnabled: live, automationEnabled: auto }, accounts.length > 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Activity & settings" description="What HQN is allowed to do in Meta, what it can see, and a record of everything it did." />

      <Card>
        <CardHeader><CardTitle>Readiness</CardTitle><CardDescription>Tokens live only in server environment variables and are never shown here. Missing items show as &ldquo;Setup required&rdquo; wherever they matter.</CardDescription></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {readiness.map((r) => (
              <li key={r.key} className="flex items-start gap-2 py-2">
                {r.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="ready" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="not set" />}
                <div><span className="font-medium">{r.label}</span> {!r.ok && r.required && <Badge variant="warning">Setup required</Badge>}<p className="text-muted-foreground">{r.detail}</p></div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="size-4" aria-hidden="true" />Live writes <Badge variant={live ? 'warning' : 'muted'}>{live ? 'ON' : 'OFF'}</Badge></CardTitle>
            <CardDescription>Master switch for creating or changing anything in Meta. Each ad account below also has its own switch. Off means HQN is read-only.</CardDescription></CardHeader>
          <CardContent><SwitchForm kind="writes" on={live} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>HQN automation <Badge variant={auto ? 'warning' : 'muted'}>{auto ? 'RUNNING' : 'STOPPED'}</Badge></CardTitle>
            <CardDescription>The global stop for automatic rules. Stopping it does <b>not</b> pause ads that are already running in Meta; to pause those, use Ads Manager or an approved proposal.</CardDescription></CardHeader>
          <CardContent><SwitchForm kind="automation" on={auto} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Ad accounts</CardTitle><CardDescription>Writes and automation are off for every account until you switch them on here. Meta&rsquo;s own account spending limit (set in Business Settings) is the only hard spend ceiling; HQN checks periodically and cannot guarantee one.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {accounts.length === 0 ? <p className="text-sm text-muted-foreground">No ad accounts imported yet. Set the reporting token and run Sync now on Meta Ads &gt; Setup.</p> : accounts.map((a) => <AccountControlsForm key={a.id} account={a} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pages, Instagram, datasets and forms</CardTitle><CardDescription>Each asset must be mapped to a contractor before it can be used in that contractor&rsquo;s ads. Instagram accounts and Instant Forms follow their Page&rsquo;s mapping. Connecting your own business does not authorize managing other businesses&rsquo; accounts: that needs Meta App Review (see the setup guide).</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <DiscoveryButton />
          {assets.length === 0 ? <p className="text-sm text-muted-foreground">Nothing discovered yet.</p> : (
            <div>
              {assets.filter((a) => a.kind === 'page' || a.kind === 'dataset').map((a) => <AssetMapRow key={a.id} asset={a} contractors={contractors} label={KIND_LABEL[a.kind]} />)}
              <p className="mt-3 text-xs text-muted-foreground">{assets.filter((a) => a.kind === 'instagram').length} Instagram account(s) and {assets.filter((a) => a.kind === 'lead_form').length} Instant Form(s) are linked to the Pages above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Conversion tracking check</CardTitle><CardDescription>HQN cannot see Events Manager diagnostics, so rules that depend on conversion data stay suspended until you confirm tracking is healthy. Last confirmed: {when(thresholds.tracking_verified_at ?? null)}. It expires after 30 days.</CardDescription></CardHeader>
        <CardContent><VerifyTrackingButton /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Audit thresholds</CardTitle></CardHeader>
        <CardContent><ThresholdsForm values={thresholds} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Activity</CardTitle><CardDescription>Newest first. Records who or what acted; provider results and previous values are on each draft, proposal and rule.</CardDescription></CardHeader>
        <CardContent>
          {(activity ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nothing yet.</p> : (
            <ul className="divide-y text-sm">
              {(activity ?? []).map((a: { id: string; at: string; actor_kind: string; action: string; target_type: string | null; target_id: string | null; version_ref: string | null }) => (
                <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                  <span className="text-xs text-muted-foreground">{when(a.at)}</span>
                  <span className="font-medium">{a.action}</span>
                  <Badge variant="muted">{a.actor_kind}</Badge>
                  {a.target_type && <span className="text-xs text-muted-foreground">{a.target_type} {a.target_id?.slice(0, 8)}</span>}
                  {a.version_ref && <span className="text-xs text-muted-foreground">{a.version_ref}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
