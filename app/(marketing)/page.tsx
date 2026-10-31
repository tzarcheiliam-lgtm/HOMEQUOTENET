import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { site } from '@/content/site';
import { generalContractorPhotos as photos } from '@/content/industry-photos';
import { photos as poolPhotos } from '@/content/photos';
import { HomePicker, type PickerCategory } from '@/components/marketing/home-picker';
import { ProjectFinder } from '@/components/marketing/project-finder';
import { baseOpenGraph } from '@/lib/site-metadata';
import './home.css';

const title = 'Book a Remodeling Appointment | HomeQuote Network';
const description =
  'Planning a bathroom, kitchen, ADU or pool project? Pick your project and book a free in-home appointment with a licensed local contractor. No obligation.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/' },
  openGraph: { ...baseOpenGraph, title, description, url: site.url },
  twitter: { card: 'summary_large_image', title, description },
};

/**
 * Each category goes to a live flow. Bathroom uses the instant estimator
 * (ballpark price range, then booking); the rest are short booking funnels.
 */
const categories: PickerCategory[] = [
  { id: 'bathroom', name: 'Bathroom', note: 'Get a ballpark price, then book', href: '/estimator/bathroom-remodel', photo: photos.bathroom },
  { id: 'kitchen', name: 'Kitchen', note: 'Five quick questions, then book', href: '/estimate/kitchen-remodel', photo: photos.kitchen },
  { id: 'adu', name: 'ADU', note: 'Design it, then book', href: '/adu-quiz', photo: photos.hero },
  { id: 'pool', name: 'Pool', note: 'A few questions, then book', href: '/estimate/pool-remodeling', photo: poolPhotos.heroPool },
];

const headline = 'What are we remodeling?'.split(' ');

const strip = [
  'Tub-to-shower',
  'Full kitchen remodel',
  'ADU',
  'Walk-in shower',
  'Cabinets and counters',
  'Garage conversion',
  'Pool resurfacing',
  'Accessible bathroom',
  'Backyard unit',
  'Spa or hot tub',
  'Kitchen layout change',
  'Add a bathroom',
];

const steps = [
  { title: 'Choose your project', body: 'Search or pick bathroom, kitchen, ADU or pool.' },
  { title: 'Answer a few questions', body: 'Short, one at a time, and made for a phone.' },
  { title: 'Book a time', body: 'Choose a day that works for you.' },
  { title: 'Meet at your home', body: 'A free, no-obligation visit with a licensed local contractor.' },
];

const promises = [
  { title: 'Free in-home consultation', body: 'A licensed local contractor comes to you, looks at the space and talks through your project.' },
  { title: 'No obligation', body: 'Ask questions, compare, and decide in your own time. Whether to hire anyone is up to you.' },
  { title: 'Ballparks, not surprises', body: 'Where we show a price range it is labeled a ballpark, never a quote. A firm number comes at your visit.' },
];

function StripRow({ reverse = false }: { reverse?: boolean }) {
  const items = reverse ? [...strip].reverse() : strip;
  return (
    <div className={`ho-strip-track ${reverse ? 'rev' : ''}`}>
      {[0, 1].map((copy) =>
        items.map((w, i) => (
          <span
            key={`${copy}-${w}`}
            className={`ho-strip-item ${(i + (reverse ? 1 : 0)) % 2 ? 'o' : ''}`}
            aria-hidden={copy === 1 ? true : undefined}
          >
            {w}
          </span>
        ))
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="ho">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: site.name,
            url: site.url,
            logo: `${site.url}/brand/homequote-logo-primary-horizontal-transparent.png`,
            description,
          }),
        }}
      />

      {/* Hero: the question is the page */}
      <section id="start" className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 pb-20 pt-10 sm:px-8 sm:pt-14 lg:pb-28">
        <HomePicker
          categories={categories}
          panel
          intro={
            <>
          <h1 className="ho-display ho-words max-w-5xl text-[clamp(3rem,8vw,6.25rem)]">
            {headline.map((w, i) => (
              <span key={i} style={{ ['--w' as string]: i }}>
                {w}
              </span>
            ))}
          </h1>
          <p
            className="ho-fade mb-10 mt-5 max-w-2xl text-lg leading-8 text-[var(--ho-ink-soft)] sm:text-xl"
            style={{ ['--w' as string]: headline.length }}
          >
            Pick one and book a free in-home visit with a licensed local contractor.
          </p>
            </>
          }
          below={
            <div className="mt-8">
              <ProjectFinder categories={categories} />
              <p className="mt-5 text-sm text-[var(--ho-ink-soft)]">
                Serving Los Angeles, Orange, Ventura, Riverside and San Bernardino counties.
              </p>
            </div>
          }
        />
      </section>

      {/* Kinetic project strip */}
      <section className="ho-strip" aria-label="Projects we help with">
        <StripRow />
        <StripRow reverse />
      </section>

      {/* How it works: sticky story */}
      <section id="how" className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 sm:py-36">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <h2 className="ho-display text-[clamp(2.25rem,5vw,4rem)]">
                From idea to a visit at your home.
              </h2>
              <p className="mt-6 max-w-md text-lg leading-8 text-[var(--ho-ink-soft)]">
                Four steps, no pressure at any of them.
              </p>
            </div>
          </div>
          <ol className="lg:col-span-7">
            {steps.map((st, i) => (
              <li key={st.title} className="ho-step">
                <span className="ho-step-n">{i + 1}</span>
                <div className="self-end">
                  <h3 className="ho-display text-[clamp(1.75rem,3.4vw,2.75rem)]">{st.title}</h3>
                  <p className="mt-3 max-w-md text-lg leading-8 text-[var(--ho-ink-soft)]">{st.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The promise: the one dark moment */}
      <section className="ho-dark">
        <Image
          src={photos.darkLiving.src}
          alt=""
          width={photos.darkLiving.width}
          height={photos.darkLiving.height}
          sizes="100vw"
        />
        <div className="mx-auto w-full max-w-7xl px-5 py-28 sm:px-8 sm:py-40">
          <h2 className="ho-display max-w-4xl text-[clamp(2.5rem,6.4vw,5.5rem)]">
            Free. No obligation. Yours to decide.
          </h2>
          <ul className="mt-16 grid gap-10 md:grid-cols-3 md:gap-10">
            {promises.map((p) => (
              <li key={p.title} className="border-t border-white/40 pt-5">
                <h3 className="ho-display text-2xl">{p.title}</h3>
                <p className="mt-3 text-lg leading-8 text-white/85">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Close */}
      <section className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 sm:py-36">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <h2 className="ho-display text-[clamp(2.75rem,7vw,6rem)] lg:col-span-6">Ready when you are.</h2>
          <div className="lg:col-span-6">
            <HomePicker categories={categories} />
            <a
              href={`tel:${site.contact.phoneHref}`}
              className="ho-btn ho-btn-line mt-8"
            >
              Prefer to talk? Call {site.contact.phone}
              <ArrowUpRight className="size-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
