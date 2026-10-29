'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Feedback, TIME_ZONES } from '@/components/availability/settings-form';
import type { SettingsState } from '@/lib/actions/booking';
import type { BookingCalendar } from '@/lib/booking/types';
import { displayPhone, resolveHostContact } from '@/lib/booking/host-contact';

/**
 * A booking calendar's rules: name, zone, call length, start-time step,
 * buffer, minimum notice, how far ahead, daily cap, phone or video (+ link),
 * the on/off switch, and who calls (the homeowner's contact card and
 * "Save Liam's number" vCard; blank fields use the defaults shown as
 * placeholders). `saveAction` is saveBookingCalendarSettings bound to
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
  // Placeholders show what a blank field resolves to (team / sales: Liam at HomeQuote).
  const fallback = resolveHostContact({ ...calendar, host: null });
  const h = calendar.host;
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
      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Who calls the homeowner</legend>
        <p className="text-sm text-muted-foreground">
          Shown on the booking screens (“Liam from Pool Masters will call you”), in the confirmation texts and emails, and on the
          “Save Liam’s number” contact card. Leave the number blank to show no card.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Caller name</span>
            <Input name="host_display_name" maxLength={80} placeholder={fallback?.displayName ?? 'Liam from Pool Masters'} defaultValue={h.displayName ?? ''} disabled={readOnly} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">First name</span>
            <Input name="host_first_name" maxLength={40} placeholder={fallback?.firstName ?? 'Liam'} defaultValue={h.firstName ?? ''} disabled={readOnly} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Company on the card</span>
            <Input name="host_org" maxLength={80} placeholder={fallback?.org ?? calendar.name} defaultValue={h.org ?? ''} disabled={readOnly} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Calls come from</span>
            <Input name="host_phone" type="tel" inputMode="tel" placeholder={fallback?.phone ? displayPhone(fallback.phone) : '(747) 217-5713'} defaultValue={h.phone ? displayPhone(h.phone) : ''} disabled={readOnly} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Email on the card <span className="font-normal text-muted-foreground">(optional)</span></span>
            <Input name="host_email" type="email" maxLength={254} defaultValue={h.email ?? ''} disabled={readOnly} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Logo / photo</span>
            <Input name="host_photo_path" placeholder={fallback?.photoPath ?? '/images/brand/poolmasters-logo.png'} defaultValue={h.photoPath ?? ''} disabled={readOnly} />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-3">
            <span className="font-medium">Note on the card <span className="font-normal text-muted-foreground">({'{minutes}'} = call length)</span></span>
            <Input name="host_note" maxLength={300} placeholder={fallback?.note ?? 'Your free {minutes}-minute call. Save this so you know it’s us when we call.'} defaultValue={h.note ?? ''} disabled={readOnly} />
          </label>
        </div>
      </fieldset>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</Button>
          <Feedback state={state} />
        </div>
      )}
    </form>
  );
}
