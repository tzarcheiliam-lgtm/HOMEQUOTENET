'use client';

import { useActionState, useState } from 'react';
import { Send } from 'lucide-react';
import { sendProspectEmail, type SendEmailState } from '@/lib/actions/emails';
import type { EmailProspectOption } from '@/lib/data/emails';
import { buildMoreInfoAfterCallEmail, MORE_INFO_TEMPLATE_KEY } from '@/lib/emails/template';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function EmailComposer({
  prospects,
  senderName,
  gmailConnected,
}: {
  prospects: EmailProspectOption[];
  senderName: string | null;
  gmailConnected: boolean;
}) {
  const [state, action, pending] = useActionState<SendEmailState, FormData>(sendProspectEmail, undefined);
  const [prospectId, setProspectId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [template, setTemplate] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const selected = prospects.find((prospect) => prospect.id === prospectId) ?? null;

  const chooseProspect = (id: string) => {
    const prospect = prospects.find((item) => item.id === id);
    setProspectId(id);
    setContactName(prospect?.decision_maker_name ?? '');
    setContactEmail(prospect?.decision_maker_email ?? prospect?.email ?? '');
    setTemplate('');
    setSubject('');
    setMessage('');
  };

  const chooseTemplate = (value: string) => {
    setTemplate(value);
    if (value === MORE_INFO_TEMPLATE_KEY && selected) {
      const draft = buildMoreInfoAfterCallEmail(selected, contactName, senderName);
      setSubject(draft.subject);
      setMessage(draft.message);
    }
  };

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Recipient and template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email-prospect">Contractor company</Label>
            <Select id="email-prospect" name="prospect_id" value={prospectId} onChange={(event) => chooseProspect(event.target.value)} required>
              <option value="" disabled>Choose a company…</option>
              {prospects.map((prospect) => (
                <option key={prospect.id} value={prospect.id}>{prospect.company_name}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipient-name">Person you spoke with</Label>
            <Input id="recipient-name" name="recipient_name" value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={120} autoComplete="name" required />
            <p className="text-xs text-muted-foreground">Saved to the company record when you send, including if Gmail returns an error.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipient-email">Recipient email</Label>
            <Input id="recipient-email" name="recipient_email" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} maxLength={254} autoComplete="email" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-template">Template</Label>
            <Select id="email-template" name="template_key" value={template} onChange={(event) => chooseTemplate(event.target.value)} disabled={!selected} required>
              <option value="" disabled>Choose a template…</option>
              <option value={MORE_INFO_TEMPLATE_KEY}>More info after our call</option>
            </Select>
          </div>

          {selected?.disposition === 'do_not_call' ? (
            <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">This contractor is marked do not call. Email sending is disabled.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Editable preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Subject</Label>
            <Input id="email-subject" name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-message">Message</Label>
            <Textarea id="email-message" name="message" value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-80 leading-6" maxLength={20_000} required />
          </div>

          {state?.ok ? (
            <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}</p>
          ) : state && !state.ok ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.error}</p>
          ) : null}

          {!gmailConnected ? (
            <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">HomeQuote Gmail is not connected. An administrator must finish Google OAuth before sending.</p>
          ) : null}

          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={pending || !gmailConnected || !selected || !template || selected.disposition === 'do_not_call'}>
              <Send className="size-4" aria-hidden="true" />
              {pending ? 'Sending…' : 'Send email'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
