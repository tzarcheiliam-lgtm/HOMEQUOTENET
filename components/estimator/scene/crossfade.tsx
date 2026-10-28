import { useEffect, useState, type ReactNode } from 'react';

/** How long a new material takes to fade in over the old one (keep in sync with the CSS). */
export const FADE_MS = 420;

/**
 * Keys to draw for a value that crossfades: normally just the current one;
 * for FADE_MS after a change, the previous one too (underneath), so the new
 * look fades in over the old instead of popping.
 */
export function useFadeKeys(key: string): string[] {
  const [keys, setKeys] = useState<string[]>([key]);
  let current = keys;
  if (keys[keys.length - 1] !== key) {
    // Derived state from the previous render (React's documented pattern).
    current = [...keys.filter((k) => k !== key).slice(-1), key];
    setKeys(current);
  }
  useEffect(() => {
    if (keys.length < 2) return;
    const t = setTimeout(() => setKeys((ks) => ks.slice(-1)), FADE_MS + 80);
    return () => clearTimeout(t);
  }, [keys]);
  return current;
}

/** Renders `children(key)` per live key; the newest fades in when there is an old one under it. */
export function Crossfade({ k, children }: { k: string; children: (key: string) => ReactNode }) {
  const keys = useFadeKeys(k);
  return (
    <>
      {keys.map((key, i) => (
        <g key={key} className={keys.length > 1 && i === keys.length - 1 ? 'ps-fade' : undefined}>
          {children(key)}
        </g>
      ))}
    </>
  );
}
