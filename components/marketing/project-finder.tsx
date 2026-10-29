'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Search } from 'lucide-react';

export type FinderCategory = {
  id: string;
  name: string;
  note: string;
  href: string;
  photo: { src: string; width: number; height: number };
};

/**
 * Specific projects a homeowner might type. Each lands in its category's flow;
 * the flow's first question narrows it down, so nobody has to know our
 * categories before they start.
 */
const projects: { label: string; category: string; also?: string }[] = [
  { label: 'Full bathroom remodel', category: 'bathroom', also: 'bath renovation' },
  { label: 'Tub-to-shower conversion', category: 'bathroom', also: 'tub shower swap' },
  { label: 'Walk-in or larger shower', category: 'bathroom', also: 'shower remodel' },
  { label: 'Accessible bathroom', category: 'bathroom', also: 'senior ada walk-in tub' },
  { label: 'Add a bathroom', category: 'bathroom', also: 'new half bath' },
  { label: 'Vanity, tile or fixtures', category: 'bathroom', also: 'toilet sink floor' },
  { label: 'Full kitchen remodel', category: 'kitchen', also: 'kitchen renovation' },
  { label: 'New cabinets and countertops', category: 'kitchen', also: 'cabinet counters quartz granite' },
  { label: 'Countertops or backsplash', category: 'kitchen', also: 'counter splash tile' },
  { label: 'Kitchen layout change', category: 'kitchen', also: 'island open concept wall' },
  { label: 'Appliances or flooring', category: 'kitchen', also: 'floor appliance' },
  { label: 'ADU or backyard unit', category: 'adu', also: 'accessory dwelling guest house' },
  { label: 'Garage conversion', category: 'adu', also: 'garage to living space' },
  { label: 'In-law or granny flat', category: 'adu', also: 'in law suite' },
  { label: 'Pool remodel', category: 'pool', also: 'pool renovation' },
  { label: 'Pool resurfacing or replaster', category: 'pool', also: 'plaster pebble finish' },
  { label: 'Pool tile and coping', category: 'pool', also: 'waterline coping deck' },
  { label: 'Spa or hot tub', category: 'pool', also: 'jacuzzi' },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');

/** Search box with live suggestions. Each match opens its category's flow. */
export function ProjectFinder({ categories }: { categories: FinderCategory[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const query = norm(q).trim();
  const matches = useMemo(() => {
    if (!query) return [];
    const words = query.split(/\s+/);
    return projects
      .filter((p) => {
        const hay = norm(`${p.label} ${p.also ?? ''} ${p.category}`);
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 5);
  }, [query]);

  const go = (category: string) => router.push(byId[category].href);

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (matches[0]) go(matches[0].category);
        }}
      >
        <label htmlFor="ho-find" className="sr-only">
          Search for your project
        </label>
        <div className="ho-search">
          <Search className="size-5 shrink-0 text-[var(--ho-ink-soft)]" aria-hidden="true" />
          <input
            id="ho-find"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: tub to shower, cabinets, pool…"
            autoComplete="off"
            enterKeyHint="go"
          />
        </div>
      </form>

      <div aria-live="polite" className="min-h-0">
        {query ? (
          matches.length ? (
            <ul className="ho-results">
              {matches.map((m) => (
                <li key={m.label}>
                  <Link href={byId[m.category].href}>
                    <span>
                      {m.label}
                      <span className="ml-2 text-sm font-normal text-[var(--ho-ink-soft)]">
                        {byId[m.category].name}
                      </span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-base text-[var(--ho-ink-soft)]">
              Nothing matches yet. Pick the closest below, or call us and we will point you the right way.
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}

/** The four project categories as photo cards. */
export function ProjectCards({ categories }: { categories: FinderCategory[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {categories.map((c, i) => (
        <li key={c.id}>
          <Link href={c.href} className="ho-pick" style={{ ['--i' as string]: i }}>
            <Image
              src={c.photo.src}
              alt=""
              width={c.photo.width}
              height={c.photo.height}
              sizes="(min-width: 1024px) 270px, (min-width: 640px) 45vw, 100vw"
              priority={i === 0}
            />
            <span className="ho-pick-label">
              <span>
                <span className="block text-2xl font-semibold tracking-tight">{c.name}</span>
                <span className="mt-1 block text-sm text-white/90">{c.note}</span>
              </span>
              <span className="ho-pick-go">
                <ArrowUpRight className="size-5" aria-hidden="true" />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
