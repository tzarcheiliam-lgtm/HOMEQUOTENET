import { Badge } from '@/components/ui/badge';
import { requestStatusLabel, type RequestStatus } from '@/lib/growth/catalog';

const VARIANT: Record<RequestStatus, 'warning' | 'secondary' | 'success' | 'muted'> = {
  new: 'warning',
  contacted: 'secondary',
  in_progress: 'secondary',
  completed: 'success',
  declined: 'muted',
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant={VARIANT[status] ?? 'muted'}>{requestStatusLabel(status)}</Badge>;
}
