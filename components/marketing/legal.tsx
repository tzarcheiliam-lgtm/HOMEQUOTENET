import type { ReactNode } from 'react';
import { Container } from './primitives';

/**
 * Shared shell for legal documents. Keeps /privacy and /terms visually
 * consistent with the marketing theme and readable at long line lengths.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="border-b border-[var(--hq-line)]">
        <Container>
          <div className="max-w-3xl py-16 sm:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--hq-accent-bright)]">
              Legal
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 text-sm text-[var(--hq-text-dim)]">
              Last updated: {updated}
            </p>
            {intro ? (
              <p className="mt-6 text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">
                {intro}
              </p>
            ) : null}
          </div>
        </Container>
      </div>

      <Container>
        <div className="max-w-3xl py-16">{children}</div>
      </Container>
    </>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--hq-text)]">
        {heading}
      </h2>
      <div className="mt-3 space-y-4 text-[15px] leading-7 text-[var(--hq-text-muted)] [&_strong]:font-semibold [&_strong]:text-[var(--hq-text)]">
        {children}
      </div>
    </section>
  );
}
