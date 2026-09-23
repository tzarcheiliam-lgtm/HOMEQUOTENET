import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DispositionBadge } from './disposition-badge';
import { fmtDateTime } from './format';
import { Mail, PhoneCall } from 'lucide-react';
import type { ProspectCallAttempt, ProspectEmailLog } from '@/lib/types';

/**
 * Every call on this prospect, newest first. Each row is a permanent record
 * from prospect_call_attempts; nothing here is derived or editable.
 */
export function ActivityTimeline({
  attempts,
  emails,
}: {
  attempts: ProspectCallAttempt[];
  emails: ProspectEmailLog[];
}) {
  const activity = [
    ...attempts.map((attempt) => ({ kind: 'call' as const, at: attempt.created_at, attempt })),
    ...emails.map((email) => ({ kind: 'email' as const, at: email.sent_at ?? email.created_at, email })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Activity history{' '}
          <span className="ml-1 text-sm font-normal text-muted-foreground tabular-nums">
            {activity.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No calls or emails logged yet. The first activity will appear here.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l pl-5">
            {activity.map((item) => item.kind === 'call' ? (
              <li key={`call-${item.attempt.id}`} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[27px] top-0.5 flex size-4 items-center justify-center rounded-full border-2 border-background bg-muted-foreground text-background"
                />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <PhoneCall className="size-3.5" aria-hidden="true" />
                  <span className="font-medium tabular-nums">Call #{item.attempt.attempt_number}</span>
                  <DispositionBadge value={item.attempt.outcome} />
                  <span className="text-muted-foreground">
                    {item.attempt.caller_name ?? 'Caller'} &middot; {fmtDateTime(item.attempt.created_at)}
                  </span>
                </div>
                {item.attempt.callback_at ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Callback: {fmtDateTime(item.attempt.callback_at)}
                  </p>
                ) : null}
                {item.attempt.appointment_at ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Appointment: {fmtDateTime(item.attempt.appointment_at)}
                  </p>
                ) : null}
                {item.attempt.notes ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{item.attempt.notes}</p>
                ) : null}
              </li>
            ) : (
              <li key={`email-${item.email.id}`} className="relative">
                <span aria-hidden="true" className={`absolute -left-[27px] top-0.5 flex size-4 items-center justify-center rounded-full border-2 border-background ${item.email.status === 'sent' ? 'bg-emerald-600' : item.email.status === 'failed' ? 'bg-red-600' : 'bg-amber-500'}`} />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <Mail className="size-3.5" aria-hidden="true" />
                  <span className="font-medium">Email {item.email.status}</span>
                  <span className="text-muted-foreground">
                    {item.email.sender_name ?? item.email.sender_email} &middot; {fmtDateTime(item.email.sent_at ?? item.email.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm"><span className="text-muted-foreground">To:</span> {item.email.recipient_name ? `${item.email.recipient_name} ` : ''}&lt;{item.email.recipient_email}&gt;</p>
                <p className="text-sm"><span className="text-muted-foreground">Subject:</span> {item.email.subject}</p>
                {item.email.error_message ? <p className="mt-1 text-sm text-red-700">{item.email.error_message}</p> : null}
                <details className="mt-1 text-sm">
                  <summary className="cursor-pointer text-muted-foreground">View message</summary>
                  <p className="mt-2 whitespace-pre-wrap leading-6">{item.email.message}</p>
                </details>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
