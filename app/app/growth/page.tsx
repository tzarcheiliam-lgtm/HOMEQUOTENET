import { requireRole } from '@/lib/auth';
import { getGrowthContext } from '@/lib/data/service-requests';
import { GrowthServicesView } from '@/components/growth/growth-services-view';

export const metadata = { title: 'Grow Your Business · HomeQuote Network' };

export default async function GrowthPage() {
  const profile = await requireRole(['contractor']);
  return <GrowthServicesView {...await getGrowthContext(profile)} />;
}
