import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { site } from '@/content/site';
import { generalContractorPhotos as photos } from '@/content/industry-photos';
import { photos as poolPhotos } from '@/content/photos';
import { ProjectCards, ProjectFinder, type FinderCategory } from '@/components/marketing/project-finder';
import { baseOpenGraph } from '@/lib/site-metadata';
import './home.css';

const title = 'Book a Remodeling Appointment | HomeQuote Network';
const description =
  'Planning a bathroom, kitchen, ADU or pool project? Find your project, get your price and book a free in-home appointment. No obligation.';

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
const categories: FinderCategory[] = [
  { id: 'bathroom', name: 'Bathroom', note: 'Get a ballpark price, then book', href: '/estimator/bathroom-remodel', photo: photos.bathroom },
  { id: 'kitchen', name: 'Kitchen', note: 'Five quick questions, then book', href: '/estimate/kitchen-remodel', photo: photos.openKitchen },
  { id: 'adu', name: 'ADU', note: 'Design it, then book', href: '/adu-quiz', photo: photos.hero },
  { id: 'pool', name: 'Pool', note: 'A few questions, then book', href: '/estimate/pool-remodeling', photo: poolPhotos.heroPool },
];

const headline = 'Book your remodeling appointment.'.split(' ');

const included = [
  { title: 'Free in-home consultation', body: 'A licensed local contractor comes to you, looks at the space and talks through your project.' },
  { title: 'No obligation', body: 'Ask questions, compare, and decide in your own time. Whether to hire anyone is up to you.' },
  { title: 'Your price up front', body: 'Start with a ballpark price range where available, so nothing about the budget is a surprise.' },
];

const steps = [
  { title: 'Choose your project', body: 'Search or pick bathroom, kitchen, ADU or pool.' },
  { title: 'Answer a few questions', body: 'Short, one at a time, and easy on a phone.' },
  { title: 'Book a time', body: 'Choose a day that works for you.' },
  { title: 'Meet at your home', body: 'A free, no-obligation visit with a licensed local contractor.' },
];

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

      {/* Hero */}
      <section id="start" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 pt-14 sm:px-8 sm:pt-20">
        <h1 className="ho-display ho-words max-w-4xl text-[clamp(2.5rem,6.4vw,5rem)]">
          {headline.map((w, i) => (
            <span key={i} style={{ ['--w' as string]: i }}>
              {w}
            </span>
          ))}
        </h1>
        <p
          className="ho-fade mt-6 max-w-xl text-lg leading-8 text-[var(--ho-ink-soft)]"
          style={{ ['--w' as string]: headline.length }}
        >
          Pick your project, get your price and book a free in-home visit, all in a few taps.
        </p>

        <div className="ho-fade mt-9" style={{ ['--w' as string]: headline.length + 1 }}>
          <ProjectFinder categories={categories} />
        </div>

        <div className="ho-hero-photo mt-14">
          <Image
            src={photos.livingKitchen.src}
            alt={photos.livingKitchen.alt}
            width={photos.livingKitchen.width}
            height={photos.livingKitchen.height}
            sizes="(min-width: 1152px) 1088px, 100vw"
            priority
          />
        </div>
        <p className="mt-4 text-sm text-[var(--ho-ink-soft)]">
          Serving Los Angeles, Orange, Ventura, Riverside and San Bernardino counties.
        </p>
      </section>

      {/* Projects */}
      <section id="projects" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32">
        <h2 className="ho-display max-w-2xl text-[clamp(2rem,4.6vw,3.5rem)]">Explore projects</h2>
        <p className="mt-4 max-w-xl text-lg leading-8 text-[var(--ho-ink-soft)]">
          Choose the closest match. The first question narrows it down.
        </p>
        <div className="mt-12">
          <ProjectCards categories={categories} />
        </div>
      </section>

      {/* Included */}
      <section className="border-t border-[var(--ho-rule)]">
        <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <h2 className="ho-display max-w-2xl text-[clamp(2rem,4.6vw,3.5rem)]">
            With every appointment
          </h2>
          <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {included.map((f) => (
              <li key={f.title} className="border-t-2 border-[var(--ho-navy)] pt-5">
                <h3 className="ho-display text-2xl">{f.title}</h3>
                <p className="mt-3 text-lg leading-8 text-[var(--ho-ink-soft)]">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Process */}
      <section id="how" className="scroll-mt-20 bg-[var(--ho-mist)]">
        <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <h2 className="ho-display max-w-2xl text-[clamp(2rem,4.6vw,3.5rem)]">How it works</h2>
          <ol className="ho-steps mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
            {steps.map((st, i) => (
              <li key={st.title}>
                <span className="ho-step-n">{i + 1}</span>
                <h3 className="ho-display mt-6 text-2xl">{st.title}</h3>
                <p className="mt-3 text-lg leading-8 text-[var(--ho-ink-soft)]">{st.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Close */}
      <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-36">
        <h2 className="ho-display max-w-3xl text-[clamp(2.5rem,6.4vw,5rem)]">Ready when you are.</h2>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a href="#start" className="ho-btn ho-btn-dark">
            Get your price
            <ArrowUpRight className="size-5" aria-hidden="true" />
          </a>
          <a href={`tel:${site.contact.phoneHref}`} className="ho-btn ho-btn-line">
            Call {site.contact.phone}
          </a>
        </div>
      </section>
    </div>
  );
}
