import { redirect } from 'next/navigation';

/**
 * lib/booking/tokens managePath() builds /book/manage/<token>; the page lives
 * at /booking/manage/<token>. Either link works.
 */
export const dynamic = 'force-dynamic';

export default async function ManageBookingAlias({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/booking/manage/${encodeURIComponent(token)}`);
}
