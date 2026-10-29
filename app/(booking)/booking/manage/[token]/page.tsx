import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { isManageTokenShape } from '@/lib/booking/tokens';
import { ManageBooking } from '@/components/booking/manage-booking';
import { loadManaged } from '@/app/api/booking/_lib/manage';
import type { PublicBooking } from '@/components/booking/types';
import { site } from '@/content/site';

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
        <BrandHeader booking={null} />
        <h1 className="text-[28px] font-[550] leading-[1.15] tracking-[-0.02em] [text-wrap:balance]">
          {failed ? 'We couldn’t load your call' : 'We couldn’t find this call'}
        </h1>
        <p className="mt-3 text-[16px] leading-[24px] text-[#1f1e1c] [text-wrap:pretty]">
          {failed
            ? 'Please try again in a moment.'
            : 'The link may be incomplete. Open it again from your confirmation email.'}
        </p>
        <p className="mt-4 text-[16px] leading-[24px] text-[#1f1e1c]">
          Questions about your call? <a className="font-medium text-[#0062c4] underline underline-offset-2" href={`tel:${site.contact.phoneHref}`}>Call HomeQuote at {site.contact.phone}</a>.
        </p>
      </div>
    );
  }
  return (
    <>
      <BrandHeader booking={managed.booking} />
      <ManageBooking token={token} initial={managed.booking} />
    </>
  );
}

/**
 * Who the call is with, above the fold (the page is reached from an email): the
 * contractor's name for its own calendar, the HomeQuote logo for team / sales calls.
 */
function BrandHeader({ booking }: { booking: PublicBooking | null }) {
  const contractor = booking?.kind === 'contractor' ? booking.hostName : null;
  return (
    <header className="mb-8 flex min-h-8 items-center" data-booking-brand="">
      {contractor ? (
        <p className="text-[17px] font-semibold leading-6 tracking-[-0.01em] text-[#0a0a0a]">{contractor}</p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- a fixed SVG wordmark, no optimisation needed
        <img src="/brand/homequote-logo-primary-horizontal.svg" alt="HomeQuote" width={148} height={32} className="h-8 w-auto" />
      )}
    </header>
  );
}
