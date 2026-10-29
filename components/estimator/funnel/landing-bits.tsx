'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, Phone, X } from 'lucide-react';

/*
 * The landing page's two small interactive pieces: the dismissible
 * announcement bar and the header menu. Everything else on the landing is
 * server-rendered.
 */

const DISMISS_KEY = 'hq-funnel-announcement';

/** Dark bar over the header. × hides it for the rest of the visit (sessionStorage; shows again if storage is blocked). */
export function AnnouncementBar({ text, badge }: { text: string; badge?: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === text) setOpen(false);
    } catch {
      // Blocked storage: keep it visible.
    }
  }, [text]);
  if (!open) return null;
  return (
    <div className="relative bg-[#0a0a0a] text-white">
      <p className="mx-auto flex min-h-[36px] max-w-[1120px] items-center justify-center gap-2 py-[7px] pl-4 pr-12 text-center text-[13px] leading-[18px] tracking-[-0.005em] sm:text-[14px]">
        {badge ? (
          <span className="shrink-0 rounded-[4px] bg-white px-[5px] py-px text-[11px] font-semibold leading-[15px] tracking-[0.02em] text-[#0a0a0a]">{badge}</span>
        ) : null}
        <span className="text-pretty">{text}</span>
      </p>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          setOpen(false);
          try {
            window.sessionStorage.setItem(DISMISS_KEY, text);
          } catch {
            // Fine: it is hidden for this page view.
          }
        }}
        className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 touch-manipulation items-center justify-center text-white/85 transition-colors duration-150 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white motion-reduce:transition-none"
      >
        <X aria-hidden="true" className="size-[18px]" strokeWidth={1.6} />
      </button>
    </div>
  );
}

export type MenuLink = { href: string; label: string };

/** Hamburger (phones) that opens a small panel under the header card: the funnel, the projects, a call link. */
export function HeaderMenu({ links, tel, phone }: { links: MenuLink[]; tel: string | null; phone?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div ref={root} className="lg:hidden">
      <button
        ref={button}
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="-mr-2 flex size-11 touch-manipulation items-center justify-center rounded-[8px] text-[#0a0a0a] focus-visible:outline-2 focus-visible:outline-[var(--fn-blue)]"
      >
        {open ? <X aria-hidden="true" className="size-[22px]" strokeWidth={1.6} /> : <Menu aria-hidden="true" className="size-[24px]" strokeWidth={1.6} />}
      </button>
      {open ? (
        <nav
          id={id}
          aria-label="Menu"
          className="fn-pop absolute inset-x-0 top-[calc(100%+8px)] z-30 rounded-[12px] border border-black/[0.06] bg-white p-2 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_rgb(0_0_0/0.12)]"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="flex h-12 items-center rounded-[8px] px-3 text-[17px] font-medium text-[#0a0a0a] active:bg-black/[0.04]"
            >
              {l.label}
            </Link>
          ))}
          {tel ? (
            <a href={tel} className="flex h-12 items-center gap-2.5 rounded-[8px] px-3 text-[17px] font-medium text-[var(--fn-blue)] active:bg-black/[0.04]">
              <Phone aria-hidden="true" className="size-[17px]" strokeWidth={2} />
              <span className="tabular-nums">Call {phone}</span>
            </a>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
