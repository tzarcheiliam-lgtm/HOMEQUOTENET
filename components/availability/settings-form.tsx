'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { saveAvailabilitySettings, type AvailabilityState } from '@/lib/actions/availability';
import type { AvailabilitySettings } from '@/lib/availability/slots';

export const TIME_ZONES = [
  ['America/Los_Angeles', 'Pacific'],
  ['America/Denver', 'Mountain'],
  ['America/Phoenix', 'Arizona (no DST)'],
  ['America/Chicago', 'Central'],
  ['America/New_York', 'Eastern'],
  ['America/Anchorage', 'Alaska'],
  ['Pacific/Honolulu', 'Hawaii'],
] as const;

export function Feedback({ state }: { state: AvailabilityState }) {
  if (state?.error) return <p className="text-sm text-destructive" role="alert">{state.error}</p>;
  if (state?.success) return <p className="text-sm text-emerald-700" role="status">{state.success}</p>;
  return null;
}

export function SettingsForm({
  contractorId,
  settings,
  readOnly,
}: {
  contractorId: string;
  settings: AvailabilitySettings;
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState<AvailabilityState, FormData>(saveAvailabilitySettings, undefined);
  const zones: readonly (readonly [string, string])[] = TIME_ZONES.some(([z]) => z === settings.timezone)
    ? TIME_ZONES
    : [...TIME_ZONES, [settings.timezone, settings.timezone] as const];
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="contractor_id" value={contractorId} />
      <label className="flex items-start gap-3 rounded-lg border p-3">
        <input type="checkbox" name="weekly_schedule_enabled" defaultChecked={settings.weeklyScheduleEnabled} disabled={readOnly} className="mt-1 size-4" />
        <span className="text-sm">
          <span className="font-medium">Only take appointments during my weekly hours</span>
          <span className="block text-muted-foreground">
            Turn this on after setting your weekly hours below. Off means any time not blocked is open.
          </span>
        </span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Time zone</span>
          <Select name="timezone" defaultValue={settings.timezone} disabled={readOnly}>
            {zones.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Default appointment length (min)</span>
          <Input name="default_duration_minutes" type="number" min={15} max={480} step={15} defaultValue={settings.defaultDurationMinutes} disabled={readOnly} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Buffer between appointments (min)</span>
          <Input name="buffer_minutes" type="number" min={0} max={480} step={5} defaultValue={settings.bufferMinutes} disabled={readOnly} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Minimum notice (hours)</span>
          <Input name="min_notice_hours" type="number" min={0} max={720} defaultValue={settings.minNoticeHours} disabled={readOnly} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Max appointments per day</span>
          <Input name="max_appointments_per_day" type="number" min={1} max={50} placeholder="No limit" defaultValue={settings.maxAppointmentsPerDay ?? ''} disabled={readOnly} />
        </label>
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
