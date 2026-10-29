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

/** Quiet header: logo and a phone number. */
export function HomeownerHeader() {
  return (
    <header className="ho-header">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:h-20 sm:px-8">
        <Link href="/" aria-label={`${site.name} home`} className="shrink-0 py-1.5">
          <BrandLogo tone="primary" priority className="w-[150px]" />
        </Link>
        <a href={`tel:${site.contact.phoneHref}`} className="text-sm font-semibold">
          {site.contact.phone}
        </a>
      </div>
    </header>
  );
}

export function HomeownerFooter() {
  return (
    <footer className="ho-footer border-t border-[var(--ho-rule)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-8 text-xs leading-5 text-[var(--ho-ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          &copy; {new Date().getFullYear()} {site.name}. Stock photography is
          illustrative. We do not build or install anything shown.
        </p>
        <nav aria-label="Footer" className="flex gap-5">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contractors">For contractors</Link>
        </nav>
      </div>
    </footer>
  );
}
