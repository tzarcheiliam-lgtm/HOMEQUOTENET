import { requireRole } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { StudioView } from '@/components/creative-studio/studio-view';
import { AddEmbedDialog } from '@/components/creative-studio/add-embed-dialog';
import { getStudioItems } from '@/lib/data/creative-studio';

export const metadata = { title: 'Creative Studio · HomeQuote Network' };

export default async function CreativeStudioPage() {
  await requireRole(['admin']);
  const { tools, agents } = await getStudioItems();
  const kinds = Array.from(new Set(tools.map((t) => t.kind)));
  return (
    <div className="space-y-6">
      <PageHeader title="Creative Studio" description="The creative assistant, plus image and video generators for ad creative.">
        <AddEmbedDialog kinds={kinds} />
      </PageHeader>
      <StudioView tools={tools} agents={agents} />
    </div>
  );
}
