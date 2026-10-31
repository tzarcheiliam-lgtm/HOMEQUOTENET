'use client';

import { useActionState, useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { updateSalesAppointment, type EditMeetingState } from '@/lib/actions/prospects';
import { APPOINTMENT_TYPES, TIME_ZONES } from '@/lib/calls/constants';
import { localParts } from '@/lib/availability/time';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export interface EditableMeeting {
  id: string;
  company: string;
  scheduledAt: string;
  timeZone: string | null;
  appointmentType: string | null;
  contactInfo: string | null;
  decisionMakerName: string | null;
  notes: string | null;
}

const fmt = (iso: string, tz: string) => new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

/**
 * Edit one sales meeting in place: time, how you meet, contact info, who you meet, notes. Saving changes the SAME
 * meeting (moving the time marks it rescheduled and re-sends the reminder texts), so nothing is ever duplicated.
 */
export function EditAppointment({ meeting, size = 'sm' }: { meeting: EditableMeeting; size?: 'sm' | 'default' }) {
  const tz = meeting.timeZone || 'America/Los_Angeles';
  const start = localParts(new Date(meeting.scheduledAt).getTime(), tz);
  const startTime = `${String(Math.floor(start.minuteOfDay / 60)).padStart(2, '0')}:${String(start.minuteOfDay % 60).padStart(2, '0')}`;
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<EditMeetingState, FormData>(updateSalesAppointment, undefined);
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(startTime);
  const moved = date !== start.date || time !== startTime;
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => { if (state?.ok) setOpen(false); }, [state]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setDate(start.date); setTime(startTime); } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size={size}><Pencil aria-hidden /> Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="space-y-4">
          <div className="space-y-1 pr-8">
            <DialogTitle>Edit meeting</DialogTitle>
            <DialogDescription>{meeting.company} · now {fmt(meeting.scheduledAt, tz)}. Saving updates this meeting; it never adds another.</DialogDescription>
          </div>
          <input type="hidden" name="id" value={meeting.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`em-date-${meeting.id}`}>Date</Label>
              <Input id={`em-date-${meeting.id}`} name="appointment_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required aria-invalid={!!errors.appointment_date} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`em-time-${meeting.id}`}>Time</Label>
              <Input id={`em-time-${meeting.id}`} name="appointment_time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
          {errors.appointment_date && <p role="alert" className="text-xs text-destructive">{errors.appointment_date}</p>}
          {moved && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Moves it from {fmt(meeting.scheduledAt, tz)}. It’s marked rescheduled and the reminder texts go out for the new time.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`em-tz-${meeting.id}`}>Their time zone</Label>
              <Select id={`em-tz-${meeting.id}`} name="time_zone" defaultValue={tz}>
                {TIME_ZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`em-type-${meeting.id}`}>How you’ll meet</Label>
              <Select id={`em-type-${meeting.id}`} name="appointment_type" defaultValue={meeting.appointmentType ?? 'phone'} aria-invalid={!!errors.appointment_type}>
                {APPOINTMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`em-dm-${meeting.id}`}>Meeting with</Label>
            <Input id={`em-dm-${meeting.id}`} name="decision_maker_name" defaultValue={meeting.decisionMakerName ?? ''} maxLength={120} required aria-invalid={!!errors.decision_maker_name} />
            {errors.decision_maker_name && <p role="alert" className="text-xs text-destructive">{errors.decision_maker_name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`em-contact-${meeting.id}`}>Phone, email or meeting link</Label>
            <Input id={`em-contact-${meeting.id}`} name="contact_info" defaultValue={meeting.contactInfo ?? ''} maxLength={300} required aria-invalid={!!errors.contact_info} />
            {errors.contact_info && <p role="alert" className="text-xs text-destructive">{errors.contact_info}</p>}
            <p className="text-xs text-muted-foreground">Video call? HomeQuote makes the video link for you. Only paste a Zoom or Meet link to use that instead.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`em-notes-${meeting.id}`}>Notes</Label>
            <textarea id={`em-notes-${meeting.id}`} name="notes" defaultValue={meeting.notes ?? ''} rows={3} maxLength={2000} className="w-full rounded-md border bg-background p-3 text-sm" />
          </div>
          <div className="flex items-center justify-end gap-3">
            {state && !state.ok && <p role="alert" className="mr-auto text-xs text-destructive">{state.error}</p>}
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : moved ? 'Save new time' : 'Save changes'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
