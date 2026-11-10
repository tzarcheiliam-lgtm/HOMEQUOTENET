'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export type PickerCategory = {
  id: string;
  name: string;
  note: string;
  href: string;
  photo: { src: string; width: number; height: number };
};

/**
 * The homepage's project choice. Four large rows; on desktop, hovering or
 * focusing a row swaps the big photograph beside it. On a phone each row
 * carries its own thumbnail and goes straight to the flow.
 */
export function HomePicker({
  categories,
  panel = false,
  intro,
  below,
}: {
  categories: PickerCategory[];
  /** Show the large photograph panel beside the rows (desktop only). */
  panel?: boolean;
  /** Rendered above the rows (the headline), so the photograph panel starts at the top of the section. */
  intro?: ReactNode;
  /** Rendered under the rows (the search box). */
  below?: ReactNode;
}) {
  const [active, setActive] = useState(0);

  return (
    <div className={panel ? 'grid lg:grid-cols-12 lg:gap-14' : ''}>
      <div className={panel ? 'lg:col-span-7' : ''}>
        {intro}
        <ul className="hp-list" onMouseLeave={() => setActive(0)}>
          {categories.map((c, i) => (
            <li key={c.id} style={{ ['--i' as string]: i }} className="hp-item">
              <Link
                href={c.href}
                className="hp-row"
                data-active={active === i}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
              >
                <span className={`hp-thumb ${panel ? 'lg:hidden' : ''}`} aria-hidden="true">
                  <Image
                    src={c.photo.src}
                    alt=""
                    width={c.photo.width}
                    height={c.photo.height}
                    sizes="96px"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="hp-name">{c.name}</span>
                  <span className="hp-note">{c.note}</span>
                </span>
                <span className="hp-go" aria-hidden="true">
                  <ArrowUpRight className="size-6" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {below}
      </div>

      {panel ? (
        <div className="hidden lg:col-span-5 lg:block">
          <div className="hp-stage" aria-hidden="true">
            {categories.map((c, i) => (
              <Image
                key={c.id}
                src={c.photo.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 480px, 0px"
                priority={i === 0}
                data-active={active === i}
                className="hp-stage-img"
              />
            ))}
            <div className="hp-stage-chip">
              <span className="font-semibold">{categories[active].name}</span>
              <span className="text-[var(--ho-ink-soft)]">{categories[active].note}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
