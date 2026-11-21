import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadVisitPage, type VisitPage } from '@/lib/sms/visit-booking.server';
import { VisitBookingFlow } from '@/components/booking/visit-booking';

/**
 * "Book your free in-home estimate": the link texted after the voice note (lib/sms/service.ts sendVoiceNoteAndLink).
 * The signed link in the path names the text conversation (lib/sms/visit-link.ts); nothing personal is in it and the
 * booking API re-checks it on every request. No login; never indexed, no referrer (the (booking) layout).
 *
 * The title and description are what iMessage shows on the link's preview card.
 */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Book your free in-home estimate',
  description: 'Tell us about your project and pick a time that works for you.',
  openGraph: { title: 'Book your free in-home estimate', description: 'Pick a time that works for you · about an hour', siteName: 'HomeQuote', type: 'website' },
};

type Props = { params: Promise<{ grant: string }> };

export default async function VisitBookingPage({ params }: Props) {
  const grant = decodeURIComponent((await params).grant);
  let page: VisitPage;
  try {
    page = await loadVisitPage(createAdminClient(), grant);
  } catch {
    page = { state: 'no_times', firstName: null };
  }

  return (
    <>
      <header className="mb-8 flex min-h-8 items-center">
        {page.state === 'open' && page.kind === 'visit' ? (
          <p className="text-[17px] font-semibold leading-6 tracking-[-0.01em] text-[#0a0a0a]">{page.who}</p>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a fixed SVG wordmark, no optimisation needed
          <img src="/brand/homequote-logo-primary-horizontal.svg" alt="HomeQuote" width={148} height={32} className="h-8 w-auto" />
        )}
      </header>
      {page.state === 'open' ? (
        <VisitBookingFlow grant={grant} initial={page} />
      ) : (
        <div className="bk" data-visit-state={page.state}>
          <h1 className="text-[28px] font-[550] leading-[1.15] tracking-[-0.02em] [text-wrap:balance]">{TITLES[page.state]}</h1>
          <p className="mt-3 text-[16px] leading-[24px] text-[#1f1e1c] [text-wrap:pretty]">{BODIES[page.state]}</p>
        </div>
      )}
    </>
  );
}

const TITLES: Record<Exclude<VisitPage['state'], 'open'>, string> = {
  invalid: 'This link has expired',
  closed: 'This link isn’t active anymore',
  booked: 'You’re already booked',
  no_times: 'No open times right now',
};
const BODIES: Record<Exclude<VisitPage['state'], 'open'>, string> = {
  invalid: 'Reply to our text and we’ll send you a fresh link.',
  closed: 'Reply to our text if you’d still like to set up a time.',
  booked: 'Check your texts for the details. Need a different time? Just reply R.',
  no_times: 'Reply to our text with a day that works and we’ll set it up with you.',
};
