import '../(marketing)/marketing.css';
import { Wordmark } from '@/components/marketing/wordmark';

/**
 * Lean shell for the paid-traffic ADU quiz: the logo (not a link) and nothing
 * else, so there is no site navigation to leak attention. Reuses the marketing
 * theme (.hq) and tokens. The only links on the page are the legal links in the
 * footer (rendered by page.tsx) and the Privacy/Terms links in the consent text.
 */
export default function AduQuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hq min-h-[100dvh]">
      <header className="border-b border-[var(--hq-line)] bg-[var(--hq-bg)]/90">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-5 sm:h-16 sm:px-8">
          <Wordmark size="sm" />
        </div>
      </header>
      <main id="main">{children}</main>
    </div>
  );
}
