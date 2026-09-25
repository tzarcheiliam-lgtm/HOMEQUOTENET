import {
  BookOpen,
  Bot,
  Camera,
  Funnel,
  Globe,
  MapPin,
  Megaphone,
  MessagesSquare,
  Palette,
  PanelsTopLeft,
  Radar,
  RefreshCcw,
  SquareKanban,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceSlug } from '@/lib/growth/catalog';

export const SERVICE_ICONS: Record<ServiceSlug, LucideIcon> = {
  ai_receptionist: Bot,
  lead_follow_up: MessagesSquare,
  crm_setup: SquareKanban,
  custom_funnel: Funnel,
  website: Globe,
  lead_reactivation: RefreshCcw,
  call_tracking: Radar,
  brochures: BookOpen,
  brand_identity: Palette,
  social_ad_creative: Megaphone,
  photo_video: Camera,
  review_generation: Star,
  local_seo: MapPin,
  landing_pages: PanelsTopLeft,
};

/**
 * Icon chip. `muted` matches the KPI/empty-state chips; `strong` is the
 * premium chip on growth cards; `inverse` sits on the dark featured card.
 */
export function ServiceIcon({
  service,
  tone = 'muted',
  size = 'md',
  className,
}: {
  service: ServiceSlug;
  tone?: 'muted' | 'strong' | 'inverse';
  size?: 'md' | 'lg';
  className?: string;
}) {
  const Icon = SERVICE_ICONS[service];
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl',
        size === 'lg' ? 'size-12' : 'size-10',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        tone === 'strong' && 'bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-sm ring-1 ring-slate-900/10',
        tone === 'inverse' && 'bg-white/10 text-white ring-1 ring-white/15',
        className
      )}
    >
      <Icon className={size === 'lg' ? 'size-6' : 'size-5'} />
    </span>
  );
}
