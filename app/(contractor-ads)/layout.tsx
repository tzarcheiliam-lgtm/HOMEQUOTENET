import '../(marketing)/marketing.css';
import Link from 'next/link';
import { site } from '@/content/site';
import { Wordmark } from '@/components/marketing/wordmark';

/**
 * Lean shell for paid-traffic contractor pages: brand + one action, no site
 * navigation to leak attention. Reuses the marketing theme (.hq) and tokens.
 */
export default function ContractorAdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hq min-h-[100dvh]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--hq-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Skip to content
      </a>
      <header className="border-b border-[var(--hq-line)] bg-[var(--hq-bg)]/90">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/contractor-appointments" aria-label={`${site.name} home`}><Wordmark size="sm" /></Link>
        </div>
      </header>
      <main id="main">{children}</main>
    </div>
  );
}
