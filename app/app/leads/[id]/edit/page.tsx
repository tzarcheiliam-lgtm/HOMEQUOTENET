import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getLead } from '@/lib/data/leads';
import { listVerticals, listSubServices } from '@/lib/data/verticals';
import { updateLead } from '@/lib/actions/leads';
import { LeadForm } from '@/components/leads/lead-form';
import { PageHeader } from '@/components/ui/page-header';

export const metadata = { title: 'Edit lead · HomeQuote Network' };

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole(['admin', 'setter']);
  const { id } = await params;

  const [detail, verticals, subServices] = await Promise.all([
    getLead(id),
    listVerticals(),
    listSubServices(),
  ]);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title="Edit lead" backHref={`/app/leads/${id}`} backLabel="Back to lead" />
      <LeadForm
        action={updateLead}
        lead={detail.lead}
        verticals={verticals}
        subServices={subServices}
        canEditEconomics={profile.role === 'admin'}
        submitLabel="Save changes"
      />
    </div>
  );
}
