'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveSmsBot, type SmsActionState } from '@/lib/actions/sms';
import { DEFAULT_OPENING_TEMPLATE, OPENING_PLACEHOLDERS, openingTemplateProblem, renderOpening } from '@/lib/sms/rules';

export function SmsBotForm({ instructions, senderName, defaultName, max, template }: { instructions: string; senderName: string; defaultName: string; max: number; template: string }) {
  const [state, action, pending] = useActionState<SmsActionState, FormData>(saveSmsBot, undefined);
  const [name, setName] = useState(senderName);
  const [opening, setOpening] = useState(template);
  const problem = openingTemplateProblem(opening);
  const preview = renderOpening(problem ? '' : opening, { firstName: 'Sam', senderName: name.trim() || defaultName, project: 'bathroom remodel' });
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="house_sender_name">Name the texts come from</Label>
        <Input id="house_sender_name" name="house_sender_name" value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName} maxLength={40} className="max-w-xs" />
        <p className="text-xs text-muted-foreground">Used on HomeQuote funnels. Leave blank for “{defaultName}”. Each contractor can have their own name on their contractor page.</p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="opening_template">First text</Label>
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => setOpening('')}>Use the standard wording</button>
        </div>
        <textarea id="opening_template" name="opening_template" value={opening} onChange={(e) => setOpening(e.target.value)} maxLength={1000} rows={3}
          placeholder={DEFAULT_OPENING_TEMPLATE} className="w-full rounded-md border bg-background p-3 text-sm" />
        <p className="text-xs text-muted-foreground">Blank uses the standard wording shown above. Fill-ins: {OPENING_PLACEHOLDERS.map((p) => <code key={p} className="mx-0.5 rounded bg-muted px-1">{p}</code>)}. It must include <code className="rounded bg-muted px-1">{'{sender}'}</code> so people know who’s texting.</p>
        {problem ? <p role="alert" className="text-xs text-destructive">{problem}</p> : null}
      </div>
      <div className="rounded-md border bg-muted/40 p-3 text-sm"><p className="text-xs font-medium text-muted-foreground">What a lead named Sam would get (preview)</p><p className="mt-1">{preview}</p></div>
      <div className="space-y-1.5">
        <Label htmlFor="bot_extra_instructions">Extra instructions for the assistant</Label>
        <textarea id="bot_extra_instructions" name="bot_extra_instructions" defaultValue={instructions} maxLength={max} rows={6}
          placeholder="e.g. Always offer evenings first. If they mention a budget under $5k, say we’ll find the right fit and still book the visit."
          className="w-full rounded-md border bg-background p-3 text-sm" />
        <p className="text-xs text-muted-foreground">Added to the assistant’s built-in goal (book the free in-home estimate visit). It can change wording and what to ask, but never the safety rules: STOP, no prices, no links, and handing off to you when unsure. Up to {max} characters.</p>
      </div>
      <div className="flex items-center gap-3"><Button type="submit" size="sm" disabled={pending || !!problem}>{pending ? 'Saving…' : 'Save'}</Button>
        <span role="status" className={`text-xs ${state?.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}`}>{state?.ok ? state.message : state?.error}</span></div>
    </form>
  );
}
