'use client';

import { useRef } from 'react';
import { Select } from '@/components/ui/select';
import { LEAD_STATUSES } from '@/lib/leads/constants';
import { changeLeadStatus } from '@/lib/actions/leads';
import type { LeadStatus } from '@/lib/types';

// Quick pipeline-status changer (staff). Submits on change.
export function StatusSelect({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={changeLeadStatus} ref={ref}>
      <input type="hidden" name="lead_id" value={leadId} />
      <Select
        name="status"
        defaultValue={status}
        className="h-8 w-auto"
        onChange={() => ref.current?.requestSubmit()}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
    </form>
  );
}
