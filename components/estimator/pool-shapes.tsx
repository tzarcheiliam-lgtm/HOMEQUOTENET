import type { PoolShape } from '@/lib/estimator/types';

/** STAND-IN: drawing of a pool shape (replaced by the real SVGs). */
export function PoolShapeIcon({ shape, className }: { shape: PoolShape; className?: string }) {
  return <span className={className} aria-hidden="true" data-shape={shape} />;
}
