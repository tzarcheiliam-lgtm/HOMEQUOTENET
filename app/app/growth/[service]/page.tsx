import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getGrowthContext } from '@/lib/data/service-requests';
import { getService } from '@/lib/growth/catalog';
import { ServiceDetailView } from '@/components/growth/service-detail-view';

export async function generateMetadata({ params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  return { title: `${getService(service)?.name ?? 'Service'} · HomeQuote Network` };
}

export default async function GrowthServicePage({ params }: { params: Promise<{ service: string }> }) {
  const { service: slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const profile = await requireRole(['contractor']);
  const { company, requests } = await getGrowthContext(profile);
  return (
    <ServiceDetailView
      service={service}
      company={company}
      requests={requests}
      requester={{ name: profile.full_name || profile.email || 'You', email: profile.email }}
    />
  );
}
