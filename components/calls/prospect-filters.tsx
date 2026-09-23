import Link from 'next/link';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
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
  return (
    <Card className="sticky top-0 z-10 p-3 shadow-sm">
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
  );
}
