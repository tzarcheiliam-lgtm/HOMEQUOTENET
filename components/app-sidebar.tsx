'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { groupNavItems, type NavItem } from '@/lib/nav';
import { NAV_ICONS } from '@/components/nav-icons';

function isActive(pathname: string, href: string) {
  return href === '/app' ? pathname === '/app' : pathname === href || pathname.startsWith(href + '/');
}

export function AppSidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const sections = groupNavItems(items);

  return (
    <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {sections.map(({ group, items: groupItems }) => (
        <div key={group ?? 'top'}>
          {group && (
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </p>
          )}
          <ul className="space-y-0.5">
            {groupItems.map((item) => {
              const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
              const active = isActive(pathname, item.href);
              return (
                <li key={`${item.label}-${item.href}`}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex min-h-9 items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'bg-accent font-semibold text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-primary'
                        : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
