import { CheckCircle2, CircleDashed, Clock, Eye, FileX2, Send, Ban, PenLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CONTRACT_STATUS_LABELS, type ContractStatus } from '@/lib/contracts/status';

const VARIANT: Record<ContractStatus, 'muted' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'muted', sent: 'info', viewed: 'info', partially_signed: 'warning', completed: 'success', declined: 'danger', expired: 'danger', voided: 'muted',
};
const ICON: Record<ContractStatus, typeof Send> = {
  draft: CircleDashed, sent: Send, viewed: Eye, partially_signed: PenLine, completed: CheckCircle2, declined: FileX2, expired: Clock, voided: Ban,
};

/** Status is always icon + text (never colour alone). */
export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const Icon = ICON[status];
  return <Badge variant={VARIANT[status]}><Icon aria-hidden="true" />{CONTRACT_STATUS_LABELS[status]}</Badge>;
}
