import type { PoolShape } from '@/lib/estimator/types';

/*
 * Top-down pool drawings for the shape question. Decorative only (the tile
 * text carries the label), so every drawing is aria-hidden. Colours are fixed
 * and tuned for the dark marketing theme: light coping outline, blue water.
 */

const COPING = 'var(--hq-text-muted, #b6c3de)';
const WATER = '#2fa4e7';
const WATER_DEEP = '#1b78b8';

type ShapeDrawing = {
  /** Closed outline of the water, in a 120x80 viewBox. */
  outline: string;
  /** Short ripple strokes inside the water. */
  ripples: string[];
};

const DRAWINGS: Record<Exclude<PoolShape, 'unsure'>, ShapeDrawing> = {
  rectangle: {
    outline: 'M12 18 H108 V62 H12 Z',
    ripples: ['M24 32 q6 -4 12 0 t12 0', 'M58 46 q6 -4 12 0 t12 0'],
  },
  l_shape: {
    outline: 'M14 14 H76 V34 H106 V66 H14 Z',
    ripples: ['M24 26 q6 -4 12 0 t12 0', 'M46 52 q6 -4 12 0 t12 0'],
  },
  freeform: {
    outline: 'M16 42 C14 24 34 14 54 20 C70 25 80 13 98 19 C114 26 112 46 98 54 C84 62 70 54 56 62 C38 70 18 62 16 42 Z',
    ripples: ['M30 36 q6 -4 12 0 t12 0', 'M70 38 q6 -4 12 0 t10 0'],
  },
};

export function PoolShapeIcon({ shape, className }: { shape: PoolShape; className?: string }) {
  if (shape === 'unsure') {
    // Rounded, dashed outline: "not sure yet", with a question mark.
    return (
      <svg viewBox="0 0 120 80" className={className} aria-hidden="true" focusable="false" data-shape={shape}>
        <rect x="12" y="14" width="96" height="52" rx="22" fill={WATER} fillOpacity="0.14" stroke={COPING} strokeWidth="3.5" strokeDasharray="7 6" strokeLinecap="round" />
        <path d="M52 34 a8 8 0 1 1 11.5 7.2 c-2.4 1.3 -3.5 2.8 -3.5 5.6" fill="none" stroke={COPING} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="60" cy="55" r="2.6" fill={COPING} />
      </svg>
    );
  }
  const d = DRAWINGS[shape];
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden="true" focusable="false" data-shape={shape}>
      <path d={d.outline} fill={WATER} stroke={COPING} strokeWidth="5" strokeLinejoin="round" />
      <path d={d.outline} fill="none" stroke={WATER_DEEP} strokeOpacity="0.5" strokeWidth="1.5" strokeLinejoin="round" />
      {d.ripples.map((r) => (
        <path key={r} d={r} fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  );
}
