'use client';

import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/select';

export interface SwitcherOption {
  id: string;
  name: string;
  kind: 'contractor' | 'team' | 'sales';
}

/**
 * Staff pick whose calendar they are looking at: the HomeQuote team
 * (project specialists), HomeQuote sales, or any contractor. Keeps the
 * current view and date. Contractors only ever have their own, so the page
 * does not render this for them.
 */
export function CalendarSwitcher({ options, current, query }: { options: SwitcherOption[]; current: string; query: Record<string, string> }) {
  const router = useRouter();
  const house = options.filter((o) => o.kind !== 'contractor');
  const contractors = options.filter((o) => o.kind === 'contractor');
  return (
    <Select
      aria-label="Calendar"
      value={current}
      className="w-full sm:w-64"
      onChange={(e) => {
        const qs = new URLSearchParams({ ...query, cal: e.target.value });
        router.push(`/app/calendar?${qs.toString()}`);
      }}
    >
      {house.length ? (
        <optgroup label="HomeQuote">
          {house.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </optgroup>
      ) : null}
      {contractors.length ? (
        <optgroup label="Contractors">
          {contractors.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </optgroup>
      ) : null}
    </Select>
  );
}
