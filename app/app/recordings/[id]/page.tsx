import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Download, ShieldCheck, Trash2 } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { deleteRecordingNow } from '@/lib/actions/video-recording';
import { getRecording } from '@/lib/data/recordings';
import { formatDay, formatDuration } from '@/lib/video/recordings/shared';
import { videoWhen } from '@/lib/video/copy';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmAction } from '@/components/ui/confirm-action';
import { PageHeader } from '@/components/ui/page-header';
import { RecordingStatusPill, recordingTitle } from '@/components/recordings/recording-status';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Call recording · HomeQuote Network', robots: { index: false } };
export const dynamic = 'force-dynamic';

const MESSAGE: Record<string, string> = {
  processing: 'The recording is still being saved. Refresh in a minute or two.',
  recording: 'This call is being recorded right now. It will be here a few minutes after it ends.',
  failed: 'This recording could not be saved.',
  deleted: 'This recording was deleted.',
  none: 'Nothing was recorded.',
};

/** Watch one video call recording (§51). RLS decides who can open it; the video links are short-lived. */
export default async function RecordingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile();
  const { id } = await params;
  const r = await getRecording(id);
  if (!r) notFound();
  const when = videoWhen(r.startedAtMs, r.timeZone);
  const length = formatDuration(r.seconds);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={recordingTitle(r)} description={`${when}${length ? ` · ${length}` : ''}${r.hostName ? ` · recorded by ${r.hostName}` : ''}`} backHref="/app/recordings" backLabel="Call recordings">
        <RecordingStatusPill status={r.status} />
      </PageHeader>

      {r.parts.length ? (
        <div className="space-y-5">
          {r.parts.map((p, i) => (
            <figure key={p.seq} className="space-y-2">
              {r.parts.length > 1 ? (
                <figcaption className="text-sm font-medium text-muted-foreground">
                  Part {i + 1} of {r.parts.length}
                  {formatDuration(p.seconds) ? ` · ${formatDuration(p.seconds)}` : ''}
                  <span className="font-normal"> (recording was paused in between)</span>
                </figcaption>
              ) : null}
              <video controls preload="metadata" playsInline src={p.playUrl} className="aspect-video w-full rounded-xl bg-[#0a1b3d]">
                Your browser cannot play this video. <a href={p.downloadUrl}>Download it</a> instead.
              </video>
              <a href={p.downloadUrl} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
                <Download className="size-4" aria-hidden="true" />
                Download{r.parts.length > 1 ? ` part ${i + 1}` : ''}
              </a>
            </figure>
          ))}
        </div>
      ) : (
        <Card className="px-5 py-10 text-center text-sm text-muted-foreground">
          {r.storageMissing
            ? 'The video storage keys are not set, so this recording cannot be played here.'
            : (MESSAGE[r.status] ?? 'This recording is not available.')}
          {r.status === 'failed' && r.error ? <span className="mt-1 block text-xs">{r.error}</span> : null}
        </Card>
      )}

      <Card className="space-y-4 p-5 text-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium">Everyone agreed to be recorded</p>
            {r.consents.length ? (
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {r.consents.map((c) => (
                  <li key={`${c.name}-${c.at}`}>
                    {c.name}
                    {c.role === 'host' ? ' (HomeQuote)' : ''} · agreed {new Intl.DateTimeFormat('en-US', { timeZone: r.timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(c.at))}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">No consent record (nothing was captured).</p>
            )}
          </div>
        </div>
        {r.status !== 'deleted' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-muted-foreground">Deleted automatically on {formatDay(r.deleteOnMs, r.timeZone)}.</p>
            {r.status === 'ready' || r.status === 'failed' ? (
              <ConfirmAction
                action={deleteRecordingNow}
                fields={{ id: r.id }}
                destructive
                triggerVariant="ghost"
                triggerClassName="gap-1.5 text-destructive"
                triggerLabel={
                  <>
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete now
                  </>
                }
                title="Delete this recording?"
                description="The video is deleted for good. The record that the call was recorded, and who agreed, stays."
                confirmLabel="Delete recording"
              />
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
