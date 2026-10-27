'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

/**
 * Confetti and the big banner for the calling HUD. Fire from any client code
 * with celebrate(); render <Celebrations /> once. Same tiny-store pattern as
 * the toaster. With prefers-reduced-motion there is no confetti and the
 * banner simply appears — the words still land, the motion does not.
 */

export type Intensity = 'small' | 'big' | 'jackpot';
interface Banner {
  id: number;
  title: string;
  sub?: string;
  intensity: Intensity;
}

let banner: Banner | null = null;
let burst: { id: number; intensity: Intensity } | null = null;
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));

export function celebrate(opts: { title?: string; sub?: string; intensity: Intensity }): void {
  const id = nextId++;
  burst = { id, intensity: opts.intensity };
  if (opts.title && opts.intensity !== 'small') {
    banner = { id, title: opts.title, sub: opts.sub, intensity: opts.intensity };
    setTimeout(() => {
      if (banner?.id === id) {
        banner = null;
        emit();
      }
    }, opts.intensity === 'jackpot' ? 3200 : 2400);
  }
  if (opts.intensity !== 'small') haptic('success');
  emit();
}

const COLORS = ['#0038B8', '#F5B700', '#3B82F6', '#10B981', '#0A1B3D', '#FDE68A'];
const COUNT: Record<Intensity, number> = { small: 50, big: 140, jackpot: 240 };

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function Confetti({ trigger }: { trigger: { id: number; intensity: Intensity } | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!trigger || !canvas || reducedMotion()) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    c.scale(dpr, dpr);
    const n = COUNT[trigger.intensity];
    const parts = Array.from({ length: n }, () => {
      const fromSides = trigger.intensity !== 'small';
      const left = Math.random() < 0.5;
      return {
        x: fromSides ? (left ? 0 : w) : w / 2 + (Math.random() - 0.5) * 120,
        y: fromSides ? h * 0.65 : h * 0.25,
        vx: fromSides ? (left ? 1 : -1) * (4 + Math.random() * 9) : (Math.random() - 0.5) * 10,
        vy: fromSides ? -(9 + Math.random() * 11) : -(3 + Math.random() * 7),
        r: 4 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });
    const start = performance.now();
    const life = trigger.intensity === 'jackpot' ? 2600 : 1800;
    let raf = 0;
    const frame = (t: number) => {
      const age = t - start;
      c.clearRect(0, 0, w, h);
      c.globalAlpha = Math.max(0, 1 - age / life);
      for (const p of parts) {
        p.vy += 0.35;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.color;
        c.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        c.restore();
      }
      if (age < life) raf = requestAnimationFrame(frame);
      else c.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [trigger]);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80] size-full" />;
}

export function Celebrations() {
  const state = useSyncExternalStore(
    subscribe,
    () => banner,
    () => null
  );
  const fire = useSyncExternalStore(
    subscribe,
    () => burst,
    () => null
  );
  return (
    <>
      <Confetti trigger={fire} />
      <div aria-live="assertive" role="status" className="pointer-events-none fixed inset-x-0 top-[22%] z-[81] flex justify-center px-4">
        {state ? (
          <div
            key={state.id}
            className={cn(
              'rounded-2xl border px-6 py-4 text-center shadow-2xl animate-in fade-in zoom-in-90 duration-300 motion-reduce:animate-none',
              state.intensity === 'jackpot'
                ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-100'
                : 'border-primary/20 bg-card'
            )}
          >
            <p className={cn('font-semibold tracking-tight', state.intensity === 'jackpot' ? 'text-3xl' : 'text-2xl')}>
              {state.title}
            </p>
            {state.sub ? <p className="mt-1 text-sm text-muted-foreground">{state.sub}</p> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
