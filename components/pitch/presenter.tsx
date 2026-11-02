'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, TriangleAlert } from 'lucide-react';
import { FAQS, PRICING_STATUS, SLIDES } from '@/lib/pitch/config';
import { cn } from '@/lib/utils';
import { DECK_CHANNEL, type DeckMessage } from './deck-context';

const PRICING_SLIDES = new Set(['pricing', 'compare', 'roi', 'addons', 'per-appointment', 'choose']);

/**
 * Presenter window (/app/pitch?view=presenter): speaker notes, a timer and the
 * next slide, kept in sync with the deck tab over a BroadcastChannel. Share the
 * deck tab on the call; keep this window to yourself.
 */
export function PresenterView() {
  const [index, setIndex] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(DECK_CHANNEL);
    channel.current = ch;
    ch.onmessage = (e: MessageEvent<DeckMessage>) => {
      if (e.data?.type === 'state') setIndex(e.data.index);
    };
    ch.postMessage({ type: 'hello' } satisfies DeckMessage);
    return () => ch.close();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const goto = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, i));
    channel.current?.postMessage({ type: 'goto', index: clamped } satisfies DeckMessage);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (index === null) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goto(index + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goto(index - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goto, index]);

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  if (index === null) {
    return (
      <main className="fixed inset-0 z-[60] grid place-items-center bg-[#0a1b3d] p-8 text-center text-white">
        <div className="max-w-md space-y-3">
          <h1 className="text-2xl font-semibold">Waiting for the deck</h1>
          <p className="text-white/70">
            Open the presentation in another tab of this browser (<span className="font-mono text-white">/app/pitch</span>). This window follows it automatically.
          </p>
        </div>
      </main>
    );
  }

  const slide = SLIDES[index];
  const next = SLIDES[index + 1];
  const decisions = slide.id === 'faq' ? FAQS.filter((f) => f.decision) : [];

  return (
    <main className="fixed inset-0 z-[60] overflow-auto bg-[#0a1b3d] text-white">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-6 p-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/60">
              Slide {index + 1} of {SLIDES.length}
            </p>
            <h1 className="text-2xl font-semibold">{slide.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="tabular-nums rounded-lg bg-white/10 px-3 py-1.5 text-lg font-semibold" aria-label="Time since the presenter window opened">
              {clock}
            </span>
            <button type="button" onClick={() => setStartedAt(Date.now())} className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Restart timer" title="Restart timer">
              <RotateCcw className="size-4" />
            </button>
          </div>
        </header>

        {PRICING_SLIDES.has(slide.id) && !PRICING_STATUS.confirmed ? (
          <p className="flex items-center gap-2 rounded-lg bg-amber-400/15 px-3 py-2 text-sm text-amber-200">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            {PRICING_STATUS.note}
          </p>
        ) : null}

        <dl className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['Say', slide.notes.say],
              ['Ask', slide.notes.ask],
              ['Emphasize', slide.notes.emphasize],
              ['Transition', slide.notes.next],
            ] as const
          ).map(([label, text]) => (
            <div key={label} className={cn('rounded-xl bg-white/[0.06] p-4', label === 'Ask' && 'ring-1 ring-[#f5b700]/60')}>
              <dt className={cn('text-sm font-semibold', label === 'Ask' ? 'text-[#f5b700]' : 'text-white/60')}>{label}</dt>
              <dd className="mt-1.5 text-lg leading-snug">{text}</dd>
            </div>
          ))}
        </dl>

        {decisions.length ? (
          <section className="rounded-xl bg-amber-400/10 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <TriangleAlert className="size-4" aria-hidden="true" />
              Not settled policy yet: don’t commit on the call
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm text-white/85">
              {decisions.map((f) => (
                <li key={f.q}>
                  <span className="font-semibold">{f.q}</span> {f.decision}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/10 pt-4">
          <button type="button" onClick={() => goto(index - 1)} disabled={index === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2.5 font-semibold hover:bg-white/15 disabled:opacity-30">
            <ChevronLeft className="size-4" aria-hidden="true" /> Back
          </button>
          <p className="truncate text-sm text-white/60">{next ? `Next: ${next.title}` : 'Last slide'}</p>
          <button type="button" onClick={() => goto(index + 1)} disabled={!next} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0038b8] px-4 py-2.5 font-semibold hover:bg-[#0045e0] disabled:opacity-30">
            Next <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="All slides" className="flex flex-wrap gap-1.5 pb-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goto(i)}
              aria-current={i === index ? 'step' : undefined}
              className={cn('rounded-md px-2.5 py-1 text-xs', i === index ? 'bg-white text-[#0a1b3d]' : 'bg-white/10 text-white/75 hover:bg-white/15')}
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </nav>
      </div>
    </main>
  );
}
