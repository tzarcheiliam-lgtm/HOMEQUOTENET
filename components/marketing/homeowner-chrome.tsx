'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { site } from '@/content/site';
import { BrandLogo } from '@/components/brand-logo';

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

/** Flat header, Buildoly-style: logo, a few links, one button. */
export function HomeownerHeader() {
  return (
    <header className="ho-header sticky top-0 z-50 border-b border-[var(--ho-rule)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:h-20 sm:px-8">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0 py-1.5">
          <BrandLogo tone="primary" priority className="w-[150px]" />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-6 sm:gap-8">
          <a href="#projects" className="hidden text-sm font-semibold sm:inline">Projects</a>
          <a href="#how" className="hidden text-sm font-semibold sm:inline">How it works</a>
          <a href={`tel:${site.contact.phoneHref}`} className="hidden text-sm font-semibold md:inline">
            {site.contact.phone}
          </a>
          <a href="#start" className="ho-btn ho-btn-dark !min-h-10 !px-5 !text-sm">
            Get your price
          </a>
        </nav>
      </div>
    </header>
  );
}

export function HomeownerFooter() {
  const col = 'space-y-2 text-sm';
  const h = 'mb-3 text-sm font-semibold text-[var(--ho-navy)]';
  return (
    <footer className="ho-footer border-t border-[var(--ho-rule)]">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 text-[var(--ho-ink-soft)] sm:px-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <BrandLogo tone="primary" className="w-[150px]" />
        </div>
        <div className="grid gap-10 sm:grid-cols-3 md:col-span-8">
          <ul className={col}>
            <li className={h}>Projects</li>
            <li><Link href="/estimator/bathroom-remodel">Bathroom</Link></li>
            <li><Link href="/estimate/kitchen-remodel">Kitchen</Link></li>
            <li><Link href="/adu-quiz">ADU</Link></li>
            <li><Link href="/estimate/pool-remodeling">Pool</Link></li>
          </ul>
          <ul className={col}>
            <li className={h}>Contact</li>
            <li><a href={`tel:${site.contact.phoneHref}`}>{site.contact.phone}</a></li>
            <li><a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></li>
          </ul>
          <ul className={col}>
            <li className={h}>More</li>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
            <li><Link href="/contractors">For contractors</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--ho-rule)]">
        <p className="mx-auto w-full max-w-6xl px-5 py-6 text-xs leading-5 text-[var(--ho-ink-soft)] sm:px-8">
          &copy; {new Date().getFullYear()} {site.name}. Stock photography is illustrative. We do not
          build or install anything shown.
        </p>
      </div>
    </footer>
  );
}
