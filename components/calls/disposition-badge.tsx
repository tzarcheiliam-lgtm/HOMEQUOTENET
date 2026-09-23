import { Badge } from '@/components/ui/badge';
import {
  DISPOSITION_LABELS,
  dispositionVariant,
  SALES_APPOINTMENT_STATUS_LABELS,
  salesAppointmentVariant,
} from '@/lib/calls/constants';
import type { ProspectDisposition, SalesAppointmentStatus } from '@/lib/types';

export function DispositionBadge({ value }: { value: ProspectDisposition }) {
  return (
    <Badge variant={dispositionVariant(value)}>
      {DISPOSITION_LABELS[value] ?? value}
    </Badge>
  );
}

export function SalesAppointmentBadge({ value }: { value: SalesAppointmentStatus }) {
  return (
    <Badge variant={salesAppointmentVariant(value)}>
      {SALES_APPOINTMENT_STATUS_LABELS[value] ?? value}
    </Badge>
  );
}
