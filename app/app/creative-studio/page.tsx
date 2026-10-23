import { requireRole } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { StudioView } from '@/components/creative-studio/studio-view';
import { CREATIVE_TOOLS } from '@/content/creative-studio';

export const metadata = { title: 'Creative Studio · HomeQuote Network' };

export default async function CreativeStudioPage() {
  await requireRole(['admin']);
  return (
    <div className="space-y-6">
      <PageHeader title="Creative Studio" description="Image and video generators for ad creative. Pick one to open it here." />
      <StudioView tools={CREATIVE_TOOLS} />
    </div>
  );
}
