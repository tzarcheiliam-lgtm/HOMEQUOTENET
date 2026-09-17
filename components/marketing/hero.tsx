import { ArrowRight, MapPin, Check } from 'lucide-react';
import type { Niche } from '@/content/types';
import { site } from '@/content/site';
import { Container, Cta, Pill } from './primitives';

/**
 * Hero.
 *
 * Two columns from `lg` up: the pitch on the left, the coverage card on the
 * right. The card carries real, useful information (which markets are live and
 * how availability is assigned) rather than decoration, and it stops the hero
 * leaving half the viewport empty on a wide screen.
 */
export function Hero({ niche }: { niche: Niche }) {
  return (
    <section className="relative isolate overflow-hidden hq-grid">
      <div className="hq-glow" aria-hidden="true" />

      <Container className="relative">
        <div className="grid items-start gap-12 py-20 sm:py-24 lg:grid-cols-12 lg:gap-12 lg:py-28">
          {/* Pitch */}
          <div className="hq-rise lg:col-span-7">
            <Pill tone="accent">
              <span className="inline-block size-1.5 rounded-full bg-[var(--hq-accent-bright)] hq-pulse" />
              {niche.hero.eyebrow}
            </Pill>

            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--hq-text)] sm:text-5xl lg:text-[3.4rem]">
              {niche.hero.headline}
            </h1>

            <p className="mt-6 text-pretty text-lg leading-8 text-[var(--hq-text-muted)]">
              {niche.hero.subheadline}
            </p>

            <p className="mt-5 text-[15px] leading-7 text-[var(--hq-text-dim)]">
              {niche.hero.support}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Cta href={site.cta.primaryHref}>
                {site.cta.primary}
                <ArrowRight className="size-4" />
              </Cta>
              <Cta href={site.cta.secondaryHref} variant="secondary">
                {site.cta.secondary}
              </Cta>
            </div>

            <p className="mt-6 max-w-xl text-sm leading-6 text-[var(--hq-text-dim)]">
              {niche.hero.trustLine}
            </p>
          </div>

          {/* Coverage */}
          <div className="hq-rise lg:col-span-5">
            <div className="hq-card p-7">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-text-dim)]">
                <MapPin className="size-3.5" aria-hidden="true" />
                Initial coverage
              </div>
              <p className="mt-3 text-lg font-semibold tracking-tight text-[var(--hq-text)]">
                {niche.markets.region}
              </p>

              <ul className="mt-5 space-y-2.5">
                {niche.markets.areas.map((area) => (
                  <li
                    key={area}
                    className="flex items-center gap-3 text-sm text-[var(--hq-text-muted)]"
                  >
                    <Check
                      className="size-4 shrink-0 text-[var(--hq-accent-bright)]"
                      aria-hidden="true"
                    />
                    {area}
                  </li>
                ))}
              </ul>

              <p className="mt-6 border-t border-[var(--hq-line)] pt-5 text-sm leading-6 text-[var(--hq-text-dim)]">
                {niche.markets.note}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
