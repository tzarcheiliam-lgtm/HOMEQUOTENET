import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { listLeads, type LeadFilters } from '@/lib/data/leads';
import { listVerticals, listSubServices } from '@/lib/data/verticals';
import { listContractorOptions } from '@/lib/data/contractors';
import { Button } from '@/components/ui/button';
import { LeadsTable } from '@/components/leads/leads-table';
import { LeadFiltersBar } from '@/components/leads/lead-filters';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/lib/types';

const QUICK_VIEWS: { label: string; href: string; match: (f: LeadFilters) => boolean }[] = [
  {
    label: 'All',
    href: '/app/leads',
    match: (f) => !f.qualification_status && !f.status && !f.assigned,
  },
  {
    label: 'Needs qualification',
    href: '/app/leads?review=needs_qualification',
    match: (f) => f.qualification_status === 'needs_qualification',
  },
  { label: 'New leads', href: '/app/leads?status=new', match: (f) => f.status === 'new' },
  {
    label: 'Unassigned',
    href: '/app/leads?assigned=unassigned',
    match: (f) => f.assigned === 'unassigned',
  },
  { label: 'Qualified', href: '/app/leads?status=qualified', match: (f) => f.status === 'qualified' },
];

export const metadata = { title: 'Leads · HomeQuote Network' };

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== '' ? s : undefined;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  const sp = await searchParams;

  const filters: LeadFilters = {
    q: first(sp.q),
    status: first(sp.status) as LeadStatus | undefined,
    vertical_id: first(sp.vertical_id),
    sub_service_id: first(sp.sub_service_id),
    source: first(sp.source),
    contractor_id: first(sp.contractor_id),
    city: first(sp.city),
    zip: first(sp.zip),
    date_from: first(sp.date_from),
    date_to: first(sp.date_to),
    archived: (first(sp.archived) as LeadFilters['archived']) ?? 'active',
    assigned: first(sp.assigned) as LeadFilters['assigned'],
    qualification_status: (['needs_qualification', 'qualified', 'not_qualified'] as const).find(
      (v) => v === first(sp.review)
    ),
  };

  const isContractor = profile.role === 'contractor';

  // Contractor view: only their assigned leads, read-only list.
  if (isContractor) {
    const rows = await listLeads({ archived: 'all' });
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Leads"
          description="Leads assigned to you. Open one to update status or add notes."
        />
        <LeadsTable rows={rows} contractors={[]} canDelete={false} readOnly />
      </div>
    );
  }

  const [rows, verticals, subServices, contractors] = await Promise.all([
    listLeads(filters),
    listVerticals(),
    listSubServices(),
    listContractorOptions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={`${rows.length} lead${rows.length === 1 ? '' : 's'} shown.`}
      >
        <Button asChild className="max-lg:hidden">
          <Link href="/app/leads/new">
            <Plus className="size-4" /> New lead
          </Link>
        </Button>
      </PageHeader>

      {/* Quick views for the setter workflow */}
      <nav
        aria-label="Quick views"
        className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 text-sm sm:mx-0 sm:px-0 lg:flex-wrap"
      >
        {QUICK_VIEWS.map((v) => {
          const active = v.match(filters);
          return (
            <Link
              key={v.label}
              href={v.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-10 shrink-0 items-center rounded-full border px-4 font-medium transition-colors lg:min-h-0 lg:rounded-md lg:px-3 lg:py-1',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent'
              )}
            >
              {v.label}
            </Link>
          );
        })}
      </nav>

      <LeadFiltersBar
        verticals={verticals}
        subServices={subServices}
        contractors={contractors}
        current={filters}
      />

      <LeadsTable
        rows={rows}
        contractors={contractors}
        canDelete={profile.role === 'admin'}
      />
    </div>
  );
}
