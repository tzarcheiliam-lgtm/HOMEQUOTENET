import {
  BookOpen,
  Camera,
  Contact,
  Globe,
  MapPin,
  Megaphone,
  MessageSquareReply,
  Palette,
  PanelsTopLeft,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceSlug } from '@/lib/growth/catalog';

const ICONS: Record<ServiceSlug, LucideIcon> = {
  brochures: BookOpen,
  brand_identity: Palette,
  website: Globe,
  landing_pages: PanelsTopLeft,
  social_ad_creative: Megaphone,
  photo_video: Camera,
  lead_follow_up: MessageSquareReply,
  crm_setup: Contact,
  review_generation: Star,
  local_seo: MapPin,
};

/** Neutral icon chip, matching the KPI and empty-state chips. */
export function ServiceIcon({ service, className }: { service: ServiceSlug; className?: string }) {
  const Icon = ICONS[service];
  return (
    <span
      aria-hidden
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground', className)}
    >
      <Icon className="size-4" />
    </span>
  );
}
