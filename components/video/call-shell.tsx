import type { ReactNode } from 'react';
import { ShieldCheck, Video } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/utils';

/**
 * The HomeQuote frame around every video call screen (pre-join, waiting,
 * left, not open yet, ended): Navy page, reversed logo, a quiet trust line.
 */
export function CallShell({ children, className, wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0a1b3d] bg-[radial-gradient(ellipse_at_top,rgba(0,56,184,0.28),transparent_60%)] text-white">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <BrandLogo tone="reversed" className="h-7 w-auto sm:h-8" priority />
        <span className="inline-flex items-center gap-1.5 text-xs text-white/60">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Private video call
        </span>
      </header>
      <main className={cn('mx-auto flex w-full flex-1 flex-col px-5 pb-10 pt-2 sm:px-8 sm:pt-6', wide ? 'max-w-5xl' : 'max-w-md', className)}>{children}</main>
    </div>
  );
}

/** A centered message inside the shell (not open yet, ended, cancelled, not set up). */
export function CallNotice({ title, meta, body, children }: { title: string; meta?: string; body?: string; children?: ReactNode }) {
  return (
    <CallShell className="justify-center text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-white/10" aria-hidden="true">
        <Video className="size-5" />
      </span>
      <h1 className="font-display mt-5 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {meta ? <p className="mt-2 text-balance text-sm text-white/60">{meta}</p> : null}
      {body ? <p className="mx-auto mt-5 max-w-sm break-words text-[15px] leading-relaxed text-white/80">{body}</p> : null}
      {children ? <div className="mt-8 flex flex-col items-center gap-3">{children}</div> : null}
    </CallShell>
  );
}
