import { redirect } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { getPayPageRequest } from '@/lib/data/service-requests';
import { payPageUrl } from '@/lib/billing/stripe';
import { PayView } from '@/components/billing/pay-view';

export const metadata = { title: 'Payment · HomeQuote Network' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where a price email sends the contractor: this request's price and a Pay button. */
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role !== 'contractor' && profile.role !== 'admin') redirect('/app');
  const [{ id }, { checkout }] = await Promise.all([params, searchParams]);
  // RLS limits a contractor to their own company's requests; admins see any.
  const request = UUID.test(id) ? await getPayPageRequest(id) : null;
  return (
    <PayView
      request={request}
      viewer={profile.role === 'admin' ? 'admin' : 'contractor'}
      payUrl={payPageUrl(id)}
      checkout={checkout === 'success' || checkout === 'canceled' ? checkout : undefined}
    />
  );
}
