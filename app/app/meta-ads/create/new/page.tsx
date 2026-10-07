import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { listContractors } from '@/lib/data/contractors';
import { loadAssets } from '@/lib/data/meta-studio';
import { draftConfigSchema } from '@/lib/meta/studio/draft';
import { PageHeader } from '@/components/ui/page-header';
import { AdWizard, type WizardInitial } from '@/components/meta/studio/ad-wizard';

export const metadata = { title: 'New ad · HomeQuote Network' };
export const dynamic = 'force-dynamic';

export default async function NewAdPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  await requireRole(['admin']);
  const sp = await searchParams;
  const db = await createClient();
  const [contractors, assets, { data: accounts }, { data: campaigns }, { data: adsets }, { data: creatives }] = await Promise.all([
    listContractors(),
    loadAssets(db),
    db.from('meta_ad_accounts').select('id, name, currency, timezone_name, contractor_id').order('name'),
    db.from('meta_campaigns').select('id, account_id, name').order('name').limit(500),
    db.from('meta_adsets').select('id, account_id, campaign_id, name').order('name').limit(1000),
    db.from('meta_creatives').select('id, name, kind, contractor_id').eq('status', 'ready').order('created_at', { ascending: false }).limit(500),
  ]);
  let initial: WizardInitial = null;
  if (sp.draft && /^[0-9a-f-]{36}$/i.test(sp.draft)) {
    const { data: d } = await db.from('meta_ad_drafts').select('id, name, contractor_id, account_id, creative_id, config, status').eq('id', sp.draft).maybeSingle();
    const cfg = draftConfigSchema.safeParse(d?.config);
    if (d && cfg.success && !['creating', 'created_paused', 'partial'].includes(d.status)) initial = { id: d.id, name: d.name, contractor_id: d.contractor_id, account_id: d.account_id, creative_id: d.creative_id, config: cfg.data };
  }
  const noAccounts = !(accounts ?? []).length;
  return (
    <div className="space-y-6">
      <PageHeader title={initial ? 'Edit ad draft' : 'New ad'} description="Work top to bottom. Nothing is sent to Meta until you confirm and create on the review page." backHref="/app/meta-ads/create" backLabel="Create Ad" />
      {noAccounts && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Setup required: no ad accounts have been imported yet. Set the reporting token and run Sync now on Meta Ads &gt; Setup, then discover Pages and datasets under Activity &amp; settings.</p>}
      {initial && <p className="text-sm text-muted-foreground">Editing clears any earlier confirmation. Re-enter the schedule times.</p>}
      <AdWizard
        key={initial?.id ?? 'new'}
        initial={initial}
        data={{
          contractors: contractors.map((c) => ({ id: c.id, name: c.name })),
          accounts: (accounts ?? []) as never, assets, campaigns: (campaigns ?? []) as never, adsets: (adsets ?? []) as never, creatives: (creatives ?? []) as never,
        }}
      />
    </div>
  );
}
