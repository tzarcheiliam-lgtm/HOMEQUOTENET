import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { BookingFlow } from '@/components/booking/booking-flow';
import { parseGrant } from '@/app/api/booking/_lib/grant';
import { resolveGrant } from '@/app/api/booking/_lib/resolve';
import { site } from '@/content/site';

/**
 * "Pick a (new) time": the link in the follow-up emails (lib/booking/recovery.server.ts):
 *   - after a no-show or a call nobody picked up (hqr1 grant: books the same lead a new call),
 *   - to a lead who gave their details but never booked (the funnel / estimator's own booking ticket).
 * The grant in the path is the whole key (signed, expiring; nothing personal in it); the booking API
 * re-checks it on every request. No login; never indexed, no referrer (the (booking) layout).
 */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pick a time for your call' };

type Props = { params: Promise<{ grant: string }> };

export default async function PickTimePage({ params }: Props) {
  const raw = decodeURIComponent((await params).grant);
  const grant = parseGrant(raw);
  let brand: string | null = null;
  if (grant) {
    try {
      const r = await resolveGrant(createAdminClient(), raw);
      brand = r?.calendar?.kind === 'contractor' ? r.calendar.name : null;
    } catch {
      brand = null;
    }
  }

  return (
    <>
      <header className="mb-8 flex min-h-8 items-center" data-booking-brand="">
        {brand ? (
          <p className="text-[17px] font-semibold leading-6 tracking-[-0.01em] text-[#0a0a0a]">{brand}</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a fixed SVG wordmark, no optimisation needed
          <img src="/brand/homequote-logo-primary-horizontal.svg" alt="HomeQuote" width={148} height={32} className="h-8 w-auto" />
        )}
      </header>
      {grant ? (
        <div data-booking-pick="">
          <BookingFlow
            grant={raw}
            heading={grant.kind === 'rebook' ? 'Pick a new time' : 'Pick a time for your call'}
            intro={grant.kind === 'rebook' ? 'Sorry we missed each other. A quick {minutes}-minute call with {host}.' : 'A quick {minutes}-minute call with {host} to go over your project.'}
            headingLevel={1}
          />
        </div>
      ) : (
        <div className="bk" data-booking-missing="">
          <h1 className="text-[28px] font-[550] leading-[1.15] tracking-[-0.02em] [text-wrap:balance]">This link has expired</h1>
          <p className="mt-3 text-[16px] leading-[24px] text-[#1f1e1c] [text-wrap:pretty]">
            Call us and we’ll find a time:{' '}
            <a className="font-medium text-[#0062c4] underline underline-offset-2" href={`tel:${site.contact.phoneHref}`}>{site.contact.phone}</a>.
          </p>
        </div>
      )}
    </>
  );
}
