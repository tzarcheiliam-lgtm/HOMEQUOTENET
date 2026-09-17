'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { site } from '@/content/site';
import { Container, Cta } from './primitives';
import { Wordmark } from './wordmark';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the sheet when it opens, so keyboard users are not left
  // on a control that is now behind the overlay.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 hq-glass transition-colors duration-300 ${
        scrolled ? 'border-b border-[var(--hq-line)]' : 'border-b border-transparent'
      }`}
    >
      <Container>
        <div className="flex h-16 items-center justify-between gap-6 sm:h-20">
          <Link
            href="/"
            className="-my-1 shrink-0 py-1.5"
            aria-label={`${site.name} home`}
            onClick={() => setOpen(false)}
          >
            <Wordmark />
          </Link>

          <nav
            className="hidden items-center gap-7 lg:flex"
            aria-label="Primary"
          >
            {site.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="py-2 text-sm font-medium text-[var(--hq-text-muted)] transition-colors hover:text-[var(--hq-text)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/sign-in"
              className="py-2 text-sm font-medium text-[var(--hq-text-muted)] transition-colors hover:text-[var(--hq-text)]"
            >
              Partner login
            </Link>
            <Cta href={site.cta.primaryHref} size="md">
              {site.cta.primary}
            </Cta>
          </div>

          {/*
            Hidden while the sheet is open. The sheet covers this button and
            carries its own close control, so leaving this one mounted would
            put a second "Close menu" button in the accessibility tree and in
            the tab order, underneath the overlay.
          */}
          {open ? null : (
            <button
              type="button"
              className="-mr-2 inline-flex size-10 items-center justify-center rounded-lg text-[var(--hq-text)] lg:hidden"
              aria-expanded={false}
              aria-controls="hq-mobile-nav"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </button>
          )}
        </div>
      </Container>

      {/* Mobile sheet */}
      {open ? (
        <div
          id="hq-mobile-nav"
          className="fixed inset-0 top-0 z-50 bg-[var(--hq-bg)] lg:hidden"
        >
          <Container>
            <div className="flex h-16 items-center justify-between sm:h-20">
              <Wordmark />
              <button
                ref={closeRef}
                type="button"
                className="-mr-2 inline-flex size-10 items-center justify-center rounded-lg text-[var(--hq-text)]"
                aria-expanded
                aria-controls="hq-mobile-nav"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>

            <nav
              className="mt-4 flex flex-col"
              aria-label="Primary mobile"
            >
              {site.nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-[var(--hq-line)] py-4 text-lg font-medium text-[var(--hq-text)]"
                >
                  {item.label}
                </a>
              ))}
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="border-b border-[var(--hq-line)] py-4 text-lg font-medium text-[var(--hq-text-muted)]"
              >
                Partner login
              </Link>
            </nav>

            <div className="mt-8">
              <Cta
                href={site.cta.primaryHref}
                className="w-full"
              >
                {site.cta.primary}
              </Cta>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
