import type { Metadata } from 'next';
import { Inter_Tight } from 'next/font/google';
import { DemoFlagCapture } from '@/components/estimator/demo-flags';
import '../(marketing)/marketing.css';

// Pages here set their own robots (noindex while prices are examples); this is the safe default.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// The simple funnel's face (components/estimator/funnel/funnel.css explains the pick); only .es-fn uses it.
// Variable axis (no fixed weights): the funnel uses in-between weights to match Buildoly's lighter articulat-cf.
// Not preloaded: the builder and configurator pages under this layout never use it (a metric-matched fallback keeps the swap still).
const funnelFont = Inter_Tight({ subsets: ['latin'], variable: '--font-funnel', display: 'swap', preload: false });

/**
 * Shell for the contractor-branded estimator page (/estimator/[slug]): no
 * HomeQuote site header or footer. The page draws the contractor's own header
 * and footer (components/estimator/shell). Same `.hq` theme scope as the
 * marketing layout so the estimator looks identical. --es-aqua is the pool
 * water accent (from the Pool Masters wave) used for earned/done states.
 */
export default function EstimatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`hq ${funnelFont.variable} flex min-h-[100dvh] flex-col [--es-aqua:#2ec5d3] [--estimator-header-h:4rem] sm:[--estimator-header-h:5rem]`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--hq-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <DemoFlagCapture />
      {children}
    </div>
  );
}
