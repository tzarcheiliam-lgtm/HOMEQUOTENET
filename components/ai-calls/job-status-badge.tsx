import { Badge } from '@/components/ui/badge';
import { JOB_STATUS_LABELS, type JobStatus } from '@/lib/ai-calling/types';
import { BLOCK_LABELS, type BlockReason } from '@/lib/ai-calling/eligibility';

const VARIANT: Record<JobStatus, 'success' | 'warning' | 'muted' | 'secondary' | 'default'> = {
  queued: 'secondary', dispatching: 'secondary', accepted: 'default', answered: 'success', completed: 'success',
  no_answer: 'warning', busy: 'warning', failed: 'warning', blocked: 'warning', cancelled: 'muted', expired: 'muted',
};

export function JobStatusBadge({ status, blockReason }: { status: JobStatus; blockReason?: string | null }) {
  return (
    <span className="inline-flex flex-col gap-0.5">
      <Badge variant={VARIANT[status] ?? 'muted'}>{JOB_STATUS_LABELS[status] ?? status}</Badge>
      {blockReason && (status === 'blocked' || status === 'expired' || status === 'cancelled') && (
        <span className="text-xs text-muted-foreground">{BLOCK_LABELS[blockReason as BlockReason] ?? blockReason.replaceAll('_', ' ')}</span>
      )}
    </span>
  );
}
