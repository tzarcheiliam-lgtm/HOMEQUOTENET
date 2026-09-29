import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MobileFilters, SheetField } from '@/components/mobile/mobile-filters';
import { buildFilterChips } from '@/components/mobile/filter-chips';
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

  const values = {
    status: current.status,
    source: current.source,
    vertical_id: current.vertical_id,
    sub_service_id: current.sub_service_id,
    contractor_id: current.contractor_id,
    city: current.city,
    zip: current.zip,
    date_from: current.date_from,
    date_to: current.date_to,
    assigned: current.assigned,
    archived: current.archived && current.archived !== 'active' ? current.archived : undefined,
  };
  const chips = buildFilterChips(
    '/app/leads',
    { q: current.q, review: current.qualification_status, ...values },
    [
      { key: 'q', label: (v) => '"' + v + '"' },
      {
        key: 'review',
        label: (v) =>
          ({ needs_qualification: 'Needs qualification', qualified: 'Qualified', not_qualified: 'Not qualified' })[v] ?? null,
      },
      { key: 'status', label: (v) => LEAD_STATUSES.find((x) => x.value === v)?.label ?? v },
      { key: 'source', label: (v) => LEAD_SOURCES.find((x) => x.value === v)?.label ?? v },
      { key: 'vertical_id', label: (v) => verticalName(v) || 'Vertical' },
      {
        key: 'sub_service_id',
        label: (v) => subServices.find((x) => x.id === v)?.name ?? 'Sub-service',
      },
      { key: 'contractor_id', label: (v) => contractors.find((c) => c.id === v)?.name ?? 'Contractor' },
      { key: 'city', label: (v) => v },
      { key: 'zip', label: (v) => 'ZIP ' + v },
      { key: 'date_from', label: (v) => 'From ' + v },
      { key: 'date_to', label: (v) => 'To ' + v },
      { key: 'assigned', label: (v) => (v === 'unassigned' ? 'Unassigned' : 'Assigned') },
      { key: 'archived', label: (v) => (v === 'archived' ? 'Archived' : 'All incl. archived') },
    ]
  );

  return (
    <>
    <MobileFilters
      action="/app/leads"
      q={current.q}
      searchPlaceholder="Search name, phone, city…"
      carry={{ review: current.qualification_status }}
      fieldValues={values}
      chips={chips}
      clearHref="/app/leads"
    >
      <SheetField label="Status" htmlFor="m-status">
        <Select id="m-status" name="status" defaultValue={current.status ?? ''}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </SheetField>
      <SheetField label="Assigned" htmlFor="m-assigned">
        <Select id="m-assigned" name="assigned" defaultValue={current.assigned ?? ''}>
          <option value="">Assigned or not</option>
          <option value="unassigned">Unassigned only</option>
          <option value="assigned">Assigned only</option>
        </Select>
      </SheetField>
      <SheetField label="Contractor" htmlFor="m-contractor">
        <Select id="m-contractor" name="contractor_id" defaultValue={current.contractor_id ?? ''}>
          <option value="">All contractors</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </SheetField>
      <SheetField label="Vertical" htmlFor="m-vertical">
        <Select id="m-vertical" name="vertical_id" defaultValue={current.vertical_id ?? ''}>
          <option value="">All verticals</option>
          {verticals.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      </SheetField>
      <SheetField label="Sub-service" htmlFor="m-sub">
        <Select id="m-sub" name="sub_service_id" defaultValue={current.sub_service_id ?? ''}>
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
      </SheetField>
      <SheetField label="Source" htmlFor="m-source">
        <Select id="m-source" name="source" defaultValue={current.source ?? ''}>
          <option value="">All sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </SheetField>
      <div className="grid grid-cols-2 gap-3">
        <SheetField label="City" htmlFor="m-city">
          <Input id="m-city" name="city" defaultValue={current.city ?? ''} />
        </SheetField>
        <SheetField label="ZIP" htmlFor="m-zip">
          <Input id="m-zip" name="zip" inputMode="numeric" defaultValue={current.zip ?? ''} />
        </SheetField>
        <SheetField label="From" htmlFor="m-from">
          <Input id="m-from" name="date_from" type="date" defaultValue={current.date_from ?? ''} />
        </SheetField>
        <SheetField label="To" htmlFor="m-to">
          <Input id="m-to" name="date_to" type="date" defaultValue={current.date_to ?? ''} />
        </SheetField>
      </div>
      <SheetField label="Show" htmlFor="m-archived">
        <Select id="m-archived" name="archived" defaultValue={current.archived ?? 'active'}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </Select>
      </SheetField>
    </MobileFilters>

    <Card className="hidden p-4 lg:block">
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
    </>
  );
}
