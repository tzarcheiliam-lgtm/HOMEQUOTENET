'use client';

import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DurationField, Field, Group, HourSelect, asNumber, asString, formatHour, formatMinutes, issuesFor, type FormProps } from './shared';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const US_TIME_ZONES: { value: string; label: string }[] = [
  { value: 'America/New_York', label: 'Eastern (New York)' },
  { value: 'America/Chicago', label: 'Central (Chicago)' },
  { value: 'America/Denver', label: 'Mountain (Denver)' },
  { value: 'America/Phoenix', label: 'Arizona (no daylight saving)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
];

function daysPhrase(days: number[]): string {
  const set = new Set(days);
  if (set.size === 0) return 'day (pick at least one day)';
  if (set.size === 7) return 'day';
  if ([1, 2, 3, 4, 5].every((d) => set.has(d)) && set.size === 5) return 'weekday';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'weekend day';
  const names = [...set].sort((a, b) => a - b).map((d) => DAY_NAMES[d]);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

export function WaitBusinessHoursForm({ config, onChange, readOnly, issues }: FormProps) {
  const rawDays = Array.isArray(config.days) ? config.days.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6) : [];
  const start = asNumber(config.startHour) ?? 9;
  const end = asNumber(config.endHour) ?? 17;
  const zone = config.zone === 'fixed' ? 'fixed' : 'lead';
  const timezone = asString(config.timezone, 'America/Los_Angeles');
  const minDelay = asNumber(config.minimumDelayMinutes) ?? 0;
  const zoneLabel = US_TIME_ZONES.find((z) => z.value === timezone)?.label ?? timezone;
  const set = (patch: Record<string, unknown>) => onChange({ ...config, ...patch });

  const summary =
    `Wait until the next ${daysPhrase(rawDays)} between ${formatHour(start)} and ${formatHour(end)} ` +
    (zone === 'lead' ? `in the homeowner’s time zone (${zoneLabel} if it is unknown)` : `in ${zoneLabel} time`) +
    (minDelay > 0 ? `, and at least ${formatMinutes(minDelay)} from now` : '') +
    '.';

  return (
    <div className="space-y-6">
      <Group legend="Days" issues={issuesFor(issues, 'days')} hint="Choose the days the next step is allowed to run.">
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((label, d) => {
            const on = rawDays.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={DAY_NAMES[d]}
                disabled={readOnly}
                className={cn(
                  'flex h-11 items-center justify-center rounded-md border text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-accent'
                )}
                onClick={() => set({ days: (on ? rawDays.filter((x) => x !== d) : [...rawDays, d]).sort((a, b) => a - b) })}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Group>

      <div className="grid gap-4 sm:grid-cols-2">
        <HourSelect label="From" from={0} to={23} value={start} disabled={readOnly} issues={issuesFor(issues, 'startHour')} onChange={(h) => h !== undefined && set({ startHour: h })} />
        <HourSelect label="Until" from={1} to={24} value={end} disabled={readOnly} issues={issuesFor(issues, 'endHour')} onChange={(h) => h !== undefined && set({ endHour: h })} />
      </div>
      {start >= end ? <p className="text-xs text-amber-700 dark:text-amber-400">The window has to end after it starts.</p> : null}

      <Field label="Whose clock?" issues={issuesFor(issues, 'zone')}>
        {(a) => (
          <Select {...a} value={zone} disabled={readOnly} onChange={(e) => set({ zone: e.target.value })}>
            <option value="lead">The homeowner&apos;s local time</option>
            <option value="fixed">A fixed time zone</option>
          </Select>
        )}
      </Field>
      <Field
        label={zone === 'fixed' ? 'Time zone' : 'Time zone if the homeowner’s is unknown'}
        hint={zone === 'lead' ? 'The homeowner’s zone comes from their state or ZIP code.' : undefined}
        issues={issuesFor(issues, 'timezone')}
      >
        {(a) => (
          <Select {...a} value={timezone} disabled={readOnly} onChange={(e) => set({ timezone: e.target.value })}>
            {!US_TIME_ZONES.some((z) => z.value === timezone) ? <option value={timezone}>{timezone}</option> : null}
            {US_TIME_ZONES.map((z) => (
              <option key={z.value} value={z.value}>{z.label}</option>
            ))}
          </Select>
        )}
      </Field>

      <DurationField
        label="Always wait at least"
        hint="Optional. Waits this long first, then looks for the next window. Up to 7 days."
        minutes={minDelay}
        units={['minutes', 'hours', 'days']}
        min={0}
        max={10080}
        disabled={readOnly}
        issues={issuesFor(issues, 'minimumDelayMinutes')}
        onChange={(m) => m !== undefined && set({ minimumDelayMinutes: m })}
      />

      <p className="rounded-md border bg-muted/40 p-3 text-sm" aria-live="polite">{summary}</p>
    </div>
  );
}
