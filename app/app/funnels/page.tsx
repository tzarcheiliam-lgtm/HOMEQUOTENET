import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { listFunnelsForDashboard, countFunnelLeadsThisMonth, type FunnelDashboardRow } from '@/lib/data/funnel-builder';
import { listContractorOptions } from '@/lib/data/contractors';
import { PageHeader } from '@/components/ui/page-header';
import { KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { FunnelFiltersBar, type FunnelListFilters } from '@/components/funnels/dashboard/funnel-filters';
import { FunnelDashboard } from '@/components/funnels/dashboard/funnel-dashboard';
import type { FunnelCardData, FunnelGroup } from '@/components/funnels/dashboard/types';

export const metadata = { title: 'Funnels · HomeQuote Network' };

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== '' ? s : undefined;
}

function toCardData(row: FunnelDashboardRow): FunnelCardData {
  return {
    id: row.id, slug: row.slug, status: row.status, isDemo: row.isDemo,
    clientName: row.clientName, industry: row.industry,
    contractorId: row.contractorId, contractorName: row.contractorName,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
    starts: row.starts, leads: row.leads, bookings: row.bookings, needsQualification: row.needsQualification,
    conversionRate: row.starts > 0 ? (row.leads / row.starts) * 100 : null,
  };
}

export default async function FunnelsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(['admin']);
  const sp = await searchParams;

  const filters: FunnelListFilters = {
    q: first(sp.q) ?? '',
    status: (first(sp.status) as FunnelListFilters['status']) ?? 'all',
    contractor: first(sp.contractor) ?? 'all',
    niche: first(sp.niche) ?? 'all',
    sort: (first(sp.sort) as FunnelListFilters['sort']) ?? 'updated',
    group: first(sp.group) === 'contractor' ? 'contractor' : 'none',
  };

  const [allRows, leadsThisMonth, contractors] = await Promise.all([
    listFunnelsForDashboard(),
    countFunnelLeadsThisMonth(),
    listContractorOptions(),
  ]);

  const cards = allRows.map(toCardData);
  const niches = Array.from(new Set(cards.map((c) => c.industry).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const recentlyEdited = [...cards].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 5);

  const q = filters.q.trim().toLowerCase();
  let matching = cards.filter((c) => {
    if (filters.status !== 'all' && c.status !== filters.status) return false;
    if (filters.contractor === 'house' && c.contractorId) return false;
    if (filters.contractor !== 'all' && filters.contractor !== 'house' && c.contractorId !== filters.contractor) return false;
    if (filters.niche !== 'all' && c.industry !== filters.niche) return false;
    if (q && !`${c.clientName} ${c.contractorName ?? 'homequote house'} ${c.industry} ${c.slug}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const sorters: Record<FunnelListFilters['sort'], (a: FunnelCardData, b: FunnelCardData) => number> = {
    updated: (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
    created: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    name: (a, b) => a.clientName.localeCompare(b.clientName),
    leads: (a, b) => b.leads - a.leads,
    conversion: (a, b) => (b.conversionRate ?? -1) - (a.conversionRate ?? -1),
    starts: (a, b) => b.starts - a.starts,
  };
  matching = [...matching].sort(sorters[filters.sort]);

  const grouped = filters.group === 'contractor';
  let groups: FunnelGroup[];
  if (grouped) {
    const byKey = new Map<string, FunnelGroup>();
    for (const row of matching) {
      const key = row.contractorId ?? 'house';
      const label = row.contractorName ?? 'HomeQuote (house)';
      if (!byKey.has(key)) byKey.set(key, { key, label, rows: [] });
      byKey.get(key)!.rows.push(row);
    }
    groups = [...byKey.values()].sort((a, b) => a.key === 'house' ? 1 : b.key === 'house' ? -1 : a.label.localeCompare(b.label));
  } else {
    groups = [{ key: 'all', label: '', rows: matching }];
  }

  const publishedCount = cards.filter((c) => c.status === 'published').length;
  const totalStarts = cards.reduce((n, c) => n + c.starts, 0);
  const totalLeads = cards.reduce((n, c) => n + c.leads, 0);
  const avgCompletion = totalStarts > 0 ? `${((totalLeads / totalStarts) * 100).toFixed(1)}%` : '—';

  return <div className="space-y-6">
    <PageHeader title="Lead funnels" description="Find and manage every funnel — search, filter and sort instead of scrolling.">
      <Button asChild><Link href="/app/funnels/new">Create funnel</Link></Button>
    </PageHeader>

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard label="Total funnels" value={cards.length} />
      <KpiCard label="Published" value={publishedCount} />
      <KpiCard label="Leads this month" value={leadsThisMonth} />
      <KpiCard label="Avg completion rate" value={avgCompletion} />
    </div>

    {recentlyEdited.length > 0 && (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">Recently edited:</span>
        {recentlyEdited.map((r) => (
          <Link key={r.id} href={r.isDemo ? `/app/funnels/${r.id}/analytics` : `/app/funnels/${r.id}/builder`}
            className="rounded-md border px-2 py-1 hover:bg-accent">
            {r.clientName}
          </Link>
        ))}
      </div>
    )}

    <FunnelFiltersBar current={filters} contractors={contractors} niches={niches} />

    <FunnelDashboard groups={groups} grouped={grouped} hasAnyFunnels={cards.length > 0} />
  </div>;
}
