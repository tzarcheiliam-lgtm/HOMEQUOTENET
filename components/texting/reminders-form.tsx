'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveReminderSettings, type SmsActionState } from '@/lib/actions/sms';
import { DEFAULT_REMINDER_CONFIG, MAX_REMINDER_TEMPLATE, REMINDER_PLACEHOLDERS, reminderTemplateProblem, renderReminder, type ReminderVars } from '@/lib/sms/reminder-config';
import { MEETING_STEPS, type FollowUpStep, type MeetingStep } from '@/lib/sms/reminder-plan';

type Templates<K extends string> = Record<K, string>;
export interface ReminderFormValue {
  contractor: { enabled: boolean; host: string; brand: string; templates: Templates<MeetingStep> };
  homeowner: { enabled: boolean; templates: Templates<MeetingStep> };
  followups: { enabled: boolean; days: number[]; templates: Templates<FollowUpStep> };
  unconfirmedAlert: boolean;
}

const MEETING_WHEN: Record<MeetingStep, { label: string; when: string; sampleWhen: string }> = {
  booked: { label: 'Booked', when: 'Right after it’s booked', sampleWhen: 'Thursday, Nov 6 at 2:00 PM' },
  four_days: { label: '4 days before', when: '10:00 AM, only when booked a week or more out', sampleWhen: 'Thursday, Nov 6 at 2:00 PM' },
  day_before: { label: 'Day before', when: '10:00 AM, asks them to reply YES or R', sampleWhen: 'tomorrow at 2:00 PM' },
  morning_of: { label: 'Morning of', when: '8:00 AM on the day (meetings at 9:30 AM or later)', sampleWhen: 'today at 2:00 PM' },
  two_hours: { label: '2 hours before', when: '2 hours before the start', sampleWhen: 'today at 2:00 PM' },
  no_show: { label: 'Missed it', when: '30 minutes after it’s marked a no-show', sampleWhen: 'today at 2:00 PM' },
};
const FOLLOW_LABEL: Record<FollowUpStep, string> = { first: 'First follow-up', second: 'Second follow-up', final: 'Last follow-up (closes the request)', nudge: 'Nudge', nudge_last: 'Last nudge' };

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      <span><span className="font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
    </label>
  );
}

function StepEditor({ id, label, when, value, fallback, vars, onChange }: { id: string; label: string; when: string; value: string; fallback: string; vars: ReminderVars; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const problem = reminderTemplateProblem(value);
  const preview = renderReminder(problem || !value.trim() ? fallback : value, vars);
  return (
    <li className="relative pl-6">
      <span aria-hidden className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium">{label} <span className="font-normal text-muted-foreground">· {when}</span></p>
        <button type="button" className="text-xs text-primary hover:underline" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{open ? 'Done' : value.trim() ? 'Edit (custom)' : 'Edit wording'}</button>
      </div>
      <p className="mt-1 rounded-md bg-muted/50 px-3 py-2 text-sm">{preview}</p>
      {open && (
        <div id={id} className="mt-2 space-y-1">
          <textarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={MAX_REMINDER_TEMPLATE} rows={3} placeholder={fallback}
            aria-label={`${label} wording`} className="w-full rounded-md border bg-background p-3 text-sm" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {problem ? <p role="alert" className="text-xs text-destructive">{problem}</p> : <p className="text-xs text-muted-foreground">Blank uses the standard wording.</p>}
            {value && <button type="button" className="text-xs text-primary hover:underline" onClick={() => onChange('')}>Use the standard wording</button>}
          </div>
        </div>
      )}
    </li>
  );
}

export function RemindersForm({ value }: { value: ReminderFormValue }) {
  const [state, action, pending] = useActionState<SmsActionState, FormData>(saveReminderSettings, undefined);
  const [cfg, setCfg] = useState(value);
  const [daysText, setDaysText] = useState(value.followups.days.join(', '));
  const d = DEFAULT_REMINDER_CONFIG;
  const days = daysText.split(/[\s,]+/).filter(Boolean).map(Number);
  const daysProblem = days.some((n) => !Number.isInteger(n) || n < 1 || n > 30) ? 'Use whole days from 1 to 30.' : new Set(days).size !== days.length || days.length < 1 || days.length > 3 ? 'Pick one to three different days.' : null;
  const templates = [...Object.values(cfg.contractor.templates), ...Object.values(cfg.homeowner.templates), ...Object.values(cfg.followups.templates)];
  const anyProblem = !!daysProblem || templates.some((t) => !!reminderTemplateProblem(t));
  const payload = JSON.stringify({ ...cfg, followups: { ...cfg.followups, days } });
  const set = <K extends keyof ReminderFormValue>(k: K, v: Partial<ReminderFormValue[K]>) => setCfg((c) => ({ ...c, [k]: typeof c[k] === 'object' ? { ...(c[k] as object), ...v } : v }));
  const host = cfg.contractor.host.trim() || d.contractor.host;
  const brand = cfg.contractor.brand.trim() || d.contractor.brand;
  const sortedDays = daysProblem ? d.followups.days : [...days].sort((a, b) => a - b);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="config" value={payload} />
      <p className="text-sm text-muted-foreground">Texts go out through your Mac with the usual rules: texting hours in their time zone, opt-outs, do-not-call and the daily limit. A reminder that can’t go out in time is skipped, never sent late. Rescheduled meetings get their reminders again.</p>

      <section className="space-y-3 rounded-lg border p-4">
        <Toggle checked={cfg.contractor.enabled} onChange={(v) => set('contractor', { enabled: v })} label="Contractor sales meetings" hint="Meetings booked from the calling workspace. Texts the decision maker’s number on the meeting, or the company phone." />
        {cfg.contractor.enabled && (<>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="rem_host">Meeting host</Label><Input id="rem_host" value={cfg.contractor.host} maxLength={40} placeholder={d.contractor.host} onChange={(e) => set('contractor', { host: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="rem_brand">Company</Label><Input id="rem_brand" value={cfg.contractor.brand} maxLength={40} placeholder={d.contractor.brand} onChange={(e) => set('contractor', { brand: e.target.value })} /></div>
          </div>
          <ol className="space-y-4 border-l pl-0 [&>li]:-ml-[5px]">
            {MEETING_STEPS.map((s) => (
              <StepEditor key={s} id={`rem_c_${s}`} label={MEETING_WHEN[s].label} when={MEETING_WHEN[s].when} value={cfg.contractor.templates[s]}
                fallback={d.contractor.templates[s]} vars={{ first_name: 'Mike', host, brand, business: 'Acme Remodeling', how: 'call', when: MEETING_WHEN[s].sampleWhen }}
                onChange={(v) => set('contractor', { templates: { ...cfg.contractor.templates, [s]: v } })} />
            ))}
          </ol>
          <Toggle checked={cfg.unconfirmedAlert} onChange={(v) => setCfg((c) => ({ ...c, unconfirmedAlert: v }))} label="Alert me to call when they haven’t confirmed by 8 AM" hint="A push notification to admins and the person who booked it, on the morning of the meeting." />
          <p className="text-xs text-muted-foreground">Replies: <b>YES</b> marks the meeting confirmed. <b>R</b> or “can’t make it” alerts you to find a new time. Anything else is sent to you as an alert.</p>
        </>)}
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <Toggle checked={cfg.homeowner.enabled} onChange={(v) => set('homeowner', { enabled: v })} label="Homeowner appointments" hint="Estimate visits booked on a lead. Texts come from the contractor’s texting name." />
        {cfg.homeowner.enabled && (
          <ol className="space-y-4 border-l [&>li]:-ml-[5px]">
            {MEETING_STEPS.map((s) => (
              <StepEditor key={s} id={`rem_h_${s}`} label={MEETING_WHEN[s].label} when={MEETING_WHEN[s].when} value={cfg.homeowner.templates[s]} fallback={d.homeowner.templates[s]}
                vars={{ first_name: 'Sam', host: 'Acme Remodeling', when: MEETING_WHEN[s].sampleWhen }}
                onChange={(v) => set('homeowner', { templates: { ...cfg.homeowner.templates, [s]: v } })} />
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <Toggle checked={cfg.followups.enabled} onChange={(v) => set('followups', { enabled: v })} label="Follow up when a homeowner doesn’t reply" hint="Stops as soon as they reply, text STOP, or a person takes over. After the last one the request is closed; a reply opens it again." />
        {cfg.followups.enabled && (<>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="rem_days">Days after the first text</Label>
            <Input id="rem_days" value={daysText} inputMode="numeric" onChange={(e) => setDaysText(e.target.value)} placeholder="1, 3, 7" aria-invalid={!!daysProblem} />
            {daysProblem ? <p role="alert" className="text-xs text-destructive">{daysProblem}</p> : <p className="text-xs text-muted-foreground">Up to three, e.g. 1, 3, 7.</p>}
          </div>
          <ol className="space-y-4 border-l [&>li]:-ml-[5px]">
            {[...sortedDays.map((day, i) => ({ step: (i === sortedDays.length - 1 ? 'final' : (['first', 'second'] as const)[i]) as FollowUpStep, when: `Day ${day}, if they never replied` })),
              { step: 'nudge' as const, when: 'They replied, then went quiet on our question' }, { step: 'nudge_last' as const, when: 'Still quiet 3 days after their last reply' }].map(({ step: s, when }) => (
              <StepEditor key={s} id={`rem_f_${s}`} label={FOLLOW_LABEL[s]} when={when} value={cfg.followups.templates[s]} fallback={d.followups.templates[s]}
                vars={{ first_name: 'Sam', project: 'bathroom remodel', sender: 'HomeQuote' }}
                onChange={(v) => set('followups', { templates: { ...cfg.followups.templates, [s]: v } })} />
            ))}
          </ol>
        </>)}
      </section>

      <p className="text-xs text-muted-foreground">Fill-ins: {REMINDER_PLACEHOLDERS.map((p) => <code key={p} className="mx-0.5 rounded bg-muted px-1">{p}</code>)}. Links are removed.</p>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={pending || anyProblem}>{pending ? 'Saving…' : 'Save reminders'}</Button>
        <span role="status" className={`text-xs ${state?.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}`}>{state?.ok ? state.message : state?.error}</span></div>
    </form>
  );
}
