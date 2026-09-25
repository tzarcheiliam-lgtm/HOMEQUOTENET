'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import type { NavItem } from '@/lib/nav';

export function MobileAppNav({ items }: { items: NavItem[] }) {
  return <details className="relative md:hidden"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border px-3 text-sm font-medium"><Menu className="size-4" /> Menu</summary><nav className="absolute left-0 top-12 z-50 grid max-h-[70dvh] w-64 overflow-y-auto rounded-xl border bg-background p-2 shadow-xl">{items.map(item => <Link className="min-h-11 rounded-lg px-3 py-3 text-sm hover:bg-muted" href={item.href} key={`${item.href}-${item.label}`}>{item.label}</Link>)}</nav></details>;
}
