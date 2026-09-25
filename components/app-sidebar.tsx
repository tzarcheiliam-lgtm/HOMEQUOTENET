'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Inbox,
  Building2,
  CalendarDays,
  Receipt,
  DollarSign,
  BarChart3,
  ShieldCheck,
  ScrollText,
  Plug,
  ArrowDownToLine,
  Phone,
  Send,
  Sprout,
  Handshake,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/nav';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Inbox,
  Building2,
  CalendarDays,
  Receipt,
  DollarSign,
  BarChart3,
  ShieldCheck,
  ScrollText,
  Plug,
  ArrowDownToLine,
  Phone,
  Send,
  Sprout,
  Handshake,
};

export function AppSidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
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
