'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/app/calls', label: 'Prospects', exact: true },
  { href: '/app/calls/logs', label: 'Call Logs', exact: false },
  { href: '/app/calls/appointments', label: 'Appointments', exact: false },
  { href: '/app/calls/emails', label: 'Emails', exact: false },
];

/** Section switcher for the calling workspace, under the page header. */
export function CallsSubnav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Calling workspace" className="flex gap-1 border-b">
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href || /^\/app\/calls\/[0-9a-f-]{36}$/.test(pathname)
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
