import type { Metadata } from 'next';
import { Inter_Tight } from 'next/font/google';
import '@/components/booking/booking.css';

// Private, token-addressed pages: never indexed, and the token never leaves in a Referer.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

// The funnel's face (components/estimator/funnel/funnel.css explains the pick), so the manage
// page looks like the booking step the homeowner just used.
const funnelFont = Inter_Tight({ subsets: ['latin'], variable: '--font-funnel', display: 'swap' });

/**
 * Shell for the homeowner's booking pages (/booking/manage/<token>): no site
 * header or footer, the funnel's warm off-white page, one centred column with
 * a 16px gutter on phones.
 */
export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`bk-page ${funnelFont.variable} min-h-[100dvh] bg-[#f6f4f0] text-[#0a0a0a] antialiased [font-family:var(--font-funnel),system-ui,sans-serif]`}
    >
      <main id="main" className="mx-auto w-full max-w-[30rem] px-4 pb-16 pt-6 sm:pt-12">
        {children}
      </main>
    </div>
  );
}
