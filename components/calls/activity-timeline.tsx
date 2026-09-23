import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DispositionBadge } from './disposition-badge';
import { fmtDateTime } from './format';
import type { ProspectCallAttempt } from '@/lib/types';

/**
 * Every call on this prospect, newest first. Each row is a permanent record
 * from prospect_call_attempts; nothing here is derived or editable.
 */
export function ActivityTimeline({ attempts }: { attempts: ProspectCallAttempt[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Call history{' '}
          <span className="ml-1 text-sm font-normal text-muted-foreground tabular-nums">
            {attempts.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No calls logged yet. The first outcome you save will appear here.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l pl-5">
            {attempts.map((a) => (
              <li key={a.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-background bg-muted-foreground"
                />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium tabular-nums">#{a.attempt_number}</span>
                  <DispositionBadge value={a.outcome} />
                  <span className="text-muted-foreground">
                    {a.caller_name ?? 'Caller'} &middot; {fmtDateTime(a.created_at)}
                  </span>
                </div>
                {a.callback_at ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Callback: {fmtDateTime(a.callback_at)}
                  </p>
                ) : null}
                {a.appointment_at ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Appointment: {fmtDateTime(a.appointment_at)}
                  </p>
                ) : null}
                {a.notes ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{a.notes}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
