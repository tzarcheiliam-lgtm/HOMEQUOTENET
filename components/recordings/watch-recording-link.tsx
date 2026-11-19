import Link from 'next/link';
import { PlayCircle } from 'lucide-react';
import { recordingPath } from '@/lib/video/recordings/shared';
import type { RecordingStatus } from '@/lib/data/recordings';
import { cn } from '@/lib/utils';

/** "Watch recording" (or "Recording processing…") next to a meeting's call history (§51). */
export function WatchRecordingLink({ rec, className }: { rec: { id: string; status: RecordingStatus } | undefined; className?: string }) {
  if (!rec) return null;
  return (
    <Link
      href={recordingPath(rec.id)}
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline', className)}
    >
      <PlayCircle className="size-3.5" aria-hidden="true" />
      {rec.status === 'ready' ? 'Watch recording' : 'Recording processing…'}
    </Link>
  );
}
