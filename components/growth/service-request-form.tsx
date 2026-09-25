'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { requestServiceInfo, type ServiceRequestState } from '@/lib/actions/service-requests';
import { NOTES_MAX, type GrowthService } from '@/lib/growth/catalog';

export function ServiceRequestForm({
  service,
  requester,
}: {
  service: Pick<GrowthService, 'slug' | 'name' | 'notesHint'>;
  /** Shown for transparency only; the server takes identity from the session. */
  requester: { name: string; email: string | null; company: string };
}) {
  const [state, formAction, pending] = useActionState<ServiceRequestState, FormData>(requestServiceInfo, undefined);
  const [notes, setNotes] = useState('');
  const confirmation = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.ok) confirmation.current?.focus();
  }, [state]);

  if (state?.ok) {
    return <RequestConfirmation ref={confirmation} serviceName={state.serviceName} contactEmail={state.contactEmail} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="service" value={service.slug} />

      <dl className="grid gap-3 rounded-lg bg-muted/50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Company</dt>
          <dd className="font-medium">{requester.company}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Requested by</dt>
          <dd className="font-medium">
            {requester.name}
            {requester.email && requester.email !== requester.name && (
              <span className="block text-xs font-normal text-muted-foreground">{requester.email}</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="space-y-1.5">
        <Label htmlFor="notes">What do you need? (optional)</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={5}
          maxLength={NOTES_MAX}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-describedby="notes-hint"
          aria-invalid={state?.ok === false || undefined}
        />
        <p id="notes-hint" className="flex justify-between gap-4 text-xs text-muted-foreground">
          <span>{service.notesHint}</span>
          <span className="shrink-0 tabular-nums">
            {notes.length.toLocaleString()}/{NOTES_MAX.toLocaleString()}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Request info'}
        </Button>
        <p className="text-xs text-muted-foreground">No payment or commitment. We’ll reach out to talk it through.</p>
      </div>
      {state?.ok === false && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

/** Shown in place of the form once a request is saved. */
export function RequestConfirmation({
  ref,
  serviceName,
  contactEmail,
}: {
  ref?: React.Ref<HTMLDivElement>;
  serviceName: string;
  contactEmail: string | null;
}) {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      className="space-y-4 rounded-lg border border-emerald-600/20 bg-emerald-50/60 p-5 outline-none dark:bg-emerald-950/30"
    >
      <div className="flex items-start gap-3">
        <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
        <div className="space-y-1">
          <p className="font-medium">Request sent</p>
          <p className="text-sm text-muted-foreground">
            We’ve shared your interest in {serviceName} with the HomeQuote team. Someone will follow up
            {contactEmail ? ` at ${contactEmail}` : ''} to talk through what you need.
          </p>
          <p className="text-sm text-muted-foreground">Nothing has been purchased and you haven’t been charged.</p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/app/growth">Back to services</Link>
      </Button>
    </div>
  );
}
