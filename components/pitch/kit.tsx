'use client';

import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/utils';

export type Tone = 'light' | 'mist' | 'navy';

/** One 1600 x 900 slide. The small logo sits bottom-left on every content slide. */
export function Slide({ tone = 'light', children, className, logo = true, bleed = false }: { tone?: Tone; children: ReactNode; className?: string; logo?: boolean; bleed?: boolean }) {
  return (
    <section className={cn('pd-slide', className)} data-tone={tone} style={bleed ? { padding: 0 } : undefined}>
      {children}
      {logo ? (
        <div className="absolute bottom-[34px] left-[104px] opacity-90" aria-hidden="true">
          <BrandLogo tone={tone === 'navy' ? 'reversed' : 'primary'} className="h-[30px] w-auto" />
        </div>
      ) : null}
    </section>
  );
}

export function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('pd-h2', className)}>{children}</h2>;
}

export function Lead({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('pd-lead mt-5', className)}>{children}</p>;
}

/** A small fine-print line pinned to the bottom-right of a slide. */
export function FinePrint({ children }: { children: ReactNode }) {
  return <p className="pd-small absolute bottom-[38px] right-[104px] max-w-[1000px] text-right">{children}</p>;
}

export function Tick({ className }: { className?: string }) {
  return (
    <span className={cn('grid size-6 shrink-0 place-items-center rounded-full bg-[var(--pd-blue-soft)] text-[var(--pd-blue)]', className)}>
      <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}
