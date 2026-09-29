'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, LayoutDashboard, LogOut, MoreHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/nav';
import type { UserRole } from '@/lib/types';
import { NAV_ICONS } from '@/components/nav-icons';
import { BottomSheet } from '@/components/ui/bottom-sheet';

/*
 * Phone chrome for the CRM: a compact top bar, a fixed bottom nav, the "More"
 * sheet and the <main> that reserves room for them. Everything here is
 * lg:hidden except <main> itself, so the desktop sidebar layout is untouched.
 * The nav lists come from lib/nav.ts (mobileNavForRole), so they inherit the
 * same per-role visibility as the sidebar.
 */

const LOGO = '/images/brand/homequote-network-logo.webp';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/**
 * Routes that are one focused record. They get a back button and a pinned
 * action bar in place of the bottom nav, so the thumb zone has a single job.
 */
export function isFocusedRoute(pathname: string): boolean {
  return (
    new RegExp(`^/app/calls/${UUID}$`, 'i').test(pathname) ||
    /^\/app\/leads\/(?!new$)[^/]+$/.test(pathname)
  );
}

const TITLE_RULES: [RegExp, string][] = [
  [new RegExp(`^/app/calls/${UUID}$`, 'i'), 'Prospect'],
  [/^\/app\/calls\/new$/, 'Add prospect'],
  [/^\/app\/calls\/logs/, 'Call logs'],
  [/^\/app\/calls\/appointments/, 'Call appointments'],
  [/^\/app\/calls\/emails/, 'Call emails'],
  [/^\/app\/leads\/new$/, 'New lead'],
  [/^\/app\/leads\/[^/]+\/edit$/, 'Edit lead'],
  [/^\/app\/leads\/[^/]+$/, 'Lead'],
  [/^\/app\/contractors\/new$/, 'New contractor'],
  [/^\/app\/contractors\/[^/]+$/, 'Contractor'],
  [/^\/app\/team\/new$/, 'New team member'],
  [/^\/app\/team\/[^/]+$/, 'Team member'],
  [/^\/app\/funnels\/new$/, 'New funnel'],
  [/^\/app\/funnels\/[^/]+\/builder$/, 'Funnel builder'],
  [/^\/app\/funnels\/[^/]+\/analytics$/, 'Funnel analytics'],
  [/^\/app\/funnels\/[^/]+$/, 'Funnel'],
  [/^\/app\/workflows\/new$/, 'New automation'],
  [/^\/app\/workflows\/runs\/[^/]+$/, 'Run'],
  [/^\/app\/workflows\/runs$/, 'Run history'],
  [/^\/app\/workflows\/[^/]+\/runs$/, 'Runs'],
  [/^\/app\/workflows\/[^/]+$/, 'Automation'],
  [/^\/app\/email-templates\/new$/, 'New template'],
  [/^\/app\/email-templates\/[^/]+$/, 'Template'],
  [/^\/app\/growth\/[^/]+$/, 'Growth tool'],
  [/^\/app\/pay\/[^/]+$/, 'Payment'],
  [/^\/app\/integrations\/meta$/, 'Meta lead ads'],
];

/** Where the back arrow goes: one level up, with /app/calls as the calls root. */
function parentOf(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length <= 2) return '/app';
  return '/' + parts.slice(0, parts.length - 1).join('/');
}

function bestMatch(pathname: string, items: NavItem[]): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of items) {
    const hit =
      item.href === '/app'
        ? pathname === '/app'
        : pathname === item.href || pathname.startsWith(item.href + '/');
    if (hit && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}

function titleFor(pathname: string, all: NavItem[]): string {
  for (const [re, title] of TITLE_RULES) if (re.test(pathname)) return title;
  const match = bestMatch(pathname, all);
  return match?.title ?? match?.label ?? 'HomeQuote';
}

/** The one contextual "+" per list page, gated to the roles that can use it. */
function contextualAction(pathname: string, role: UserRole): { href: string; label: string } | null {
  if (pathname === '/app/leads' && (role === 'admin' || role === 'setter'))
    return { href: '/app/leads/new', label: 'New lead' };
  if (pathname === '/app/calls' && role === 'admin')
    return { href: '/app/calls/new', label: 'Add prospect' };
  if (pathname === '/app/contractors' && role === 'admin')
    return { href: '/app/contractors/new', label: 'New contractor' };
  return null;
}

function initials(name: string): string {
  const parts = name
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function MobileChrome({
  primary,
  secondary,
  role,
  roleLabel,
  displayName,
  signOutAction,
  children,
}: {
  primary: NavItem[];
  secondary: NavItem[];
  role: UserRole;
  roleLabel: string;
  displayName: string;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const all = [...primary, ...secondary];
  const focused = isFocusedRoute(pathname);
  const active = bestMatch(pathname, all);
  const moreActive =
    !!active && secondary.some((s) => s.href === active.href && s.label === active.label);
  const isDestination = all.some((i) => i.href === pathname);
  const showBack = !isDestination && pathname !== '/app';
  const action = contextualAction(pathname, role);

  return (
    <>
      <header className="pt-safe px-safe sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="flex h-14 items-center gap-2">
          {showBack ? (
            <Link
              href={parentOf(pathname)}
              aria-label="Back"
              className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground active:bg-accent"
            >
              <ChevronLeft className="size-6" />
            </Link>
          ) : (
            <Link
              href="/app"
              aria-label="HomeQuote home"
              className="flex size-11 shrink-0 items-center justify-center"
            >
              <Image
                src={LOGO}
                alt=""
                aria-hidden="true"
                width={32}
                height={32}
                sizes="32px"
                priority
                className="rounded-full"
                style={{ width: 32, height: 32 }}
              />
            </Link>
          )}
          <p className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-tight">
            {titleFor(pathname, all)}
          </p>
          {action ? (
            <Link
              href={action.href}
              aria-label={action.label}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground active:opacity-80"
            >
              <Plus className="size-5" />
            </Link>
          ) : null}
          <button
            type="button"
            aria-label="Account and menu"
            onClick={() => setMoreOpen(true)}
            className="flex size-11 shrink-0 items-center justify-center"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {initials(displayName)}
            </span>
          </button>
        </div>
      </header>

      <main
        className={cn(
          // overflow-y-auto only from lg: a scroll container here would stop sticky
          // children (tabs, filter bars, save bars) sticking to the viewport.
          'min-w-0 flex-1 p-3 sm:p-6 lg:overflow-y-auto',
          focused ? 'pb-mbar' : 'pb-mnav',
          'lg:pb-6'
        )}
      >
        {children}
      </main>

      {focused ? null : (
        <nav
          aria-label="Primary"
          className="px-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden"
        >
          <ul className="mx-auto flex h-[var(--mnav-h)] max-w-xl items-stretch">
            {primary.map((item) => {
              const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
              const isActive = active?.href === item.href && active?.label === item.label;
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-accent/60',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    <Icon className={cn('size-6', isActive && 'stroke-[2.4]')} aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                className={cn(
                  'flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-accent/60',
                  moreActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <MoreHorizontal className="size-6" aria-hidden="true" />
                More
              </button>
            </li>
          </ul>
        </nav>
      )}

      <BottomSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title="Menu"
        footer={
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium text-destructive active:bg-accent"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        }
      >
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted/50 p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold">
            {initials(displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        {secondary.length > 0 ? (
          <nav aria-label="More" className="grid grid-cols-2 gap-2">
            {secondary.map((item) => {
              const Icon = NAV_ICONS[item.icon] ?? LayoutDashboard;
              const isActive = active?.href === item.href && active?.label === item.label;
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium active:bg-accent',
                    isActive ? 'border-primary bg-primary/5' : 'bg-background'
                  )}
                >
                  <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}
      </BottomSheet>
    </>
  );
}
