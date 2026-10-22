import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import { AduQuiz } from '@/components/adu-quiz/adu-quiz';
import { FOOTER_DISCLAIMER } from '@/lib/adu-quiz/quiz';
import { LICENSE_LINE, publicConfig } from '@/lib/adu-quiz/config';

export const metadata: Metadata = {
  title: 'What Would an ADU Cost on Your Lot?',
  description: 'Answer a few quick questions and see your ADU price range. Takes about 60 seconds.',
  // Paid-traffic page: keep it out of search for now.
  robots: { index: false, follow: false },
};

const faqs = [
  {
    question: 'How much does an ADU cost?',
    answer:
      'It depends on the size, where it goes on your lot, the finishes you choose and your local permit requirements. The quiz gives you a range based on your answers, and your builder confirms a real quote at your free consultation.',
  },
  {
    question: 'Is financing available?',
    answer:
      'Financing programs are available for qualified homeowners, subject to credit approval and program terms. Not all applicants qualify. Your builder will walk you through your options.',
  },
  {
    question: 'How long does it take?',
    answer:
      'Timelines vary by project and by how long permits take in your city. Your builder will give you a schedule for your lot at your free consultation.',
  },
];

export default function AduQuizPage() {
  const config = publicConfig();
  return (
    <>
      <AduQuiz config={config} />

      <section aria-labelledby="adu-faq" className="mx-auto w-full max-w-3xl px-5 pb-12 pt-4 sm:px-8">
        <h2 id="adu-faq" className="text-xl font-semibold tracking-tight">Common questions</h2>
        <div className="mt-4 divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)]">
          {faqs.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left [&::-webkit-details-marker]:hidden">
                <span className="text-[15px] font-semibold leading-6 text-[var(--hq-text)]">{item.question}</span>
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--hq-line-strong)] text-[var(--hq-text-muted)] transition-transform group-open:rotate-45">
                  <Plus className="size-3.5" aria-hidden="true" />
                </span>
              </summary>
              <p className="pb-5 pr-10 text-sm leading-7 text-[var(--hq-text-muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--hq-line)] bg-[var(--hq-bg-raised)]">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-5 py-8 text-xs leading-6 text-[var(--hq-text-dim)] sm:px-8">
          <p>We connect homeowners with licensed local ADU builders.</p>
          <p>{FOOTER_DISCLAIMER}</p>
          {LICENSE_LINE ? <p>{LICENSE_LINE}</p> : null}
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6">
            <a href="/privacy" className="inline-block py-3 font-semibold text-[var(--hq-text-muted)] underline hover:text-[var(--hq-text)]">Privacy Policy</a>
            <a href="/terms" className="inline-block py-3 font-semibold text-[var(--hq-text-muted)] underline hover:text-[var(--hq-text)]">Terms</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
