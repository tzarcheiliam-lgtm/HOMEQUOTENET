import type { Metadata } from 'next';
import { ShieldCheck, Clock, FileSignature } from 'lucide-react';
import { site } from '@/content/site';
import { poolNiche } from '@/content/niches/pool';
import { Container } from '@/components/marketing/primitives';
import { ApplicationForm } from '@/components/marketing/application-form';
import type { Track } from '@/lib/validation/application';

export const metadata: Metadata = {
  title: 'Contractor Application',
  description:
    'Apply to check lead availability in your market. Tell us your project types, service areas, and capacity, and we will confirm what is available.',
  alternates: { canonical: '/apply' },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Contractor Application · ${site.name}`,
    description:
      'Check lead availability for your market. Project types, service area, and capacity.',
    url: `${site.url}/apply`,
  },
};

const assurances = [
  {
    icon: FileSignature,
    title: 'No obligation',
    description:
      'Applying does not create an agreement. Nothing runs until you approve the terms in writing.',
  },
  {
    icon: ShieldCheck,
    title: 'Terms before launch',
    description:
      'Lead standards, pricing, service area, and exclusivity are confirmed before the first lead is delivered.',
  },
  {
    icon: Clock,
    title: 'About two minutes',
    description:
      'Fourteen questions. The detail helps us tell you quickly whether your market is available.',
  },
];

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const params = await searchParams;
  // Deep link from the "Discuss Managed Growth" button preselects that option.
  const defaultTrack: Track =
    params.track === 'managed' ? 'managed' : 'pay_per_lead';

  return (
    <section className="relative isolate overflow-hidden hq-grid">
      <div className="hq-glow" aria-hidden="true" />
      <Container className="relative">
        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:gap-16">
          {/* Left rail */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--hq-accent-bright)]">
                Contractor application
              </p>
              <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
                See if your market is available.
              </h1>
              <p className="mt-6 text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">
                Tell us what projects you want, where you work, and how many
                additional opportunities your team can handle.
              </p>

              <div className="mt-10 space-y-6">
                {assurances.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--hq-line-strong)] bg-[var(--hq-surface-2)] text-[var(--hq-accent-bright)]">
                      <item.icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-[15px] font-semibold">{item.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-[var(--hq-text-muted)]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* For contractors who would rather talk than fill in a form. */}
              <div className="mt-10 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/50 p-5">
                <p className="text-sm font-semibold text-[var(--hq-text)]">
                  Prefer to talk it through?
                </p>
                <p className="mt-1.5 text-sm leading-6 text-[var(--hq-text-muted)]">
                  Book a call and we will cover the same questions live.
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  <a
                    href={site.contact.booking}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block py-2 font-semibold text-[var(--hq-accent-bright)] hover:underline"
                  >
                    Book a call →
                  </a>
                  <a
                    href={`tel:${site.contact.phoneHref}`}
                    className="inline-block py-2 text-[var(--hq-text-muted)] transition-colors hover:text-[var(--hq-text)]"
                  >
                    {site.contact.phone}
                  </a>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[var(--hq-line)] bg-[var(--hq-surface)]/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-text-dim)]">
                  Currently serving
                </p>
                <p className="mt-2.5 text-sm leading-6 text-[var(--hq-text-muted)]">
                  {poolNiche.markets.areas.join(' · ')}
                </p>
                <p className="mt-3 text-xs leading-5 text-[var(--hq-text-dim)]">
                  Outside these areas? Apply anyway and tell us where you work.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-7">
            <div className="hq-card p-6 sm:p-9">
              <ApplicationForm defaultTrack={defaultTrack} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
