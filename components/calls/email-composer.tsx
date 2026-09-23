'use client';

import { useActionState, useState } from 'react';
import { Send } from 'lucide-react';
import { sendProspectEmail, type SendEmailState } from '@/lib/actions/emails';
import type { EmailProspectOption } from '@/lib/data/emails';
import {
  buildMoreInfoAfterCallEmail,
  buildProspectEmailHtml,
  MORE_INFO_TEMPLATE_KEY,
} from '@/lib/emails/template';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function EmailComposer({
  prospects,
  gmailConnected,
  logoUrl,
}: {
  prospects: EmailProspectOption[];
  gmailConnected: boolean;
  logoUrl: string;
}) {
  const [state, action, pending] = useActionState<SendEmailState, FormData>(sendProspectEmail, undefined);
  const [prospectId, setProspectId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [serviceInterests, setServiceInterests] = useState('');
  const [template, setTemplate] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const selected = prospects.find((prospect) => prospect.id === prospectId) ?? null;

  const chooseProspect = (id: string) => {
    const prospect = prospects.find((item) => item.id === id);
    setProspectId(id);
    setContactName(prospect?.decision_maker_name ?? '');
    setContactEmail(prospect?.decision_maker_email ?? prospect?.email ?? '');
    setServiceInterests(prospect?.email_service_interests.join(', ') ?? '');
    setTemplate('');
    setSubject('');
    setMessage('');
  };

  const chooseTemplate = (value: string) => {
    setTemplate(value);
    if (value === MORE_INFO_TEMPLATE_KEY && selected) {
      const draft = buildMoreInfoAfterCallEmail(
        selected,
        contactName,
        serviceInterests.split(',').map((service) => service.trim()).filter(Boolean)
      );
      setSubject(draft.subject);
      setMessage(draft.message);
    }
  };
  const htmlPreview = message ? buildProspectEmailHtml(message, logoUrl) : '';

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
            <Label htmlFor="service-interests">Pool services discussed (optional)</Label>
            <Input
              id="service-interests"
              name="service_interests"
              value={serviceInterests}
              onChange={(event) => setServiceInterests(event.target.value)}
              maxLength={500}
              placeholder="e.g. pool remodels, new pool construction"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Enter only services they said they want more of, then choose the template.
              {selected?.primary_services.length
                ? ` Known company services: ${selected.primary_services.join(', ')}.`
                : ''}
            </p>
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
            <Label htmlFor="email-message">Message body</Label>
            <Textarea id="email-message" name="message" value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-80 leading-6" maxLength={20_000} required />
          </div>

          {selected && template && htmlPreview ? (
            <div className="space-y-2">
              <Label>Sent-email preview</Label>
              <div className="overflow-hidden rounded-md border bg-white shadow-sm">
                <div className="border-b bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div><span className="font-medium text-slate-500">To:</span> {contactName} &lt;{contactEmail}&gt;</div>
                  <div className="mt-1"><span className="font-medium text-slate-500">Subject:</span> {subject}</div>
                </div>
                <div className="p-4 sm:p-6" dangerouslySetInnerHTML={{ __html: htmlPreview }} />
              </div>
              <p className="text-xs text-muted-foreground">This HTML is used verbatim for Gmail delivery. The plain-text fallback includes the same message and Liam signature.</p>
            </div>
          ) : null}

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
