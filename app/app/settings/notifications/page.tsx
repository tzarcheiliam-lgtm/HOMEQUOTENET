import Link from 'next/link';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { NotificationSettings } from '@/components/notifications/notification-settings';
import {
  defaultPreferences,
  notificationTypesForRole,
  NOTIFICATION_TYPE_IDS,
  type NotificationPreferences,
} from '@/lib/notifications/types';

export const metadata = { title: 'Notification settings · HomeQuote Network' };

export default async function NotificationSettingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', profile.id).maybeSingle();

  // No row yet = defaults (everything on); the first toggle creates it.
  const initial: NotificationPreferences = defaultPreferences();
  if (data) {
    initial.enabled = data.enabled !== false;
    for (const id of NOTIFICATION_TYPE_IDS) initial.types[id] = data[id] !== false;
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Notification settings" description="Choose how HomeQuote alerts you on this device." />
      <NotificationSettings
        userId={profile.id}
        types={notificationTypesForRole(profile.role).map(({ id, label, description }) => ({ id, label, description }))}
        initial={initial}
        pushConfigured={Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)}
      />
      {profile.role === 'admin' ? (
        <div className="mx-auto max-w-2xl">
          <Link href="/app/settings/notification-routing" className="flex min-h-12 items-center justify-center rounded-lg border text-sm font-medium hover:bg-accent">
            Notification routing (who gets which alert)
          </Link>
        </div>
      ) : null}
    </div>
  );
}
