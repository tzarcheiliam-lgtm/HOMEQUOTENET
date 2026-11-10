'use client';

import './pitch.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Expand, LayoutGrid, MonitorSmartphone, Shrink, Tag, X } from 'lucide-react';
import { SLIDES, SLIDE_INDEX, type TierId } from '@/lib/pitch/config';
import { cn } from '@/lib/utils';
import { DECK_CHANNEL, DeckContext, type DeckMessage } from './deck-context';
import { IntroSlide, ProblemSlide, SolutionSlide, HowSlide, PlatformSlide } from './slides-intro';
import { PricingSlide, CompareSlide, WhySlide, RoiSlide, AddOnsSlide } from './slides-offer';
import { PerAppointmentSlide, OnboardingSlide, FaqSlide, ChooseSlide, CloseSlide } from './slides-close';

const W = 1600;
const H = 900;

const COMPONENTS: Record<string, ComponentType> = {
  intro: IntroSlide,
  problem: ProblemSlide,
  solution: SolutionSlide,
  how: HowSlide,
  platform: PlatformSlide,
  pricing: PricingSlide,
  compare: CompareSlide,
  why: WhySlide,
  roi: RoiSlide,
  addons: AddOnsSlide,
  'per-appointment': PerAppointmentSlide,
  onboarding: OnboardingSlide,
  faq: FaqSlide,
  choose: ChooseSlide,
  close: CloseSlide,
};

/** Typing in the calculator (or any field) must not flip slides. */
function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function indexFromHash(): number {
  if (typeof window === 'undefined') return 0;
  const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  return SLIDE_INDEX[id] ?? 0;
}

/**
 * The HomeQuote sales presentation. Keyboard: ← → / Space / Page keys move,
 * Home / End jump, P pricing, G slide menu, F full screen, N presenter window.
 */
export function PitchDeck() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [tier, setTier] = useState<TierId>('managed');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const viewport = useRef<HTMLDivElement>(null);
  const indexRef = useRef(index);
  const channel = useRef<BroadcastChannel | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((next: number) => {
    setIndex((cur) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
      if (clamped !== cur) setDirection(clamped > cur ? 1 : -1);
      return clamped;
    });
  }, []);
  const goTo = useCallback((id: string) => go(SLIDE_INDEX[id] ?? 0), [go]);

  // Deep links: /app/pitch#pricing opens on that slide; the hash follows the deck.
  useEffect(() => {
    setIndex(indexFromHash());
    const onHash = () => go(indexFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [go]);
  useEffect(() => {
    const id = SLIDES[index]?.id;
    if (id && window.location.hash !== `#${id}`) window.history.replaceState(null, '', `#${id}`);
  }, [index]);

  // Fit the 1600 x 900 canvas to the screen.
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / W, el.clientHeight / H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Presenter window sync.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(DECK_CHANNEL);
    channel.current = ch;
    ch.onmessage = (e: MessageEvent<DeckMessage>) => {
      if (e.data?.type === 'goto') go(e.data.index);
      if (e.data?.type === 'hello') ch.postMessage({ type: 'state', index: indexRef.current } satisfies DeckMessage);
    };
    return () => ch.close();
  }, [go]);
  useEffect(() => {
    indexRef.current = index;
    channel.current?.postMessage({ type: 'state', index } satisfies DeckMessage);
  }, [index]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const openPresenter = useCallback(() => {
    window.open('/app/pitch?view=presenter', 'hq-pitch-presenter', 'width=980,height=760');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const k = e.key;
      if (menuOpen && k === 'Escape') return setMenuOpen(false);
      if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !(e.target instanceof HTMLButtonElement))) {
        e.preventDefault();
        go(indexRef.current + 1);
      } else if (k === 'ArrowLeft' || k === 'PageUp') {
        e.preventDefault();
        go(indexRef.current - 1);
      } else if (k === 'Home') go(0);
      else if (k === 'End') go(SLIDES.length - 1);
      else if (k === 'p' || k === 'P') goTo('pricing');
      else if (k === 'g' || k === 'G') setMenuOpen((v) => !v);
      else if (k === 'f' || k === 'F') toggleFullscreen();
      else if (k === 'n' || k === 'N') openPresenter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, goTo, menuOpen, openPresenter, toggleFullscreen]);

  // Controls fade out while the presenter talks; any mouse move brings them back.
  const wake = useCallback(() => {
    setChromeVisible(true);
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => setChromeVisible(false), 2500);
  }, []);
  useEffect(() => {
    wake();
    return () => {
      if (idle.current) clearTimeout(idle.current);
    };
  }, [wake]);

  const ctx = useMemo(() => ({ tier, setTier, goTo }), [tier, goTo]);
  const slide = SLIDES[index];
  const Current = COMPONENTS[slide.id];
  const progress = (index + 1) / SLIDES.length;

  return (
    <MotionConfig reducedMotion="user">
      <DeckContext.Provider value={ctx}>
        <div className="pd fixed inset-0 z-[60] select-none bg-[#060f24]" onMouseMove={wake} aria-roledescription="presentation">
          <div ref={viewport} className="absolute inset-0">
            <div
              className="pd-stage shadow-2xl"
              style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
              aria-live="polite"
              aria-label={`Slide ${index + 1} of ${SLIDES.length}: ${slide.title}`}
            >
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={slide.id}
                  custom={direction}
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Current />
                </motion.div>
              </AnimatePresence>
              {/* Discreet progress: a thin line that fills as the conversation moves along. */}
              <div className="absolute inset-x-0 bottom-0 h-[5px] bg-black/5">
                <motion.div className="h-full bg-[var(--pd-blue)]" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
              </div>
            </div>
          </div>

          {/* Presenter controls (outside the slide canvas). */}
          <nav
            aria-label="Presentation controls"
            className={cn(
              'absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#0a1b3d]/85 p-1 text-white shadow-lg backdrop-blur transition-opacity duration-300 focus-within:opacity-100',
              chromeVisible || menuOpen ? 'opacity-100' : 'opacity-0'
            )}
          >
            <CtrlButton label="Previous slide (←)" onClick={() => go(index - 1)} disabled={index === 0}>
              <ChevronLeft className="size-4" />
            </CtrlButton>
            <span className="pd-num min-w-14 px-1 text-center text-xs text-white/80">
              {index + 1} / {SLIDES.length}
            </span>
            <CtrlButton label="Next slide (→)" onClick={() => go(index + 1)} disabled={index === SLIDES.length - 1}>
              <ChevronRight className="size-4" />
            </CtrlButton>
            <span className="mx-1 h-5 w-px bg-white/20" aria-hidden="true" />
            <CtrlButton label="All slides (G)" onClick={() => setMenuOpen((v) => !v)} pressed={menuOpen}>
              <LayoutGrid className="size-4" />
            </CtrlButton>
            <CtrlButton label="Go to pricing (P)" onClick={() => goTo('pricing')}>
              <Tag className="size-4" />
            </CtrlButton>
            <CtrlButton label="Open presenter notes in a new window (N)" onClick={openPresenter}>
              <MonitorSmartphone className="size-4" />
            </CtrlButton>
            <CtrlButton label={fullscreen ? 'Exit full screen (F)' : 'Full screen (F)'} onClick={toggleFullscreen}>
              {fullscreen ? <Shrink className="size-4" /> : <Expand className="size-4" />}
            </CtrlButton>
          </nav>

          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="All slides"
                className="absolute inset-0 z-10 overflow-auto bg-[#060f24]/92 p-8 text-white backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mx-auto max-w-5xl">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Jump to a slide</h2>
                    <CtrlButton label="Close (Esc)" onClick={() => setMenuOpen(false)}>
                      <X className="size-5" />
                    </CtrlButton>
                  </div>
                  <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SLIDES.map((s, i) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          autoFocus={i === index}
                          onClick={() => {
                            go(i);
                            setMenuOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-baseline gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                            i === index ? 'border-[var(--pd-gold)] bg-white/10' : 'border-white/10 hover:bg-white/5'
                          )}
                        >
                          <span className="pd-num w-5 text-white/50">{i + 1}</span>
                          <span className="font-medium">{s.title}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-6 text-xs text-white/50">
                    Keys: ← → move · P pricing · G this menu · F full screen · N presenter notes
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </DeckContext.Provider>
    </MotionConfig>
  );
}

function CtrlButton({ label, onClick, disabled, pressed, children }: { label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className="grid size-9 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}
