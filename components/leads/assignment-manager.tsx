'use client';

import { useActionState, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  APPOINTMENT_STATUSES,
  ASSIGNMENT_STATUSES,
} from '@/lib/leads/constants';
import {
  assignLead,
  unassignLead,
  updateAssignmentStatus,
  scheduleAppointment,
  updateAppointmentStatus,
  type LeadFormState,
} from '@/lib/actions/leads';
import { OutcomesSection } from '@/components/leads/outcomes-section';
import type { AssignmentDetail } from '@/lib/data/leads';
import type { ContractorOption } from '@/lib/data/contractors';

// Auto-submitting select for an assignment's status.
function AssignmentStatusSelect({
  leadId,
  assignmentId,
  status,
}: {
  leadId: string;
  assignmentId: string;
  status: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={updateAssignmentStatus} ref={ref}>
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <Select
        name="status"
        defaultValue={status}
        className="h-8 w-auto"
        onChange={() => ref.current?.requestSubmit()}
      >
        {ASSIGNMENT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
    </form>
  );
}

function AppointmentStatusSelect({
  leadId,
  appointmentId,
  status,
}: {
  leadId: string;
  appointmentId: string;
  status: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={updateAppointmentStatus} ref={ref}>
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <Select
        name="status"
        defaultValue={status}
        className="h-8 w-auto"
        onChange={() => ref.current?.requestSubmit()}
      >
        {APPOINTMENT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
    </form>
  );
}

function ScheduleAppointmentForm({
  leadId,
  assignmentId,
}: {
  leadId: string;
  assignmentId: string;
}) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    scheduleAppointment,
    undefined
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="assignment_id" value={assignmentId} />
      <Input name="scheduled_at" type="datetime-local" className="w-auto" />
      <Input name="location" placeholder="Location" className="w-40" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving…' : 'Schedule appointment'}
      </Button>
      {state?.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}

function AssignForm({
  leadId,
  available,
}: {
  leadId: string;
  available: ContractorOption[];
}) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    assignLead,
    undefined
  );

  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All contractors are already assigned to this lead.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="lead_id" value={leadId} />
      <div className="flex flex-wrap gap-2">
        {available.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
          >
            <input
              type="checkbox"
              name="contractor_ids"
              value={c.id}
              className="size-4 accent-primary"
            />
            {c.name}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_exclusive"
          className="size-4 accent-primary"
        />
        Exclusive assignment
      </label>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Assigning…' : 'Assign to selected'}
      </Button>
    </form>
  );
}

export function AssignmentManager({
  leadId,
  assignments,
  contractors,
  canManage,
  canUnassign,
  isAdmin,
}: {
  leadId: string;
  assignments: AssignmentDetail[];
  contractors: ContractorOption[];
  canManage: boolean; // staff: can assign new contractors
  canUnassign: boolean; // admin: can remove assignments
  isAdmin: boolean; // admin: can override commission, see commission amounts
}) {
  const assignedIds = new Set(assignments.map((a) => a.contractor_id));
  const available = contractors.filter((c) => !assignedIds.has(c.id));

  return (
    <div className="space-y-5">
      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not assigned to any contractor yet.
        </p>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {a.contractor?.name ?? 'Contractor'}
                  </span>
                  {a.is_exclusive && (
                    <Badge variant="secondary">Exclusive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <AssignmentStatusSelect
                    leadId={leadId}
                    assignmentId={a.id}
                    status={a.status}
                  />
                  {canUnassign && (
                    <form action={unassignLead}>
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <input type="hidden" name="lead_id" value={leadId} />
                      <Button type="submit" variant="ghost" size="sm">
                        <Trash2 className="size-4" />
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              {/* Appointments for this assignment */}
              {a.appointments && a.appointments.length > 0 && (
                <ul className="mt-3 space-y-2 border-t pt-3">
                  {a.appointments.map((ap: any) => (
                    <li
                      key={ap.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {ap.scheduled_at
                          ? new Date(ap.scheduled_at).toLocaleString()
                          : 'No time set'}
                        {ap.location ? ` · ${ap.location}` : ''}
                      </span>
                      <AppointmentStatusSelect
                        leadId={leadId}
                        appointmentId={ap.id}
                        status={ap.status}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3">
                <ScheduleAppointmentForm leadId={leadId} assignmentId={a.id} />
              </div>

              {/* Estimate -> Sale -> Commission for this assignment */}
              <OutcomesSection
                leadId={leadId}
                assignmentId={a.id}
                estimates={a.estimates ?? []}
                sales={a.sales ?? []}
                isAdmin={isAdmin}
              />
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="rounded-lg border border-dashed p-4">
          <p className="text-sm font-medium">Assign without emailing</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Records the assignment only. To email the lead, use Send lead above.
          </p>
          <AssignForm leadId={leadId} available={available} />
        </div>
      )}
    </div>
  );
}
