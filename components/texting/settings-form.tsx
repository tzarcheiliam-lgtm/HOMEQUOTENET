'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveSmsSettings, type SmsActionState } from '@/lib/actions/sms';

export function SmsSettingsForm({ settings }: { settings: { window_start_hour: number; window_end_hour: number; daily_cap: number; contractor_funnels_enabled: boolean; first_text_delay_minutes?: number; max_ai_turns?: number; max_ai_replies_per_day?: number } }) {
  const [state, action, pending] = useActionState<SmsActionState, FormData>(saveSmsSettings, undefined);
  const f = (name: string, label: string, v: number, hint: string) => (
    <div className="space-y-1.5"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type="number" inputMode="numeric" defaultValue={v} /><p className="text-xs text-muted-foreground">{hint}</p></div>
  );
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {f('window_start_hour', 'First text no earlier than (hour)', settings.window_start_hour, 'Lead’s local time, 0–23')}
        {f('window_end_hour', 'No texts after (hour)', settings.window_end_hour, 'Lead’s local time, 1–24. Leads outside these hours are texted when the window opens.')}
        {f('daily_cap', 'Texts per 24 hours (all)', settings.daily_cap, 'A safety ceiling')}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {f('first_text_delay_minutes', 'Wait before the first text (minutes)', settings.first_text_delay_minutes ?? 0, '0 = right away. A short pause can feel less robotic.')}
        {f('max_ai_replies_per_day', 'Assistant replies per 24 hours (all)', settings.max_ai_replies_per_day ?? 150, 'Caps AI spend. Past this, conversations go to you.')}
        {f('max_ai_turns', 'Assistant replies per lead (max)', settings.max_ai_turns ?? 14, 'After this many it hands the conversation to you.')}
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="contractor_funnels_enabled" defaultChecked={settings.contractor_funnels_enabled} className="mt-1" />
        <span>Also text leads from contractor-branded funnels, as that contractor<span className="block text-xs text-muted-foreground">Master switch. Then turn texting on for each contractor on their contractor page. Leave off unless your agreement with the contractor allows it. House (HomeQuote) funnels always text as HomeQuote.</span></span></label>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</Button>
        <span role="status" className={`text-xs ${state?.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}`}>{state?.ok ? state.message : state?.error}</span></div>
    </form>
  );
}
