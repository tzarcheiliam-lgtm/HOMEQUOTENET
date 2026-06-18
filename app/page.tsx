import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';

// The root route simply forwards people to the right place.
export default async function HomePage() {
  const profile = await getProfile();
  if (!profile) redirect('/sign-in');
  if (!profile.is_active) redirect('/pending');
  redirect('/app');
}
