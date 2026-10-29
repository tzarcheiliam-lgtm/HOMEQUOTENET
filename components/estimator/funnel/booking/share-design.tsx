'use client';

import { useId, useRef, useState } from 'react';
import { Check, Share } from 'lucide-react';

/**
 * "Send my design to my partner" on the booking screen (before and after they
 * book). The phone's own share sheet (Web Share API: iMessage, WhatsApp, mail…)
 * with a title, a line of text and the read-only design link; where there is no
 * share sheet (most desktops), the link is copied, and if even that is blocked
 * the link is shown selected so it can be copied by hand. The link carries only
 * the picks (lib/estimator/share.ts), never a name or a lead id.
 */
export function ShareDesignButton({ url, title, text }: { url: string; title: string; text: string }) {
  const uid = useId();
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const absolute = () => {
    try {
      return new URL(url, window.location.origin).toString();
    } catch {
      return url;
    }
  };

  const onShare = async () => {
    const link = absolute();
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ url: link }))) {
      try {
        await nav.share({ title, text, url: link });
        return;
      } catch (e) {
        // They closed the sheet: nothing to do. Anything else falls back to copying.
        if ((e as { name?: string })?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setState('copied');
    } catch {
      setState('manual');
      requestAnimationFrame(() => inputRef.current?.select());
    }
  };

  return (
    <div className="mt-3" data-funnel-share="">
      <button
        type="button"
        onClick={() => void onShare()}
        aria-describedby={state === 'copied' ? `${uid}-status` : undefined}
        className="inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-[4px] bg-white px-4 text-[16px] font-medium text-[var(--fn-ink)] shadow-[inset_0_0_0_1px_var(--fn-line)] transition-[background-color,scale] duration-150 ease-out active:scale-[0.985] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--fn-focus)] motion-reduce:transition-none [@media(hover:hover)]:hover:bg-[var(--fn-bg)]"
      >
        {state === 'copied' ? <Check aria-hidden="true" className="size-4 text-[color:var(--fn-blue)]" strokeWidth={2.4} /> : <Share aria-hidden="true" className="size-4" />}
        {state === 'copied' ? 'Link copied' : 'Send my design to my partner'}
      </button>
      <p id={`${uid}-status`} role="status" aria-live="polite" className="sr-only">
        {state === 'copied' ? 'Link to your design copied. Paste it in a text or email.' : ''}
      </p>
      {state === 'manual' ? (
        <div className="mt-2">
          <label htmlFor={`${uid}-link`} className="text-[14px] leading-5 text-[var(--fn-muted)]">Copy this link to your design:</label>
          <input
            ref={inputRef}
            id={`${uid}-link`}
            readOnly
            value={absolute()}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 h-11 w-full rounded-[4px] border border-[var(--fn-line)] bg-white px-3 text-[15px] text-[var(--fn-ink)]"
          />
        </div>
      ) : null}
    </div>
  );
}
