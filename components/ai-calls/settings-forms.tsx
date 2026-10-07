'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addOptOut, saveCallingSettings, type AiActionState } from '@/lib/actions/ai-calling';
import type { AiCallingSettings } from '@/lib/ai-calling/types';

const Msg = ({ s }: { s: AiActionState }) => <span role="status" className={`text-xs ${s?.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}`}>{s?.ok ? s.message : s?.error}</span>;

export function CallingSettingsForm({ settings }: { settings: AiCallingSettings }) {
  const [state, action, pending] = useActionState<AiActionState, FormData>(saveCallingSettings, undefined);
  const f = (name: string, label: string, v: number, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" inputMode="numeric" defaultValue={v} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {f('window_start_hour', 'Window opens (hour, 0-23)', settings.window_start_hour, 'In the contact’s local time')}
        {f('window_end_hour', 'Window closes (hour, 1-24)', settings.window_end_hour, 'Calls stop before this hour')}
        {f('max_attempts', 'Max call attempts per lead', settings.max_attempts, 'Includes retries and redials')}
        {f('retry_delay_minutes', 'Minutes before a redial', settings.retry_delay_minutes)}
        {f('max_job_age_hours', 'Expire queued calls after (hours)', settings.max_job_age_hours, 'Stale jobs are never dialed')}
      </div>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</Button><Msg s={state} /></div>
    </form>
  );
}

export function OptOutForm() {
  const [state, action, pending] = useActionState<AiActionState, FormData>(addOptOut, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5"><Label htmlFor="optout-phone">Phone number</Label><Input id="optout-phone" name="phone" inputMode="tel" placeholder="(310) 555-0123" /></div>
      <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="optout-reason">Reason (optional)</Label><Input id="optout-reason" name="reason" maxLength={300} /></div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? 'Saving…' : 'Add opt-out'}</Button>
      <Msg s={state} />
    </form>
  );
}
