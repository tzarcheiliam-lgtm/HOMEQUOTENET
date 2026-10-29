import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { site } from '@/content/site';
import { generalContractorPhotos as photos } from '@/content/industry-photos';
import { FaqJsonLd } from '@/components/marketing/faq';
import { baseOpenGraph } from '@/lib/site-metadata';
import './home.css';

const title = 'HomeQuote Network | Get matched with a licensed local remodeling contractor';
const description =
  'Tell us about your bathroom, kitchen or ADU project. HomeQuote Network connects homeowners with licensed local contractors for a free in-home consultation. No obligation.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/' },
  openGraph: { ...baseOpenGraph, title, description, url: site.url },
  twitter: { card: 'summary_large_image', title, description },
};

/**
 * The three projects a homeowner can start today. Each goes to a live funnel:
 * the bathroom and kitchen funnels ask five questions; the ADU quiz is a
 * visual builder followed by a short screening quiz.
 */
const projects = [
  {
    name: 'Bathroom remodel',
    detail: 'Full remodels, tub-to-shower, accessible baths',
    meta: 'Five quick questions',
    href: '/estimate/bathroom-remodel',
    photo: photos.bathroom,
  },
  {
    name: 'Kitchen remodel',
    detail: 'Full remodels, new cabinets and counters, layout changes',
    meta: 'Five quick questions',
    href: '/estimate/kitchen-remodel',
    photo: photos.openKitchen,
  },
  {
    name: 'ADU or backyard unit',
    detail: 'Design yours, then see if you qualify',
    meta: 'Visual builder, then a short quiz',
    href: '/adu-quiz',
    photo: photos.hero,
  },
] as const;

const steps = [
  {
    title: 'Tell us about the project',
    body: 'Pick your project and answer a few questions: where it is, whether you own the home, and when you would like to start.',
  },
  {
    title: 'We match you',
    body: 'We connect you with a licensed local contractor who does that kind of work.',
  },
  {
    title: 'Meet them at your home',
    body: 'They visit for a free, no-obligation consultation. Whether to hire them is entirely your call.',
  },
];

/** Plain-language reasons for each question the funnel asks. */
const whyWeAsk = [
  { ask: 'What are you planning?', why: 'So we match you with a contractor who does that exact work.' },
  { ask: 'Your ZIP code', why: 'So the contractor is local and works in your area.' },
  { ask: 'Do you own the home?', why: 'We work with homeowners only, because owners decide on the work.' },
  { ask: 'When do you want to start?', why: 'So the contractor knows how soon you would like to get going. A later date is fine.' },
  { ask: 'The property address', why: 'So the contractor can confirm they serve it before anyone drives out.' },
];

const faq = [
  {
    question: 'Does it cost anything?',
    answer:
      'No. HomeQuote Network is free for homeowners. Contractors pay us when a qualified appointment is booked, so there is no fee to you and nothing to sign up for.',
  },
  {
    question: 'Am I obligated to hire anyone?',
    answer:
      'No. The consultation is free and comes with no obligation. You can compare, ask questions, and say no.',
  },
  {
    question: 'Are you a contractor?',
    answer:
      'No. HomeQuote Network is a matching service. We connect homeowners with licensed local contractors. The contractor does the estimate and the work, and the agreement is between you and them.',
  },
  {
    question: 'Do I need to own my home?',
    answer:
      'Yes. We work with homeowners only, so renters and people who do not own the property cannot be matched.',
  },
  {
    question: 'Where do you work?',
    answer:
      'We are starting in Southern California, and availability depends on your area and the type of project. Your ZIP code is the first thing the form checks.',
  },
];

function Picks({ compact = false }: { compact?: boolean }) {
  return (
    <ul className="ho-picks">
      {projects.map((p, i) => (
        <li key={p.href} style={{ ['--i' as string]: i }} className="ho-pick relative">
          <Link
            href={p.href}
            className={`flex flex-col justify-center gap-2 px-5 after:absolute after:inset-0 after:content-[''] sm:px-8 ${
              compact ? 'py-6 sm:py-8' : 'py-8 sm:py-12'
            }`}
          >
            <span
              className={`ho-display ${
                compact ? 'text-[clamp(1.75rem,4vw,3rem)]' : 'text-[clamp(2.25rem,5.6vw,4.5rem)]'
              }`}
            >
              {p.name}
            </span>
            <span className="max-w-md text-base leading-6 text-[var(--ho-on-blue)]">
              {p.detail}
            </span>
            <span className="text-sm font-semibold text-[var(--ho-gold)]">{p.meta}</span>
          </Link>
          <div className="ho-pick-photo pointer-events-none" aria-hidden="true">
            <Image
              src={p.photo.src}
              alt=""
              width={p.photo.width}
              height={p.photo.height}
              sizes="(min-width: 768px) 384px, 100vw"
              priority={!compact && i === 0}
            />
            <span className="ho-go">
              <ArrowRight className="size-6" />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function HomePage() {
  return (
    <div className="ho">
      <FaqJsonLd items={faq} />
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

      {/* ---- Hero: the choice is the hero ---------------------------------- */}
      <section id="start" className="ho-hero scroll-mt-16">
        <div className="mx-auto w-full max-w-7xl px-5 pb-8 pt-9 sm:px-8 sm:pb-10 sm:pt-12">
          <h1 className="ho-display max-w-5xl text-[clamp(2.75rem,8.4vw,6rem)]">
            Tell us the project. We find your contractor.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-[var(--ho-on-blue)] sm:text-xl sm:leading-9">
            Answer a few quick questions. We connect you with a licensed local
            contractor for a free in-home consultation.
          </p>
          <p className="mt-4 text-base font-semibold">
            Free to use <span aria-hidden="true">·</span> No obligation{' '}
            <span aria-hidden="true">·</span> Homeowners only
          </p>
        </div>
        <Picks />
      </section>

      {/* ---- How it works -------------------------------------------------- */}
      <section id="how" className="scroll-mt-16 py-20 sm:py-28">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-12">
          <h2 className="ho-display text-[clamp(2rem,4.4vw,3.5rem)] lg:col-span-5">
            Three steps from idea to a contractor at your door.
          </h2>
          <ol className="ho-rows lg:col-span-7">
            {steps.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[3.5rem_1fr] gap-4 py-7 sm:grid-cols-[5rem_1fr]">
                <span className="ho-display text-5xl text-[var(--ho-blue)] sm:text-6xl">{i + 1}</span>
                <div>
                  <h3 className="ho-display text-2xl">{s.title}</h3>
                  <p className="mt-2 max-w-xl text-pretty text-lg leading-8 text-[var(--ho-ink-soft)]">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- Why we ask ---------------------------------------------------- */}
      <section className="bg-[var(--ho-mist-2)] py-20 sm:py-28">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="ho-display text-[clamp(2rem,4.4vw,3.5rem)]">
              Every question has a reason.
            </h2>
            <p className="mt-5 max-w-md text-pretty text-lg leading-8 text-[var(--ho-ink-soft)]">
              No long forms, and no questions we do not need. Here is what we ask
              and why.
            </p>
          </div>
          <dl className="ho-rows lg:col-span-7">
            {whyWeAsk.map((q) => (
              <div key={q.ask} className="grid gap-1 py-5 sm:grid-cols-5 sm:gap-8">
                <dt className="font-semibold sm:col-span-2">{q.ask}</dt>
                <dd className="text-pretty leading-7 text-[var(--ho-ink-soft)] sm:col-span-3">{q.why}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---- What we are, with a real photograph --------------------------- */}
      <section className="grid lg:grid-cols-2">
        <div className="relative min-h-[22rem] lg:min-h-[34rem]">
          <Image
            src={photos.livingKitchen.src}
            alt={photos.livingKitchen.alt}
            width={photos.livingKitchen.width}
            height={photos.livingKitchen.height}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center px-5 py-16 sm:px-12 sm:py-24 lg:px-16">
          <h2 className="ho-display text-[clamp(2rem,4.2vw,3.25rem)]">
            We are a matching service, not a contractor.
          </h2>
          <p className="mt-6 max-w-lg text-pretty text-lg leading-8 text-[var(--ho-ink-soft)]">
            We do not do the work and we do not charge you. Contractors pay us
            when a qualified appointment is booked, which is why we only match
            homeowners who are ready to talk.
          </p>
          <p className="mt-4 max-w-lg text-pretty text-lg leading-8 text-[var(--ho-ink-soft)]">
            Your agreement, if you choose to make one, is directly with the
            contractor.
          </p>
        </div>
      </section>

      {/* ---- FAQ ------------------------------------------------------------ */}
      <section id="faq" className="scroll-mt-16 py-20 sm:py-28">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-12">
          <h2 className="ho-display text-[clamp(2rem,4.4vw,3.5rem)] lg:col-span-5">
            Questions homeowners ask first.
          </h2>
          <div className="ho-faq ho-rows lg:col-span-7">
            {faq.map((item) => (
              <details key={item.question} className="border-t-2 border-[var(--ho-navy)] last:border-b-2">
                <summary className="flex items-center justify-between gap-6 py-5 text-xl font-semibold">
                  {item.question}
                  <Plus className="ho-plus size-6 shrink-0" aria-hidden="true" />
                </summary>
                <p className="max-w-2xl pb-6 text-pretty text-lg leading-8 text-[var(--ho-ink-soft)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Second chance to start ---------------------------------------- */}
      <section className="ho-hero ho-blue">
        <div className="mx-auto w-full max-w-7xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24">
          <h2 className="ho-display max-w-3xl text-[clamp(2.25rem,6vw,4.5rem)]">
            Ready? Pick your project.
          </h2>
          <p className="mt-5 text-base font-semibold">
            Free to use <span aria-hidden="true">·</span> No obligation{' '}
            <span aria-hidden="true">·</span> Homeowners only
          </p>
        </div>
        <div className="mt-10">
          <Picks compact />
        </div>
      </section>
    </div>
  );
}
