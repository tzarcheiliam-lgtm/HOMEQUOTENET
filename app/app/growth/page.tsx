import { requireRole } from '@/lib/auth';
import { getGrowthContext } from '@/lib/data/service-requests';
import { GrowthServicesView } from '@/components/growth/growth-services-view';

export const metadata = { title: 'Growth Tools · HomeQuote Network' };

export default async function GrowthPage() {
  const profile = await requireRole(['contractor']);
  return (
    <GrowthServicesView
      {...await getGrowthContext(profile)}
      requester={{ name: profile.full_name || profile.email || 'You', email: profile.email }}
    />
  );
}
