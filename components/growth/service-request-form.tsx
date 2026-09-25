'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { CircleCheck, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { requestServiceInfo, type ServiceRequestState } from '@/lib/actions/service-requests';
import { NOTES_MAX, type GrowthService, type RequestSource } from '@/lib/growth/catalog';
import { trackUpsell } from '@/lib/growth/track';

export interface Requester {
  name: string;
  email: string | null;
  company: string;
  contractorId: string;
}

/**
 * The Growth Tools request form. Shows the account details it will file under
 * (display only: the server takes identity from the session) and asks only for
 * optional notes.
 */
export function ServiceRequestForm({
  service,
  requester,
  source,
  after,
}: {
  service: Pick<GrowthService, 'slug' | 'name' | 'cta' | 'notesHint'>;
  requester: Requester;
  source: RequestSource;
  /** Rendered under the confirmation, e.g. a Close button in the modal. */
  after?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ServiceRequestState, FormData>(requestServiceInfo, undefined);
  const [notes, setNotes] = useState('');
  const confirmation = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.ok) {
      confirmation.current?.focus();
      trackUpsell('upsell_requested', requester.contractorId, service.slug);
    }
  }, [state, requester.contractorId, service.slug]);

  if (state?.ok) {
    return <RequestConfirmation ref={confirmation} after={after} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="service" value={service.slug} />
      <input type="hidden" name="source" value={source} />

      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg border bg-muted/40 p-4 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Company</dt>
          <dd className="truncate font-medium">{requester.company}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Requested by</dt>
          <dd className="truncate font-medium">{requester.name}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Email</dt>
          <dd className="truncate">{requester.email ?? '—'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Contractor ID</dt>
          <dd className="truncate font-mono text-xs leading-5" title={requester.contractorId}>
            {requester.contractorId}
          </dd>
        </div>
      </dl>

      <div className="space-y-1.5">
        <Label htmlFor={`notes-${service.slug}`}>Anything we should know? (optional)</Label>
        <Textarea
          id={`notes-${service.slug}`}
          name="notes"
          rows={4}
          maxLength={NOTES_MAX}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          aria-describedby={`notes-hint-${service.slug}`}
        />
        <p id={`notes-hint-${service.slug}`} className="flex justify-between gap-4 text-xs text-muted-foreground">
          <span>{service.notesHint}</span>
          <span className="shrink-0 tabular-nums">
            {notes.length.toLocaleString()}/{NOTES_MAX.toLocaleString()}
          </span>
        </p>
      </div>

      {state?.ok === false && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} aria-disabled={pending} className="w-full">
        {pending ? (
          <>
            <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" /> Sending request…
          </>
        ) : (
          service.cta
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        There’s no charge to request. We’ll talk it through with you before anything is set up.
      </p>
    </form>
  );
}

/** Shown in place of the form once a request is saved. */
export function RequestConfirmation({
  ref,
  after,
}: {
  ref?: React.Ref<HTMLDivElement>;
  after?: React.ReactNode;
}) {
  return (
    <div ref={ref} tabIndex={-1} role="status" className="space-y-5 py-2 text-center outline-none">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
        <CircleCheck aria-hidden className="size-6" />
      </span>
      <div className="space-y-1.5">
        <p className="text-lg font-semibold tracking-tight">Request received</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Our team will reach out to you shortly to get this set up.
        </p>
      </div>
      {after}
    </div>
  );
}
