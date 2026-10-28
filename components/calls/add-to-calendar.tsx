'use client';

import { useState } from 'react';
import { CalendarCheck, CalendarPlus, CalendarX, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { markSalesAppointmentAdded } from '@/lib/actions/sales-calendar';
import { calendarAddState, type CalendarProvider } from '@/lib/calls/calendar-links';

export interface AddToCalendarProps {
  id: string;
  scheduledAt: string;
  cancelled: boolean;
  /** Meeting time already passed. */
  past: boolean;
  googleAddUrl: string;
  /** Google Calendar on the day this person added it, to find (move or delete) that event. */
  googleAddedDayUrl: string | null;
  icsUrl: string;
  /** The meeting time each calendar was last added for, or null. */
  added: { google: string | null; apple: string | null };
  /** Short labels ("Google", "Apple") for tight spaces such as the calendar agenda. */
  compact?: boolean;
}

/**
 * "Add to Google Calendar" / "Add to Apple Calendar" for one sales appointment.
 * Once added, the button shows that instead, so the meeting isn't added twice; a
 * rescheduled or cancelled meeting says what to do with the event already there.
 */
export function AddToCalendar(p: AddToCalendarProps) {
  const [added, setAdded] = useState(p.added);
  const google = calendarAddState(added.google, p.scheduledAt);
  const apple = calendarAddState(added.apple, p.scheduledAt);

  const mark = (provider: CalendarProvider) => {
    setAdded((a) => ({ ...a, [provider]: p.scheduledAt }));
    void markSalesAppointmentAdded(p.id, provider);
  };

  const say = (long: string, short: string) => (p.compact ? short : long);
  const btn = (strong: boolean) => cn(buttonVariants({ variant: strong ? 'outline' : 'ghost', size: 'sm' }), 'gap-1.5', !strong && 'text-muted-foreground');

  // Nothing to add for a cancelled or finished meeting that was never added.
  const showGoogle = google !== 'none' || (!p.cancelled && !p.past);
  const showApple = apple !== 'none' || (!p.cancelled && !p.past);
  if (!showGoogle && !showApple) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showGoogle ? (
        google === 'none' ? (
          <a href={p.googleAddUrl} target="_blank" rel="noopener noreferrer" onClick={() => mark('google')} className={btn(true)} aria-label={p.compact ? 'Add to Google Calendar' : undefined}>
            <CalendarPlus aria-hidden="true" /> {say('Add to Google Calendar', 'Google')}
          </a>
        ) : p.cancelled ? (
          <a href={p.googleAddedDayUrl ?? p.googleAddUrl} target="_blank" rel="noopener noreferrer" className={btn(true)} title="Opens that day in Google Calendar so you can delete the event">
            <CalendarX aria-hidden="true" /> {say('Cancelled: remove from Google', 'Remove from Google')}
          </a>
        ) : google === 'moved' ? (
          <a
            href={p.googleAddedDayUrl ?? p.googleAddUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => mark('google')}
            className={btn(true)}
            title="Opens the old day in Google Calendar. Drag the event to the new time instead of adding it again."
          >
            <RefreshCw aria-hidden="true" /> {say('Time changed: move it in Google', 'Move in Google')}
          </a>
        ) : (
          <a href={p.googleAddedDayUrl ?? p.googleAddUrl} target="_blank" rel="noopener noreferrer" className={btn(false)} title="Already added. Opens that day in Google Calendar.">
            <CalendarCheck aria-hidden="true" /> {say('In Google Calendar', 'In Google')}
          </a>
        )
      ) : null}
      {showApple ? (
        // Same UID every time, so opening it again updates the existing event rather than adding one.
        <a
          href={p.icsUrl}
          onClick={() => mark('apple')}
          aria-label={p.compact && apple === 'none' && !p.cancelled ? 'Add to Apple Calendar' : undefined}
          className={btn(apple !== 'added' || p.cancelled)}
          title={apple === 'added' && !p.cancelled ? 'Already added. Opening it again updates the same event.' : undefined}
        >
          {p.cancelled ? (
            <>
              <CalendarX aria-hidden="true" /> {say('Cancelled: update Apple Calendar', 'Update Apple')}
            </>
          ) : apple === 'moved' ? (
            <>
              <RefreshCw aria-hidden="true" /> {say('Time changed: update Apple Calendar', 'Update Apple')}
            </>
          ) : apple === 'added' ? (
            <>
              <CalendarCheck aria-hidden="true" /> {say('In Apple Calendar', 'In Apple')}
            </>
          ) : (
            <>
              <CalendarPlus aria-hidden="true" /> {say('Add to Apple Calendar', 'Apple')}
            </>
          )}
        </a>
      ) : null}
    </div>
  );
}
