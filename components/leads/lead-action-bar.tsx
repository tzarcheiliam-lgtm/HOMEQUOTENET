'use client';

import { useState } from 'react';
import { ListChecks, MapPin, MoreHorizontal, Phone, RefreshCw } from 'lucide-react';
import { ActionBarItem, MobileActionBar } from '@/components/mobile/mobile-action-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { LeadStatusSheet } from '@/components/leads/lead-status-sheet';
import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/lib/types';

/**
 * The phone lead workspace bar: Call · Directions · Status · More.
 *
 * Status opens the pipeline picker for staff; for a contractor (whose status
 * lives on their own assignment) it jumps to the assignment section instead.
 * `more` is server-rendered by the page (edit / archive / delete forms) so the
 * permission checks stay where they already are — this component only decides
 * how the buttons are laid out.
 */
export function LeadActionBar({
  leadId,
  status,
  tel,
  directionsHref,
  canChangeStatus,
  more,
}: {
  leadId: string;
  status: LeadStatus;
  tel: string | null;
  directionsHref: string | null;
  canChangeStatus: boolean;
  more: React.ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const slot =
    'flex h-14 min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 rounded-xl border bg-background text-[11px] font-medium active:bg-accent';

  return (
    <MobileActionBar>
      {tel ? (
        <ActionBarItem href={tel} icon={Phone} label="Call" primary grow={1.4} />
      ) : (
        <ActionBarItem icon={Phone} label="No number" disabled grow={1.4} />
      )}
      {directionsHref ? (
        <ActionBarItem
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          icon={MapPin}
          label="Directions"
        />
      ) : (
        <ActionBarItem icon={MapPin} label="Directions" disabled />
      )}
      {canChangeStatus ? (
        <LeadStatusSheet leadId={leadId} status={status} triggerClassName={slot}>
          <RefreshCw className="size-5" aria-hidden="true" />
          <span>Status</span>
        </LeadStatusSheet>
      ) : (
        <ActionBarItem href="#assignments" icon={ListChecks} label="Update" />
      )}
      <BottomSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title="More actions"
        trigger={
          <button type="button" className={cn(slot)}>
            <MoreHorizontal className="size-5" aria-hidden="true" />
            <span>More</span>
          </button>
        }
      >
        <div
          className="space-y-2 pb-2"
          onClick={(e) => {
            const link = (e.target as HTMLElement).closest('a');
            if (!link) return;
            const href = link.getAttribute('href') ?? '';
            if (href.startsWith('#')) {
              // The sheet holds a scroll lock; jump once it has let go.
              e.preventDefault();
              setMoreOpen(false);
              window.setTimeout(() => {
                document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 120);
            } else {
              setMoreOpen(false);
            }
          }}
        >
          {more}
        </div>
      </BottomSheet>
    </MobileActionBar>
  );
}
