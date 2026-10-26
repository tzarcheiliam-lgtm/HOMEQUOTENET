'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { StudioState } from '@/lib/actions/meta-studio';

export type Tab = { href: string; label: string };

/** Section tabs for the whole Meta Ads area. Scrolls sideways on phones instead of wrapping. */
export function StudioTabs({ tabs }: { tabs: Tab[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Meta Ads sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b">
        {tabs.map((t) => {
          const active = t.href === '/app/meta-ads' ? path === t.href || path.startsWith('/app/meta-ads/events') || path.startsWith('/app/meta-ads/setup') : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? 'page' : undefined}
                className={cn('inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors', active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Msg({ s }: { s: StudioState }) {
  if (s?.error) return <p role="alert" className="text-sm text-destructive">{s.error}</p>;
  if (s?.success) return <p role="status" className="text-sm text-emerald-700">{s.success}</p>;
  return null;
}
