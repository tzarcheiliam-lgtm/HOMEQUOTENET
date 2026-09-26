import { Badge } from '@/components/ui/badge';
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '@/lib/billing/pricing';

const VARIANT: Record<PaymentStatus, 'success' | 'warning' | 'muted' | 'secondary'> = {
  none: 'muted',
  awaiting_payment: 'warning',
  processing: 'secondary',
  paid: 'success',
  active: 'success',
  past_due: 'warning',
  canceled: 'muted',
  failed: 'warning',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
