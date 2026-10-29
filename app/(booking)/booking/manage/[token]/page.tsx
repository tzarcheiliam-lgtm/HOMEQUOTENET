import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { isManageTokenShape } from '@/lib/booking/tokens';
import { ManageBooking } from '@/components/booking/manage-booking';
import { loadManaged } from '@/app/api/booking/_lib/manage';

/**
 * The homeowner's self-service page for a booked call, reached from the link
 * in the confirmation and reminder texts / emails. No login: the 256-bit token
 * in the path is the key (only its hash is stored). Rendered on the server
 * from the booking itself, so the time shows at once; changes go through
 * /api/booking/manage/<token>.
 */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your call' };

type Props = { params: Promise<{ token: string }> };

export default async function ManageBookingPage({ params }: Props) {
  const { token } = await params;
  let managed: Awaited<ReturnType<typeof loadManaged>> = null;
  let failed = false;
  if (isManageTokenShape(token)) {
    try {
      managed = await loadManaged(createAdminClient(), token);
    } catch {
      failed = true;
    }
  }

  if (!managed) {
    return (
      <div className="bk" data-booking-missing="">
        <h1 className="text-[28px] font-[550] leading-[1.15] tracking-[-0.02em] [text-wrap:balance]">
          {failed ? 'We couldn’t load your call' : 'We couldn’t find this call'}
        </h1>
        <p className="mt-3 text-[16px] leading-[24px] text-[#1f1e1c] [text-wrap:pretty]">
          {failed
            ? 'Please try again in a moment.'
            : 'The link may be incomplete. Open it again from your confirmation text or email.'}
        </p>
      </div>
    );
  }
  return <ManageBooking token={token} initial={managed.booking} />;
}
