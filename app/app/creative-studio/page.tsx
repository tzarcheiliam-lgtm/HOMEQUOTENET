import { requireRole } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { StudioView } from '@/components/creative-studio/studio-view';
import { CREATIVE_AGENT, CREATIVE_TOOLS } from '@/content/creative-studio';

export const metadata = { title: 'Creative Studio · HomeQuote Network' };

export default async function CreativeStudioPage() {
  await requireRole(['admin']);
  return (
    <div className="space-y-6">
      <PageHeader title="Creative Studio" description="The creative assistant, plus image and video generators for ad creative." />
      <StudioView tools={CREATIVE_TOOLS} agent={CREATIVE_AGENT} />
    </div>
  );
}
