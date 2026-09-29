'use client';

import { useSyncExternalStore } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

/**
 * Tiny toast system: call toast('Saved') from any client code, render
 * <Toaster /> once in the layout. Concise, auto-dismissing, announced to screen
 * readers, and pinned above the bottom nav / home indicator on phones.
 */
type Tone = 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(message: string, tone: Tone = 'success'): void {
  const id = nextId++;
  items = [...items.slice(-2), { id, message, tone }];
  emit();
  if (tone === 'success') haptic('success');
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, tone === 'error' ? 5000 : 2600);
}

const EMPTY: ToastItem[] = [];
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => EMPTY);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 bottom-[calc(var(--mnav-h,4rem)+env(safe-area-inset-bottom)+0.75rem)] lg:bottom-6"
    >
      {list.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none',
            t.tone === 'error' && 'border-destructive/40'
          )}
        >
          {t.tone === 'error' ? (
            <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}
