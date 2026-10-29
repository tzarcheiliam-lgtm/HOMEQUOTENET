import type { Metadata } from 'next';
import { ArrowRight, Plus } from 'lucide-react';
import { homeContent } from '@/content/home';
import { site } from '@/content/site';
import { Container } from '@/components/marketing/primitives';
import './redesign.css';

export const metadata: Metadata = {
  title: 'Homepage redesign demo',
  robots: { index: false, follow: false },
  alternates: { canonical: '/' },
};

/**
 * Illustrative only. These rows demonstrate the product (a booked calendar);
 * they are not a real client's schedule and the page says so beside the sheet.
 */
const sampleDay = [
  { time: '9:00', meridiem: 'AM', job: 'Kitchen remodel', place: 'Irvine, Orange County', booked: true },
  { time: '11:30', meridiem: 'AM', job: 'Roof replacement', place: 'Riverside, Riverside County', booked: true },
  { time: '2:00', meridiem: 'PM', job: 'Fence and gate', place: 'Thousand Oaks, Ventura County', booked: true },
  { time: '4:30', meridiem: 'PM', job: 'Open for your next booking', place: 'Held in your calendar', booked: false },
];

const faqPicks = [0, 3, 4, 5].map((i) => homeContent.faq[i]);

export default function RedesignDemoPage() {
  const { hero, process, services, problems, audienceFit } = homeContent;

  return (
    <div className="ds">
      {/* ---- Hero: the product is a calendar, so the hero is one ---------- */}
      <section className="border-b-[1.5px] border-[var(--ds-ink)]">
        <Container className="grid gap-14 py-16 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-24">
          <div className="lg:col-span-7">
            <h1 className="ds-display text-[clamp(2.5rem,6.2vw,5rem)] font-bold leading-[1.02]">
              Qualified homeowner appointments, booked on your calendar.
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-[var(--ds-ink-soft)]">
              {hero.subheadline}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href={site.cta.primaryHref} className="ds-btn ds-btn-gold">
                {site.cta.primary}
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <a href={site.cta.secondaryHref} className="ds-btn ds-btn-line">
                {site.cta.secondary}
              </a>
            </div>
            <p className="mt-7 max-w-lg text-sm leading-6 text-[var(--ds-ink-soft)]">
              {hero.trustLine}
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="ds-sheet" role="group" aria-label="Example calendar for one day">
              <div className="flex items-baseline justify-between gap-4 px-5 py-4">
                <p className="ds-display text-xl font-bold">Thursday</p>
                <p className="text-sm font-medium text-[var(--ds-ink-soft)]">
                  3 booked, 1 open
                </p>
              </div>
              <ol>
                {sampleDay.map((row, i) => (
                  <li
                    key={row.time}
                    className="ds-sheet-row"
                    style={{ ['--i' as string]: i }}
                  >
                    <p className="text-lg font-semibold leading-none">
                      {row.time}
                      <span className="ml-1 text-xs font-medium text-[var(--ds-ink-soft)]">
                        {row.meridiem}
                      </span>
                    </p>
                    <div className="min-w-0">
                      <p className={`font-semibold ${row.booked ? '' : 'text-[var(--ds-ink-soft)]'}`}>
                        {row.job}
                      </p>
                      <p className="truncate text-sm text-[var(--ds-ink-soft)]">{row.place}</p>
                    </div>
                    <span className={`ds-status ${row.booked ? '' : 'ds-open'}`}>
                      {row.booked ? 'Qualified' : 'Open'}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-4 text-xs leading-5 text-[var(--ds-ink-soft)]">
              Illustrative schedule. Jobs and cities are examples, not a client&rsquo;s bookings.
            </p>
          </div>
        </Container>
      </section>

      {/* ---- Price: one full blue field, one sentence --------------------- */}
      <section className="ds-blue bg-[var(--ds-blue)] text-white">
        <Container className="grid gap-8 py-20 sm:py-28 lg:grid-cols-12 lg:items-end">
          <h2 className="ds-display text-[clamp(2.25rem,5.4vw,4.25rem)] font-bold leading-[1.04] lg:col-span-8">
            You pay per qualified booked appointment.
          </h2>
          <p className="max-w-sm text-pretty text-lg leading-8 text-[var(--ds-blue-ink)] lg:col-span-4">
            No monthly marketing retainer required to get started. Service area,
            project types and pricing are agreed before launch.
          </p>
        </Container>
      </section>

      {/* ---- Problem: said plainly, as a list, not five cards ------------- */}
      <section className="py-20 sm:py-28">
        <Container className="grid gap-12 lg:grid-cols-12">
          <h2 className="ds-display text-3xl font-bold leading-tight sm:text-4xl lg:col-span-4">
            What usually goes wrong with contractor marketing
          </h2>
          <ul className="ds-rows lg:col-span-8">
            {problems.map((p) => (
              <li key={p.title} className="grid gap-2 py-6 sm:grid-cols-5 sm:gap-8">
                <h3 className="font-semibold sm:col-span-2">{p.title}</h3>
                <p className="text-pretty leading-7 text-[var(--ds-ink-soft)] sm:col-span-3">
                  {p.description}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ---- Process: a single ruled run, steps read top to bottom -------- */}
      <section className="bg-[var(--ds-ground-2)] py-20 sm:py-28">
        <Container className="grid gap-12 lg:grid-cols-12">
          <h2 className="ds-display text-3xl font-bold leading-tight sm:text-4xl lg:col-span-4">
            From agreed market to estimate at the door
          </h2>
          <ol className="ds-rows lg:col-span-8">
            {process.map((s) => (
              <li key={s.title} className="grid gap-2 py-6 sm:grid-cols-5 sm:gap-8">
                <h3 className="ds-display text-xl font-bold sm:col-span-2">{s.title}</h3>
                <p className="text-pretty leading-7 text-[var(--ds-ink-soft)] sm:col-span-3">
                  {s.description}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ---- Trades: a typographic index, no icon tiles ------------------- */}
      <section className="py-20 sm:py-28">
        <Container>
          <h2 className="ds-display max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
            The projects we book for you
          </h2>
          <ul className="ds-rows mt-12 grid sm:grid-cols-2 sm:gap-x-12 [&>li:nth-last-child(2)]:sm:border-b-[1.5px] [&>li:nth-last-child(2)]:sm:border-[var(--ds-ink)]">
            {services.map((s) => (
              <li key={s.title} className="py-5">
                <h3 className="ds-display text-xl font-bold">{s.title}</h3>
                <p className="mt-1 text-[var(--ds-ink-soft)]">{s.description}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ---- Fit: navy, two honest columns -------------------------------- */}
      <section className="ds-navy bg-[var(--ds-ink)] py-20 text-[var(--ds-ground)] sm:py-28">
        <Container>
          <h2 className="ds-display max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
            Built for established contractors, and honest about who it isn&rsquo;t for
          </h2>
          <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h3 className="text-lg font-semibold">A good fit</h3>
              <ul className="ds-rows mt-5">
                {audienceFit.fit.map((f) => (
                  <li key={f} className="py-3 text-[#c9d6f2]">{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Probably not a fit</h3>
              <ul className="ds-rows mt-5">
                {audienceFit.notFit.map((f) => (
                  <li key={f} className="py-3 text-[#c9d6f2]">{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* ---- FAQ ----------------------------------------------------------- */}
      <section className="py-20 sm:py-28">
        <Container className="grid gap-12 lg:grid-cols-12">
          <h2 className="ds-display text-3xl font-bold leading-tight sm:text-4xl lg:col-span-4">
            Questions contractors ask first
          </h2>
          <div className="ds-faq ds-rows lg:col-span-8">
            {faqPicks.map((item) => (
              <details key={item.question} className="border-t-[1.5px] border-[var(--ds-ink)] last:border-b-[1.5px]">
                <summary className="flex items-center justify-between gap-6 py-5 text-lg font-semibold">
                  {item.question}
                  <Plus className="ds-plus size-5 shrink-0" aria-hidden="true" />
                </summary>
                <p className="max-w-2xl pb-6 text-pretty leading-7 text-[var(--ds-ink-soft)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ---- Close --------------------------------------------------------- */}
      <section className="ds-blue bg-[var(--ds-blue)] py-20 text-white sm:py-28">
        <Container className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <h2 className="ds-display max-w-2xl text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.04]">
            See whether your market is open.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={site.cta.primaryHref} className="ds-btn ds-btn-gold">
              {site.cta.primary}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <a href={site.cta.secondaryHref} className="ds-btn ds-btn-line">
              {site.cta.secondary}
            </a>
          </div>
        </Container>
      </section>
    </div>
  );
}
