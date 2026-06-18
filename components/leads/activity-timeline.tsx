import {
  MessageSquare,
  PhoneCall,
  ArrowRightLeft,
  BadgeCheck,
  UserPlus,
  CalendarClock,
  Pencil,
  Info,
} from 'lucide-react';
import type { ActivityType } from '@/lib/types';
import type { ActivityWithActor } from '@/lib/data/leads';

const ICONS: Record<ActivityType, typeof Info> = {
  note: MessageSquare,
  contact_attempt: PhoneCall,
  status_change: ArrowRightLeft,
  qualification: BadgeCheck,
  assignment: UserPlus,
  appointment: CalendarClock,
  field_change: Pencil,
  system: Info,
};

export function ActivityTimeline({
  activities,
}: {
  activities: ActivityWithActor[];
}) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity yet.</p>
    );
  }

  return (
    <ol className="space-y-4">
      {activities.map((a) => {
        const Icon = ICONS[a.type] ?? Info;
        const actor =
          a.actor?.full_name || a.actor?.email || 'System';
        return (
          <li key={a.id} className="flex gap-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm">{a.body || a.type}</p>
              <p className="text-xs text-muted-foreground">
                {actor} · {new Date(a.created_at).toLocaleString()}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
