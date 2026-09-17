import { Plus } from 'lucide-react';
import type { FaqItem } from '@/content/types';
import { Section, SectionHeading } from './primitives';

/**
 * Native <details>/<summary> so the FAQ is keyboard-accessible and works
 * without JavaScript. No client component required.
 */
export function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <Section id="faq">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <SectionHeading
            eyebrow="FAQ"
            title="Questions contractors ask."
            lead="If something here is not clear, ask on the call. Every term that matters is confirmed in writing before launch."
          />
        </div>

        <div className="lg:col-span-8">
          <div className="divide-y divide-[var(--hq-line)] border-y border-[var(--hq-line)]">
            {items.map((item) => (
              <details key={item.question} className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="text-[15px] font-semibold leading-7 text-[var(--hq-text)]">
                    {item.question}
                  </span>
                  <span className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--hq-line-strong)] text-[var(--hq-text-muted)] transition-transform duration-200 group-open:rotate-45">
                    <Plus className="size-3.5" aria-hidden="true" />
                  </span>
                </summary>
                <p className="pb-6 pr-12 text-sm leading-7 text-[var(--hq-text-muted)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

/** JSON-LD so the FAQ is eligible for rich results. */
export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
