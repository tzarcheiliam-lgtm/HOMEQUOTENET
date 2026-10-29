'use client';

import { useEffect, useState } from 'react';
import { parseWallTime } from '@/lib/availability/time';
import { formatSlot } from '@/lib/booking/format';
import { SlotPicker, SlotPickerSkeleton } from '@/components/booking/slot-picker';
import type { PublicSlot } from '@/components/booking/types';
import { zoneLabel } from '@/components/booking/zone';
import { Input } from '@/components/ui/input';
import { getCalendarSlots, type ActionResult, type SlotsPayload } from '@/lib/actions/booking';

export interface ChosenTime {
  startsAt: string;
  /** Picked outside the open slots ("Book anyway", staff only). */
  override: boolean;
}

/**
 * The open times on a calendar, in the same SlotPicker the homeowner uses.
 * Hosts see the calendar's zone (they can switch to their own when it
 * differs). Staff may also type any other time ("Book anyway"), which the
 * booking RPC still refuses if it would double-book someone.
 */
export function SlotChooser({
  calendarId,
  calendarTimeZone,
  reschedule,
  allowOverride,
  value,
  onChange,
}: {
  calendarId: string;
  calendarTimeZone: string;
  reschedule?: { kind: 'appointment' | 'visit' | 'sales_appointment'; id: string };
  allowOverride: boolean;
  value: ChosenTime | null;
  onChange: (value: ChosenTime | null) => void;
}) {
  const [state, setState] = useState<ActionResult<SlotsPayload> | null>(null);
  const [zone, setZone] = useState(calendarTimeZone);
  const [browserZone, setBrowserZone] = useState<string | null>(null);
  const [other, setOther] = useState('');
  const rescheduleKey = reschedule ? `${reschedule.kind}:${reschedule.id}` : '';

  useEffect(() => {
    let live = true;
    setState(null);
    getCalendarSlots({ calendarId, ...(reschedule ? { reschedule } : {}) })
      .then((r) => { if (live) setState(r); })
      .catch(() => { if (live) setState({ ok: false, error: 'Could not load open times. Try again.' }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the calendar or booking changes
  }, [calendarId, rescheduleKey]);

  useEffect(() => {
    try {
      setBrowserZone(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
    } catch {
      setBrowserZone(null);
    }
  }, []);

  if (!state) return <SlotPickerSkeleton />;
  if (!state.ok) return <p className="text-sm text-destructive" role="alert">{state.error}</p>;

  const slots: PublicSlot[] = state.slots;
  const otherMs = other ? parseWallTime(other, calendarTimeZone) : null;

  return (
    <div className="space-y-5">
      {slots.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          No open times coming up. Check the calendar’s hours and booking window in its settings.
        </p>
      ) : (
        <SlotPicker
          slots={slots}
          timeZone={zone}
          zoneChoices={[calendarTimeZone, ...(browserZone ? [browserZone] : [])]}
          onTimeZoneChange={setZone}
          selected={value && !value.override ? value.startsAt : null}
          current={state.current}
          onSelect={(start) => { setOther(''); onChange({ startsAt: start, override: false }); }}
          headingLevel={3}
        />
      )}

      {allowOverride ? (
        <div className="space-y-1.5 rounded-lg border p-3">
          <label htmlFor={`other-${calendarId}`} className="text-sm font-medium">Another time (book anyway)</label>
          <p className="text-xs text-muted-foreground">
            Outside the open hours, notice or daily limit. {zoneLabel(Date.now(), calendarTimeZone)}. It still can’t double-book anyone, and it is logged.
          </p>
          <Input
            id={`other-${calendarId}`}
            type="datetime-local"
            value={other}
            onChange={(e) => {
              setOther(e.target.value);
              const ms = e.target.value ? parseWallTime(e.target.value, calendarTimeZone) : null;
              onChange(ms === null ? null : { startsAt: new Date(ms).toISOString(), override: true });
            }}
            className="w-full sm:w-64"
          />
          {otherMs !== null ? <p className="text-xs text-muted-foreground">{formatSlot(otherMs, calendarTimeZone)}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
