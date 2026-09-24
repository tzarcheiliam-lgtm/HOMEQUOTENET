'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import { site } from '@/content/site';
import { Container, Cta } from './primitives';
import { Wordmark } from './wordmark';

export type NavLink = { label: string; href: string };

/**
 * Industries dropdown. A disclosure (button + list of links) rather than an ARIA
 * menu, because every item is a plain navigation link. Closes on Escape, on an
 * outside click, and when a link is followed.
 */
function IndustriesMenu({ items }: { items: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="hq-industries-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 whitespace-nowrap py-2 text-sm font-medium text-[var(--hq-text-muted)] transition-colors hover:text-[var(--hq-text)] aria-expanded:text-[var(--hq-text)]"
      >
        Industries
        <ChevronDown
          className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id="hq-industries-menu"
          className="absolute left-1/2 top-full z-50 mt-3 w-60 -translate-x-1/2 rounded-xl border border-[var(--hq-line-strong)] bg-[var(--hq-bg-raised)] p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
        >
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--hq-text-muted)] transition-colors hover:bg-[var(--hq-surface-2)] hover:text-[var(--hq-text)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader({ industries }: { industries: NavLink[] }) {
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
            className="hidden items-center gap-4 lg:flex xl:gap-7"
            aria-label="Primary"
          >
            <IndustriesMenu items={industries} />
            {site.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap py-2 text-sm font-medium text-[var(--hq-text-muted)] transition-colors hover:text-[var(--hq-text)] ${
                  'wideOnly' in item ? 'hidden xl:inline' : ''
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/sign-in"
              className="whitespace-nowrap py-2 text-sm font-medium text-[var(--hq-text-muted)] transition-colors hover:text-[var(--hq-text)]"
            >
              Partner login
            </Link>
            <Cta href={site.cta.primaryHref} size="md">
              {site.cta.primaryShort}
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
          className="fixed inset-0 top-0 z-50 overflow-y-auto bg-[var(--hq-bg)] pb-10 lg:hidden"
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
              <div className="border-b border-[var(--hq-line)] py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--hq-text-dim)]">
                  Industries
                </p>
                <ul className="mt-2 grid grid-cols-2 gap-x-4">
                  {industries.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="block py-2 text-base font-medium text-[var(--hq-text)]"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
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
