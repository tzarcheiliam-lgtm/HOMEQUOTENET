import { cn } from '@/lib/utils';
import type { RecordingStatus } from '@/lib/data/recordings';

const STATUS: Record<RecordingStatus, { label: string; tone: string }> = {
  ready: { label: 'Ready', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  processing: { label: 'Processing', tone: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  recording: { label: 'Recording now', tone: 'bg-red-50 text-red-700 ring-red-600/20' },
  failed: { label: 'Not saved', tone: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
  deleted: { label: 'Deleted', tone: 'bg-muted text-muted-foreground ring-border' },
  none: { label: 'Not recorded', tone: 'bg-muted text-muted-foreground ring-border' },
};

/** The state of a video call recording as a small pill (§51). */
export function RecordingStatusPill({ status, className }: { status: RecordingStatus; className?: string }) {
  const s = STATUS[status];
  return <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', s.tone, className)}>{s.label}</span>;
}

/** "Call with Mike · ABC Roofing", "Call with ABC Roofing", "Video call". */
export function recordingTitle(r: { guestName: string | null; subject: string | null }): string {
  if (r.guestName && r.subject && r.guestName !== r.subject) return `Call with ${r.guestName} · ${r.subject}`;
  const who = r.guestName || r.subject;
  return who ? `Call with ${who}` : 'Video call';
}
