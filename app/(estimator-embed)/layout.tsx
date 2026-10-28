import type { Metadata } from 'next';
import '../(marketing)/marketing.css';

// Embedded inside a contractor's own site: never indexed, whatever the prices status.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Bare shell for the iframe embed: no site header or footer, but the same
 * `.hq` theme scope as the marketing layout so the estimator looks identical.
 * Framing: the app sets no X-Frame-Options or CSP frame-ancestors header
 * anywhere (checked in next.config.ts and middleware), so a contractor's site
 * can already iframe this route. If a site-wide frame header is ever added,
 * exempt /embed/estimator/* from it.
 */
export default function EstimatorEmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hq min-h-[100dvh]">
      <main id="main">{children}</main>
    </div>
  );
}
