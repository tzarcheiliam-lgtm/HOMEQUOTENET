'use client';

import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toaster';
import { sendQuickEmail, type SendEmailState } from '@/lib/actions/emails';
import {
  FOLLOW_UP_FOR,
  bestRecipient,
  draftFollowUp,
  type QuickTemplate,
} from '@/lib/emails/call-followups';
import { buildProspectEmailHtml, MORE_INFO_TEMPLATE_KEY, type EmailSigner } from '@/lib/emails/template';
import type { EmailTemplateContext } from '@/lib/emails/variables';
import { QUICK_EMAIL_EVENT, type QuickEmailRequest } from '@/lib/calls/quick-email-events';
import type { ProspectDisposition } from '@/lib/types';

export interface QuickEmailProspect {
  id: string;
  company_name: string;
  city: string | null;
  disposition: ProspectDisposition;
  decision_maker_name: string | null;
  decision_maker_email: string | null;
  email: string | null;
  email_service_interests: string[];
  email_opt_out_at: string | null;
}

/**
 * The follow-up email, one screen over the prospect you're on. Opens itself
 * after logging an outcome that calls for one (see FOLLOW_UP_FOR) with the
 * right template filled in; "Send & next" or "Skip" then moves to the next
 * prospect, so emailing never breaks the call loop. ⌘/Ctrl+Enter sends, Esc skips.
 */
export function QuickEmailSheet({
  prospect,
  templates,
  signer,
  address,
  logoUrl,
  gmailConnected,
  homequote,
  lastEmailAt,
}: {
  prospect: QuickEmailProspect;
  templates: QuickTemplate[];
  signer: EmailSigner;
  address: string | null;
  logoUrl: string;
  gmailConnected: boolean;
  homequote: EmailTemplateContext['homequote'];
  /** When this prospect was last emailed, for the "emailed recently" note. */
  lastEmailAt: string | null;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SendEmailState, FormData>(sendQuickEmail, undefined);
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<string | null>(null);
  const [when, setWhen] = useState<QuickEmailRequest['when']>(null);
  const [templateKey, setTemplateKey] = useState('');
  const [to, setTo] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const toRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // The action state when the sheet opened: anything older is not this email's result.
  const openedWith = useRef<SendEmailState>(undefined);
  const finished = useRef<SendEmailState>(undefined);

  const draft = useCallback(
    (key: string, w: QuickEmailRequest['when'], contactName: string) => {
      const t = templates.find((x) => x.key === key) ?? templates[0];
      if (!t) return;
      const d = draftFollowUp(t, {
        companyName: prospect.company_name,
        city: prospect.city,
        contactName,
        services: prospect.email_service_interests,
        sender: { name: signer.name, phone: signer.phone ?? null },
        when: w,
        homequote,
      });
      setTemplateKey(t.key);
      setSubject(d.subject);
      setMessage(d.message);
    },
    [templates, prospect, signer, homequote]
  );

  useEffect(() => {
    const onOpen = (e: Event) => {
      const req = (e as CustomEvent<QuickEmailRequest>).detail ?? {};
      if (prospect.disposition === 'do_not_call' && req.outcome !== undefined) return;
      const key = req.templateKey ?? FOLLOW_UP_FOR[req.outcome ?? prospect.disposition] ?? MORE_INFO_TEMPLATE_KEY;
      const contact = prospect.decision_maker_name ?? '';
      setNext(req.nextHref ?? null);
      setWhen(req.when ?? null);
      setTo(bestRecipient(prospect));
      setName(contact);
      draft(key, req.when ?? null, contact);
      openedWith.current = state;
      setOpen(true);
    };
    window.addEventListener(QUICK_EMAIL_EVENT, onOpen);
    return () => window.removeEventListener(QUICK_EMAIL_EVENT, onOpen);
  }, [prospect, draft, state]);

  // Focus the address first when we don't have one.
  useEffect(() => {
    if (open && !to) requestAnimationFrame(() => toRef.current?.focus());
  }, [open, to]);

  const close = useCallback(
    (moveOn: boolean) => {
      setOpen(false);
      if (moveOn && next) router.push(next);
    },
    [next, router]
  );

  useEffect(() => {
    if (!open || !state || !state.ok || state === openedWith.current || state === finished.current) return;
    finished.current = state;
    toast(state.message);
    close(true);
  }, [state, open, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  const optedOut = Boolean(prospect.email_opt_out_at);
  const recent = lastEmailAt && Date.now() - Date.parse(lastEmailAt) < 86_400_000;
  const general = !prospect.decision_maker_email && !!prospect.email && to === prospect.email;
  const blocked = optedOut || prospect.disposition === 'do_not_call';
  const shownError = state && !state.ok && state !== openedWith.current ? state : null;

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="quick-email-title">
      <form
        ref={formRef}
        action={action}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border bg-card p-4 shadow-2xl animate-in slide-in-from-bottom-4 fade-in motion-reduce:animate-none sm:rounded-2xl sm:p-5"
      >
        <input type="hidden" name="prospect_id" value={prospect.id} />
        <input type="hidden" name="template_key" value={templateKey} />
        <input type="hidden" name="service_interests" value={prospect.email_service_interests.join(', ')} />
        <input type="hidden" name="recipient_name" value={name || prospect.company_name} />

        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="quick-email-title" className="flex items-center gap-2 text-base font-semibold">
              <Mail className="size-4 text-primary" aria-hidden="true" /> Send the follow-up?
            </h2>
            <p className="truncate text-sm text-muted-foreground">{prospect.company_name}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => close(true)} aria-label={next ? 'Skip and go to the next prospect' : 'Close'}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {blocked ? (
          <p role="alert" className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {optedOut ? 'This contractor asked not to be emailed.' : 'This contractor is on the do-not-call list.'} No email can be sent.
          </p>
        ) : null}
        {!gmailConnected ? (
          <p className="mb-3 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            No Gmail is connected yet — connect yours on Calls → Emails to send from your own inbox.
          </p>
        ) : null}
        {recent ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Emailed in the last 24 hours — make sure this one adds something.</p>
        ) : null}

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="qe-to">To</Label>
              <Input
                ref={toRef}
                id="qe-to"
                name="recipient_email"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Ask: what's the best email?"
                required
                autoComplete="off"
              />
              {general ? <p className="text-[11px] text-muted-foreground">Company inbox — no decision-maker email yet.</p> : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="qe-template">Email</Label>
              <Select id="qe-template" value={templateKey} onChange={(e) => draft(e.target.value, when, name)}>
                {templates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="qe-name">Name</Label>
            <Input id="qe-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => draft(templateKey, when, name)} placeholder="Decision-maker (optional)" autoComplete="off" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qe-subject">Subject</Label>
            <Input id="qe-subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qe-message">Message</Label>
            <Textarea id="qe-message" name="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={8} className="leading-6" maxLength={20_000} required />
          </div>
          <details className="rounded-md border">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">Preview as sent (signed {signer.name})</summary>
            <div className="border-t bg-white p-3 text-sm" dangerouslySetInnerHTML={{ __html: buildProspectEmailHtml(message, logoUrl, signer, address) }} />
          </details>
        </div>

        {shownError ? (
          <p role="alert" className={cn('mt-3 rounded-md border p-3 text-sm', shownError.repeat ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800')}>
            {shownError.error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          <Button type="button" variant="ghost" onClick={() => close(true)}>
            {next ? 'Skip' : 'Cancel'}
          </Button>
          {shownError?.repeat ? (
            <Button type="submit" name="allow_repeat" value="1" variant="outline" disabled={pending}>
              Send anyway
            </Button>
          ) : null}
          <Button type="submit" disabled={pending || blocked || !gmailConnected}>
            <Send className="size-4" aria-hidden="true" />
            {pending ? 'Sending…' : next ? 'Send & next' : 'Send'}
            {next && !pending ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
          </Button>
        </div>
        <p className="mt-2 text-right text-[11px] text-muted-foreground max-sm:hidden">⌘/Ctrl+Enter sends · Esc skips</p>
      </form>
    </div>
  );
}
