import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, type SigningStatus } from '@/lib/signing/constants';
import { STATUS_VARIANT } from '@/lib/signing/view';

export function SigningStatusBadge({ status }: { status: SigningStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status] ?? status}</Badge>;
}
