'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Feedback, TIME_ZONES } from '@/components/availability/settings-form';
import type { SettingsState } from '@/lib/actions/booking';
import type { BookingCalendar } from '@/lib/booking/types';

/**
 * A booking calendar's rules: name, zone, call length, start-time step,
 * buffer, minimum notice, how far ahead, daily cap, phone or video (+ link),
 * and the on/off switch. `saveAction` is saveBookingCalendarSettings bound to
 * the calendar id; the database checks the same bounds again.
 */
export function CalendarSettingsForm({
  calendar,
  readOnly,
  saveAction,
}: {
  calendar: BookingCalendar;
  readOnly: boolean;
  saveAction: (prev: SettingsState, formData: FormData) => Promise<SettingsState>;
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveAction, undefined);
  const [meeting, setMeeting] = useState(calendar.meetingType);
  const zones: readonly (readonly [string, string])[] = TIME_ZONES.some(([z]) => z === calendar.timezone)
    ? TIME_ZONES
    : [...TIME_ZONES, [calendar.timezone, calendar.timezone] as const];
  const notice = calendar.minNoticeMinutes / 60;
  return (
    <form action={action} className="space-y-4">
      <label className="flex items-start gap-3 rounded-lg border p-3">
        <input type="checkbox" name="active" defaultChecked={calendar.active} disabled={readOnly} className="mt-1 size-4" />
        <span className="text-sm">
          <span className="font-medium">Taking bookings</span>
          <span className="block text-muted-foreground">Off: funnels pointing here show their fallback instead of the time picker.</span>
        </span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-1">
          <span className="font-medium">Name</span>
          <Input name="name" defaultValue={calendar.name} maxLength={120} required disabled={readOnly} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Time zone</span>
          <Select name="timezone" defaultValue={calendar.timezone} disabled={readOnly}>
            {zones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Call length (min)</span>
          <Input name="duration_minutes" type="number" min={10} max={240} step={5} defaultValue={calendar.durationMinutes} disabled={readOnly} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Start times every (min)</span>
          <Input name="slot_step_minutes" type="number" min={5} max={240} step={5} defaultValue={calendar.slotStepMinutes} disabled={readOnly} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Buffer between calls (min)</span>
          <Input name="buffer_minutes" type="number" min={0} max={240} step={5} defaultValue={calendar.bufferMinutes} disabled={readOnly} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Minimum notice (hours)</span>
          <Input name="min_notice_hours" type="number" min={0} max={720} step={0.5} defaultValue={notice} disabled={readOnly} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Book up to (days ahead)</span>
          <Input name="horizon_days" type="number" min={1} max={120} defaultValue={calendar.horizonDays} disabled={readOnly} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Max calls per day</span>
          <Input name="max_per_day" type="number" min={1} max={100} placeholder="No limit" defaultValue={calendar.maxPerDay ?? ''} disabled={readOnly} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Meeting type</span>
          <Select name="meeting_type" value={meeting} onChange={(e) => setMeeting(e.target.value === 'video' ? 'video' : 'phone')} disabled={readOnly}>
            <option value="phone">Phone call (we call them)</option>
            <option value="video">Video call</option>
          </Select>
        </label>
        {meeting === 'video' ? (
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Video link</span>
            <Input name="video_link" type="url" inputMode="url" placeholder="https://meet.google.com/…" defaultValue={calendar.videoLink ?? ''} disabled={readOnly} />
          </label>
        ) : (
          <input type="hidden" name="video_link" value={calendar.videoLink ?? ''} />
        )}
      </div>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</Button>
          <Feedback state={state} />
        </div>
      )}
    </form>
  );
}
