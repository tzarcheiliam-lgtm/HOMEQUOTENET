'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/** Automations · Runs · Tasks (· Access for admins). */
export function WorkflowsSubNav({ showAccess }: { showAccess: boolean }) {
  const path = usePathname();
  const items = [
    { href: '/app/workflows', label: 'Automations', match: (p: string) => p === '/app/workflows' || (/^\/app\/workflows\/[0-9a-f-]{36}/.test(p) && !p.includes('/runs')) || p === '/app/workflows/new' },
    { href: '/app/workflows/runs', label: 'Run history', match: (p: string) => p.startsWith('/app/workflows/runs') || p.endsWith('/runs') },
    { href: '/app/workflows/tasks', label: 'Tasks', match: (p: string) => p.startsWith('/app/workflows/tasks') },
    ...(showAccess ? [{ href: '/app/workflows/access', label: 'Contractor access', match: (p: string) => p.startsWith('/app/workflows/access') }] : []),
  ];
  return (
    <nav aria-label="Automations sections" className="-mx-1 flex gap-1 overflow-x-auto px-1">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={i.match(path) ? 'page' : undefined} className={cn('whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition', i.match(path) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
