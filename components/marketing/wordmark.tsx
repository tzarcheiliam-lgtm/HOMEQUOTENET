import { cn } from '@/lib/utils';

/**
 * Text-based wordmark with a small geometric mark.
 *
 * PLACEHOLDER: swap the <span> mark for the real logo file when brand assets
 * exist. Drop an SVG at /public/logo.svg and replace the mark block below.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="relative inline-flex size-7 items-center justify-center rounded-[7px] bg-gradient-to-br from-[var(--hq-accent-bright)] to-[var(--hq-accent-dim)] shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]"
      >
        {/* Roofline mark: a house/quote hybrid drawn as pure geometry. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-4 text-white"
          strokeWidth="2.2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 11.5 12 5l8 6.5" />
          <path d="M7 13v5.5h10V13" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-[var(--hq-text)]">
        HomeQuote<span className="text-[var(--hq-text-dim)]"> Network</span>
      </span>
    </span>
  );
}
