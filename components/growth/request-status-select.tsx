'use client';

import { useRef } from 'react';
import { Select } from '@/components/ui/select';
import { REQUEST_STATUSES, type RequestStatus } from '@/lib/growth/catalog';
import { updateServiceRequestStatus } from '@/lib/actions/service-requests';

// Admin status changer for a service request. Submits on change, like the
// lead StatusSelect.
export function RequestStatusSelect({
  requestId,
  status,
  label,
}: {
  requestId: string;
  status: RequestStatus;
  /** Accessible name, e.g. "Status for Pool Masters · Website". */
  label: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={updateServiceRequestStatus} ref={ref}>
      <input type="hidden" name="id" value={requestId} />
      <Select
        name="status"
        defaultValue={status}
        aria-label={label}
        className="h-8 w-auto"
        onChange={() => ref.current?.requestSubmit()}
      >
        {REQUEST_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
    </form>
  );
}
