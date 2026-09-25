import { requireRole } from '@/lib/auth';
import { listFunnelTemplates } from '@/lib/data/funnel-builder';
import { listContractorOptions } from '@/lib/data/contractors';
import { PageHeader } from '@/components/ui/page-header';
import { CreateFunnelForm } from '@/components/funnels/builder/create-funnel-form';

export const metadata = { title: 'New funnel · HomeQuote Network' };

export default async function NewFunnelPage() {
  await requireRole(['admin']);
  const [templates, contractors] = await Promise.all([listFunnelTemplates(), listContractorOptions()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Create funnel" description="Start blank or duplicate a template, then build it visually." backHref="/app/funnels" backLabel="Funnels" />
      <CreateFunnelForm templates={templates} contractors={contractors} />
    </div>
  );
}
