import type { Metadata } from 'next';
import { Inter_Tight } from 'next/font/google';
import '../(marketing)/marketing.css';

// Embedded inside a contractor's own site: never indexed, whatever the prices status.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Same funnel face as app/(estimator)/layout.tsx; only .es-fn uses it.
// Not preloaded: the builder and configurator pages under this layout never use it (a metric-matched fallback keeps the swap still).
const funnelFont = Inter_Tight({ subsets: ['latin'], variable: '--font-funnel', display: 'swap', preload: false });

/**
 * Bare shell for the iframe embed: no site header or footer, but the same
 * `.hq` theme scope as the marketing layout so the estimator looks identical.
 * Framing: the app sets no X-Frame-Options or CSP frame-ancestors header
 * anywhere (checked in next.config.ts and middleware), so a contractor's site
 * can already iframe this route. If a site-wide frame header is ever added,
 * exempt /embed/estimator/* from it. --es-aqua is the shell components' "earned" accent
 * (same value as app/(estimator)/layout.tsx).
 */
export default function EstimatorEmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`hq ${funnelFont.variable} min-h-[100dvh] [--es-aqua:#2ec5d3]`}>
      <main id="main">{children}</main>
    </div>
  );
}
