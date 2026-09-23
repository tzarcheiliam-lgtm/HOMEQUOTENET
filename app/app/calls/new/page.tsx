import { requireRole } from '@/lib/auth';
import { listCallers } from '@/lib/data/prospects';
import { PageHeader } from '@/components/ui/page-header';
import { ProspectForm } from '@/components/calls/prospect-form';

export const metadata = { title: 'Add prospect · HomeQuote Network' };

export default async function NewProspectPage() {
  await requireRole(['admin']);
  const callers = await listCallers();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Add prospect"
        description="One contractor at a time. For a full list, use the import script so records are deduplicated first."
        backHref="/app/calls?view=all"
        backLabel="All prospects"
      />
      <ProspectForm callers={callers} />
    </div>
  );
}
