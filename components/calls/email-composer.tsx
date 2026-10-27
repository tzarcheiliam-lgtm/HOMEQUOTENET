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
import { type EmailTemplateContext } from '@/lib/emails/variables';
import { draftFollowUp, stripSignOff } from '@/lib/emails/call-followups';
import type { EmailSigner } from '@/lib/emails/template';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface ProspectLibraryTemplate {
  key: string;
  category: string;
  name: string;
  subject: string;
  textBody: string;
}

export function EmailComposer({
  prospects,
  gmailConnected,
  logoUrl,
  libraryTemplates = [],
  homequote,
  signer,
  address = null,
}: {
  prospects: EmailProspectOption[];
  gmailConnected: boolean;
  logoUrl: string;
  libraryTemplates?: ProspectLibraryTemplate[];
  homequote?: EmailTemplateContext['homequote'];
  /** Who the email is signed by: the person sending it. */
  signer: EmailSigner;
  /** Mailing address for the opt-out footer (EMAIL_MAILING_ADDRESS), if set. */
  address?: string | null;
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
    if (value === MORE_INFO_TEMPLATE_KEY) {
      if (!selected) return;
      const draft = buildMoreInfoAfterCallEmail(
        selected,
        contactName,
        serviceInterests.split(',').map((service) => service.trim()).filter(Boolean)
      );
      setSubject(draft.subject);
      setMessage(draft.message);
      return;
    }
    const library = libraryTemplates.find((t) => t.key === value);
    if (library) {
      // The library's text_body ends with its own "— HomeQuote Network" sign-off;
      // it is stripped since the sender's own signature is added on send.
      const draft = draftFollowUp(
        { key: library.key, name: library.name, subject: library.subject, body: stripSignOff(library.textBody) },
        {
          companyName: selected?.company_name ?? '',
          city: selected?.city ?? null,
          contactName,
          services: serviceInterests.split(',').map((s) => s.trim()).filter(Boolean),
          sender: { name: signer.name, phone: signer.phone ?? null },
          homequote,
        }
      );
      setSubject(draft.subject);
      setMessage(draft.message);
    }
  };
  const htmlPreview = message ? buildProspectEmailHtml(message, logoUrl, signer, address) : '';
  const optedOut = Boolean(selected?.email_opt_out_at);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Recipient and template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email-prospect">Contractor company (optional)</Label>
            <Select id="email-prospect" name="prospect_id" value={prospectId} onChange={(event) => chooseProspect(event.target.value)}>
              <option value="">No company (e.g. homeowner email)</option>
              {prospects.map((prospect) => (
                <option key={prospect.id} value={prospect.id}>{prospect.company_name}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipient-name">Recipient name</Label>
            <Input id="recipient-name" name="recipient_name" value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={120} autoComplete="name" required />
            <p className="text-xs text-muted-foreground">When a company is selected, this is saved to the company record when you send, including if Gmail returns an error.</p>
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
            <Select id="email-template" name="template_key" value={template} onChange={(event) => chooseTemplate(event.target.value)} required>
              <option value="" disabled>Choose a template…</option>
              <option value={MORE_INFO_TEMPLATE_KEY}>More info after our call</option>
              {Object.entries(
                libraryTemplates.reduce<Record<string, ProspectLibraryTemplate[]>>((byCategory, t) => {
                  (byCategory[t.category] ??= []).push(t);
                  return byCategory;
                }, {})
              ).map(([category, templates]) => (
                <optgroup key={category} label={category}>
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>

          {optedOut ? (
            <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">This contractor asked not to be emailed. Email sending is disabled.</p>
          ) : null}
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

          {template && htmlPreview ? (
            <div className="space-y-2">
              <Label>Sent-email preview</Label>
              <div className="overflow-hidden rounded-md border bg-white shadow-sm">
                <div className="border-b bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div><span className="font-medium text-slate-500">To:</span> {contactName} &lt;{contactEmail}&gt;</div>
                  <div className="mt-1"><span className="font-medium text-slate-500">Subject:</span> {subject}</div>
                </div>
                <div className="p-4 sm:p-6" dangerouslySetInnerHTML={{ __html: htmlPreview }} />
              </div>
              <p className="text-xs text-muted-foreground">This HTML is used verbatim for Gmail delivery, signed by you, with the opt-out line. The plain-text fallback carries the same message and signature.</p>
            </div>
          ) : null}

          {state?.ok ? (
            <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}</p>
          ) : state && !state.ok ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.error}</p>
          ) : null}

          {!gmailConnected ? (
            <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">No Gmail account is connected. Connect yours (or ask an administrator to connect the automation sender) before sending.</p>
          ) : null}

          <div className="flex justify-end gap-2 border-t pt-4">
            {state && !state.ok && state.repeat ? (
              <Button type="submit" name="allow_repeat" value="1" variant="outline" disabled={pending}>
                Send anyway
              </Button>
            ) : null}
            <Button type="submit" disabled={pending || !gmailConnected || !template || selected?.disposition === 'do_not_call' || optedOut}>
              <Send className="size-4" aria-hidden="true" />
              {pending ? 'Sending…' : 'Send email'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
