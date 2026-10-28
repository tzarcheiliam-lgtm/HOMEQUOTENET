import type { SceneSpec } from '@/lib/estimator/scene/types';
import { SCENE } from '@/lib/estimator/scene/types';

export type PoolSceneProps = {
  scene: SceneSpec;
  /** Night view: dusk lighting with glowing LEDs and fire. */
  night?: boolean;
  /** Accessible description of the design (the parent builds it from the answers). */
  label: string;
  className?: string;
};

/** STAND-IN: the live top-down pool picture (replaced by the real renderer). */
export function PoolScene({ scene, label, className }: PoolSceneProps) {
  return (
    <svg viewBox={`0 0 ${SCENE.width} ${SCENE.height}`} role="img" aria-label={label} className={className}>
      <rect width={SCENE.width} height={SCENE.height} fill="#6f9b4c" />
      <rect x={300} y={250} width={scene.lengthFt * SCENE.pxPerFt} height={scene.widthFt * SCENE.pxPerFt} rx={8} fill="#3fb6d3" />
    </svg>
  );
}
