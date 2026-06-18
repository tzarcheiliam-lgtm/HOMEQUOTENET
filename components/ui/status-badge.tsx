import { Badge } from '@/components/ui/badge';
import type { AccountStatus } from '@/lib/types';

const MAP: Record<
  AccountStatus,
  { label: string; variant: 'success' | 'warning' | 'muted' | 'secondary' }
> = {
  active: { label: 'Active', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  suspended: { label: 'Suspended', variant: 'warning' },
  disabled: { label: 'Disabled', variant: 'muted' },
};

export function StatusBadge({ status }: { status: AccountStatus }) {
  const s = MAP[status] ?? MAP.disabled;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export const ACCOUNT_STATUSES: { value: AccountStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'disabled', label: 'Disabled' },
];
