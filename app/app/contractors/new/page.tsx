import { requireRole } from '@/lib/auth';
import { createContractor } from '@/lib/actions/contractors';
import { ContractorForm } from '@/components/contractors/contractor-form';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'New contractor · HomeQuote Network' };

export default async function NewContractorPage() {
  await requireRole(['admin']);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New contractor"
        description="Add the business. You can set verticals and pricing on the next screen."
        backHref="/app/contractors"
        backLabel="Contractors"
      />
      <ContractorForm action={createContractor} submitLabel="Create contractor" />
    </div>
  );
}
