import { OctagonX, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { setCallingEnabled } from '@/lib/actions/ai-calling';

/** Global calling status. Calls dispatch only when BOTH the deployment switch and the admin switch are on. */
export function StatusPanel({ envEnabled, enabled, stoppedAt, counts }: {
  envEnabled: boolean; enabled: boolean; stoppedAt: string | null;
  counts: { queued: number; blocked: number; active: number; last24h: number };
}) {
  const live = envEnabled && enabled;
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            AI calling
            <Badge variant={live ? 'success' : 'warning'}>{live ? 'Live' : 'Not dialing'}</Badge>
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {live ? 'New eligible form leads and manual calls are being dialed.' : 'No calls are being placed. Queued jobs wait.'}
          </p>
        </div>
        {enabled ? (
          <ConfirmAction
            action={setCallingEnabled} fields={{ enabled: 'false' }} destructive triggerVariant="destructive"
            triggerLabel={<><OctagonX className="size-4" /> Emergency stop</>}
            title="Stop all AI calling now?"
            description="No new calls will be dispatched, including scheduled and retried ones, and queued calls will wait. Calls that are already connected keep running until they end; this app cannot hang up an active call. Turn calling back on here when you are ready."
            confirmLabel="Stop calling"
          />
        ) : (
          <ConfirmAction
            action={setCallingEnabled} fields={{ enabled: 'true' }}
            triggerLabel={<><Power className="size-4" /> Enable calling</>}
            title="Enable AI calling?"
            description="Eligible jobs already in the queue will be dialed on the next scheduler run (within about 5 minutes), and new eligible form leads for contractors in automatic mode will be called. Jobs older than the expiry window are never dialed. Review the queue first."
            confirmLabel="Enable"
          />
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <dt className="text-xs text-muted-foreground">Deployment switch (AI_CALLING_GLOBAL_ENABLED)</dt>
            <dd className="mt-1"><Badge variant={envEnabled ? 'success' : 'muted'}>{envEnabled ? 'On' : 'Off'}</Badge></dd>
          </div>
          <div className="rounded-md border p-3">
            <dt className="text-xs text-muted-foreground">Admin switch</dt>
            <dd className="mt-1 flex items-center gap-2">
              <Badge variant={enabled ? 'success' : 'muted'}>{enabled ? 'On' : 'Off'}</Badge>
              {!enabled && stoppedAt && <span className="text-xs text-muted-foreground">stopped {new Date(stoppedAt).toLocaleString()}</span>}
            </dd>
          </div>
        </dl>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {([['Queued', counts.queued], ['Blocked', counts.blocked], ['In progress', counts.active], ['Created in 24h', counts.last24h]] as const).map(([k, v]) => (
            <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-xl font-semibold tabular-nums">{v}</dd></div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
