import Link from 'next/link';
import { AlertTriangle, Megaphone, Plug } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { canViewMetaAds, isHqnAdministrator } from '@/lib/permissions';
import { HQN_TIMEZONE, loadMetaReport, type MetaReport as MetaReportData } from '@/lib/data/meta-ads';
import { parseRange } from '@/lib/meta/metrics';
import { listContractors } from '@/lib/data/contractors';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { MetaReport } from '@/components/meta/meta-report';
import { MetaFilters } from '@/components/meta/meta-filters';
import { SyncButton } from '@/components/meta/sync-button';

export const metadata = { title: 'Meta Ads · HomeQuote Network' };
export const dynamic = 'force-dynamic';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const uuid = /^[0-9a-f-]{36}$/i;
const metaId = /^[0-9]{5,25}$/;

export default async function MetaAdsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const profile = await requireProfile();
  if (!canViewMetaAds(profile)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meta Ads" description="Ad performance and lead outcomes." />
        <EmptyState icon={Megaphone} title="Owners only" description="Meta Ads reporting is available to HomeQuote administrators and to contractor account owners." />
      </div>
    );
  }
  const admin = isHqnAdministrator(profile);
  const sp = await searchParams;
  const range = parseRange(one(sp.since), one(sp.until), HQN_TIMEZONE);
  const contractorParam = admin ? one(sp.contractor) : undefined;
  const campaignId = one(sp.campaign), adsetId = one(sp.adset), adId = one(sp.ad);
  const filters = {
    range,
    contractorId: contractorParam && uuid.test(contractorParam) ? contractorParam : null,
    campaignId: campaignId && metaId.test(campaignId) ? campaignId : null,
    adsetId: adsetId && metaId.test(adsetId) ? adsetId : null,
    adId: adId && metaId.test(adId) ? adId : null,
  };

  const db = await createClient();
  let report: MetaReportData | null = null;
  let loadError = false;
  try { report = await loadMetaReport(db, filters); } catch { loadError = true; }
  const contractors = admin ? (await listContractors()).map((c) => ({ id: c.id, name: c.name })) : undefined;

  const qs = (extra: Record<string, string | null | undefined>) => {
    const q = new URLSearchParams({ since: range.since, until: range.until });
    if (filters.contractorId) q.set('contractor', filters.contractorId);
    for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
    return `/app/meta-ads?${q}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Meta Ads" description="Ad performance from Meta next to what actually happened to the leads in HQN.">
        {admin && (
          <div className="flex items-start gap-2">
            <Button asChild variant="outline" size="sm"><Link href="/app/meta-ads/setup"><Plug className="size-4" aria-hidden="true" />Setup</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href="/app/meta-ads/events">Delivery</Link></Button>
            <SyncButton />
          </div>
        )}
      </PageHeader>

      <MetaFilters range={range} tz={HQN_TIMEZONE} contractors={contractors} contractorId={filters.contractorId}
        hidden={{ campaign: filters.campaignId ?? undefined, adset: filters.adsetId ?? undefined, ad: filters.adId ?? undefined }} />

      {loadError || !report ? (
        <EmptyState icon={AlertTriangle} title="Couldn’t load Meta Ads data" description="This is a problem on our side, not with your ads. Try again in a moment; if it keeps happening, an administrator can check the server logs." />
      ) : report.accounts.length === 0 ? (
        <EmptyState icon={Plug}
          title={admin ? 'Meta isn’t connected yet' : 'No Meta ad accounts are linked to your company'}
          description={admin ? 'Connect a Marketing API token on the Setup page, run a sync, then map each ad account to a contractor.' : 'When HomeQuote links your ad campaigns here you’ll see their performance and lead outcomes.'}
          action={admin ? <Button asChild><Link href="/app/meta-ads/setup">Open setup</Link></Button> : undefined} />
      ) : (
        <MetaReport report={report} admin={admin} qs={qs} filters={filters} range={range} />
      )}
    </div>
  );
}
