import { ArrowDownToLine } from 'lucide-react';
import { requireRole } from '@/lib/auth';
import { listIntakeEvents } from '@/lib/data/integrations';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { IntakeEventsTable } from '@/components/integrations/intake-events-table';

export const metadata = { title: 'Lead Intake · HomeQuote Network' };

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== '' ? s : undefined;
}

export default async function LeadIntakePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin']);
  const sp = await searchParams;

  const events = await listIntakeEvents({
    provider: first(sp.provider),
    status: first(sp.status),
    limit: 300,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Intake"
        description="Every inbound lead across all sources, with processing and duplicate status."
      />

      {events.length === 0 ? (
        <EmptyState
          icon={ArrowDownToLine}
          title="No intake events yet"
          description="When a source sends a lead, it appears here — created, duplicate, or error."
        />
      ) : (
        <IntakeEventsTable rows={events} />
      )}
    </div>
  );
}
