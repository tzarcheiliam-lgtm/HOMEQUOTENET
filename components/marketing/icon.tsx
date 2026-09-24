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
  House,
  ChefHat,
  Bath,
  Building2,
  Warehouse,
  Ruler,
  Hammer,
  Construction,
  Droplets,
  CloudRain,
  ClipboardCheck,
  Wrench,
  Fence,
  DoorOpen,
  ArrowLeftRight,
  Shield,
  Columns3,
  Snowflake,
  Flame,
  Thermometer,
  Fan,
  AirVent,
  Wind,
  Leaf,
  Gauge,
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
  house: House,
  chefHat: ChefHat,
  bath: Bath,
  building: Building2,
  warehouse: Warehouse,
  ruler: Ruler,
  hammer: Hammer,
  construction: Construction,
  droplets: Droplets,
  cloudRain: CloudRain,
  clipboardCheck: ClipboardCheck,
  wrench: Wrench,
  fence: Fence,
  doorOpen: DoorOpen,
  arrowLeftRight: ArrowLeftRight,
  shield: Shield,
  columns: Columns3,
  snowflake: Snowflake,
  flame: Flame,
  thermometer: Thermometer,
  fan: Fan,
  airVent: AirVent,
  wind: Wind,
  leaf: Leaf,
  gauge: Gauge,
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
