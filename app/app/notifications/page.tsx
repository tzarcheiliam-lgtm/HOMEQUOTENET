import { requireProfile } from '@/lib/auth';
import { NotificationsScreen } from '@/components/notifications/notifications-screen';

export const metadata = { title: 'Notifications · HomeQuote Network' };

export default async function NotificationsPage() {
  await requireProfile();
  return <NotificationsScreen />;
}
