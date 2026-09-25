import { Badge } from '@/components/ui/badge';
import { requestStatusLabel, type RequestStatus } from '@/lib/growth/catalog';

const VARIANT: Record<RequestStatus, 'warning' | 'secondary' | 'success' | 'muted'> = {
  new: 'warning',
  contacted: 'secondary',
  proposal_sent: 'secondary',
  accepted: 'success',
  closed: 'muted',
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant={VARIANT[status] ?? 'muted'}>{requestStatusLabel(status)}</Badge>;
}
