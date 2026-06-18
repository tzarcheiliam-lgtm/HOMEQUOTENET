import { requireRole } from '@/lib/auth';
import { listVerticals, listSubServices } from '@/lib/data/verticals';
import { createLead } from '@/lib/actions/leads';
import { LeadForm } from '@/components/leads/lead-form';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'New lead · HomeQuote Network' };

export default async function NewLeadPage() {
  const profile = await requireRole(['admin', 'setter']);
  const [verticals, subServices] = await Promise.all([
    listVerticals(),
    listSubServices(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New lead"
        description="Capture a homeowner lead with full marketing attribution."
        backHref="/app/leads"
        backLabel="Leads"
      />
      <LeadForm
        action={createLead}
        verticals={verticals}
        subServices={subServices}
        canEditEconomics={profile.role === 'admin'}
        submitLabel="Create lead"
      />
    </div>
  );
}
