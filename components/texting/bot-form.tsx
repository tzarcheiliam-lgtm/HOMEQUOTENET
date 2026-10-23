'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveSmsBot, type SmsActionState } from '@/lib/actions/sms';

export function SmsBotForm({ instructions, senderName, defaultName, max, preview }: { instructions: string; senderName: string; defaultName: string; max: number; preview: string }) {
  const [state, action, pending] = useActionState<SmsActionState, FormData>(saveSmsBot, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="house_sender_name">Name the texts come from</Label>
        <Input id="house_sender_name" name="house_sender_name" defaultValue={senderName} placeholder={defaultName} maxLength={40} className="max-w-xs" />
        <p className="text-xs text-muted-foreground">Used on HomeQuote funnels. Leave blank for “{defaultName}”. Contractor funnels text as that contractor.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bot_extra_instructions">Extra instructions for the assistant</Label>
        <textarea id="bot_extra_instructions" name="bot_extra_instructions" defaultValue={instructions} maxLength={max} rows={6}
          placeholder="e.g. Always offer evenings first. If they mention a budget under $5k, say we’ll find the right fit and still book the visit."
          className="w-full rounded-md border bg-background p-3 text-sm" />
        <p className="text-xs text-muted-foreground">Added to the assistant’s built-in goal (book the free in-home estimate visit). It can change wording and what to ask, but never the safety rules: STOP, no prices, no links, and handing off to you when unsure. Up to {max} characters.</p>
      </div>
      <div className="rounded-md border bg-muted/40 p-3 text-sm"><p className="text-xs font-medium text-muted-foreground">First text a lead gets (preview)</p><p className="mt-1">{preview}</p></div>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
        <span role="status" className={`text-xs ${state?.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}`}>{state?.ok ? state.message : state?.error}</span></div>
    </form>
  );
}
