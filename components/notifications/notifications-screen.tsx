'use client';

import { PageHeader } from '@/components/ui/page-header';
import { NotificationPanel } from './notification-bell';
import { Button } from '@/components/ui/button';
import { refreshNotifications } from './use-notifications';

/** Full-screen notification list (the phone "Alerts" tab). */
export function NotificationsScreen() {
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <PageHeader title="Notifications" description="Everything HomeQuote has alerted you about." />
      <NotificationPanel big onNavigate={() => {}} />
      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => void refreshNotifications()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
