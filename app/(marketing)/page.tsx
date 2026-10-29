import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { site } from '@/content/site';
import { generalContractorPhotos as photos } from '@/content/industry-photos';
import { baseOpenGraph } from '@/lib/site-metadata';
import './home.css';

const title = 'Book a Remodeling Appointment | HomeQuote Network';
const description =
  'Planning a bathroom, kitchen or ADU project? Book a free in-home remodeling appointment. No obligation.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/' },
  openGraph: { ...baseOpenGraph, title, description, url: site.url },
  twitter: { card: 'summary_large_image', title, description },
};

/** Each choice goes to a live funnel. */
const projects = [
  { name: 'Bathroom', note: 'Five quick questions', href: '/estimate/bathroom-remodel', photo: photos.bathroom },
  { name: 'Kitchen', note: 'Five quick questions', href: '/estimate/kitchen-remodel', photo: photos.openKitchen },
  { name: 'ADU', note: 'Design it, then book', href: '/adu-quiz', photo: photos.hero },
] as const;

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
          {['Free', 'No obligation', 'Pick your project to start'].map((t) => (
            <span key={t} className="inline-flex items-center gap-2">
              <Check className="size-4 text-[var(--ho-blue)]" aria-hidden="true" />
              {t}
            </span>
          ))}
        </p>

        <ul className="mt-12 grid gap-5 sm:grid-cols-3 sm:gap-6">
          {projects.map((p, i) => (
            <li key={p.href}>
              <Link href={p.href} className="ho-pick" style={{ ['--i' as string]: i }}>
                <Image
                  src={p.photo.src}
                  alt=""
                  width={p.photo.width}
                  height={p.photo.height}
                  sizes="(min-width: 640px) 360px, 100vw"
                  priority={i === 0}
                />
                <span className="ho-pick-label">
                  <span>
                    <span className="block text-2xl font-semibold tracking-tight">{p.name}</span>
                    <span className="mt-1 block text-sm text-white/85">{p.note}</span>
                  </span>
                  <span className="ho-pick-go">
                    <ArrowUpRight className="size-5" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

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
