import Link from 'next/link';
import { Settings } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { REASON_LABELS } from '@/lib/contractor-funnel/schema';
import { serviceLabel, capacityLabel, timelineLabel, reviewLabel } from '@/lib/contractor-funnel/labels';

export const metadata = { title: 'Contractor funnel · HomeQuote Network' };
export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'needs_review', label: 'Needs review' },
  { key: 'booked', label: 'Booked a call' },
] as const;

export default async function ContractorFunnelPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  await requireRole(['admin']);
  const { f = 'all' } = await searchParams;
  const filter = FILTERS.some((x) => x.key === f) ? f : 'all';

  let q = createAdminClient()
    .from('contractor_funnel_submissions')
    .select('id, created_at, name, company, services, service_area, appointment_capacity, start_timeline, qualification_status, qualification_reasons, booking_status, review_status')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filter === 'qualified' || filter === 'needs_review') q = q.eq('qualification_status', filter);
  if (filter === 'booked') q = q.neq('booking_status', 'none');
  const { data, error } = await q;
  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contractor funnel"
        description="Contractors who completed Check My Fit at /contractor-appointments. These are prospective HomeQuote clients, not homeowner leads."
      >
        <Link href="/app/funnels/contractor-prospects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <Settings className="size-4" aria-hidden="true" /> Calendar &amp; rules
        </Link>
      </PageHeader>

      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={x.key === 'all' ? '/app/contractor-funnel' : `/app/contractor-funnel?f=${x.key}`}
            aria-current={filter === x.key ? 'page' : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm ${filter === x.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {x.label}
          </Link>
        ))}
      </nav>

      {error && <Card><CardContent className="pt-6 text-sm text-destructive">Could not load submissions.</CardContent></Card>}
      {!error && rows.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No contractor submissions yet.</CardContent></Card>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => {
          const reasons = (p.qualification_reasons as string[]).map((r) => REASON_LABELS[r] ?? r);
          return (
            <Link key={p.id} href={`/app/contractor-funnel/${p.id}`} className="block rounded-xl focus-visible:outline-2">
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.company}</p>
                      <p className="truncate text-sm text-muted-foreground">{p.name}</p>
                    </div>
                    <Badge variant={p.qualification_status === 'qualified' ? 'default' : 'secondary'}>
                      {p.qualification_status === 'qualified' ? 'Qualified' : 'Needs review'}
                    </Badge>
                  </div>
                  <p className="text-sm">{(p.services as string[]).map(serviceLabel).join(', ')}</p>
                  <p className="text-sm text-muted-foreground">{p.service_area}</p>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div><dt className="text-muted-foreground">Capacity</dt><dd className="font-medium">{capacityLabel(p.appointment_capacity as string)}</dd></div>
                    <div><dt className="text-muted-foreground">Start</dt><dd className="font-medium">{timelineLabel(p.start_timeline as string)}</dd></div>
                  </dl>
                  {reasons.length > 0 && <p className="text-xs text-muted-foreground">Review: {reasons.join('; ')}</p>}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(p.created_at).toLocaleString()}</span>
                    <span>· {reviewLabel(p.review_status)}</span>
                    {p.booking_status !== 'none' && <Badge variant="secondary">{p.booking_status === 'confirmed' ? 'Call booked' : 'Call booked (unverified)'}</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
