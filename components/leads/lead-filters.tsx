import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LEAD_SOURCES, LEAD_STATUSES } from '@/lib/leads/constants';
import type { SubService, Vertical } from '@/lib/types';
import type { ContractorOption } from '@/lib/data/contractors';
import type { LeadFilters } from '@/lib/data/leads';

// A plain GET form — submitting updates the URL query string, which the list
// page reads. Works without client-side JS.
export function LeadFiltersBar({
  verticals,
  subServices,
  contractors,
  current,
}: {
  verticals: Vertical[];
  subServices: SubService[];
  contractors: ContractorOption[];
  current: LeadFilters;
}) {
  const verticalName = (id: string) =>
    verticals.find((v) => v.id === id)?.name ?? '';

  return (
    <Card className="p-4">
      <form method="get" className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <Input
            name="q"
            placeholder="Search name, phone, email, address…"
            defaultValue={current.q ?? ''}
          />
        </div>

        <Select name="status" defaultValue={current.status ?? ''}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        <Select name="source" defaultValue={current.source ?? ''}>
          <option value="">All sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        <Select name="vertical_id" defaultValue={current.vertical_id ?? ''}>
          <option value="">All verticals</option>
          {verticals.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>

        <Select name="sub_service_id" defaultValue={current.sub_service_id ?? ''}>
          <option value="">All sub-services</option>
          {verticals
            .filter((v) => subServices.some((s) => s.vertical_id === v.id))
            .map((v) => (
              <optgroup key={v.id} label={verticalName(v.id)}>
                {subServices
                  .filter((s) => s.vertical_id === v.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </optgroup>
            ))}
        </Select>

        <Select name="contractor_id" defaultValue={current.contractor_id ?? ''}>
          <option value="">All contractors</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Input name="city" placeholder="City" defaultValue={current.city ?? ''} />
        <Input name="zip" placeholder="ZIP" defaultValue={current.zip ?? ''} />

        <Input
          name="date_from"
          type="date"
          defaultValue={current.date_from ?? ''}
        />
        <Input name="date_to" type="date" defaultValue={current.date_to ?? ''} />

        <Select name="assigned" defaultValue={current.assigned ?? ''}>
          <option value="">Assigned or not</option>
          <option value="unassigned">Unassigned only</option>
          <option value="assigned">Assigned only</option>
        </Select>

        <Select name="archived" defaultValue={current.archived ?? 'active'}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </Select>

        <div className="flex gap-2 md:col-span-4">
          <Button type="submit" size="sm">
            Apply filters
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/app/leads">Clear</Link>
          </Button>
        </div>
      </form>
    </Card>
  );
}
