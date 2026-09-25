import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getFunnelForBuilder } from '@/lib/data/funnel-builder';
import { listContractorOptions } from '@/lib/data/contractors';
import { listVerticals } from '@/lib/data/verticals';
import { FunnelBuilder } from '@/components/funnels/builder/funnel-builder';

export const metadata = { title: 'Edit funnel · HomeQuote Network' };

export default async function FunnelBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin']);
  const { id } = await params;
  const [funnel, contractors, verticals] = await Promise.all([
    getFunnelForBuilder(id),
    listContractorOptions(),
    listVerticals(),
  ]);
  if (!funnel) notFound();
  if (funnel.isDemo) {
    return <div className="p-6 text-sm text-muted-foreground">The demo funnel is not editable here. Edit content/funnels/pool-demo.json and run scripts/funnels.mjs update.</div>;
  }
  return (
    <FunnelBuilder
      funnelId={funnel.id}
      slug={funnel.slug}
      status={funnel.status}
      initialConfig={funnel.config}
      initialContractorId={funnel.contractorId}
      initialVerticalId={funnel.verticalId}
      contractors={contractors}
      verticals={verticals}
    />
  );
}
