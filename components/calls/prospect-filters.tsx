import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { MobileFilters, SheetField } from '@/components/mobile/mobile-filters';
import { buildFilterChips } from '@/components/mobile/filter-chips';
import { CALL_SORTS, DISPOSITIONS, type CallView } from '@/lib/calls/constants';
import type { CallerOption, ProspectFilters as Filters } from '@/lib/data/prospects';

/**
 * A plain GET form, so every filter state is a URL: shareable, bookmarkable,
 * and back-button friendly. Sticky so the controls stay put while the caller
 * scrolls a long list.
 */
export function ProspectFilters({
  view,
  current,
  callers,
  isAdmin,
  options,
}: {
  view: CallView;
  current: Filters;
  callers: CallerOption[];
  isAdmin: boolean;
  options: { cities: string[]; counties: string[]; services: string[]; niches: string[] };
}) {
  const label = (list: { value: string; label: string }[], v: string) =>
    list.find((x) => x.value === v)?.label ?? v;
  const callerName = (v: string) =>
    v === 'unassigned' ? 'Unassigned' : (callers.find((c) => c.id === v)?.name ?? 'Caller');
  const values = {
    caller: current.caller,
    disposition: current.disposition,
    city: current.city,
    county: current.county,
    service: current.service,
    niche: current.niche,
    callback: current.callback,
    sort: current.sort,
  };
  const chips = buildFilterChips(
    '/app/calls',
    { view, q: current.q, ...values },
    [
      { key: 'q', label: (v) => `"${v}"` },
      { key: 'caller', label: callerName },
      { key: 'disposition', label: (v) => label(DISPOSITIONS, v) },
      { key: 'city', label: (v) => v },
      { key: 'county', label: (v) => `${v} County` },
      { key: 'service', label: (v) => v },
      { key: 'niche', label: (v) => v },
      {
        key: 'callback',
        label: (v) =>
          ({ due: 'Callback due', upcoming: 'Callback upcoming', any: 'Has callback' })[v] ?? null,
      },
      { key: 'sort', label: (v) => `Sort: ${label(CALL_SORTS, v)}` },
    ]
  );

  return (
    <>
    <MobileFilters
      action="/app/calls"
      q={current.q}
      searchPlaceholder="Search company, phone, city…"
      carry={{ view }}
      fieldValues={values}
      chips={chips}
      clearHref={`/app/calls?view=${view}`}
    >
      {isAdmin ? (
        <SheetField label="Caller" htmlFor="m-caller">
          <Select id="m-caller" name="caller" defaultValue={current.caller ?? ''}>
            <option value="">All callers</option>
            <option value="unassigned">Unassigned</option>
            {callers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </SheetField>
      ) : null}
      <SheetField label="Status" htmlFor="m-disposition">
        <Select id="m-disposition" name="disposition" defaultValue={current.disposition ?? ''}>
          <option value="">All statuses</option>
          {DISPOSITIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </SheetField>
      <SheetField label="Callback" htmlFor="m-callback">
        <Select id="m-callback" name="callback" defaultValue={current.callback ?? ''}>
          <option value="">Any callback state</option>
          <option value="due">Callback due</option>
          <option value="upcoming">Callback upcoming</option>
          <option value="any">Has callback</option>
        </Select>
      </SheetField>
      <SheetField label="City" htmlFor="m-city">
        <Select id="m-city" name="city" defaultValue={current.city ?? ''}>
          <option value="">All cities</option>
          {options.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </SheetField>
      <SheetField label="County" htmlFor="m-county">
        <Select id="m-county" name="county" defaultValue={current.county ?? ''}>
          <option value="">All counties</option>
          {options.counties.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </SheetField>
      <SheetField label="Service" htmlFor="m-service">
        <Select id="m-service" name="service" defaultValue={current.service ?? ''}>
          <option value="">All services</option>
          {options.services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </SheetField>
      {options.niches.length > 0 ? (
        <SheetField label="Niche" htmlFor="m-niche">
          <Select id="m-niche" name="niche" defaultValue={current.niche ?? ''}>
            <option value="">All niches</option>
            {options.niches.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </SheetField>
      ) : null}
      <SheetField label="Sort by" htmlFor="m-sort">
        <Select id="m-sort" name="sort" defaultValue={current.sort ?? ''}>
          <option value="">Default sort</option>
          {CALL_SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </SheetField>
    </MobileFilters>

    <Card className="sticky top-0 z-10 hidden p-3 shadow-sm lg:block">
      <form method="get" className="grid gap-2 md:grid-cols-12">
        <input type="hidden" name="view" value={view} />

        <div className="relative md:col-span-3">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={current.q ?? ''}
            placeholder="Company, phone, website, city…"
            aria-label="Search prospects"
            className="pl-8"
          />
        </div>

        {isAdmin ? (
          <Select name="caller" defaultValue={current.caller ?? ''} aria-label="Caller" className="md:col-span-2">
            <option value="">All callers</option>
            <option value="unassigned">Unassigned</option>
            {callers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        ) : null}

        <Select name="disposition" defaultValue={current.disposition ?? ''} aria-label="Status" className="md:col-span-2">
          <option value="">All statuses</option>
          {DISPOSITIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>

        <Select name="city" defaultValue={current.city ?? ''} aria-label="City" className={isAdmin ? 'md:col-span-2' : 'md:col-span-3'}>
          <option value="">All cities</option>
          {options.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <Select name="county" defaultValue={current.county ?? ''} aria-label="County" className="md:col-span-2">
          <option value="">All counties</option>
          {options.counties.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <Select name="service" defaultValue={current.service ?? ''} aria-label="Service" className={isAdmin ? 'md:col-span-1' : 'md:col-span-2'}>
          <option value="">All services</option>
          {options.services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        {options.niches.length > 0 ? (
          <Select name="niche" defaultValue={current.niche ?? ''} aria-label="Niche" className="md:col-span-2">
            <option value="">All niches</option>
            {options.niches.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        ) : null}

        <Select name="callback" defaultValue={current.callback ?? ''} aria-label="Callback" className="md:col-span-2">
          <option value="">Any callback state</option>
          <option value="due">Callback due</option>
          <option value="upcoming">Callback upcoming</option>
          <option value="any">Has callback</option>
        </Select>

        <Select name="sort" defaultValue={current.sort ?? ''} aria-label="Sort" className="md:col-span-2">
          <option value="">Default sort</option>
          {CALL_SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>

        <div className="flex gap-2 md:col-span-2 md:justify-end">
          <Button type="submit" size="sm" className="flex-1 md:flex-none">
            Apply
          </Button>
          <Button asChild type="button" variant="outline" size="sm">
            <Link href={`/app/calls?view=${view}`}>Clear</Link>
          </Button>
        </div>
      </form>
    </Card>
    </>
  );
}
