import {
  Waves,
  PaintRoller,
  Grid3x3,
  Settings2,
  Layers,
  SquareStack,
  Sparkles,
  Trees,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import type { IconName } from '@/content/types';

/**
 * Maps the string icon names used in content files to Lucide components, so
 * content stays serialisable and free of JSX.
 */
const registry: Record<IconName, LucideIcon> = {
  waves: Waves,
  paintRoller: PaintRoller,
  grid: Grid3x3,
  settings: Settings2,
  layers: Layers,
  squareStack: SquareStack,
  sparkles: Sparkles,
  trees: Trees,
  sun: Sun,
};

export function ContentIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const Icon = registry[name] ?? Waves;
  return <Icon className={className} aria-hidden="true" />;
}
