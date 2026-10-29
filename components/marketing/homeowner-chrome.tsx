'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/content/site';
import { Wordmark } from './wordmark';

/**
 * The homepage speaks to homeowners; every other marketing route still speaks
 * to contractors. The layout hands both versions of the header and footer to
 * this switch, which picks one by pathname.
 */
export function AudienceSwitch({
  home,
  other,
}: {
  home: ReactNode;
  other: ReactNode;
}) {
  return usePathname() === '/' ? home : other;
}

/** Light, quiet header: the page below it is the loud part. */
export function HomeownerHeader() {
  return (
    <header className="ho-header sticky top-0 z-50">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:h-[4.5rem] sm:px-8">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0 py-1.5">
          <Wordmark />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 sm:gap-8">
          <a href="#how" className="hidden text-sm font-semibold sm:inline">
            How it works
          </a>
          <a href="#faq" className="hidden text-sm font-semibold sm:inline">
            Questions
          </a>
          <Link href="/contractors" className="whitespace-nowrap text-sm font-semibold underline-offset-4 hover:underline">
            For contractors
          </Link>
          <a href="#start" className="ho-btn ho-btn-gold !min-h-10 !px-4 !text-sm">
            Start
          </a>
        </nav>
      </div>
    </header>
  );
}

export function HomeownerFooter() {
  return (
    <footer className="ho-footer">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-12">
        <div className="md:col-span-6">
          <Wordmark size="lg" />
          <p className="mt-5 max-w-md text-sm leading-6">
            HomeQuote Network is a contractor-matching service, not a contractor.
            We connect homeowners with licensed local professionals for a free
            in-home consultation.
          </p>
        </div>
        <dl className="space-y-1 text-sm md:col-span-3">
          <dt className="font-semibold">Questions?</dt>
          <dd>
            <a className="inline-block py-1.5" href={`mailto:${site.contact.email}`}>
              {site.contact.email}
            </a>
          </dd>
          <dd>
            <a className="inline-block py-1.5" href={`tel:${site.contact.phoneHref}`}>
              {site.contact.phone}
            </a>
          </dd>
        </dl>
        <ul className="space-y-1 text-sm md:col-span-3">
          <li className="font-semibold">More</li>
          <li><Link className="inline-block py-1.5" href="/contractors">For contractors</Link></li>
          <li><Link className="inline-block py-1.5" href="/privacy">Privacy Policy</Link></li>
          <li><Link className="inline-block py-1.5" href="/terms">Terms</Link></li>
        </ul>
      </div>
      <div className="mx-auto w-full max-w-7xl px-5 pb-10 text-xs leading-5 sm:px-8">
        <p className="max-w-3xl">
          Illustrative stock photography. HomeQuote Network does not build,
          remodel or install anything shown. Availability varies by area and by
          project type. &copy; {new Date().getFullYear()} {site.name}. Operated by{' '}
          {site.operator}.
        </p>
      </div>
    </footer>
  );
}
