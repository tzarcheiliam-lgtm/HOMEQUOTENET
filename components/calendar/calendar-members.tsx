'use client';

import { useActionState } from 'react';
import { Bell, BellOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Feedback } from '@/components/availability/settings-form';
import { updateBookingCalendarMember, type SettingsState } from '@/lib/actions/booking';

export interface MemberView {
  userId: string;
  name: string;
  email: string | null;
  notify: boolean;
}

/**
 * The calendar's hosts: who is told about each booking (push + email) and
 * whose connected Google Calendar is read for busy time and receives the
 * call. Owners / admins add and remove; others read.
 */
export function CalendarMembers({
  calendarId,
  members,
  candidates,
  readOnly,
  addAction,
}: {
  calendarId: string;
  members: MemberView[];
  candidates: { id: string; name: string }[];
  readOnly: boolean;
  addAction: (prev: SettingsState, formData: FormData) => Promise<SettingsState>;
}) {
  const [state, add, pending] = useActionState<SettingsState, FormData>(addAction, undefined);
  const taken = new Set(members.map((m) => m.userId));
  const open = candidates.filter((c) => !taken.has(c.id));
  return (
    <div className="space-y-3">
      {members.length === 0 ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" role="alert">
          No hosts yet: nobody is notified when a call is booked here.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {members.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.email ?? ''}{m.email ? ' · ' : ''}{m.notify ? 'Notified of bookings' : 'Not notified'}
                </p>
              </div>
              {!readOnly && (
                <form action={updateBookingCalendarMember} className="flex items-center gap-1">
                  <input type="hidden" name="calendar_id" value={calendarId} />
                  <input type="hidden" name="user_id" value={m.userId} />
                  <Button type="submit" name="op" value={m.notify ? 'notify_off' : 'notify_on'} variant="ghost" size="icon" aria-label={m.notify ? `Stop notifying ${m.name}` : `Notify ${m.name}`}>
                    {m.notify ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                  </Button>
                  <Button type="submit" name="op" value="remove" variant="ghost" size="icon" aria-label={`Remove ${m.name}`}>
                    <Trash2 className="size-4" />
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      {!readOnly && open.length > 0 && (
        <form action={add} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select name="user_id" aria-label="Add a host" defaultValue="" className="sm:w-72" required>
            <option value="" disabled>Add a host…</option>
            {open.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Button type="submit" variant="outline" disabled={pending}>{pending ? 'Adding…' : 'Add host'}</Button>
          <Feedback state={state} />
        </form>
      )}
    </div>
  );
}
