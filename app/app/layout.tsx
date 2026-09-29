import Link from 'next/link';
import type { Viewport } from 'next';
import { requireProfile } from '@/lib/auth';
import { mobileNavForRole, navItemsForRole, ROLE_LABELS } from '@/lib/nav';
import { AppSidebar } from '@/components/app-sidebar';
import { signOutAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { MobileChrome } from '@/components/mobile/mobile-shell';

// The CRM draws edge to edge on notched phones (PWA / wrapper); the mobile
// chrome pads itself with env(safe-area-inset-*).
export const viewport: Viewport = {
  maximumScale: 1,
  viewportFit: 'cover',
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const items = navItemsForRole(profile.role);
  const { primary, secondary } = mobileNavForRole(profile.role);

  return (
    <div className="flex min-h-[100dvh]">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Link href="/app" className="font-semibold tracking-tight">
            HomeQuote<span className="text-muted-foreground"> Network</span>
          </Link>
        </div>
        <AppSidebar items={items} />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden min-h-16 items-center justify-between gap-3 border-b px-6 lg:flex">
          <span className="text-sm text-muted-foreground">
            {ROLE_LABELS[profile.role]}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {profile.full_name || profile.email}
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        {/* Phones: compact top bar, bottom nav and <main> live together so the
            content padding always matches what is pinned to the bottom. */}
        <MobileChrome
          primary={primary}
          secondary={secondary}
          role={profile.role}
          roleLabel={ROLE_LABELS[profile.role]}
          displayName={profile.full_name || profile.email || 'Account'}
          signOutAction={signOutAction}
        >
          {children}
        </MobileChrome>
      </div>
    </div>
  );
}
