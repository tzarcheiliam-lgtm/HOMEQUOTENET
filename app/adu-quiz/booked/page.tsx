import type { Metadata } from 'next';
import { BookedBeacon } from '@/components/adu-quiz/booked-beacon';

export const metadata: Metadata = { title: 'Booked', robots: { index: false, follow: false } };

/**
 * Where the GoHighLevel calendar redirects after a booking is confirmed. It
 * renders inside the booking iframe on /adu-quiz and tells the parent page, which
 * fires the Schedule event. Opened on its own it just shows a confirmation.
 */
export default function BookedPage() {
  return (
    <section className="mx-auto w-full max-w-xl px-5 py-12 text-center sm:px-8">
      <BookedBeacon />
      <h1 className="text-2xl font-semibold tracking-tight">You’re booked.</h1>
      <p className="mt-3 text-base leading-7 text-[var(--hq-text-muted)]">Watch for a confirmation text.</p>
    </section>
  );
}
