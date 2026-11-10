import { UserCheck, UserX } from 'lucide-react';
import type { CallSummary } from '@/lib/video/events.server';
import { cn } from '@/lib/utils';

/**
 * One line of video call history (§52): "Joined 2:03 PM · 31 min" when the
 * guest came, "Didn't join" when the rep was in the room and the guest never
 * was (or the meeting was marked a no-show). Nothing before anyone joined.
 */
export function VideoCallHistory({ summary, timeZone, noShow = false, className }: { summary: CallSummary; timeZone: string; noShow?: boolean; className?: string }) {
  if (summary.guestJoinedAt) {
    const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(summary.guestJoinedAt));
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300', className)}>
        <UserCheck className="size-3.5" aria-hidden="true" />
        Joined {time}
        {summary.minutesTogether > 0 ? ` · ${summary.minutesTogether} min` : ''}
      </span>
    );
  }
  if (summary.hostJoinedAt && noShow) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300', className)}>
        <UserX className="size-3.5" aria-hidden="true" />
        Didn’t join
      </span>
    );
  }
  return null;
}
