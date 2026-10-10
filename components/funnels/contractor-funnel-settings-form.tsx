'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateContractorFunnelSettings, type ContractorFunnelSettingsState } from '@/lib/actions/contractor-funnel';
import type { QualificationRules } from '@/lib/contractor-funnel/schema';

const RULE_LABELS: { key: keyof QualificationRules; label: string }[] = [
  { key: 'reviewIfOnlyOtherServices', label: 'Send to review when the only service chosen is “Something else”' },
  { key: 'reviewIfRoleOther', label: 'Send to review when the role is “Other”' },
  { key: 'reviewIfNoCapacity', label: 'Send to review when capacity is “No capacity right now”' },
  { key: 'reviewIfResearching', label: 'Send to review when the start timing is “Just researching”' },
];

export function ContractorFunnelSettingsForm({
  calendarUrl, pixelId, rules,
}: { calendarUrl: string; pixelId: string; rules: QualificationRules }) {
  const [state, action, pending] = useActionState<ContractorFunnelSettingsState, FormData>(updateContractorFunnelSettings, undefined);
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="sales_calendar_url">HomeQuote contractor-sales calendar URL</Label>
        <Input id="sales_calendar_url" name="sales_calendar_url" type="url" defaultValue={calendarUrl} placeholder="https://calendly.com/your-team/contractor-call" />
        <p className="text-xs text-muted-foreground">Used only for contractor prospects. Calendly links embed and report bookings; other https links open in a new tab and are never shown as “booked”. Leave blank to use the environment variable or site default.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="meta_pixel_id">Meta Pixel ID (optional)</Label>
        <Input id="meta_pixel_id" name="meta_pixel_id" inputMode="numeric" defaultValue={pixelId} placeholder="Digits only" />
        <p className="text-xs text-muted-foreground">Fires CtaClick, QualificationComplete, Lead (inquiry saved) and Schedule (booking) for visitors who allow measurement. No contact details are sent.</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Review rules</legend>
        <p className="text-xs text-muted-foreground">Everything else qualifies and sees the calendar. There are no revenue or budget requirements. Unchecked rules are ignored.</p>
        {RULE_LABELS.map((r) => (
          <label key={r.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={r.key} defaultChecked={rules[r.key]} className="size-4" /> {r.label}
          </label>
        ))}
      </fieldset>
      {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p role="status" className="text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}</Button>
    </form>
  );
}
