import { requireRole } from '@/lib/auth';
import { countServiceRequestsByStatus, listServiceRequests } from '@/lib/data/service-requests';
import { isRequestStatus } from '@/lib/growth/catalog';
import { ServiceRequestsView } from '@/components/growth/service-requests-view';

export const metadata = { title: 'Service Requests · HomeQuote Network' };

export default async function ServiceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(['admin']);
  const { status: raw } = await searchParams;
  const status = isRequestStatus(raw) ? raw : undefined;
  const [requests, counts] = await Promise.all([listServiceRequests({ status }), countServiceRequestsByStatus()]);
  return <ServiceRequestsView requests={requests} counts={counts} status={status} />;
}
