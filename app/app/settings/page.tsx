import { redirect } from 'next/navigation';

// Notifications is the only settings area today; /app/settings is the
// parent the phone back arrow lands on.
export default function SettingsIndexPage() {
  redirect('/app/settings/notifications');
}
