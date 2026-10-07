import Link from 'next/link';
import type { Metadata, Viewport } from 'next';
import { requireProfile } from '@/lib/auth';
import { mobileNavForRole, navItemsForRole, ROLE_LABELS } from '@/lib/nav';
import { AppSidebar } from '@/components/app-sidebar';
import { signOutAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { MobileChrome } from '@/components/mobile/mobile-shell';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { PortalPushBoot } from '@/components/notifications/portal-push-boot';
import { SignOutForm } from '@/components/notifications/sign-out-form';
import { Toaster } from '@/components/ui/toaster';
import { BrandLogo } from '@/components/brand-logo';
import { InstallHelper } from '@/components/notifications/install-helper';

// The CRM draws edge to edge on notched phones (PWA / wrapper); the mobile
// chrome pads itself with env(safe-area-inset-*).
export const viewport: Viewport = {
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
  ],
};

// Home Screen (standalone) app behaviour on iOS; the manifest covers Android/desktop.
export const metadata: Metadata = {
  appleWebApp: { capable: true, title: 'HomeQuote', statusBarStyle: 'default' },
  other: { 'mobile-web-app-capable': 'yes' },
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
    <div className="flex min-h-[100dvh] bg-[var(--app-bg)]">
      <PortalPushBoot userId={profile.id} />
      <Toaster />
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 flex-col border-r bg-card lg:flex">
        <div className="flex h-14 shrink-0 items-center border-b px-5">
          <Link href="/app" aria-label="HomeQuote Network home" className="block">
            <BrandLogo priority className="w-[204px]" />
          </Link>
        </div>
        <AppSidebar items={items} />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-14 items-center justify-between gap-3 border-b bg-card px-8 lg:flex">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {ROLE_LABELS[profile.role]}
          </span>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm font-medium">
              {profile.full_name || profile.email}
            </span>
            <SignOutForm action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </SignOutForm>
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
          <InstallHelper />
          {children}
        </MobileChrome>
      </div>
    </div>
  );
}
