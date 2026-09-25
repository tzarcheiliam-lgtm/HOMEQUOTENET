import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { navItemsForRole, ROLE_LABELS } from '@/lib/nav';
import { AppSidebar } from '@/components/app-sidebar';
import { signOutAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { MobileAppNav } from '@/components/mobile-app-nav';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const items = navItemsForRole(profile.role);

  return (
    <div className="flex min-h-[100dvh]">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Link href="/app" className="font-semibold tracking-tight">
            HomeQuote<span className="text-muted-foreground"> Network</span>
          </Link>
        </div>
        <AppSidebar items={items} />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b px-3 sm:px-6">
          <div className="flex items-center gap-3"><MobileAppNav items={items} /><span className="hidden text-sm text-muted-foreground sm:inline">
            {ROLE_LABELS[profile.role]}
          </span></div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium sm:inline">
              {profile.full_name || profile.email}
            </span>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
