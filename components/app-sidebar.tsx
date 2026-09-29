'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/nav';
import { NAV_ICONS } from '@/components/nav-icons';

export function AppSidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
        const active =
          item.href === '/app'
            ? pathname === '/app'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
