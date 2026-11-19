import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Video } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { listRecordings } from '@/lib/data/recordings';
import { formatDay, formatDuration, recordingPath } from '@/lib/video/recordings/shared';
import { videoWhen } from '@/lib/video/copy';
import { recordingConfig } from '@/lib/video/transcripts/config.server';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { RecordingStatusPill, recordingTitle } from '@/components/recordings/recording-status';

export const metadata: Metadata = { title: 'Call recordings · HomeQuote Network' };
export const dynamic = 'force-dynamic';

/**
 * Video call recordings (§51). Admins see every recording; anyone else sees the ones they started
 * (RLS on video_recordings). Each is deleted automatically after the retention period.
 */
export default async function RecordingsPage() {
  const me = await requireProfile();
  const [rows, cfg] = [await listRecordings(), recordingConfig()];
  const days = cfg?.retentionDays ?? 90;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Call recordings"
        description={`Recorded video calls, with everyone's consent. Each recording is deleted automatically after ${days} days.`}
      />
      {!cfg ? (
        <p role="note" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {me.role === 'admin'
            ? 'Recording is switched off. To turn it on, set VIDEO_RECORDING_ENABLED=true and the VIDEO_RECORDING_S3_* storage keys in Vercel, then redeploy.'
            : 'Recording is not switched on yet.'}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No recordings yet"
          description="In a HomeQuote video call, tap Record at the top right. Everyone in the call is asked to agree before it starts."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={recordingPath(r.id)} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{recordingTitle(r)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {videoWhen(r.startedAtMs, r.timeZone)}
                      {formatDuration(r.seconds) ? ` · ${formatDuration(r.seconds)}` : ''}
                      {me.role === 'admin' && r.hostName ? ` · ${r.hostName}` : ''}
                      {r.status === 'ready' ? ` · deleted ${formatDay(r.deleteOnMs, r.timeZone)}` : ''}
                    </p>
                  </div>
                  <RecordingStatusPill status={r.status} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
