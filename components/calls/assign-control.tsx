import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { assignProspects } from '@/lib/actions/prospects';
import type { CallerOption } from '@/lib/data/prospects';

/** Admin-only: assign or reassign one prospect from its record. */
export function AssignControl({
  prospectId,
  assignedTo,
  callers,
}: {
  prospectId: string;
  assignedTo: string | null;
  callers: CallerOption[];
}) {
  return (
    <form action={assignProspects} className="flex items-center gap-2">
      <input type="hidden" name="ids" value={prospectId} />
      <Select
        name="assignee"
        defaultValue={assignedTo ?? 'unassigned'}
        aria-label="Assigned caller"
        className="h-8 w-auto"
      >
        <option value="unassigned">Unassigned</option>
        {callers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" variant="outline">
        Assign
      </Button>
    </form>
  );
}
