import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
  { name: 'Bathroom', href: '/estimate/bathroom-remodel', photo: photos.bathroom },
  { name: 'Kitchen', href: '/estimate/kitchen-remodel', photo: photos.openKitchen },
  { name: 'ADU', href: '/adu-quiz', photo: photos.hero },
] as const;

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

      <section className="mx-auto w-full max-w-5xl px-5 pb-24 pt-16 sm:px-8 sm:pb-32 sm:pt-24">
        <h1 className="ho-display max-w-3xl text-[clamp(2.25rem,5.4vw,4rem)]">
          Book your remodeling appointment.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--ho-ink-soft)]">
          What are you planning? Free and no obligation.
        </p>

        <ul className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-6">
          {projects.map((p, i) => (
            <li key={p.href} style={{ ['--i' as string]: i }} className="ho-pick-li">
              <Link href={p.href} className="ho-pick" style={{ ['--i' as string]: i }}>
                <div className="ho-pick-photo">
                  <Image
                    src={p.photo.src}
                    alt=""
                    width={p.photo.width}
                    height={p.photo.height}
                    sizes="(min-width: 640px) 320px, 100vw"
                    priority={i === 0}
                  />
                </div>
                <span className="ho-pick-name">
                  {p.name}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
