import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { setSalesAppointmentStatus } from '@/lib/actions/prospects';
import { SALES_APPOINTMENT_STATUSES } from '@/lib/calls/constants';
import type { SalesAppointmentStatus } from '@/lib/types';

/** Inline status change for one sales appointment. */
export function AppointmentStatusControl({
  id,
  status,
}: {
  id: string;
  status: SalesAppointmentStatus;
}) {
  return (
    <form action={setSalesAppointmentStatus} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Select name="status" defaultValue={status} aria-label="Appointment status" className="h-8 w-auto">
        {SALES_APPOINTMENT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" variant="outline">
        Update
      </Button>
    </form>
  );
}
