import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { site } from '@/content/site';
import { generalContractorPhotos as photos } from '@/content/industry-photos';
import { photos as poolPhotos } from '@/content/photos';
import { ProjectFinder, type FinderCategory } from '@/components/marketing/project-finder';
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

      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
        <h1 className="ho-display ho-words max-w-4xl text-[clamp(2.5rem,6vw,4.75rem)]">
          {headline.map((w, i) => (
            <span key={i} style={{ ['--w' as string]: i }}>
              {w}
            </span>
          ))}
        </h1>
        <p className="ho-fade mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-base font-medium text-[var(--ho-ink-soft)]" style={{ ['--w' as string]: headline.length }}>
          {['Free', 'No obligation', 'Find your project in seconds'].map((t) => (
            <span key={t} className="inline-flex items-center gap-2">
              <Check className="size-4 text-[var(--ho-blue)]" aria-hidden="true" />
              {t}
            </span>
          ))}
        </p>

        <div className="mt-10">
          <ProjectFinder categories={categories} />
        </div>

        <p className="mt-12 text-base text-[var(--ho-ink-soft)]">
          Prefer to talk?{' '}
          <a href={`tel:${site.contact.phoneHref}`} className="font-semibold text-[var(--ho-navy)] underline decoration-[var(--ho-rule)] underline-offset-4 hover:decoration-[var(--ho-blue)]">
            Call {site.contact.phone}
          </a>
        </p>
      </section>
    </div>
  );
}
